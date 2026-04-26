/**
 * Unit tests for host-session provision logic (v2 project-agent topology).
 *
 * One agent per (hostname × cwd × ownerUserId); one run per sessionId.
 * Tests idempotency, isolation, auth, and run lifecycle without a live DB.
 */

import { randomUUID, timingSafeEqual } from 'node:crypto'
import { strict as assert } from 'node:assert'

// ---------------------------------------------------------------------------
// Inline port of verifyBridgeToken
// ---------------------------------------------------------------------------

function verifyBridgeToken(authHeader: string | undefined, expected: string): boolean {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !expected) return false
  const tBuf = Buffer.from(token)
  const eBuf = Buffer.from(expected)
  if (tBuf.length !== eBuf.length) return false
  return timingSafeEqual(tBuf, eBuf)
}

// ---------------------------------------------------------------------------
// Inline port of cwd validation
// ---------------------------------------------------------------------------

function validateCwd(cwd: string): boolean {
  return cwd.startsWith('/') && !cwd.includes('..')
}

function deriveProjectKey(cwd: string): string {
  return cwd.split('/').filter(Boolean).pop() ?? 'home'
}

// ---------------------------------------------------------------------------
// Minimal in-memory DB types
// ---------------------------------------------------------------------------

type AgentRow = {
  id: string
  ownerUserId: string
  name: string
  ingestToken: string
  projectId: string | null
  config: { type: string; hostname: string; cwd: string; projectKey: string; createdBy: string }
  deletedAt: null | Date
}

type ConvRow = {
  id: string
  kind: string
  userAId: string
  policy: Record<string, unknown>
  deletedAt: null | Date
}

type RunRow = {
  id: string
  agentId: string
  conversationId: string
  rootRunId: string
  status: string
  prompt: string | null
  sessionMetadata: {
    sessionId: string
    cwd: string
    hostname: string
    gitBranch: string | null
    sessionVersion: string | null
    sessionStartedAt: string | null
  }
  startedAt: Date | null
  finishedAt: Date | null
  deletedAt: null | Date
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Inline port of provision logic (v2)
// ---------------------------------------------------------------------------

type ProjectRowLite = {
  id: string
  ownerUserId: string
  deletedAt: null | Date
}

type Store = {
  agents: AgentRow[]
  convs: ConvRow[]
  runs: RunRow[]
  projects: ProjectRowLite[]
  projectsMap: Record<string, string>
}

function makeStore(): Store {
  return { agents: [], convs: [], runs: [], projects: [], projectsMap: {} }
}

type ProvisionInput = {
  sessionId: string
  cwd: string
  hostname: string
  gitBranch?: string
  sessionVersion?: string
  sessionStartedAt?: string
  ownerUserId: string
}

type ProvisionResult = {
  agentId: string
  conversationId: string
  runId: string
  ingestToken: string
}

// Mirror of host-session-handler resolution: look up the mapping, then verify
// the project exists, is owned by the host-bridge owner, and isn't soft-deleted.
function resolveMappedProjectId(
  store: Store,
  cwd: string,
  ownerUserId: string,
): string | null {
  const mapped = store.projectsMap[cwd] ?? null
  if (!mapped) return null
  const project = store.projects.find(
    (p) => p.id === mapped && p.ownerUserId === ownerUserId && p.deletedAt === null,
  )
  return project ? project.id : null
}

async function provisionLogic(store: Store, input: ProvisionInput): Promise<ProvisionResult> {
  const { sessionId, cwd, hostname, gitBranch, sessionVersion, sessionStartedAt, ownerUserId } = input
  const projectKey = deriveProjectKey(cwd)
  const messengerProjectId = resolveMappedProjectId(store, cwd, ownerUserId)

  // Lookup or create project-agent (one per hostname × cwd × ownerUserId)
  let agent = store.agents.find(
    (a) =>
      a.config.type === 'host-session' &&
      a.config.hostname === hostname &&
      a.config.cwd === cwd &&
      a.ownerUserId === ownerUserId &&
      a.deletedAt === null,
  ) ?? null

  let conversationId: string

  if (agent) {
    // Bridge bootstrap: bind only when current projectId is null.
    if (messengerProjectId && agent.projectId === null) {
      agent.projectId = messengerProjectId
    }
    const conv = store.convs.find(
      (c) =>
        c.kind === 'agent' &&
        c.userAId === ownerUserId &&
        (c.policy as Record<string, string>)._agentId === agent!.id &&
        c.deletedAt === null,
    )!
    conversationId = conv.id
  } else {
    const agentId = randomUUID()
    const ingestToken = randomUUID()
    agent = {
      id: agentId,
      ownerUserId,
      name: `${hostname}:${projectKey}`,
      ingestToken,
      projectId: messengerProjectId,
      config: { type: 'host-session', hostname, cwd, projectKey, createdBy: 'host-bridge' },
      deletedAt: null,
    }
    store.agents.push(agent)

    conversationId = randomUUID()
    store.convs.push({
      id: conversationId,
      kind: 'agent',
      userAId: ownerUserId,
      policy: { _agentId: agentId },
      deletedAt: null,
    })
  }

  const agentId = agent.id
  const ingestToken = agent.ingestToken

  // Idempotent run: reuse running run for this sessionId
  const existingRun = store.runs.find(
    (r) =>
      r.agentId === agentId &&
      r.status === 'running' &&
      r.sessionMetadata.sessionId === sessionId &&
      r.deletedAt === null,
  ) ?? null

  if (existingRun) {
    return { agentId, conversationId, runId: existingRun.id, ingestToken }
  }

  const runId = randomUUID()
  const gitSuffix = gitBranch ? `@${gitBranch}` : ''
  store.runs.push({
    id: runId,
    agentId,
    conversationId,
    rootRunId: runId,
    status: 'running',
    prompt: `Session ${sessionId.slice(0, 8)} @ ${cwd}${gitSuffix}`,
    sessionMetadata: {
      sessionId,
      cwd,
      hostname,
      gitBranch: gitBranch ?? null,
      sessionVersion: sessionVersion ?? null,
      sessionStartedAt: sessionStartedAt ?? null,
    },
    startedAt: new Date(),
    finishedAt: null,
    deletedAt: null,
    createdAt: new Date(),
  })

  return { agentId, conversationId, runId, ingestToken }
}

async function completeLogic(
  store: Store,
  runId: string,
): Promise<{ ok: boolean; runId?: string; note?: string }> {
  const run = store.runs.find((r) => r.id === runId && r.deletedAt === null) ?? null
  if (!run) return { ok: false }
  if (run.status === 'completed' || run.status === 'failed') {
    return { ok: true, note: 'already terminal' }
  }
  run.status = 'completed'
  run.finishedAt = new Date()
  return { ok: true, runId: run.id }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testAuthVerification() {
  const secret = 'a'.repeat(32)

  assert.ok(verifyBridgeToken(`Bearer ${secret}`, secret), 'valid token must pass')
  assert.ok(!verifyBridgeToken(undefined, secret), 'missing header must fail')
  assert.ok(!verifyBridgeToken('', secret), 'empty header must fail')
  assert.ok(!verifyBridgeToken('Bearer wrongtoken12345678901234567', secret), 'wrong token must fail')
  assert.ok(!verifyBridgeToken(`Bearer ${secret}x`, secret), 'token with extra char must fail')
  assert.ok(!verifyBridgeToken(`Bearer ${secret.slice(0, -1)}`, secret), 'short token must fail')
  assert.ok(!verifyBridgeToken(`Token ${secret}`, secret), 'wrong scheme must fail')
}

async function testCwdValidation() {
  assert.ok(validateCwd('/home/user/project'), 'absolute path valid')
  assert.ok(validateCwd('/'), 'root valid')
  assert.ok(!validateCwd('relative/path'), 'relative path invalid')
  assert.ok(!validateCwd('/home/../etc'), 'path with .. invalid')
  assert.ok(!validateCwd('..'), 'bare .. invalid')
}

async function testProjectKeyExtraction() {
  assert.equal(deriveProjectKey('/home/claudecode/daria'), 'daria')
  assert.equal(deriveProjectKey('/home/claudecode'), 'claudecode')
  assert.equal(deriveProjectKey('/'), 'home')
}

async function testNewProvisionCreatesOneAgentOneConvOneRun() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/project',
    hostname: 'server1',
    ownerUserId,
  })

  assert.equal(store.agents.length, 1)
  assert.equal(store.convs.length, 1)
  assert.equal(store.runs.length, 1)
  assert.ok(result.agentId)
  assert.ok(result.conversationId)
  assert.ok(result.runId)
  assert.ok(result.ingestToken)
  assert.equal(store.runs[0].status, 'running')
}

async function testAgentNameContainsHostnameAndProjectKey() {
  const store = makeStore()

  await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/claudecode/daria',
    hostname: 'daria-dev',
    ownerUserId: randomUUID(),
  })

  assert.equal(store.agents[0].name, 'daria-dev:daria')
}

async function testSameSessionIdIsIdempotent() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId, cwd: '/home/user/proj', hostname: 'h1', ownerUserId })
  const r2 = await provisionLogic(store, { sessionId, cwd: '/home/user/proj', hostname: 'h1', ownerUserId })

  assert.equal(r1.agentId, r2.agentId, 'agentId stable')
  assert.equal(r1.conversationId, r2.conversationId, 'conversationId stable')
  assert.equal(r1.runId, r2.runId, 'runId reused while running')
  assert.equal(r1.ingestToken, r2.ingestToken, 'ingestToken stable')

  assert.equal(store.agents.length, 1, 'no duplicate agents')
  assert.equal(store.convs.length, 1, 'no duplicate convs')
  assert.equal(store.runs.length, 1, 'no duplicate runs')
}

async function testDifferentSessionsSameHostCwdShareAgent() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'h1',
    ownerUserId,
  })
  const r2 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'h1',
    ownerUserId,
  })

  assert.equal(r1.agentId, r2.agentId, 'same agent for same host+cwd')
  assert.equal(r1.conversationId, r2.conversationId, 'same conversation')
  assert.notEqual(r1.runId, r2.runId, 'different run per session')

  assert.equal(store.agents.length, 1, 'one project-agent')
  assert.equal(store.convs.length, 1, 'one conversation')
  assert.equal(store.runs.length, 2, 'two runs')
}

async function testDifferentCwdGetDifferentAgents() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj1',
    hostname: 'h1',
    ownerUserId,
  })
  const r2 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj2',
    hostname: 'h1',
    ownerUserId,
  })

  assert.notEqual(r1.agentId, r2.agentId, 'different cwd → different agent')
  assert.equal(store.agents.length, 2)
}

async function testDifferentHostnameSameCwdGetDifferentAgents() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'host-a',
    ownerUserId,
  })
  const r2 = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'host-b',
    ownerUserId,
  })

  assert.notEqual(r1.agentId, r2.agentId, 'different hostname → different agent')
  assert.equal(store.agents.length, 2)
}

async function testNewRunCreatedAfterPreviousCompleted() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const cwd = '/home/user/proj'
  const hostname = 'h1'

  const r1 = await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })

  // Mark first run completed
  store.runs.find((r) => r.id === r1.runId)!.status = 'completed'

  // New session on same project-agent should get a new run
  const r2 = await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })

  assert.equal(r1.agentId, r2.agentId, 'agentId unchanged')
  assert.notEqual(r1.runId, r2.runId, 'new run after completion')
  assert.equal(store.runs.length, 2)
  assert.equal(store.runs[1].status, 'running')
}

async function testCompleteByRunId() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const { runId } = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'h1',
    ownerUserId,
  })

  const res = await completeLogic(store, runId)
  assert.ok(res.ok)
  assert.equal(res.runId, runId)

  const run = store.runs.find((r) => r.id === runId)!
  assert.equal(run.status, 'completed')
  assert.ok(run.finishedAt instanceof Date)
}

async function testCompleteUnknownRunIdReturnsFalse() {
  const store = makeStore()
  const res = await completeLogic(store, randomUUID())
  assert.equal(res.ok, false)
}

async function testCompleteAlreadyTerminalIsNoop() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const { runId } = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/proj',
    hostname: 'h1',
    ownerUserId,
  })

  await completeLogic(store, runId)
  const res = await completeLogic(store, runId)
  assert.ok(res.ok)
  assert.equal(res.note, 'already terminal')
}

async function testSessionMetadataStoredOnRun() {
  const store = makeStore()
  const sessionId = randomUUID()

  await provisionLogic(store, {
    sessionId,
    cwd: '/home/user/proj',
    hostname: 'h1',
    gitBranch: 'feature/x',
    sessionVersion: '1.2.3',
    sessionStartedAt: '2026-04-25T10:00:00Z',
    ownerUserId: randomUUID(),
  })

  const run = store.runs[0]
  assert.equal(run.sessionMetadata.sessionId, sessionId)
  assert.equal(run.sessionMetadata.cwd, '/home/user/proj')
  assert.equal(run.sessionMetadata.hostname, 'h1')
  assert.equal(run.sessionMetadata.gitBranch, 'feature/x')
  assert.equal(run.sessionMetadata.sessionVersion, '1.2.3')
  assert.equal(run.sessionMetadata.sessionStartedAt, '2026-04-25T10:00:00Z')
}

// ---------------------------------------------------------------------------
// Inline port of active-runs query logic
// ---------------------------------------------------------------------------

function activeRunsLogic(store: Store, ownerUserId: string) {
  return store.runs
    .filter((r) => {
      const agent = store.agents.find((a) => a.id === r.agentId && a.deletedAt === null)
      return (
        r.status === 'running' &&
        r.deletedAt === null &&
        agent !== undefined &&
        agent.config.type === 'host-session' &&
        agent.ownerUserId === ownerUserId
      )
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100)
    .map((r) => ({
      id: r.id,
      agentId: r.agentId,
      sessionId: r.sessionMetadata.sessionId,
      cwd: r.sessionMetadata.cwd,
    }))
}

async function testActiveRunsReturnsRunningHostSessionRuns() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId })
  const r2 = await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p2', hostname: 'h1', ownerUserId })

  const result = activeRunsLogic(store, ownerUserId)

  assert.equal(result.length, 2, 'both running runs returned')
  const ids = result.map((r) => r.id)
  assert.ok(ids.includes(r1.runId), 'run1 included')
  assert.ok(ids.includes(r2.runId), 'run2 included')
}

async function testActiveRunsExcludesCompletedRuns() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const { runId } = await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId })
  await completeLogic(store, runId)
  await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId })

  const result = activeRunsLogic(store, ownerUserId)
  assert.equal(result.length, 1, 'only the running run returned')
  assert.notEqual(result[0]!.id, runId, 'completed run excluded')
}

async function testActiveRunsExcludesOtherOwner() {
  const store = makeStore()
  const owner1 = randomUUID()
  const owner2 = randomUUID()

  await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId: owner1 })
  await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId: owner2 })

  const result1 = activeRunsLogic(store, owner1)
  const result2 = activeRunsLogic(store, owner2)

  assert.equal(result1.length, 1, 'owner1 sees only their run')
  assert.equal(result2.length, 1, 'owner2 sees only their run')
  assert.notEqual(result1[0]!.id, result2[0]!.id, 'different runs for different owners')
}

// ---------------------------------------------------------------------------
// Bridge-projects mapping (W4): cwd → projectId binding on provision
// ---------------------------------------------------------------------------

async function testProvisionBindsProjectIdWhenMappingPresent() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const projectId = randomUUID()
  const cwd = '/home/claudecode/daria'

  store.projects.push({ id: projectId, ownerUserId, deletedAt: null })
  store.projectsMap = { [cwd]: projectId }

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd,
    hostname: 'daria-dev',
    ownerUserId,
  })

  const agent = store.agents.find((a) => a.id === result.agentId)!
  assert.equal(agent.projectId, projectId, 'projectId bound from mapping')
}

async function testProvisionFallsBackToNullWithoutMapping() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd: '/home/user/unmapped',
    hostname: 'h1',
    ownerUserId,
  })

  const agent = store.agents.find((a) => a.id === result.agentId)!
  assert.equal(agent.projectId, null, 'no mapping → projectId stays null (legacy behavior)')
}

async function testProvisionFallsBackToNullWhenMappedProjectMissing() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const cwd = '/home/user/proj'

  // Mapping points to a project that doesn't exist in DB (e.g. it was deleted).
  store.projectsMap = { [cwd]: randomUUID() }

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd,
    hostname: 'h1',
    ownerUserId,
  })

  const agent = store.agents.find((a) => a.id === result.agentId)!
  assert.equal(agent.projectId, null, 'unknown project → projectId null, no error thrown')
}

async function testProvisionFallsBackToNullWhenMappedProjectSoftDeleted() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const projectId = randomUUID()
  const cwd = '/home/user/proj'

  store.projects.push({ id: projectId, ownerUserId, deletedAt: new Date() })
  store.projectsMap = { [cwd]: projectId }

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd,
    hostname: 'h1',
    ownerUserId,
  })

  const agent = store.agents.find((a) => a.id === result.agentId)!
  assert.equal(agent.projectId, null, 'soft-deleted project rejected by ownership/deleted_at filter')
}

async function testProvisionFallsBackToNullWhenMappedProjectOwnedByDifferentUser() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const otherOwner = randomUUID()
  const projectId = randomUUID()
  const cwd = '/home/user/proj'

  store.projects.push({ id: projectId, ownerUserId: otherOwner, deletedAt: null })
  store.projectsMap = { [cwd]: projectId }

  const result = await provisionLogic(store, {
    sessionId: randomUUID(),
    cwd,
    hostname: 'h1',
    ownerUserId,
  })

  const agent = store.agents.find((a) => a.id === result.agentId)!
  assert.equal(agent.projectId, null, 'cross-owner project mapping is ignored')
}

async function testExistingAgentWithNullProjectIdGetsBoundOnNextProvision() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const projectId = randomUUID()
  const cwd = '/home/user/proj'
  const hostname = 'h1'

  // First provision happens BEFORE the operator adds the mapping.
  const r1 = await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })
  assert.equal(store.agents[0].projectId, null, 'agent created without projectId')

  // Operator adds the mapping and the project is verifiable.
  store.projects.push({ id: projectId, ownerUserId, deletedAt: null })
  store.projectsMap = { [cwd]: projectId }

  // Second provision picks up the mapping idempotently.
  const r2 = await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })

  assert.equal(r1.agentId, r2.agentId, 'same agent reused across provisions')
  assert.equal(store.agents[0].projectId, projectId, 'projectId backfilled on next provision')
}

async function testExistingAgentWithProjectIdSetIsNotOverridden() {
  const store = makeStore()
  const ownerUserId = randomUUID()
  const manualProjectId = randomUUID()
  const mappedProjectId = randomUUID()
  const cwd = '/home/user/proj'
  const hostname = 'h1'

  // Both projects exist in DB; one is set manually on the agent, the other is
  // in the bridge mapping. The bridge MUST NOT override the manual value.
  store.projects.push(
    { id: manualProjectId, ownerUserId, deletedAt: null },
    { id: mappedProjectId, ownerUserId, deletedAt: null },
  )

  // Seed an agent whose projectId was set manually (e.g. via admin UI).
  await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })
  store.agents[0].projectId = manualProjectId

  // Operator adds a conflicting mapping and re-provisions.
  store.projectsMap = { [cwd]: mappedProjectId }
  await provisionLogic(store, { sessionId: randomUUID(), cwd, hostname, ownerUserId })

  assert.equal(
    store.agents[0].projectId,
    manualProjectId,
    'manually-set projectId must not be overridden by bridge mapping',
  )
}

async function testActiveRunsOrderedByCreatedAtDesc() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p1', hostname: 'h1', ownerUserId })
  // Advance createdAt for second run
  store.runs.find((r) => r.id === r1.runId)!.createdAt = new Date(Date.now() - 1000)
  const r2 = await provisionLogic(store, { sessionId: randomUUID(), cwd: '/home/user/p2', hostname: 'h1', ownerUserId })

  const result = activeRunsLogic(store, ownerUserId)
  assert.equal(result[0]!.id, r2.runId, 'most recent run first')
  assert.equal(result[1]!.id, r1.runId, 'older run second')
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  const tests = [
    testAuthVerification,
    testCwdValidation,
    testProjectKeyExtraction,
    testNewProvisionCreatesOneAgentOneConvOneRun,
    testAgentNameContainsHostnameAndProjectKey,
    testSameSessionIdIsIdempotent,
    testDifferentSessionsSameHostCwdShareAgent,
    testDifferentCwdGetDifferentAgents,
    testDifferentHostnameSameCwdGetDifferentAgents,
    testNewRunCreatedAfterPreviousCompleted,
    testCompleteByRunId,
    testCompleteUnknownRunIdReturnsFalse,
    testCompleteAlreadyTerminalIsNoop,
    testSessionMetadataStoredOnRun,
    testActiveRunsReturnsRunningHostSessionRuns,
    testActiveRunsExcludesCompletedRuns,
    testActiveRunsExcludesOtherOwner,
    testActiveRunsOrderedByCreatedAtDesc,
    testProvisionBindsProjectIdWhenMappingPresent,
    testProvisionFallsBackToNullWithoutMapping,
    testProvisionFallsBackToNullWhenMappedProjectMissing,
    testProvisionFallsBackToNullWhenMappedProjectSoftDeleted,
    testProvisionFallsBackToNullWhenMappedProjectOwnedByDifferentUser,
    testExistingAgentWithNullProjectIdGetsBoundOnNextProvision,
    testExistingAgentWithProjectIdSetIsNotOverridden,
  ]

  let passed = 0
  for (const test of tests) {
    try {
      await test()
      console.log(`PASS: ${test.name}`)
      passed++
    } catch (err) {
      console.error(`FAIL: ${test.name}`)
      console.error(err)
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`)
  if (passed < tests.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
