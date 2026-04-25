/**
 * Unit tests for host-session provision logic.
 *
 * Tests the core lookup-or-create idempotency, auth, and run lifecycle
 * without a live DB. Logic is inlined (same approach as agent-run-store.test.ts).
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
// Minimal in-memory DB types
// ---------------------------------------------------------------------------

type AgentRow = {
  id: string
  ownerUserId: string
  name: string
  ingestToken: string
  config: Record<string, string>
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
  startedAt: Date | null
  finishedAt: Date | null
  deletedAt: null | Date
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Inline port of provision logic
// ---------------------------------------------------------------------------

type Store = {
  agents: AgentRow[]
  convs: ConvRow[]
  runs: RunRow[]
}

function makeStore(): Store {
  return { agents: [], convs: [], runs: [] }
}

async function provisionLogic(
  store: Store,
  input: { sessionId: string; ownerUserId: string },
): Promise<{ agentId: string; conversationId: string; runId: string; ingestToken: string }> {
  const { sessionId, ownerUserId } = input

  const existingAgent = store.agents.find(
    (a) =>
      a.config.sessionId === sessionId &&
      a.config.type === 'host-session' &&
      a.deletedAt === null,
  ) ?? null

  if (existingAgent) {
    const existingConv = store.convs.find(
      (c) =>
        c.kind === 'agent' &&
        c.userAId === ownerUserId &&
        (c.policy as Record<string, string>)._agentId === existingAgent.id &&
        c.deletedAt === null,
    )!

    const allRuns = store.runs
      .filter((r) => r.agentId === existingAgent.id && r.deletedAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const latestRun = allRuns[0] ?? null

    let runId: string
    if (latestRun && latestRun.status === 'running') {
      runId = latestRun.id
    } else {
      runId = randomUUID()
      store.runs.push({
        id: runId,
        agentId: existingAgent.id,
        conversationId: existingConv.id,
        rootRunId: runId,
        status: 'running',
        prompt: `host session ${sessionId}`,
        startedAt: new Date(),
        finishedAt: null,
        deletedAt: null,
        createdAt: new Date(),
      })
    }

    return {
      agentId: existingAgent.id,
      conversationId: existingConv.id,
      runId,
      ingestToken: existingAgent.ingestToken,
    }
  }

  // Create agent + conv + run
  const agentId = randomUUID()
  const ingestToken = randomUUID()
  const now = new Date()

  store.agents.push({
    id: agentId,
    ownerUserId,
    name: `Host Session ${sessionId.slice(0, 8)}`,
    ingestToken,
    config: { type: 'host-session', sessionId, host: 'testhost' },
    deletedAt: null,
  })

  const convId = randomUUID()
  store.convs.push({
    id: convId,
    kind: 'agent',
    userAId: ownerUserId,
    policy: { _agentId: agentId },
    deletedAt: null,
  })

  const runId = randomUUID()
  store.runs.push({
    id: runId,
    agentId,
    conversationId: convId,
    rootRunId: runId,
    status: 'running',
    prompt: `host session ${sessionId}`,
    startedAt: now,
    finishedAt: null,
    deletedAt: null,
    createdAt: now,
  })

  return { agentId, conversationId: convId, runId, ingestToken }
}

async function completeLogic(
  store: Store,
  sessionId: string,
): Promise<{ ok: boolean; runId?: string; note?: string }> {
  const agent = store.agents.find(
    (a) =>
      a.config.sessionId === sessionId &&
      a.config.type === 'host-session' &&
      a.deletedAt === null,
  ) ?? null

  if (!agent) return { ok: false }

  const runningRun = store.runs
    .filter(
      (r) =>
        r.agentId === agent.id &&
        (r.status === 'running' || r.status === 'pending') &&
        r.deletedAt === null,
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null

  if (!runningRun) return { ok: true, note: 'no active run' }

  runningRun.status = 'completed'
  runningRun.finishedAt = new Date()
  return { ok: true, runId: runningRun.id }
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

async function testNewSessionCreatesOneRowEach() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  const result = await provisionLogic(store, { sessionId, ownerUserId })

  assert.equal(store.agents.length, 1, 'one agent row created')
  assert.equal(store.convs.length, 1, 'one conversation row created')
  assert.equal(store.runs.length, 1, 'one run row created')

  assert.ok(result.agentId)
  assert.ok(result.conversationId)
  assert.ok(result.runId)
  assert.ok(result.ingestToken)

  assert.equal(store.runs[0].status, 'running', 'run is in running state')
}

async function testSameSessionIdIsIdempotent() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId, ownerUserId })
  const r2 = await provisionLogic(store, { sessionId, ownerUserId })

  assert.equal(r1.agentId, r2.agentId, 'agentId must be stable across calls')
  assert.equal(r1.conversationId, r2.conversationId, 'conversationId must be stable across calls')
  assert.equal(r1.runId, r2.runId, 'runId must be reused when run is still running')
  assert.equal(r1.ingestToken, r2.ingestToken, 'ingestToken must be stable')

  assert.equal(store.agents.length, 1, 'no duplicate agent rows')
  assert.equal(store.convs.length, 1, 'no duplicate conversation rows')
  assert.equal(store.runs.length, 1, 'no duplicate run rows when run is still running')
}

async function testDifferentSessionIdsAreIndependent() {
  const store = makeStore()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId: randomUUID(), ownerUserId })
  const r2 = await provisionLogic(store, { sessionId: randomUUID(), ownerUserId })

  assert.notEqual(r1.agentId, r2.agentId, 'different sessions get different agents')
  assert.notEqual(r1.conversationId, r2.conversationId, 'different sessions get different conversations')
  assert.equal(store.agents.length, 2, 'two agent rows')
  assert.equal(store.convs.length, 2, 'two conversation rows')
  assert.equal(store.runs.length, 2, 'two run rows')
}

async function testNewRunCreatedWhenPreviousCompleted() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  const r1 = await provisionLogic(store, { sessionId, ownerUserId })

  // Mark run completed
  store.runs.find((r) => r.id === r1.runId)!.status = 'completed'

  const r2 = await provisionLogic(store, { sessionId, ownerUserId })

  assert.equal(r1.agentId, r2.agentId, 'agentId unchanged')
  assert.notEqual(r1.runId, r2.runId, 'new run created after completion')
  assert.equal(store.runs.length, 2, 'second run row created')
  assert.equal(store.runs[1].status, 'running', 'new run is running')
}

async function testCompleteMarksRunCompleted() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  const { runId } = await provisionLogic(store, { sessionId, ownerUserId })
  const res = await completeLogic(store, sessionId)

  assert.ok(res.ok)
  assert.equal(res.runId, runId)
  const run = store.runs.find((r) => r.id === runId)!
  assert.equal(run.status, 'completed')
  assert.ok(run.finishedAt instanceof Date)
}

async function testCompleteUnknownSessionReturnsNotFound() {
  const store = makeStore()
  const res = await completeLogic(store, randomUUID())
  assert.equal(res.ok, false)
}

async function testAgentNameContainsSessionPrefix() {
  const store = makeStore()
  const sessionId = randomUUID()
  const ownerUserId = randomUUID()

  await provisionLogic(store, { sessionId, ownerUserId })

  const agent = store.agents[0]
  assert.ok(
    agent.name.includes(sessionId.slice(0, 8)),
    `agent name must include first 8 chars of sessionId, got: ${agent.name}`,
  )
}

async function main() {
  const tests = [
    testAuthVerification,
    testNewSessionCreatesOneRowEach,
    testSameSessionIdIsIdempotent,
    testDifferentSessionIdsAreIndependent,
    testNewRunCreatedWhenPreviousCompleted,
    testCompleteMarksRunCompleted,
    testCompleteUnknownSessionReturnsNotFound,
    testAgentNameContainsSessionPrefix,
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
