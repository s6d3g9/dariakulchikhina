# Phase 1 / Week 1 / Monday: Zitadel setup

Цель: Zitadel self-hosted bootstrapped, admin user created, base configuration ready.

## Шаг 1: Dedicated Postgres database для Zitadel

Zitadel уже в docker-compose (см. `phase-0-foundation/02-docker-compose-full.md`). Убедись, что `identity_db` создан:

```bash
docker exec -it daria-postgres psql -U daria -c "\l" | grep identity_db
# Should see identity_db
```

## Шаг 2: Zitadel startup

```bash
docker compose up -d zitadel
docker logs daria-zitadel | tail -50
# Wait for: "Zitadel Management is running"
```

Готовность: `curl http://localhost:8081/debug/ready` → 200 OK.

## Шаг 3: Initial admin setup

Default credentials (из docker-compose env):
- Username: `zitadel-admin@zitadel.localhost`
- Password: `Password1!`

```bash
open http://localhost:8081/ui/login
# Login, прийдётся change password на first login
```

## Шаг 4: Create Daria organization

В Zitadel Admin UI:
1. Default Instance → Organizations → New.
2. Name: `Daria`.
3. Domain: `daria.app` (production), `localhost` (dev).
4. Primary admin: `admin@daria.app`.

Или через API (preferred for automation):

```bash
ZITADEL_URL=http://localhost:8081
ADMIN_TOKEN=$(curl -s -X POST $ZITADEL_URL/oauth/v2/token \
  -d "grant_type=client_credentials" \
  -d "client_id=admin-service-account" \
  -d "client_secret=$ADMIN_SECRET" | jq -r .access_token)

curl -X POST $ZITADEL_URL/admin/v1/orgs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Daria",
    "primaryDomain": "daria.app",
    "admins": [{"email": "admin@daria.app", "firstName": "Admin", "lastName": "User"}]
  }'
```

Save org ID для further API calls.

## Шаг 5: Define v6 projects within Daria org

Zitadel "project" = logical grouping of resources. Создаём по одному per-service:

```bash
# Shell project (apps/shell-* consumes)
curl -X POST $ZITADEL_URL/management/v1/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name": "daria-shell"}'

# Management project
curl -X POST $ZITADEL_URL/management/v1/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name": "daria-admin"}'

# External API project (Phase 5+)
# curl ... -d '{"name": "daria-public-api"}'
```

## Шаг 6: Scopes configuration

Zitadel native scopes настраиваются при создании project + в user claims.

Создаём `services/identity/config/scopes.yaml`:

```yaml
# Shell scopes
shell:read:
  description: Basic shell access (browsing)
  
shell:write:
  description: Shell interactions (posts, messages)

# Domain scopes
domain:pattern:read:
  description: View pattern-cards
  
domain:pattern:write:
  description: Create/edit pattern-cards
  
domain:wallet:read:
  description: View wallet balances
  requires_kyc: 1
  
domain:wallet:transfer:
  description: Transfer funds
  requires_kyc: 2
  requires_mfa: true

domain:booking:book:
  description: Book slots
  
domain:authorship:publish:
  description: Publish templates
  requires_kyc: 1

domain:messenger:send:
  description: Send messages

domain:feed:post:
  description: Post to feed

# Governance scopes
governance:moderate:
  description: Moderation queue access
  admin_only: true

governance:compliance:
  description: Compliance report access
  admin_only: true

governance:admin:
  description: Platform admin operations
  admin_only: true
  requires_mfa: true

# Banking (Phase 8+)
banking:*:
  description: Banking vertical (gated behind additional KYC + consent)
  phase_gate: 8
```

## Шаг 7: Scripted scope registration

`scripts/zitadel/register-scopes.ts`:

```ts
import { readFileSync } from 'fs'
import yaml from 'js-yaml'

const ZITADEL_URL = process.env.ZITADEL_URL!
const ADMIN_TOKEN = process.env.ZITADEL_ADMIN_TOKEN!
const SHELL_PROJECT_ID = process.env.SHELL_PROJECT_ID!

const scopesConfig = yaml.load(readFileSync('services/identity/config/scopes.yaml', 'utf-8')) as Record<string, any>

for (const [scopeName, meta] of Object.entries(scopesConfig)) {
  // Register as project role в Zitadel
  const response = await fetch(`${ZITADEL_URL}/management/v1/projects/${SHELL_PROJECT_ID}/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: scopeName,
      displayName: scopeName,
      group: scopeName.split(':')[0],
    }),
  })
  
  if (!response.ok) {
    const err = await response.text()
    console.error(`Failed to register ${scopeName}: ${err}`)
    continue
  }
  
  console.log(`✓ ${scopeName}`)
}
```

Run:

```bash
ZITADEL_URL=http://localhost:8081 \
ZITADEL_ADMIN_TOKEN=$ADMIN_TOKEN \
SHELL_PROJECT_ID=... \
pnpm tsx scripts/zitadel/register-scopes.ts
```

## Шаг 8: Actions (custom JWT claims)

Zitadel Actions позволяют customize JWT при login. Создаём action для добавления `kyc_level` + `roles` в токен:

`services/identity/actions/enrich-jwt.js`:

```javascript
// Executed by Zitadel при login
function enrichJWT(ctx, api) {
  const user = ctx.v1.user
  
  // Add kyc_level от custom metadata
  const kycLevel = user.human?.metadata?.find(m => m.key === 'kyc_level')?.value || 0
  api.v1.claims.setClaim('kyc_level', parseInt(kycLevel))
  
  // Add region
  const region = user.human?.metadata?.find(m => m.key === 'region')?.value || 'UNKNOWN'
  api.v1.claims.setClaim('region', region)
  
  // Add role list
  const roles = user.grants?.projectGrants?.[0]?.roles || []
  api.v1.claims.setClaim('roles', roles)
  
  // Add feature-flags exposure
  const featureFlags = user.human?.metadata?.find(m => m.key === 'feature_flags')?.value
  if (featureFlags) {
    api.v1.claims.setClaim('feature_flags', JSON.parse(featureFlags))
  }
}
```

Register action в Zitadel Admin UI → Actions → New → paste JS.

## Шаг 9: Smoke test — OIDC discovery

```bash
curl http://localhost:8081/.well-known/openid-configuration | jq
```

Expected output:
```json
{
  "issuer": "http://localhost:8081",
  "authorization_endpoint": "http://localhost:8081/oauth/v2/authorize",
  "token_endpoint": "http://localhost:8081/oauth/v2/token",
  "userinfo_endpoint": "http://localhost:8081/oidc/v1/userinfo",
  "jwks_uri": "http://localhost:8081/oauth/v2/keys",
  ...
}
```

JWKS:
```bash
curl http://localhost:8081/oauth/v2/keys | jq
```

Expected: `keys` array с public keys для JWT verification.

## Шаг 10: Test user registration + login

Через Zitadel UI:
1. http://localhost:8081/ui/login
2. Register new user (email + password)
3. Verify email via mailhog (http://localhost:8025)
4. Login
5. Inspect JWT: paste в https://jwt.io
   - Should have: `iss`, `sub`, `exp`, `kyc_level` (0), `roles` (empty), `region`

## Шаг 11: CLI client для Phase 1 testing

Create `scripts/dev/zitadel-login.ts`:

```ts
import { Issuer } from 'openid-client'

async function login(email: string, password: string): Promise<string> {
  const issuer = await Issuer.discover('http://localhost:8081')
  const client = new issuer.Client({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
  })
  
  const tokenSet = await client.grant({
    grant_type: 'password',
    username: email,
    password,
    scope: 'openid profile email shell:read shell:write',
  })
  
  return tokenSet.access_token!
}

// CLI usage
login(process.argv[2], process.argv[3]).then(token => {
  console.log(`export JWT=${token}`)
})
```

```bash
eval $(pnpm tsx scripts/dev/zitadel-login.ts admin@daria.app Password1!)
echo $JWT  # should show token
```

## Checklist

- [ ] Zitadel running и отвечает /debug/ready
- [ ] Daria organization created
- [ ] 2+ projects created (shell, admin)
- [ ] Scopes registered
- [ ] Enrich-JWT action работает (claims появляются в JWT)
- [ ] Test user registered + logged in
- [ ] JWKS endpoint available
- [ ] OIDC discovery response valid

## Troubleshooting

### Zitadel takes forever to start
First boot includes schema migrations. 2 minutes normal. Check `docker logs daria-zitadel`.

### Invalid grant error on password
Zitadel requires client_credentials для password grant. Create service-account client first.

### JWKS не обновляется при key rotation
Cache 5 min default. Force refresh с `?nocache=true` или restart consumer.

## Next

Tuesday: Scopes + roles assignment via CI → `02-scopes-roles.md`.
