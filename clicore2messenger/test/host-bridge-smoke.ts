/**
 * E2E smoke harness for the v2 host-session bridge.
 *
 * Validates: session provision, event delivery, isolation, idle reaping,
 * re-activation, crash-recovery (offset/uuid dedup), and cross-talk.
 *
 * Requirements:
 *   - Live PostgreSQL reachable at MESSENGER_DB_URL or DATABASE_URL
 *   - HOST_BRIDGE_TOKEN env (≥32 chars)
 *   - HOST_BRIDGE_OWNER_USER_ID env (UUID of an existing messenger_users row)
 *     OR the test inserts its own user when SMOKE_CREATE_TEST_USER=1 (default)
 *
 * Usage:
 *   pnpm test:host-bridge-smoke
 *   SMOKE_CREATE_TEST_USER=1 pnpm test:host-bridge-smoke
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, appendFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir, hostname as osHostname } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strict as assert } from 'node:assert'

// Load root .env so DATABASE_URL / MESSENGER_DB_URL are available
const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../.env')
try {
  const _envContent = readFileSync(_envPath, 'utf8')
  for (const line of _envContent.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    // eslint-disable-next-line no-restricted-syntax
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* .env absent — rely on pre-set env vars */ }

import Fastify from 'fastify'
import { registerHostSessionRoutes } from '../../messenger/core/src/agents/host-session-handler.ts'
import { registerIngestRoutes } from '../../messenger/core/src/agents/ingest-handler.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerAgentRuns,
  messengerAgentRunEvents,
  eq,
  and,
  isNull,
  sql,
} from '../../messenger/core/src/agents/ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerUsers, messengerConversations } from '../../../server/db/schema/messenger.ts'
import { runTailMode } from '../src/core.ts'
import { claudeTranscriptAdapter } from '../src/adapters/claude-transcript.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SMOKE_HOSTNAME = `smoke-${randomUUID().slice(0, 8)}`
const BRIDGE_TOKEN = (process.env.HOST_BRIDGE_TOKEN?.length ?? 0) >= 32
  ? process.env.HOST_BRIDGE_TOKEN!
  : 'smoke-test-token-' + 'x'.repeat(20)

// ---------------------------------------------------------------------------
// Setup: test user + Fastify server
// ---------------------------------------------------------------------------

let ownerUserId: string
let baseUrl: string
let app: ReturnType<typeof Fastify>
let db: ReturnType<typeof useIngestDb>

async function setup() {
  db = useIngestDb()

  // Provision or reuse test user
  const existingOwner = process.env.HOST_BRIDGE_OWNER_USER_ID
  if (existingOwner) {
    ownerUserId = existingOwner
  } else {
    ownerUserId = randomUUID()
    await db.insert(messengerUsers).values({
      id: ownerUserId,
      login: `smoke-${ownerUserId.slice(0, 8)}`,
      displayName: 'Smoke Test User',
    })
  }

  // Set env vars before registering routes (host-session-handler reads config once at registration)
  process.env.HOST_BRIDGE_TOKEN = BRIDGE_TOKEN
  process.env.HOST_BRIDGE_OWNER_USER_ID = ownerUserId

  app = Fastify({ logger: false })
  registerHostSessionRoutes(app)
  registerIngestRoutes(app, () => {})
  await app.listen({ host: '127.0.0.1', port: 0 })
  const addr = app.server.address() as { port: number }
  baseUrl = `http://127.0.0.1:${addr.port}`
}

// ---------------------------------------------------------------------------
// Cleanup: remove test data
// ---------------------------------------------------------------------------

const _createdAgentIds: Set<string> = new Set()

async function teardown(createdTestUser: boolean) {
  if (_createdAgentIds.size > 0) {
    // Cascade: runs + events deleted via FK cascade when agents deleted
    for (const agentId of _createdAgentIds) {
      // Delete conversations linked to this agent
      await db
        .delete(messengerConversations)
        .where(sql`${messengerConversations.policy}->>'_agentId' = ${agentId}`)
      await db.delete(messengerAgentRuns).where(eq(messengerAgentRuns.agentId, agentId))
      await db.delete(messengerAgents).where(eq(messengerAgents.id, agentId))
    }
  }

  // Clean up agents created via test naming pattern (safety net)
  const testAgents = await db
    .select({ id: messengerAgents.id })
    .from(messengerAgents)
    .where(sql`${messengerAgents.config}->>'hostname' LIKE ${SMOKE_HOSTNAME + '%'}`)
  for (const a of testAgents) {
    await db
      .delete(messengerConversations)
      .where(sql`${messengerConversations.policy}->>'_agentId' = ${a.id}`)
    await db.delete(messengerAgentRuns).where(eq(messengerAgentRuns.agentId, a.id))
    await db.delete(messengerAgents).where(eq(messengerAgents.id, a.id))
  }

  if (createdTestUser) {
    await db.delete(messengerUsers).where(eq(messengerUsers.id, ownerUserId))
  }

  await app.close()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** POST to the provision endpoint. Returns parsed JSON body. */
async function provision(cwd: string, sessionId: string): Promise<{
  agentId: string
  conversationId: string
  runId: string
  ingestToken: string
}> {
  const res = await fetch(`${baseUrl}/agents/host-session/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_TOKEN}` },
    body: JSON.stringify({ sessionId, cwd, hostname: SMOKE_HOSTNAME }),
  })
  assert.equal(res.status, 200, `provision failed: ${res.status} ${await res.text()}`)
  const body = await res.json() as { agentId: string; conversationId: string; runId: string; ingestToken: string }
  _createdAgentIds.add(body.agentId)
  return body
}

/** POST an event to the ingest endpoint. */
async function postEvent(
  agentId: string,
  ingestToken: string,
  event: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ingestToken}` },
    body: JSON.stringify(event),
  })
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}

/** POST to the run-complete endpoint. */
async function completeRun(runId: string, reason?: 'idle' | 'rotated' | 'shutdown'): Promise<void> {
  const res = await fetch(`${baseUrl}/agents/host-session/runs/${runId}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BRIDGE_TOKEN}` },
    body: JSON.stringify(reason ? { reason } : {}),
  })
  assert.equal(res.status, 200, `complete failed: ${res.status} ${await res.text()}`)
}

/**
 * Writes a minimal Claude Code transcript (JSONL) for the given events,
 * simulating what the Claude Code CLI writes to ~/.claude/projects/<slug>/<sessionId>.jsonl.
 *
 * Returns the absolute path to the written file.
 */
function simulateClaudeSession(
  stateDir: string,
  cwd: string,
  sessionId: string,
  turns: Array<{ user: string; assistant: string }>,
): string {
  const slug = cwd.replace(/\//g, '-').replace(/^-/, '')
  const dir = join(stateDir, `.claude-projects`, slug)
  mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `${sessionId}.jsonl`)
  const lines: string[] = []
  for (const { user, assistant } of turns) {
    lines.push(JSON.stringify({
      type: 'user',
      uuid: randomUUID(),
      message: { role: 'user', content: user },
    }))
    lines.push(JSON.stringify({
      type: 'assistant',
      uuid: randomUUID(),
      message: { role: 'assistant', content: [{ type: 'text', text: assistant }] },
    }))
  }
  writeFileSync(filePath, lines.join('\n') + '\n')
  return filePath
}

/** Append turns to an existing session file. */
function appendToSession(filePath: string, turns: Array<{ user: string; assistant: string }>) {
  for (const { user, assistant } of turns) {
    appendFileSync(filePath, JSON.stringify({
      type: 'user',
      uuid: randomUUID(),
      message: { role: 'user', content: user },
    }) + '\n')
    appendFileSync(filePath, JSON.stringify({
      type: 'assistant',
      uuid: randomUUID(),
      message: { role: 'assistant', content: [{ type: 'text', text: assistant }] },
    }) + '\n')
  }
}

/** Count events in DB for a given runId. */
async function countEvents(runId: string): Promise<number> {
  const rows = await db
    .select({ id: messengerAgentRunEvents.id })
    .from(messengerAgentRunEvents)
    .where(eq(messengerAgentRunEvents.runId, runId))
  return rows.length
}

/** Fetch run status. */
async function getRunStatus(runId: string): Promise<string | null> {
  const [row] = await db
    .select({ status: messengerAgentRuns.status })
    .from(messengerAgentRuns)
    .where(and(eq(messengerAgentRuns.id, runId), isNull(messengerAgentRuns.deletedAt)))
    .limit(1)
  return row?.status ?? null
}

// ---------------------------------------------------------------------------
// Scenario 1: Single session basic
// ---------------------------------------------------------------------------

async function scenario1_singleSessionBasic() {
  const cwd = `/tmp/smoke-proj-${randomUUID().slice(0, 8)}`
  const sessionId = randomUUID()

  const { agentId, runId, ingestToken } = await provision(cwd, sessionId)

  // Assert one agent created with correct name (hostname:basename)
  const [agent] = await db
    .select({ id: messengerAgents.id, name: messengerAgents.name, config: messengerAgents.config })
    .from(messengerAgents)
    .where(eq(messengerAgents.id, agentId))
    .limit(1)

  assert.ok(agent, 'agent exists')
  const basename = cwd.split('/').at(-1)
  assert.equal(agent.name, `${SMOKE_HOSTNAME}:${basename}`, 'agent name = hostname:cwd-basename')

  const config = agent.config as Record<string, unknown>
  assert.equal(config.type, 'host-session')
  assert.equal(config.hostname, SMOKE_HOSTNAME)
  assert.equal(config.cwd, cwd)

  // Assert run is in running status
  assert.equal(await getRunStatus(runId), 'running', 'run status = running after provision')

  // Post a sequence of events
  const r1 = await postEvent(agentId, ingestToken, { type: 'run_start', runId })
  assert.equal(r1.status, 200)

  const r2 = await postEvent(agentId, ingestToken, { type: 'delta', runId, delta: 'hello world' })
  assert.equal(r2.status, 200)

  const r3 = await postEvent(agentId, ingestToken, { type: 'tokens', runId, tokenIn: 10, tokenOut: 5 })
  assert.equal(r3.status, 200)

  const r4 = await postEvent(agentId, ingestToken, { type: 'complete', runId, finalText: 'done' })
  assert.equal(r4.status, 200)

  // Assert 4 events persisted
  const eventCount = await countEvents(runId)
  assert.equal(eventCount, 4, `expected 4 events, got ${eventCount}`)

  // Assert run transitions to completed
  assert.equal(await getRunStatus(runId), 'completed', 'run status = completed after complete event')
}

// ---------------------------------------------------------------------------
// Scenario 2: Two parallel sessions, different cwd
// ---------------------------------------------------------------------------

async function scenario2_twoSessions_differentCwd() {
  const sessionA = randomUUID()
  const sessionB = randomUUID()
  const cwdA = `/tmp/smoke-proj-a-${randomUUID().slice(0, 8)}`
  const cwdB = `/tmp/smoke-proj-b-${randomUUID().slice(0, 8)}`
  const start = new Date()

  const { agentId: agentA, runId: runA, ingestToken: tokenA } = await provision(cwdA, sessionA)
  const { agentId: agentB, runId: runB, ingestToken: tokenB } = await provision(cwdB, sessionB)

  assert.notEqual(agentA, agentB, 'different cwd → different agentId')

  // Send interleaved events
  await postEvent(agentA, tokenA, { type: 'run_start', runId: runA })
  await postEvent(agentB, tokenB, { type: 'run_start', runId: runB })
  await postEvent(agentA, tokenA, { type: 'delta', runId: runA, delta: 'from A' })
  await postEvent(agentB, tokenB, { type: 'delta', runId: runB, delta: 'from B' })
  await postEvent(agentA, tokenA, { type: 'complete', runId: runA })
  await postEvent(agentB, tokenB, { type: 'complete', runId: runB })

  // Events must not cross: each runId belongs to exactly one agentId
  const rows = await db
    .select({
      runId: messengerAgentRunEvents.runId,
      agentId: messengerAgentRuns.agentId,
    })
    .from(messengerAgentRunEvents)
    .innerJoin(messengerAgentRuns, eq(messengerAgentRunEvents.runId, messengerAgentRuns.id))
    .where(sql`${messengerAgentRuns.agentId} IN (${agentA}, ${agentB})`)

  const agentsByRun = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!agentsByRun.has(r.runId)) agentsByRun.set(r.runId, new Set())
    agentsByRun.get(r.runId)!.add(r.agentId)
  }

  for (const [runId, agents] of agentsByRun) {
    assert.equal(agents.size, 1, `runId ${runId} has events from ${agents.size} agents (expected 1)`)
  }

  assert.equal(agentsByRun.get(runA)?.has(agentA), true, 'runA events belong to agentA')
  assert.equal(agentsByRun.get(runB)?.has(agentB), true, 'runB events belong to agentB')
}

// ---------------------------------------------------------------------------
// Scenario 3: Two parallel sessions, same cwd
// ---------------------------------------------------------------------------

async function scenario3_twoSessions_sameCwd() {
  const cwd = `/tmp/smoke-proj-shared-${randomUUID().slice(0, 8)}`
  const sessionX = randomUUID()
  const sessionY = randomUUID()

  const { agentId: agentX, runId: runX, ingestToken: tokenX } = await provision(cwd, sessionX)
  const { agentId: agentY, runId: runY, ingestToken: tokenY } = await provision(cwd, sessionY)

  // Same cwd → same agentId
  assert.equal(agentX, agentY, 'same cwd → same agentId')
  // Different sessions → different runIds
  assert.notEqual(runX, runY, 'different sessions → different runIds')
  // Both tokens should work (same agent, same ingestToken)
  assert.equal(tokenX, tokenY, 'same agent → same ingestToken')

  // Post events to each run
  await postEvent(agentX, tokenX, { type: 'run_start', runId: runX })
  await postEvent(agentX, tokenX, { type: 'delta', runId: runX, delta: 'x output' })
  await postEvent(agentX, tokenX, { type: 'complete', runId: runX })

  await postEvent(agentY, tokenY, { type: 'run_start', runId: runY })
  await postEvent(agentY, tokenY, { type: 'delta', runId: runY, delta: 'y output' })
  await postEvent(agentY, tokenY, { type: 'complete', runId: runY })

  // Each run has its own events
  const eventsX = await countEvents(runX)
  const eventsY = await countEvents(runY)
  assert.equal(eventsX, 3, `runX: expected 3 events, got ${eventsX}`)
  assert.equal(eventsY, 3, `runY: expected 3 events, got ${eventsY}`)

  // Verify via GROUP BY that two distinct run_ids exist under the shared agent
  const grouped = await db
    .select({ runId: messengerAgentRunEvents.runId })
    .from(messengerAgentRunEvents)
    .where(
      sql`${messengerAgentRunEvents.runId} IN (${runX}, ${runY})`,
    )
  const distinctRuns = new Set(grouped.map((r) => r.runId))
  assert.equal(distinctRuns.size, 2, 'two distinct runIds under same agentId')
}

// ---------------------------------------------------------------------------
// Scenario 4: Idle reaping
// ---------------------------------------------------------------------------

async function scenario4_idleReaping() {
  const cwd = `/tmp/smoke-idle-${randomUUID().slice(0, 8)}`
  const sessionId = randomUUID()

  const { agentId, runId, ingestToken } = await provision(cwd, sessionId)

  // Post some events
  await postEvent(agentId, ingestToken, { type: 'run_start', runId })
  await postEvent(agentId, ingestToken, { type: 'delta', runId, delta: 'working...' })

  assert.equal(await getRunStatus(runId), 'running', 'run should be running before reaping')

  // Supervisor calls complete with reason='idle' after detecting transcript inactivity
  await completeRun(runId, 'idle')

  assert.equal(await getRunStatus(runId), 'completed', 'run should be completed after idle reaping')

  // finishedAt should be set
  const [run] = await db
    .select({ finishedAt: messengerAgentRuns.finishedAt })
    .from(messengerAgentRuns)
    .where(eq(messengerAgentRuns.id, runId))
    .limit(1)
  assert.ok(run?.finishedAt instanceof Date, 'finishedAt should be set after reaping')
}

// ---------------------------------------------------------------------------
// Scenario 5: Re-activation after idle reaping
// ---------------------------------------------------------------------------

async function scenario5_reactivation() {
  const cwd = `/tmp/smoke-reactivate-${randomUUID().slice(0, 8)}`
  const session1 = randomUUID()

  const { agentId, runId: runId1, ingestToken } = await provision(cwd, session1)
  await postEvent(agentId, ingestToken, { type: 'run_start', runId: runId1 })
  await completeRun(runId1, 'idle')
  assert.equal(await getRunStatus(runId1), 'completed')

  // New session on same project (same cwd+hostname) → same agent, new run
  const session2 = randomUUID()
  const { agentId: agentId2, runId: runId2 } = await provision(cwd, session2)

  assert.equal(agentId2, agentId, 're-activation reuses same agentId')
  assert.notEqual(runId2, runId1, 're-activation creates new runId')
  assert.equal(await getRunStatus(runId2), 'running', 'new run is running')

  // New run can receive events
  await postEvent(agentId, ingestToken, { type: 'run_start', runId: runId2 })
  await postEvent(agentId, ingestToken, { type: 'complete', runId: runId2 })
  assert.equal(await getRunStatus(runId2), 'completed')
}

// ---------------------------------------------------------------------------
// Scenario 6: Crash recovery (offset dedup)
// ---------------------------------------------------------------------------

async function scenario6_crashRecovery() {
  const stateDir = join(tmpdir(), `smoke-crash-${randomUUID().slice(0, 8)}`)
  mkdirSync(stateDir, { recursive: true })

  const cwd = `/tmp/smoke-crash-cwd-${randomUUID().slice(0, 8)}`
  const sessionId = randomUUID()

  const { agentId, runId, ingestToken } = await provision(cwd, sessionId)

  // Write initial transcript with 2 turns
  const transcriptFile = simulateClaudeSession(stateDir, cwd, sessionId, [
    { user: 'first question', assistant: 'first answer' },
    { user: 'second question', assistant: 'second answer' },
  ])

  // Run tail mode (oneShot) — first pass, simulates normal bridge run
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: transcriptFile,
    stateDir,
    runId,
    agentId,
    messengerUrl: baseUrl,
    token: ingestToken,
    oneShot: true,
  })

  const eventsAfterFirstPass = await countEvents(runId)
  assert.ok(eventsAfterFirstPass > 0, `expected events after first pass, got ${eventsAfterFirstPass}`)

  // Simulate crash + restart: append new content to transcript
  appendToSession(transcriptFile, [
    { user: 'third question', assistant: 'third answer' },
  ])

  // Second pass from persisted offset (simulates bridge restart after SIGKILL)
  // The new run re-uses the same runId (still running) and reads from offset
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: transcriptFile,
    stateDir,
    runId,
    agentId,
    messengerUrl: baseUrl,
    token: ingestToken,
    oneShot: true,
  })

  const eventsAfterSecondPass = await countEvents(runId)

  // No duplicate events: second pass only added new lines
  assert.ok(
    eventsAfterSecondPass > eventsAfterFirstPass,
    `second pass should add events: before=${eventsAfterFirstPass}, after=${eventsAfterSecondPass}`,
  )

  // Run a THIRD pass with no new content — count must stay the same (no re-processing)
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: transcriptFile,
    stateDir,
    runId,
    agentId,
    messengerUrl: baseUrl,
    token: ingestToken,
    oneShot: true,
  })

  const eventsAfterThirdPass = await countEvents(runId)
  assert.equal(
    eventsAfterThirdPass,
    eventsAfterSecondPass,
    `third pass (no new content) must not add events: before=${eventsAfterSecondPass}, after=${eventsAfterThirdPass}`,
  )

  // Cleanup temp dir
  rmSync(stateDir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Scenario 7: Cross-talk regression
// ---------------------------------------------------------------------------

async function scenario7_crosstalkRegression() {
  const cwdAlpha = `/tmp/smoke-ct-alpha-${randomUUID().slice(0, 8)}`
  const cwdBeta = `/tmp/smoke-ct-beta-${randomUUID().slice(0, 8)}`
  const sAlpha = randomUUID()
  const sBeta = randomUUID()

  const { agentId: aAlpha, runId: rAlpha, ingestToken: tAlpha } = await provision(cwdAlpha, sAlpha)
  const { agentId: aBeta, runId: rBeta, ingestToken: tBeta } = await provision(cwdBeta, sBeta)

  // Use an identical timestamp on both events to stress the ordering logic
  const ts = new Date().toISOString()

  // Interleave events with identical timestamps
  await Promise.all([
    postEvent(aAlpha, tAlpha, { type: 'run_start', runId: rAlpha, ts }),
    postEvent(aBeta, tBeta, { type: 'run_start', runId: rBeta, ts }),
  ])
  await Promise.all([
    postEvent(aAlpha, tAlpha, { type: 'delta', runId: rAlpha, delta: 'alpha delta', ts }),
    postEvent(aBeta, tBeta, { type: 'delta', runId: rBeta, delta: 'beta delta', ts }),
  ])
  await Promise.all([
    postEvent(aAlpha, tAlpha, { type: 'complete', runId: rAlpha, ts }),
    postEvent(aBeta, tBeta, { type: 'complete', runId: rBeta, ts }),
  ])

  // Critical assertion: every event row carries the correct runId
  const alphaEvents = await db
    .select({ runId: messengerAgentRunEvents.runId, msg: messengerAgentRunEvents.message })
    .from(messengerAgentRunEvents)
    .where(eq(messengerAgentRunEvents.runId, rAlpha))

  const betaEvents = await db
    .select({ runId: messengerAgentRunEvents.runId, msg: messengerAgentRunEvents.message })
    .from(messengerAgentRunEvents)
    .where(eq(messengerAgentRunEvents.runId, rBeta))

  assert.equal(alphaEvents.length, 3, `alpha: expected 3 events, got ${alphaEvents.length}`)
  assert.equal(betaEvents.length, 3, `beta: expected 3 events, got ${betaEvents.length}`)

  for (const ev of alphaEvents) {
    assert.equal(ev.runId, rAlpha, `alpha event has wrong runId: ${ev.runId}`)
  }
  for (const ev of betaEvents) {
    assert.equal(ev.runId, rBeta, `beta event has wrong runId: ${ev.runId}`)
  }

  // Verify the delta message is on the correct run (not crossed)
  const alphaDelta = alphaEvents.find((e) => e.msg === 'alpha delta')
  const betaDelta = betaEvents.find((e) => e.msg === 'beta delta')
  assert.ok(alphaDelta, '"alpha delta" event must be on alpha run')
  assert.ok(betaDelta, '"beta delta" event must be on beta run')
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

type Scenario = () => Promise<void>

const scenarios: Array<[string, Scenario]> = [
  ['single session basic', scenario1_singleSessionBasic],
  ['two parallel sessions, different cwd', scenario2_twoSessions_differentCwd],
  ['two parallel sessions, same cwd', scenario3_twoSessions_sameCwd],
  ['idle reaping', scenario4_idleReaping],
  ['re-activation after idle reaping', scenario5_reactivation],
  ['crash recovery (offset + uuid dedup)', scenario6_crashRecovery],
  ['cross-talk regression', scenario7_crosstalkRegression],
]

async function main() {
  const createdTestUser = !process.env.HOST_BRIDGE_OWNER_USER_ID

  try {
    await setup()
  } catch (err) {
    console.error('FAIL: setup', err)
    process.exit(1)
  }

  let passed = 0
  const failed: string[] = []

  for (const [name, fn] of scenarios) {
    try {
      await fn()
      console.log(`PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`FAIL: ${name}`)
      console.error(err instanceof Error ? err.message : err)
      failed.push(name)
    }
  }

  try {
    await teardown(createdTestUser)
  } catch (err) {
    console.error('WARN: teardown error (may leave test data)', err)
  }

  console.log(`\n${passed}/${scenarios.length} scenarios passed`)
  if (failed.length > 0) {
    console.error('Failed:', failed)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
