import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.MESSENGER_CORE_DATA_DIR = mkdtempSync(join(tmpdir(), 'messenger-router-smoke-'))
mkdirSync(join(process.env.MESSENGER_CORE_DATA_DIR, 'uploads'), { recursive: true })
process.env.MESSENGER_CORE_AUTH_SECRET = 'RouterSmokeSecret1234567890'
process.env.MESSENGER_AGENT_CLI_ENABLED = 'false'
process.env.MESSENGER_AGENT_API_KEY = ''
process.env.MESSENGER_AGENT_ALLOW_NO_KEY = 'false'

const { createMessengerServer } = await import('../src/server.ts')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const app = await createMessengerServer()
const origin = 'http://localhost'

async function inject(options: Parameters<typeof app.inject>[0]) {
  return app.inject({
    ...options,
    headers: {
      origin,
      ...(options.headers || {}),
    },
  })
}

async function register(login: string) {
  const response = await inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      login,
      password: 'SmokePass1',
      displayName: login,
    },
  })

  assert(response.statusCode === 200, `register ${login} failed: ${response.statusCode} ${response.body}`)
  return response.json() as { token: string; user: { id: string } }
}

try {
  const noAuth = await inject({ method: 'GET', url: '/agent-router/profiles' })
  assert(noAuth.statusCode === 401, `expected 401 without auth, got ${noAuth.statusCode}`)

  const admin = await register('admin')
  const user = await register('worker')
  const adminHeaders = { authorization: `Bearer ${admin.token}` }
  const userHeaders = { authorization: `Bearer ${user.token}` }

  const nonAdmin = await inject({
    method: 'GET',
    url: '/agent-router/profiles',
    headers: userHeaders,
  })
  assert(nonAdmin.statusCode === 403, `expected 403 for non-admin, got ${nonAdmin.statusCode}`)

  const planPayload = {
    scope: 'DB auth/security migration for router smoke',
    changedFiles: ['server/db/schema.ts', 'messenger/core/src/auth.ts'],
    requestedActions: ['db-migration'],
    dataClasses: ['credentials'],
    environment: 'dev',
    tenantKey: 'smoke-tenant',
    projectId: 'smoke-project',
    idempotencyKey: 'plan-smoke-0001',
  }
  const planResponse = await inject({
    method: 'POST',
    url: '/agent-router/plan',
    headers: adminHeaders,
    payload: planPayload,
  })
  const planJson = planResponse.json() as {
    plan?: {
      profileVersion?: string
      policyVersion?: string
      profile?: { id?: string }
      policy?: { riskTier?: string; externalModelAllowed?: boolean }
    }
    audit?: { planId?: string; planHash?: string }
  }
  assert(planResponse.statusCode === 200, `expected plan 200, got ${planResponse.statusCode}`)
  assert(Boolean(planJson.audit?.planId && planJson.audit?.planHash), 'expected plan audit id/hash')
  assert(Boolean(planJson.plan?.profileVersion && planJson.plan?.policyVersion), 'expected plan versions')
  assert(planJson.plan?.profile?.id === 'security-privacy', `expected security-privacy plan, got ${planJson.plan?.profile?.id}`)
  assert(planJson.plan?.policy?.externalModelAllowed === false, 'expected credentials to block external model')

  const runPayload = {
    ...planPayload,
    idempotencyKey: 'run-smoke-0001',
    runActions: ['inspect-current-state'],
  }
  const blockedRun = await inject({
    method: 'POST',
    url: '/agent-router/runs',
    headers: adminHeaders,
    payload: runPayload,
  })
  const blockedJson = blockedRun.json() as {
    error?: string
    run?: { runId?: string; status?: string }
  }
  assert(blockedRun.statusCode === 409, `expected blocked run 409, got ${blockedRun.statusCode}`)
  assert(blockedJson.error === 'BLOCKED_BY_GATE', `expected BLOCKED_BY_GATE, got ${blockedJson.error}`)
  assert(blockedJson.run?.status === 'blocked', `expected blocked status, got ${blockedJson.run?.status}`)
  assert(Boolean(blockedJson.run?.runId), 'expected blocked run id')

  const reusedRun = await inject({
    method: 'POST',
    url: '/agent-router/runs',
    headers: adminHeaders,
    payload: runPayload,
  })
  const reusedJson = reusedRun.json() as { reused?: boolean; run?: { runId?: string } }
  assert(reusedRun.statusCode === 200, `expected reused run 200, got ${reusedRun.statusCode}`)
  assert(reusedJson.reused === true, 'expected reused run')
  assert(reusedJson.run?.runId === blockedJson.run?.runId, 'expected same run for idempotency key')

  const approve = await inject({
    method: 'POST',
    url: `/agent-router/runs/${blockedJson.run!.runId}/approve`,
    headers: adminHeaders,
    payload: {
      gateIds: ['human-approval'],
      note: 'smoke approval',
    },
  })
  assert(approve.statusCode === 200, `expected approve 200, got ${approve.statusCode}`)

  const cancel = await inject({
    method: 'POST',
    url: `/agent-router/runs/${blockedJson.run!.runId}/cancel`,
    headers: adminHeaders,
    payload: {
      reason: 'smoke complete',
    },
  })
  assert(cancel.statusCode === 200, `expected cancel 200, got ${cancel.statusCode}`)

  const successRun = await inject({
    method: 'POST',
    url: '/agent-router/runs',
    headers: adminHeaders,
    payload: {
      profile: 'docs-rewrite',
      scope: 'docs router success smoke',
      changedFiles: ['docs/architecture-v5/INDEX.md'],
      requestedActions: ['draft-plan'],
      dataClasses: ['internal'],
      idempotencyKey: 'run-smoke-success-0001',
      runActions: ['inspect-current-state', 'prepare-report'],
    },
  })
  const successJson = successRun.json() as { run?: { status?: string } }
  assert(successRun.statusCode === 200, `expected success run 200, got ${successRun.statusCode}`)
  assert(successJson.run?.status === 'succeeded', `expected succeeded safe run, got ${successJson.run?.status}`)

  console.log(JSON.stringify({
    ok: true,
    dataDir: process.env.MESSENGER_CORE_DATA_DIR,
    checked: ['401', '403', 'plan-audit-version', 'blocked-run', 'idempotency', 'approve', 'cancel', 'safe-run'],
  }, null, 2))
} finally {
  await app.close().catch(() => {})
}

process.exit(0)
