# Phase 1 / Week 1 / Tuesday: Scopes + Roles

Цель: регистрация всех scopes в Zitadel + defined roles + assignment flow.

## Prereq

Monday done (Zitadel bootstrapped, daria org + 2 projects).

## Шаг 1: Scope taxonomy — final list

`services/identity/config/scopes.yaml`:

```yaml
# Layer: Shell
scopes:
  - key: shell:read
    displayName: Basic shell read
    description: Browse, view entities, public content
    group: shell
    requires_kyc_level: 0
    
  - key: shell:write
    displayName: Shell interactions
    description: Post messages, create entities, likes
    group: shell
    requires_kyc_level: 0
    
  # Layer: Domain — pattern
  - key: domain:pattern:read
    group: domain
    requires_kyc_level: 0
  - key: domain:pattern:write
    group: domain
    requires_kyc_level: 1
    
  # Layer: Domain — timeline
  - key: domain:timeline:submit-human-step
    description: Submit data для human-kind timeline step
    group: domain
    requires_kyc_level: 0
    
  # Layer: Domain — booking
  - key: domain:booking:book
    group: domain
    requires_kyc_level: 1
    
  # Layer: Domain — wallet
  - key: domain:wallet:read
    group: domain
    requires_kyc_level: 1
  - key: domain:wallet:transfer
    group: domain
    requires_kyc_level: 2
    requires_mfa: true
    
  # Layer: Domain — authorship
  - key: domain:authorship:publish
    group: domain
    requires_kyc_level: 1
  - key: domain:authorship:fork
    group: domain
    requires_kyc_level: 0
    
  # Layer: Domain — subscription
  - key: domain:subscription:purchase
    group: domain
    requires_kyc_level: 1
  - key: domain:subscription:gift
    group: domain
    requires_kyc_level: 2
    
  # Layer: Domain — messenger
  - key: domain:messenger:send
    group: domain
    requires_kyc_level: 0
  - key: domain:messenger:create-community
    group: domain
    requires_kyc_level: 1
    
  # Layer: Domain — feed
  - key: domain:feed:post
    group: domain
    requires_kyc_level: 0
    
  # Layer: Governance
  - key: governance:moderate
    group: governance
    admin_only: true
    requires_mfa: true
  - key: governance:compliance-read
    group: governance
    admin_only: true
    requires_mfa: true
  - key: governance:admin
    group: governance
    admin_only: true
    requires_mfa: true
    requires_elevated_session: true
  - key: governance:security
    group: governance
    admin_only: true
    requires_mfa: true
    requires_elevated_session: true
    
  # System (service-to-service — только для service accounts)
  - key: system:events:publish
    group: system
    service_account_only: true
  - key: system:events:consume
    group: system
    service_account_only: true
    
  # Banking (Phase 8+, gated)
  - key: banking:account:open
    group: banking
    requires_kyc_level: 3
    requires_mfa: true
    phase_gate: 8
  - key: banking:transfer
    group: banking
    requires_kyc_level: 3
    requires_mfa: true
    phase_gate: 8
```

## Шаг 2: Registration script

`scripts/zitadel/register-scopes.ts`:

```typescript
import { readFileSync } from 'fs'
import yaml from 'js-yaml'

interface ScopeConfig {
  key: string
  displayName?: string
  description?: string
  group: string
  requires_kyc_level?: number
  requires_mfa?: boolean
  admin_only?: boolean
  requires_elevated_session?: boolean
  service_account_only?: boolean
  phase_gate?: number
}

const ZITADEL_URL = process.env.ZITADEL_URL!
const ADMIN_TOKEN = process.env.ZITADEL_ADMIN_TOKEN!
const PROJECT_ID = process.env.SHELL_PROJECT_ID!

async function registerScopes() {
  const config = yaml.load(readFileSync('services/identity/config/scopes.yaml', 'utf-8')) as any
  const scopes: ScopeConfig[] = config.scopes

  let registered = 0
  let skipped = 0

  for (const scope of scopes) {
    // Skip phase-gated scopes before their phase
    const currentPhase = parseInt(process.env.CURRENT_PHASE ?? '1')
    if (scope.phase_gate && scope.phase_gate > currentPhase) {
      console.log(`⏭  ${scope.key} (phase-gated ${scope.phase_gate})`)
      skipped++
      continue
    }

    const response = await fetch(`${ZITADEL_URL}/management/v1/projects/${PROJECT_ID}/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: scope.key,
        displayName: scope.displayName ?? scope.key,
        group: scope.group,
      }),
    })

    if (response.status === 409) {
      console.log(`↺ ${scope.key} (exists)`)
    } else if (!response.ok) {
      console.error(`✗ ${scope.key}: ${await response.text()}`)
      continue
    } else {
      console.log(`✓ ${scope.key}`)
      registered++
    }

    // Store metadata (requires_kyc_level etc) в Zitadel metadata
    if (scope.requires_kyc_level !== undefined || scope.requires_mfa) {
      await fetch(`${ZITADEL_URL}/admin/v1/metadata/roles/${scope.key}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'scope_metadata',
          value: btoa(JSON.stringify({
            requires_kyc_level: scope.requires_kyc_level,
            requires_mfa: scope.requires_mfa,
            admin_only: scope.admin_only,
          })),
        }),
      })
    }
  }

  console.log(`\nRegistered ${registered}, skipped ${skipped} (phase-gated)`)
}

registerScopes().catch(console.error)
```

Run:
```bash
CURRENT_PHASE=1 pnpm tsx scripts/zitadel/register-scopes.ts
```

Expected: ~25 scopes registered.

## Шаг 3: Default roles

`services/identity/config/roles.yaml`:

```yaml
roles:
  # Default user (self-signup)
  user:
    description: Regular authenticated user
    grants:
      - shell:read
      - shell:write
      - domain:pattern:read
      - domain:pattern:write
      - domain:authorship:fork
      - domain:messenger:send
      - domain:feed:post
      - domain:timeline:submit-human-step

  creator:
    description: Verified creator (publishing rights)
    extends: user
    grants:
      - domain:authorship:publish
      - domain:messenger:create-community

  provider:
    description: B2B service provider
    extends: user
    grants:
      - domain:booking:book
      - domain:authorship:publish

  moderator:
    description: Platform moderator
    extends: user
    grants:
      - governance:moderate

  compliance:
    description: Compliance officer
    extends: user
    grants:
      - governance:compliance-read

  security:
    description: Security team
    extends: user
    grants:
      - governance:security

  admin:
    description: Platform admin
    extends: user
    grants:
      - governance:admin
      - governance:moderate

  # Service accounts
  service_account_payments:
    description: Payments service
    grants:
      - system:events:publish
      - system:events:consume
      - domain:wallet:transfer

  service_account_authorship:
    description: Authorship-registry service
    grants:
      - system:events:publish
      - system:events:consume
      - domain:wallet:transfer
```

## Шаг 4: Register roles script

`scripts/zitadel/register-roles.ts`:

```typescript
import { readFileSync } from 'fs'
import yaml from 'js-yaml'

async function resolveGrants(roleName: string, rolesMap: Map<string, any>, resolved = new Set<string>()): Promise<string[]> {
  if (resolved.has(roleName)) return []  // cycle guard
  resolved.add(roleName)

  const role = rolesMap.get(roleName)
  if (!role) return []

  let grants = [...(role.grants ?? [])]
  if (role.extends) {
    const parentGrants = await resolveGrants(role.extends, rolesMap, resolved)
    grants = [...new Set([...grants, ...parentGrants])]
  }
  return grants
}

async function registerRoles() {
  const config = yaml.load(readFileSync('services/identity/config/roles.yaml', 'utf-8')) as any
  const rolesMap = new Map(Object.entries(config.roles))

  for (const [roleName, roleConfig] of rolesMap) {
    const allGrants = await resolveGrants(roleName, rolesMap)
    
    // Create Zitadel "user grant template" via metadata
    await fetch(`${ZITADEL_URL}/admin/v1/metadata/roles_def/${roleName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'role_definition',
        value: btoa(JSON.stringify({
          name: roleName,
          description: (roleConfig as any).description,
          grants: allGrants,
        })),
      }),
    })
    
    console.log(`✓ ${roleName} (${allGrants.length} grants)`)
  }
}

registerRoles().catch(console.error)
```

## Шаг 5: Default role на signup

Update Zitadel Action `enrich-jwt.js`:

```javascript
// После user.created:
function onUserCreated(ctx, api) {
  // Auto-grant `user` role
  api.v1.users.grants.add({
    userId: ctx.v1.user.id,
    projectId: ctx.v1.project.id,
    roleKeys: ['user'],
  })
  
  // Set default metadata
  api.v1.users.metadata.set(ctx.v1.user.id, [
    { key: 'kyc_level', value: '0' },
    { key: 'region', value: ctx.v1.user.preferredLanguage ?? 'UNKNOWN' },
  ])
}
```

Register action в Zitadel UI → Actions → New → trigger on `user.created`.

## Шаг 6: Role promotion policy

Upgrade user's role требует 4-eyes (2 админов approve):

`services/identity/src/role-change.ts`:

```typescript
interface RoleChangeRequest {
  userId: string
  targetRole: string
  currentRoles: string[]
  requestedBy: string
  justification: string
  status: 'pending' | 'approved' | 'rejected'
  approvals: Array<{ approverId: string; at: Date }>
  createdAt: Date
}

async function requestRoleChange(params: {
  userId: string
  targetRole: string
  justification: string
  requestedBy: string
}): Promise<RoleChangeRequest> {
  // Insert в role_change_requests table (in platform_db)
  const [req] = await db.insert(roleChangeRequests).values({
    ...params,
    status: 'pending',
    approvals: [{ approverId: params.requestedBy, at: new Date() }],  // requester counts as 1 approval
  }).returning()

  // Notify admins
  await notificationsClient.send({
    toRole: 'admin',
    type: 'role-change-request',
    data: { requestId: req.id, ...params },
  })

  return req
}

async function approveRoleChange(requestId: string, approverId: string) {
  const req = await db.query.roleChangeRequests.findFirst({
    where: eq(roleChangeRequests.id, requestId),
  })
  if (!req || req.status !== 'pending') throw new Error('INVALID_STATE')
  if (req.approvals.some(a => a.approverId === approverId)) throw new Error('ALREADY_APPROVED')

  const newApprovals = [...req.approvals, { approverId, at: new Date() }]

  if (newApprovals.length >= 2) {
    // 4-eyes satisfied — apply change
    await fetch(`${ZITADEL_URL}/management/v1/users/${req.userId}/grants`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ projectId: PROJECT_ID, roleKeys: [req.targetRole] }),
    })

    await db.update(roleChangeRequests)
      .set({ status: 'approved', approvals: newApprovals })
      .where(eq(roleChangeRequests.id, requestId))

    await publishEvent('app.daria.identity.role-granted.v1', {
      userId: req.userId,
      role: req.targetRole,
      grantedByIds: newApprovals.map(a => a.approverId),
    })
  } else {
    await db.update(roleChangeRequests)
      .set({ approvals: newApprovals })
      .where(eq(roleChangeRequests.id, requestId))
  }
}
```

## Шаг 7: Scope validation middleware (для других services)

`packages/sdk-platform/src/auth-middleware.ts`:

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { IncomingMessage, ServerResponse } from 'http'

const JWKS_URL = process.env.JWKS_URL ?? 'http://identity.internal/.well-known/jwks.json'
const JWKS = createRemoteJWKSet(new URL(JWKS_URL), {
  cacheMaxAge: 5 * 60 * 1000,  // 5 min
})

export interface AuthContext {
  userId: string
  email: string
  scopes: string[]
  kycLevel: number
  region: string
  roles: string[]
  sessionId: string
  authTime: number
  mfaVerified: boolean
}

export async function verifyAndExtract(jwt: string): Promise<AuthContext> {
  const { payload } = await jwtVerify(jwt, JWKS, {
    issuer: process.env.IDENTITY_ISSUER ?? 'http://identity.internal',
    audience: process.env.SERVICE_AUDIENCE,
  })

  return {
    userId: payload.sub as string,
    email: payload.email as string,
    scopes: (payload.scope as string ?? '').split(' '),
    kycLevel: payload.kyc_level as number ?? 0,
    region: payload.region as string ?? 'UNKNOWN',
    roles: payload.roles as string[] ?? [],
    sessionId: payload.sid as string,
    authTime: payload.auth_time as number,
    mfaVerified: payload.amr?.includes('mfa') ?? false,
  }
}

export function requireScope(scope: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: Function) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return respond(res, 401, { error: { code: 'UNAUTHORIZED' } })
    }
    
    try {
      const ctx = await verifyAndExtract(authHeader.slice(7))
      if (!ctx.scopes.includes(scope)) {
        return respond(res, 403, { error: { code: 'FORBIDDEN', message: `Required scope: ${scope}` } })
      }
      ;(req as any).auth = ctx
      next()
    } catch (err) {
      return respond(res, 401, { error: { code: 'INVALID_TOKEN' } })
    }
  }
}

export function requireMFA() {
  return async (req: IncomingMessage, res: ServerResponse, next: Function) => {
    const ctx = (req as any).auth as AuthContext
    if (!ctx?.mfaVerified) {
      return respond(res, 403, { error: { code: 'MFA_REQUIRED' } })
    }
    next()
  }
}

export function requireFreshAuth(maxAgeSeconds: number = 300) {
  return async (req: IncomingMessage, res: ServerResponse, next: Function) => {
    const ctx = (req as any).auth as AuthContext
    const age = Date.now() / 1000 - ctx.authTime
    if (age > maxAgeSeconds) {
      return respond(res, 403, { error: { code: 'STEP_UP_REQUIRED', message: `Re-authenticate within ${maxAgeSeconds}s` } })
    }
    next()
  }
}

function respond(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
```

Usage в сервисе:
```typescript
// services/wallet/src/handlers/transfers.ts
app.post('/transfers', requireScope('domain:wallet:transfer'), requireMFA(), requireFreshAuth(300), handler)
```

## Шаг 8: Test end-to-end

```bash
# 1. Create user, login
eval $(pnpm tsx scripts/dev/zitadel-login.ts user1@test.com Password1!)

# 2. Inspect JWT scopes
echo $JWT | jwt-decode
# Should see: "scope": "openid profile email shell:read shell:write ..."

# 3. Try wallet transfer — should fail (no KYC)
curl -H "Authorization: Bearer $JWT" \
     -H "Idempotency-Key: $(uuidgen)" \
     -X POST http://wallet.internal/v1/transfers \
     -d '{"fromAccountId":"...", ...}'
# → 403 FORBIDDEN (scope domain:wallet:transfer missing)

# 4. Admin upgrades KYC (mock for now)
curl -H "Authorization: Bearer $ADMIN_JWT" \
     -X POST http://identity.internal/v1/users/$USER_ID/metadata \
     -d '{"kyc_level": "2"}'

# 5. Re-login to refresh JWT с new scope
# ...

# 6. Try transfer again — should pass MFA check
```

## Checklist

- [ ] 25+ scopes зарегистрированы в Zitadel
- [ ] 8 roles defined (user, creator, provider, moderator, compliance, security, admin, service_accounts)
- [ ] Default `user` role применяется automatically on signup
- [ ] Role change requires 4-eyes (2 admins)
- [ ] Scope-validation middleware работает (test PR gateway)
- [ ] MFA-required middleware работает
- [ ] Step-up (fresh auth) работает

## Next

Wednesday: registration flow → `03-registration-flow.md`.
