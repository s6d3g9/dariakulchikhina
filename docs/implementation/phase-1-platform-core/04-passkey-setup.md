# Phase 1 / Week 1 / Thursday: Passkey setup (WebAuthn)

Цель: WebAuthn-based passkey auth. Passwordless, phishing-resistant, biometric-backed.

## Архитектура

```
Shell (browser)  ←→  identity-service  ←→  Zitadel
      │                      │
      ▼                      ▼
   WebAuthn              Zitadel стандартно
   (passkey)              supports WebAuthn
```

Zitadel уже имеет WebAuthn support. Нам — configure + integrate с shell UI.

## Шаг 1: Enable WebAuthn в Zitadel

Admin UI → Login Policy:

- ☑ Passwordless (FIDO2 / WebAuthn) enabled
- Passwordless Type: **Allowed** + **Required for MFA**
- Relying Party ID: `daria.app` (prod) / `localhost` (dev)

Или через API:

```bash
curl -X PUT $ZITADEL_URL/admin/v1/policies/login \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "allowUsernamePassword": false,
    "allowRegister": true,
    "allowExternalIDP": true,
    "passwordlessType": "PASSWORDLESS_TYPE_ALLOWED",
    "forceMFA": false,
    "secondFactors": ["SECOND_FACTOR_TYPE_OTP", "SECOND_FACTOR_TYPE_U2F"],
    "multiFactors": ["MULTI_FACTOR_TYPE_U2F_WITH_VERIFICATION"]
  }'
```

## Шаг 2: Passkey registration endpoint

`services/identity/src/handlers/webauthn.ts`:

```typescript
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { db } from '../db'
import { webauthnCredentials } from '../db/schema'
import { requireAuth } from '../middleware/auth'

const RP_ID = process.env.RP_ID ?? 'localhost'
const RP_NAME = 'Daria'
const ORIGIN = process.env.PUBLIC_URL ?? 'http://localhost:3000'

// === Registration (user setting up new passkey) ===

export const beginRegistration = defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Load existing credentials to exclude
  const existing = await db.query.webauthnCredentials.findMany({
    where: eq(webauthnCredentials.userId, user.userId),
  })

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.userId,
    userName: user.email,
    userDisplayName: user.email,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existing.map(c => ({
      id: c.credentialIdBase64url,
      type: 'public-key',
      transports: c.transports as any,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    supportedAlgorithmIDs: [-7, -257],  // ES256, RS256
  })

  // Store challenge для verification
  await db.insert(webauthnChallenges).values({
    userId: user.userId,
    challenge: options.challenge,
    type: 'registration',
    expiresAt: new Date(Date.now() + 60000),
  })

  return options
})

export const finishRegistration = defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event) as RegistrationResponseJSON

  // Load challenge
  const challenge = await db.query.webauthnChallenges.findFirst({
    where: and(
      eq(webauthnChallenges.userId, user.userId),
      eq(webauthnChallenges.type, 'registration'),
      gt(webauthnChallenges.expiresAt, new Date()),
    ),
  })
  if (!challenge) {
    throw createError({ statusCode: 400, statusMessage: 'NO_CHALLENGE' })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    })
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: 'VERIFICATION_FAILED', data: { error: String(err) } })
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw createError({ statusCode: 400, statusMessage: 'VERIFICATION_FAILED' })
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

  // Store credential
  await db.insert(webauthnCredentials).values({
    userId: user.userId,
    credentialIdBase64url: Buffer.from(credentialID).toString('base64url'),
    publicKey: Buffer.from(credentialPublicKey),
    counter: BigInt(counter),
    transports: body.response.transports ?? [],
    nickname: body.nickname ?? 'Passkey',
    createdAt: new Date(),
  })

  // Delete challenge
  await db.delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, challenge.id))

  // Emit event
  await publishEvent('app.daria.identity.passkey-enrolled.v1', {
    userId: user.userId,
    credentialId: Buffer.from(credentialID).toString('base64url'),
  })

  return { success: true, credentialId: Buffer.from(credentialID).toString('base64url') }
})

// === Authentication (login via passkey) ===

export const beginAuth = defineEventHandler(async (event) => {
  const { email } = await readBody(event)
  
  const user = await zitadelClient.findUserByEmail(email)
  if (!user) {
    // Don't leak user existence — return generic challenge
    return generateGenericAuthOptions()
  }

  const credentials = await db.query.webauthnCredentials.findMany({
    where: eq(webauthnCredentials.userId, user.id),
  })

  if (credentials.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'NO_PASSKEYS' })
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    allowCredentials: credentials.map(c => ({
      id: c.credentialIdBase64url,
      type: 'public-key',
      transports: c.transports as any,
    })),
    userVerification: 'required',
  })

  await db.insert(webauthnChallenges).values({
    userId: user.id,
    challenge: options.challenge,
    type: 'authentication',
    expiresAt: new Date(Date.now() + 60000),
  })

  return options
})

export const finishAuth = defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, response } = body

  const user = await zitadelClient.findUserByEmail(email)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'UNAUTHORIZED' })

  const challenge = await db.query.webauthnChallenges.findFirst({
    where: and(
      eq(webauthnChallenges.userId, user.id),
      eq(webauthnChallenges.type, 'authentication'),
      gt(webauthnChallenges.expiresAt, new Date()),
    ),
  })
  if (!challenge) throw createError({ statusCode: 400, statusMessage: 'NO_CHALLENGE' })

  const credential = await db.query.webauthnCredentials.findFirst({
    where: and(
      eq(webauthnCredentials.userId, user.id),
      eq(webauthnCredentials.credentialIdBase64url, response.id),
    ),
  })
  if (!credential) throw createError({ statusCode: 401, statusMessage: 'CREDENTIAL_NOT_FOUND' })

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credential.credentialIdBase64url, 'base64url'),
        credentialPublicKey: credential.publicKey,
        counter: Number(credential.counter),
      },
      requireUserVerification: true,
    })
  } catch (err) {
    throw createError({ statusCode: 401, statusMessage: 'VERIFICATION_FAILED' })
  }

  if (!verification.verified) {
    throw createError({ statusCode: 401, statusMessage: 'VERIFICATION_FAILED' })
  }

  // Update counter (anti-replay)
  await db.update(webauthnCredentials)
    .set({ counter: BigInt(verification.authenticationInfo.newCounter) })
    .where(eq(webauthnCredentials.id, credential.id))

  await db.delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, challenge.id))

  // Generate Zitadel session for this user
  const session = await zitadelClient.createSessionForUser(user.id, {
    amr: ['pwd', 'webauthn', 'mfa'],  // indicates passkey + MFA
  })

  // Emit event
  await publishEvent('app.daria.identity.user-logged-in.v1', {
    userId: user.id,
    method: 'passkey',
    loggedInAt: new Date().toISOString(),
    credentialId: credential.credentialIdBase64url,
  })

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  }
})
```

## Шаг 3: DB schema

`services/identity/src/db/schema.ts` (дополнение):

```typescript
export const webauthnCredentials = pgTable('webauthn_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  credentialIdBase64url: varchar('credential_id_base64url', { length: 512 }).notNull(),
  publicKey: customType<{ data: Buffer }>({
    dataType() { return 'bytea' },
  })('public_key').notNull(),
  counter: bigint('counter', { mode: 'bigint' }).notNull().default(0n),
  transports: jsonb('transports').$type<string[]>().default([]),
  nickname: varchar('nickname', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('webauthn_user_idx').on(t.userId),
  credentialIdx: unique('webauthn_credential_unique').on(t.credentialIdBase64url),
}))

export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  challenge: text('challenge').notNull(),
  type: varchar('type', { length: 16 }).notNull(),  // 'registration' | 'authentication'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userTypeIdx: index('webauthn_challenges_user_type_idx').on(t.userId, t.type, t.expiresAt),
}))
```

## Шаг 4: Cleanup cron

Удалять expired challenges:

```typescript
// Temporal workflow: runs every minute
async function cleanupChallengesCron() {
  await db.delete(webauthnChallenges).where(lt(webauthnChallenges.expiresAt, new Date()))
}
```

## Шаг 5: Client-side (React)

Install `@simplewebauthn/browser`:

```bash
pnpm add @simplewebauthn/browser -F @daria/shell-web
```

`apps/shell-web/src/lib/passkey.ts`:

```typescript
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

export async function registerPasskey() {
  // 1. Get registration options
  const optionsResponse = await fetch('/api/auth/webauthn/register-begin', {
    method: 'POST',
  })
  const options = await optionsResponse.json()

  // 2. Invoke WebAuthn API (triggers browser/platform UI)
  const attestationResponse = await startRegistration(options)

  // 3. Send back to server for verification
  const verifyResponse = await fetch('/api/auth/webauthn/register-finish', {
    method: 'POST',
    body: JSON.stringify(attestationResponse),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!verifyResponse.ok) {
    throw new Error('Registration failed')
  }

  return await verifyResponse.json()
}

export async function loginWithPasskey(email: string) {
  // 1. Get auth options
  const optionsResponse = await fetch('/api/auth/webauthn/auth-begin', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })
  const options = await optionsResponse.json()

  // 2. Invoke WebAuthn API
  const assertionResponse = await startAuthentication(options)

  // 3. Send back
  const verifyResponse = await fetch('/api/auth/webauthn/auth-finish', {
    method: 'POST',
    body: JSON.stringify({ email, response: assertionResponse }),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!verifyResponse.ok) {
    throw new Error('Authentication failed')
  }

  // Tokens set в httpOnly cookies by server
  return await verifyResponse.json()
}
```

## Шаг 6: Login UI component

`apps/shell-web/app/auth/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button, Input } from '@daria/ui-react'
import { loginWithPasskey } from '@/lib/passkey'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handlePasskeyLogin() {
    setLoading(true)
    setError(null)
    try {
      await loginWithPasskey(email)
      router.push('/')
    } catch (err) {
      setError('Sign-in failed. Попробуй magic-link?')
    }
    setLoading(false)
  }

  async function handleMagicLink() {
    setLoading(true)
    try {
      await fetch('/api/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })
      router.push('/auth/check-email')
    } catch (err) {
      setError('Failed to send magic link')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Вход</h1>
      
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4"
      />

      {error && <p className="text-danger-500 mb-4">{error}</p>}

      <Button
        className="w-full mb-3"
        onClick={handlePasskeyLogin}
        disabled={loading || !email}
      >
        Войти через passkey 🔑
      </Button>

      <Button
        className="w-full"
        variant="secondary"
        onClick={handleMagicLink}
        disabled={loading || !email}
      >
        Отправить magic-link на email
      </Button>

      <p className="text-xs text-fg-tertiary mt-6">
        Passkey works with your device's biometrics (TouchID, FaceID, Windows Hello).
        No password required.
      </p>
    </div>
  )
}
```

## Шаг 7: Registration page (settings)

`apps/shell-web/app/settings/security/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button, Item } from '@daria/ui-react'
import { registerPasskey } from '@/lib/passkey'

export default function SecuritySettings() {
  const [passkeys, setPasskeys] = useState([])

  useEffect(() => {
    fetch('/api/me/passkeys').then(r => r.json()).then(setPasskeys)
  }, [])

  async function handleAddPasskey() {
    try {
      await registerPasskey()
      const updated = await fetch('/api/me/passkeys').then(r => r.json())
      setPasskeys(updated)
    } catch (err) {
      alert('Failed to register passkey')
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm('Delete this passkey?')) return
    await fetch(`/api/me/passkeys/${id}`, { method: 'DELETE' })
    setPasskeys(passkeys.filter(p => p.id !== id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Security</h1>
      
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Passkeys</h2>
        <p className="text-fg-secondary mb-4">Sign-in without passwords using biometrics.</p>
        
        <div className="space-y-2 mb-4">
          {passkeys.map(p => (
            <Item
              key={p.id}
              identity={{ title: p.nickname || 'Passkey' }}
              meta={`Created ${new Date(p.createdAt).toLocaleDateString()}, last used ${p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleDateString() : 'never'}`}
              actions={
                <Button variant="ghost" size="sm" onClick={() => handleDeletePasskey(p.id)}>
                  Delete
                </Button>
              }
            />
          ))}
        </div>

        <Button onClick={handleAddPasskey}>Add passkey</Button>
      </section>
    </div>
  )
}
```

## Шаг 8: Test

```bash
# 1. Login via magic-link (existing flow)
# 2. Navigate to /settings/security
# 3. Click "Add passkey"
#    - Browser prompts для TouchID/FaceID/security-key
#    - User approves
# 4. Logout
# 5. Login via passkey
#    - Enter email
#    - Click "Войти через passkey"
#    - Browser prompts biometric
#    - Authenticated → redirected to shell
```

## Checklist

- [ ] Zitadel WebAuthn enabled
- [ ] `/api/auth/webauthn/register-begin|finish` работают
- [ ] `/api/auth/webauthn/auth-begin|finish` работают
- [ ] Credential stored с correct counter
- [ ] Counter increments после each auth (anti-replay)
- [ ] Passkey management UI (add / list / delete)
- [ ] End-to-end login via passkey успешно
- [ ] `app.daria.identity.passkey-enrolled.v1` event published
- [ ] AMR claim в JWT includes `mfa` для passkey-authenticated sessions

## Next

Friday: WS-ticket flow → `05-ws-ticket-flow.md`.
