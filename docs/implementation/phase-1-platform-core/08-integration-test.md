# Phase 1 / Week 2 / Friday: End-to-end integration test

Цель: полный flow — register user → login → charge → wallet transfer → event chain → audit-log — всё работает.

## Acceptance scenarios

Test-script, которые должны passed до завершения Phase 1 Week 2.

## Scenario 1: New user registration + verified email

```bash
# Setup
export ZITADEL_URL=http://identity.daria.local
export GATEWAY_URL=https://daria.local

# 1. Register new user
RESPONSE=$(curl -sk -X POST $GATEWAY_URL/api/identity/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice-test-'"$(date +%s)"'@daria.app",
    "age": 30,
    "region": "EU",
    "preferredLanguage": "en"
  }')
USER_ID=$(echo $RESPONSE | jq -r .userId)
echo "User created: $USER_ID"

# 2. Check Mailhog for magic-link
sleep 2
LINK=$(curl -s http://localhost:8025/api/v2/messages?limit=1 | \
  jq -r '.items[0].Content.Body' | grep -oE 'https://[^ ]+auth/callback[^ ]+')
echo "Magic-link: $LINK"

# 3. Simulate click (headless fetch)
CALLBACK_RESULT=$(curl -sk "$LINK")

# 4. Verify user.kyc_level = 0
METADATA=$(curl -sk $ZITADEL_URL/management/v1/users/$USER_ID/metadata/kyc_level \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$METADATA" | jq -e '.metadata.value' || exit 1
```

**Expected events fired** (check `audit_events.events` table в ClickHouse):
- `app.daria.identity.user-registered.v1`
- `app.daria.identity.user-logged-in.v1` (after magic-link click)

## Scenario 2: Passkey registration + login

```bash
# Requires browser; use Playwright для automated test
cat > tests/integration/passkey.spec.ts <<EOF
import { test, expect } from '@playwright/test'

test('passkey registration + login flow', async ({ page, context }) => {
  // Enable virtual authenticator (WebAuthn mock)
  const cdpSession = await context.newCDPSession(page)
  await cdpSession.send('WebAuthn.enable')
  const { authenticatorId } = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  })

  // 1. Login via magic-link (to get session)
  await page.goto('https://daria.local/auth/login')
  await page.fill('[type=email]', 'alice-test@daria.app')
  await page.click('button:has-text("magic-link")')
  // ... click link из Mailhog

  // 2. Navigate to security settings
  await page.goto('https://daria.local/settings/security')
  
  // 3. Add passkey
  await page.click('button:has-text("Add passkey")')
  // Browser prompts auto-pass через virtual authenticator
  await expect(page.locator('text=Passkey added')).toBeVisible({ timeout: 5000 })

  // 4. Logout
  await page.click('button:has-text("Logout")')
  
  // 5. Login via passkey
  await page.fill('[type=email]', 'alice-test@daria.app')
  await page.click('button:has-text("Войти через passkey")')
  
  // 6. Should redirect to shell
  await expect(page).toHaveURL('https://daria.local/')
})
EOF

pnpm exec playwright test tests/integration/passkey.spec.ts
```

## Scenario 3: Charge → Wallet update → Royalty → Notifications

Self-contained test-script:

```typescript
// tests/integration/charge-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { v7 as uuidv7 } from 'uuid'

const GATEWAY = process.env.GATEWAY_URL ?? 'https://daria.local'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!

describe('Phase 1 integration: charge → wallet → royalty', () => {
  let aliceId: string
  let bobId: string   // author
  let templateId: string
  let aliceJwt: string

  beforeAll(async () => {
    // Setup: Create Alice (buyer), Bob (author)
    aliceId = await createTestUser('alice', 'EU', 30)
    bobId = await createTestUser('bob', 'EU', 35)
    
    // Bob publishes template
    templateId = await createTestTemplate(bobId, {
      licenseKind: 'Royalty-Fork',
      splitPolicy: {
        splits: [
          { party: 'author', share: 0.70 },
          { party: 'platform', share: 0.30 },
        ],
        forksLineageRule: 'none',
        minDistributionCents: 1,
        dustPolicy: 'platform-fee',
        currency: 'EUR',
      },
      priceCents: '1000',
      currency: 'EUR',
    })

    // Alice logs in
    aliceJwt = await loginTestUser('alice')

    // Ensure KYC L1 for Alice (required for purchase)
    await upgradeKyc(aliceId, 1)
  })

  it('Alice purchases template → all events flow', async () => {
    const idempotencyKey = uuidv7()

    // 1. Alice initiates purchase (via shell)
    const purchaseResponse = await fetch(`${GATEWAY}/api/patterns/v1/templates/${templateId}/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceJwt}`,
        'Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: 'test-method',
      }),
    })
    expect(purchaseResponse.status).toBe(201)
    const { chargeId } = await purchaseResponse.json()

    // 2. Wait for payment confirmation (PSP webhook в test stub)
    await waitForEvent('app.daria.payments.payment-confirmed.v1', { chargeId }, 10000)

    // 3. Verify wallet transfer
    await waitForEvent('app.daria.wallet.transfer-completed.v1', { 
      kind: 'royalty',
    }, 10000)

    // 4. Verify royalty distribution
    const distribution = await waitForEvent('app.daria.authorship.royalty-distributed.v1', {
      templateId,
      buyerId: aliceId,
    }, 10000)

    expect(distribution.data.amountDistributedCents).toBe('1000')
    
    const recipients = distribution.data.distribution
    const bobPart = recipients.find((r: any) => r.recipient === bobId && r.role === 'author')
    expect(bobPart?.amountCents).toBe('700')  // 70%
    
    const platformPart = recipients.find((r: any) => r.recipient === 'platform')
    expect(platformPart?.amountCents).toBe('300')  // 30%

    // 5. Verify notifications sent
    await waitForEvent('app.daria.notifications.sent.v1', { 
      userId: aliceId,
      type: 'purchase-confirmation',
    }, 5000)
    await waitForEvent('app.daria.notifications.sent.v1', {
      userId: bobId,
      type: 'royalty-received',
    }, 5000)

    // 6. Verify audit-log has all events
    const auditCount = await queryClickHouse(`
      SELECT count(*) 
      FROM audit_events.events 
      WHERE event_type LIKE 'app.daria.%' 
        AND event_id IN (SELECT id FROM ... WHERE trace_id = '${chargeId}')
    `)
    expect(auditCount).toBeGreaterThanOrEqual(5)

    // 7. Verify Bob's wallet balance increased
    const bobBalance = await getWalletBalance(bobId, 'EUR')
    expect(BigInt(bobBalance.availableCents)).toBeGreaterThanOrEqual(700n)
  })

  it('Refund flow — reverses everything', async () => {
    // Initiate refund
    const refundResponse = await fetch(`${GATEWAY}/api/payments/v1/charges/${chargeId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceJwt}`,
        'Idempotency-Key': uuidv7(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'user-requested' }),
    })
    expect(refundResponse.status).toBe(201)

    // Verify reversal events
    await waitForEvent('app.daria.payments.refund-completed.v1', { chargeId }, 10000)
    await waitForEvent('app.daria.authorship.reversal-completed.v1', { 
      originalPurchaseId: chargeId 
    }, 10000)

    // Bob's balance should be back to original
    const bobBalanceAfter = await getWalletBalance(bobId, 'EUR')
    expect(BigInt(bobBalanceAfter.availableCents)).toBe(0n)
  })
})

// Helpers
async function waitForEvent(
  eventType: string,
  matcher: Record<string, any>,
  timeoutMs: number,
): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const found = await queryClickHouse(`
      SELECT data
      FROM audit_events.events
      WHERE event_type = '${eventType}'
        ${Object.entries(matcher).map(([k, v]) => `AND data.${k} = '${v}'`).join(' ')}
      ORDER BY timestamp DESC
      LIMIT 1
    `)
    if (found?.length > 0) return found[0]
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Event ${eventType} not received within ${timeoutMs}ms`)
}

async function queryClickHouse(sql: string): Promise<any[]> {
  const response = await fetch('http://localhost:8123/?query=' + encodeURIComponent(sql + ' FORMAT JSONEachRow'))
  const text = await response.text()
  return text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
}
```

## Scenario 4: Load test

```bash
# k6 load test — baseline targets
cat > tests/load/baseline.js <<EOF
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp-up
    { duration: '5m', target: 50 },   // steady
    { duration: '1m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.01'],
  },
}

const USERS = __ENV.USER_TOKENS.split(',')

export default function () {
  const token = USERS[Math.floor(Math.random() * USERS.length)]
  
  // Read wallet balance (cached через gateway)
  const r1 = http.get('https://daria.local/api/wallet/v1/accounts', {
    headers: { Authorization: \`Bearer \${token}\` },
  })
  check(r1, { 'wallet 200': (r) => r.status === 200 })
  errorRate.add(r1.status !== 200)
  
  sleep(0.5)
  
  // Policy evaluate (должен быть fast)
  const r2 = http.post('https://daria.local/api/policy/v1/evaluate', JSON.stringify({
    user: { id: 'test', age: 30, roles: [], kyc: { level: 1 } },
    region: { code: 'EU', tz: 'UTC', language: 'en' },
    action: { type: 'card-type.access', resource: 'travel' },
    time: { utc: new Date().toISOString() },
  }), {
    headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
  })
  check(r2, {
    'policy 200': (r) => r.status === 200,
    'policy p99 < 10ms': (r) => r.timings.duration < 10,
  })
}
EOF

k6 run tests/load/baseline.js --env USER_TOKENS="$JWT1,$JWT2,$JWT3"
```

**Pass criteria:**
- p95 < 1000ms
- p99 < 2000ms
- Error rate < 1%
- Policy evaluate p99 < 10ms
- No SEV-1 alerts fired during test

## Scenario 5: Chaos test (optional — Phase 6+)

```bash
# Kill random pod during load test
chaosmesh apply -f tests/chaos/random-pod-kill.yaml
# Verify: no user-facing errors > 1%, auto-recovery within 30s
```

## Test infrastructure

`packages/testing/integration/setup.ts`:

```typescript
import { execSync } from 'child_process'
import { Client } from 'pg'
import { connect } from 'nats'

export async function setupIntegrationEnv() {
  // 1. Ensure docker-compose up
  execSync('cd platform/docker-compose && docker compose up -d', { stdio: 'inherit' })
  
  // 2. Wait для healthchecks
  await waitHealthy([
    'http://identity.daria.local/health/ready',
    'http://wallet.daria.local/health/ready',
    'http://payments.daria.local/health/ready',
    'http://authorship-registry.internal:8080/health/ready',
  ], 60_000)
  
  // 3. Seed DBs
  execSync('pnpm -F @daria/service-wallet db:migrate')
  execSync('pnpm -F @daria/service-payments db:migrate')
  execSync('pnpm -F @daria/service-authorship-registry db:migrate')
  
  // 4. Ensure NATS streams
  execSync('pnpm -F @daria/events ensure-streams')
  
  // 5. Register test service accounts
  await registerTestServiceAccounts()
}

export async function teardownIntegrationEnv() {
  execSync('cd platform/docker-compose && docker compose down -v', { stdio: 'inherit' })
}
```

## Run integration tests

```bash
# Full integration suite
pnpm run test:integration

# Specific scenario
pnpm vitest run tests/integration/charge-flow.test.ts

# Playwright
pnpm exec playwright test tests/integration/

# Load test
k6 run tests/load/baseline.js
```

## Checklist — Week 2 completion

- [ ] New user registration + email verify works end-to-end
- [ ] Passkey registration + login (Playwright)
- [ ] Charge → wallet transfer → royalty → notifications → audit (all events fire)
- [ ] Refund reverses entire chain
- [ ] Load test baseline p95 < 1s, p99 < 2s, errors < 1%
- [ ] Policy-engine p99 < 10ms under load
- [ ] No SEV-1 alerts during test runs
- [ ] CI pipeline runs integration suite (nightly)

## Next

Phase 1 Week 3 Mon: wallet service deep-dive → `09-wallet-implementation.md`.
