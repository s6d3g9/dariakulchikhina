# Phase 1 / Week 1 / Wednesday: Registration flow

Цель: user registers через email magic-link или SSO, receives JWT, default `user` role applied.

## Flow

```
1. Shell: "Sign up"
2. User enters email + age + region
3. Client POST /identity/signup → Zitadel user-created (unverified)
4. Age-gate check (policy-engine)
   - Minor? → parent-email flow (см. 41-children-safety)
   - Banned region? → denied
5. Magic-link sent (Mailhog в dev)
6. User clicks link → email verified → Zitadel marks verified
7. First login → JWT issued → onboarding flow
```

## Шаг 1: Signup endpoint (in services/identity)

`services/identity/src/handlers/signup.ts`:

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { zitadelClient } from '../zitadel-client'
import { evaluatePolicy } from '../policy-client'
import { publishEvent } from '../events'

const ZSignupRequest = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  region: z.string().regex(/^[A-Z]{2}$/),
  preferredLanguage: z.string().optional().default('en'),
  timezone: z.string().optional(),
  referralCode: z.string().optional(),
  deviceFingerprint: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = ZSignupRequest.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, data: parsed.error.flatten() })
  }
  const data = parsed.data

  // Age-gate через policy-engine
  const policyDecision = await evaluatePolicy({
    user: { id: 'anonymous', age: data.age, roles: [], kyc: { level: 0 } },
    region: { code: data.region, tz: data.timezone ?? 'UTC', language: data.preferredLanguage },
    action: { type: 'identity.signup', resource: 'daria-shell' },
    time: { utc: new Date().toISOString() },
  })

  if (policyDecision.effect === 'deny') {
    throw createError({
      statusCode: 403,
      statusMessage: 'SIGNUP_NOT_ALLOWED',
      data: { reason: policyDecision.reason, decision: policyDecision },
    })
  }

  const isMinor = data.age < getLegalAdultAge(data.region)

  if (isMinor) {
    // Parent-consent flow
    return handleMinorSignup(data)
  }

  // Adult signup
  const userId = await zitadelClient.createUser({
    email: data.email,
    age: data.age,
    region: data.region,
    preferredLanguage: data.preferredLanguage,
    metadata: {
      kyc_level: '0',
      region: data.region,
      declared_age: String(data.age),
      signup_source: 'self-signup',
      referral_code: data.referralCode ?? '',
    },
  })

  // Trigger magic-link email
  await zitadelClient.sendMagicLink(userId)

  // Emit event
  await publishEvent('app.daria.identity.user-registered.v1', {
    userId,
    registeredAt: new Date().toISOString(),
    source: 'signup',
    region: data.region,
    language: data.preferredLanguage,
    declaredAge: data.age,
    ageVerified: false,
    isMinor: false,
    referralCode: data.referralCode,
    deviceFingerprint: data.deviceFingerprint,
  })

  return {
    userId,
    status: 'pending-email-verification',
    message: 'Check your email для magic-link',
  }
})

async function handleMinorSignup(data: z.infer<typeof ZSignupRequest>) {
  // ... см. 41-children-safety.md
}

function getLegalAdultAge(region: string): number {
  // Read from law-profile
  const profile = lawProfiles.get(region)
  return profile?.legalAges?.adult ?? 18
}
```

## Шаг 2: Zitadel client helper

`services/identity/src/zitadel-client.ts`:

```typescript
import axios from 'axios'

const ZITADEL_URL = process.env.ZITADEL_URL!
const PROJECT_ID = process.env.ZITADEL_PROJECT_ID!
const SERVICE_TOKEN = process.env.ZITADEL_SERVICE_TOKEN!  // Client-credentials для identity-service

const client = axios.create({
  baseURL: ZITADEL_URL,
  headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
})

export const zitadelClient = {
  async createUser(params: {
    email: string
    age: number
    region: string
    preferredLanguage: string
    metadata: Record<string, string>
  }): Promise<string> {
    const response = await client.post('/management/v1/users/human/_import', {
      profile: {
        userName: params.email,
        preferredLanguage: params.preferredLanguage,
      },
      email: { email: params.email, isEmailVerified: false },
      // Password omitted — passwordless flow
      passwordless: true,
    })
    const userId = response.data.userId

    // Set metadata
    for (const [key, value] of Object.entries(params.metadata)) {
      await client.post(`/management/v1/users/${userId}/metadata/${key}`, {
        value: Buffer.from(value).toString('base64'),
      })
    }

    // Grant default `user` role
    await client.post(`/management/v1/users/${userId}/grants`, {
      projectId: PROJECT_ID,
      roleKeys: ['user'],
    })

    return userId
  },

  async sendMagicLink(userId: string): Promise<void> {
    await client.post(`/management/v1/users/${userId}/_initialize`, {
      sendVerificationEmail: true,
    })
  },

  async verifyEmail(userId: string, code: string): Promise<void> {
    await client.post(`/management/v1/users/${userId}/email/_verify`, {
      code,
    })
  },

  async setMetadata(userId: string, key: string, value: string): Promise<void> {
    await client.post(`/management/v1/users/${userId}/metadata/${key}`, {
      value: Buffer.from(value).toString('base64'),
    })
  },

  async getMetadata(userId: string, key: string): Promise<string | null> {
    try {
      const response = await client.get(`/management/v1/users/${userId}/metadata/${key}`)
      return Buffer.from(response.data.metadata.value, 'base64').toString()
    } catch (err: any) {
      if (err.response?.status === 404) return null
      throw err
    }
  },

  async revokeSession(sessionId: string): Promise<void> {
    await client.delete(`/session/v2/sessions/${sessionId}`)
  },
}
```

## Шаг 3: Magic-link callback

Zitadel хостит magic-link flow (встроено). Configure в Zitadel Admin UI:
- Login Policy → Enable "Passwordless".
- Login UI → Customize redirect: `https://daria.app/auth/callback`.

После click-through Zitadel:
1. Verifies email.
2. Issues session.
3. Redirects к callback с tokens.

Shell handles callback:

`apps/shell-web/app/auth/callback/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code || !state) {
        router.push('/auth/error?reason=missing-params')
        return
      }

      // Exchange code для tokens
      const response = await fetch('/api/auth/exchange', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      })
      
      if (!response.ok) {
        router.push('/auth/error?reason=exchange-failed')
        return
      }
      
      const { userId } = await response.json()
      
      // Check if first-time user → onboarding
      const meResponse = await fetch('/api/me')
      const me = await meResponse.json()
      
      if (me.onboardingCompleted) {
        router.push('/')  // shell
      } else {
        router.push('/onboarding')
      }
    }

    handleCallback()
  }, [])

  return <div>Signing you in…</div>
}
```

`apps/shell-web/app/api/auth/exchange/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { code, state } = await request.json()

  // Exchange code с Zitadel
  const tokenResponse = await fetch(`${process.env.ZITADEL_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.ZITADEL_CLIENT_ID!,
      client_secret: process.env.ZITADEL_CLIENT_SECRET!,
      redirect_uri: `${process.env.PUBLIC_URL}/auth/callback`,
    }),
  })

  if (!tokenResponse.ok) {
    return NextResponse.json({ error: 'TOKEN_EXCHANGE_FAILED' }, { status: 401 })
  }

  const tokens = await tokenResponse.json()

  // Store JWT в httpOnly cookie (NOT localStorage — I19 security)
  cookies().set('daria-access-token', tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokens.expires_in,
    path: '/',
  })
  cookies().set('daria-refresh-token', tokens.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 3600,
    path: '/api/auth',
  })

  // Extract userId from JWT
  const [, payload] = tokens.access_token.split('.')
  const decoded = JSON.parse(atob(payload))
  
  return NextResponse.json({ userId: decoded.sub })
}
```

## Шаг 4: Onboarding page

`apps/shell-web/app/onboarding/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button, Section, Field } from '@daria/ui-react'
import { useRouter } from 'next/navigation'

const STEPS = ['language', 'interests', 'connections', 'first-action']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    language: 'en',
    interests: [] as string[],
    connections: { google: false, apple: false, contacts: false },
  })

  async function handleComplete() {
    await fetch('/api/me/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    router.push('/')
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded ${i <= step ? 'bg-primary-500' : 'bg-neutral-200'}`}
            />
          ))}
        </div>
      </div>

      {step === 0 && <LanguageStep data={data} onNext={(d) => { setData({...data, ...d}); setStep(1) }} />}
      {step === 1 && <InterestsStep data={data} onNext={(d) => { setData({...data, ...d}); setStep(2) }} />}
      {step === 2 && <ConnectionsStep data={data} onNext={(d) => { setData({...data, ...d}); setStep(3) }} />}
      {step === 3 && <FirstActionStep onComplete={handleComplete} />}
    </div>
  )
}

function InterestsStep({ data, onNext }) {
  const options = ['Travel', 'Creative', 'Education', 'Shopping', 'Wellness', 'Work', 'All']
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Что вас интересует?</h1>
      <p className="text-fg-secondary mb-6">Поможет подобрать релевантный контент и рекомендации</p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {options.map(opt => (
          <button
            key={opt}
            className={`p-4 rounded-lg border ${
              data.interests.includes(opt)
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200'
            }`}
            onClick={() => {
              const newInterests = data.interests.includes(opt)
                ? data.interests.filter(i => i !== opt)
                : [...data.interests, opt]
              onNext({ interests: newInterests })
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <Button onClick={() => onNext({})} disabled={data.interests.length === 0}>
        Продолжить
      </Button>
    </div>
  )
}

// ... LanguageStep, ConnectionsStep, FirstActionStep similar
```

## Шаг 5: Minor-signup flow

`services/identity/src/handlers/minor-signup.ts`:

```typescript
async function handleMinorSignup(data: SignupRequest): Promise<MinorSignupResult> {
  // Require parent email
  if (!data.parentEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'MINOR_REQUIRES_PARENT_EMAIL',
      data: {
        reason: `You're under ${getLegalAdultAge(data.region)}. A parent email is required.`,
        nextStep: 'provide-parent-email',
      },
    })
  }

  // Create child account в "pending-parent-consent" state
  const userId = await zitadelClient.createUser({
    email: data.email,
    age: data.age,
    region: data.region,
    preferredLanguage: data.preferredLanguage,
    metadata: {
      kyc_level: '0',
      region: data.region,
      declared_age: String(data.age),
      is_minor: 'true',
      pending_parent_consent: 'true',
      parent_email: data.parentEmail,
    },
  })

  // Don't grant any roles yet
  // Send parent-consent email
  const consentToken = generateSecureToken()
  await db.insert(parentConsentTokens).values({
    token: consentToken,
    childUserId: userId,
    parentEmail: data.parentEmail,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),  // 7d
  })

  await notificationsClient.send({
    to: data.parentEmail,
    template: 'parent-consent-required',
    data: {
      childEmail: data.email,
      childAge: data.age,
      consentUrl: `https://daria.app/parent-consent?token=${consentToken}`,
    },
  })

  return {
    userId,
    status: 'pending-parent-consent',
    message: 'A consent email was sent to the parent',
  }
}

async function parentConsent(token: string, parentAge: number, parentName: string) {
  const record = await db.query.parentConsentTokens.findFirst({
    where: eq(parentConsentTokens.token, token),
  })
  if (!record || record.expiresAt < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'TOKEN_EXPIRED_OR_INVALID' })
  }
  if (record.consumedAt) {
    throw createError({ statusCode: 409, statusMessage: 'ALREADY_CONSENTED' })
  }
  if (parentAge < 18) {
    throw createError({ statusCode: 403, statusMessage: 'PARENT_MUST_BE_ADULT' })
  }

  // Create parent account if doesn't exist
  let parentUserId = await zitadelClient.findUserByEmail(record.parentEmail)
  if (!parentUserId) {
    parentUserId = await zitadelClient.createUser({
      email: record.parentEmail,
      age: parentAge,
      region: record.region,
      metadata: { kyc_level: '0', role: 'parent' },
    })
  }

  // Link parent to child
  await zitadelClient.setMetadata(record.childUserId, 'parent_id', parentUserId)
  await zitadelClient.setMetadata(record.childUserId, 'pending_parent_consent', 'false')
  await zitadelClient.setMetadata(record.childUserId, 'parent_consent_given_at', new Date().toISOString())

  // Grant default minor roles
  await zitadelClient.addRoles(record.childUserId, ['user'])

  // Consume token
  await db.update(parentConsentTokens)
    .set({ consumedAt: new Date(), consumedBy: parentUserId })
    .where(eq(parentConsentTokens.token, token))

  await publishEvent('app.daria.identity.parent-consent-given.v1', {
    childUserId: record.childUserId,
    parentUserId,
    givenAt: new Date().toISOString(),
  })
}
```

## Шаг 6: Test end-to-end

```bash
# 1. Signup as adult
curl -X POST http://identity.internal/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","age":30,"region":"EU","preferredLanguage":"en"}'
# → {"userId":"u_...","status":"pending-email-verification"}

# 2. Check Mailhog для magic-link
open http://localhost:8025

# 3. Click link → callback processes → JWT в cookie

# 4. Test signup as minor
curl -X POST http://identity.internal/v1/signup \
  -d '{"email":"teen@test.com","age":14,"region":"EU","parentEmail":"parent@test.com"}'
# → {"userId":"...","status":"pending-parent-consent"}

# 5. Parent-consent link в Mailhog → POST /parent-consent
curl -X POST http://identity.internal/v1/parent-consent \
  -d '{"token":"...","parentAge":40,"parentName":"John Smith"}'
# → 200 OK, child получает role:user

# 6. Verify JWT для minor
eval $(pnpm tsx scripts/dev/zitadel-login.ts teen@test.com Password1!)
echo $JWT | jwt-decode | grep is_minor
# → "is_minor": "true"
```

## Checklist

- [ ] POST /identity/v1/signup works для adult (end-to-end с email-verify)
- [ ] Age-gate blocks banned regions + underage в regions where даже signup blocked
- [ ] Minor signup → parent-consent flow works
- [ ] Magic-link email отправляется (Mailhog tests)
- [ ] OAuth callback в shell exchanges code для JWT
- [ ] JWT stored в httpOnly cookie (not localStorage)
- [ ] Onboarding page loads после first login
- [ ] `app.daria.identity.user-registered.v1` event published

## Next

Thursday: passkey setup → `04-passkey-setup.md`.
