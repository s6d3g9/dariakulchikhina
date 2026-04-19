/**
 * Integration test suite for the ingest-handler endpoint.
 * Covers all event types, auth, error paths, and replay detection.
 * Requires a live PostgreSQL DB at MESSENGER_DB_URL or DATABASE_URL.
 *
 * Usage: node --experimental-strip-types messenger/core/src/agents/__tests__/ingest-handler.integration.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../../../.env')
try {
  const _envContent = readFileSync(_envPath, 'utf8')
  for (const line of _envContent.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    // eslint-disable-next-line no-restricted-syntax
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* .env absent — rely on pre-set env vars */ }

import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import { registerIngestRoutes } from '../ingest-handler.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerAgentRuns,
  messengerAgentRunEvents,
  eq,
} from '../ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerUsers, messengerConversations } from '../../../../../server/db/schema/messenger.ts'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  const db = useIngestDb()

  // Shared fixtures: user → conversation → agent
  const userId = randomUUID()
  const conversationId = randomUUID()
  const agentId = randomUUID()
  const ingestToken = randomUUID()

  await db.insert(messengerUsers).values({ id: userId, login: `integ-${userId}`, displayName: 'Integration' })
  await db.insert(messengerConversations).values({ id: conversationId, kind: 'agent', userAId: userId })
  await db.insert(messengerAgents).values({ id: agentId, ownerUserId: userId, name: 'Integration Agent', ingestToken })

  const app = Fastify({ logger: false })
  const broadcasts: Array<{ channel: string; event: Record<string, unknown> }> = []
  registerIngestRoutes(app, (channel, event) => broadcasts.push({ channel, event }))
  await app.listen({ host: '127.0.0.1', port: 0 })

  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('unexpected server address')
  const baseUrl = `http://127.0.0.1:${(address as { port: number }).port}`

  async function post(body: Record<string, unknown>, token = ingestToken) {
    const res = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() as Record<string, unknown> }
  }

  async function postNoAuth(body: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() as Record<string, unknown> }
  }

  const runIds: string[] = []

  try {
    // ─── Test 1: Full happy sequence ─────────────────────────────────────────────
    // run_start → substate → delta × 2 → tokens → tool_use → complete (7 events)
    {
      const runId = randomUUID()
      runIds.push(runId)
      await db.insert(messengerAgentRuns).values({ id: runId, agentId, conversationId, status: 'pending' })
      const broadcastStart = broadcasts.length

      const e1 = await post({ type: 'run_start', runId, prompt: 'Integration test' })
      assert(e1.status === 200, `[happy] run_start 200, got ${e1.status}`)
      assert(typeof e1.body.persistedEventId === 'string', '[happy] run_start returns persistedEventId')

      const e2 = await post({ type: 'substate', runId, substate: 'thinking', message: 'Processing' })
      assert(e2.status === 200, `[happy] substate 200, got ${e2.status}`)

      const e3 = await post({ type: 'delta', runId, delta: 'Hello' })
      assert(e3.status === 200, `[happy] delta#1 200, got ${e3.status}`)

      const e4 = await post({ type: 'delta', runId, delta: ' World' })
      assert(e4.status === 200, `[happy] delta#2 200, got ${e4.status}`)

      const e5 = await post({ type: 'tokens', runId, tokenIn: 20, tokenOut: 10 })
      assert(e5.status === 200, `[happy] tokens 200, got ${e5.status}`)

      const e6 = await post({ type: 'tool_use', runId, tool: 'search', input: { query: 'test' } })
      assert(e6.status === 200, `[happy] tool_use 200, got ${e6.status}`)

      const e7 = await post({ type: 'complete', runId, finalText: 'Hello World' })
      assert(e7.status === 200, `[happy] complete 200, got ${e7.status}`)

      const events = await db
        .select({ id: messengerAgentRunEvents.id })
        .from(messengerAgentRunEvents)
        .where(eq(messengerAgentRunEvents.runId, runId))
      assert(events.length === 7, `[happy] expected 7 event rows, got ${events.length}`)

      const [run] = await db
        .select({ status: messengerAgentRuns.status })
        .from(messengerAgentRuns)
        .where(eq(messengerAgentRuns.id, runId))
        .limit(1)
      assert(run?.status === 'completed', `[happy] expected run status=completed, got ${run?.status}`)

      const broadcastCount = broadcasts.length - broadcastStart
      assert(broadcastCount === 7, `[happy] expected 7 broadcasts, got ${broadcastCount}`)
      for (const b of broadcasts.slice(broadcastStart)) {
        assert(b.channel === `agent-stream:${agentId}`, `[happy] wrong broadcast channel: ${b.channel}`)
      }

      console.log('PASS: [1] full happy sequence — 7 events, run=completed, 7 broadcasts')
    }

    // ─── Test 2: Failure path ─────────────────────────────────────────────────────
    // run_start → delta → error(fatal) → run.status must become 'failed'
    {
      const runId = randomUUID()
      runIds.push(runId)
      await db.insert(messengerAgentRuns).values({ id: runId, agentId, conversationId, status: 'pending' })
      const broadcastStart = broadcasts.length

      await post({ type: 'run_start', runId })
      await post({ type: 'delta', runId, delta: 'Partial output' })
      const e3 = await post({ type: 'error', runId, message: 'Context limit exceeded', fatal: true })
      assert(e3.status === 200, `[failure] error event 200, got ${e3.status}`)

      const events = await db
        .select({ id: messengerAgentRunEvents.id })
        .from(messengerAgentRunEvents)
        .where(eq(messengerAgentRunEvents.runId, runId))
      assert(events.length === 3, `[failure] expected 3 event rows, got ${events.length}`)

      const [run] = await db
        .select({ status: messengerAgentRuns.status })
        .from(messengerAgentRuns)
        .where(eq(messengerAgentRuns.id, runId))
        .limit(1)
      assert(run?.status === 'failed', `[failure] expected run status=failed, got ${run?.status}`)

      const broadcastCount = broadcasts.length - broadcastStart
      assert(broadcastCount === 3, `[failure] expected 3 broadcasts, got ${broadcastCount}`)

      console.log('PASS: [2] failure path — 3 events, run=failed, 3 broadcasts')
    }

    // ─── Test 3: Auth errors ──────────────────────────────────────────────────────
    {
      const runId = randomUUID()
      runIds.push(runId)
      await db.insert(messengerAgentRuns).values({ id: runId, agentId, conversationId, status: 'pending' })

      const wrongToken = await post({ type: 'delta', runId, delta: 'x' }, 'wrong-token')
      assert(wrongToken.status === 401, `[auth] expected 401 on bad token, got ${wrongToken.status}`)

      const noAuth = await postNoAuth({ type: 'delta', runId, delta: 'x' })
      assert(noAuth.status === 401, `[auth] expected 401 on missing header, got ${noAuth.status}`)

      console.log('PASS: [3] auth errors — wrong token → 401, missing header → 401')
    }

    // ─── Test 4: Unknown runId → 404 ─────────────────────────────────────────────
    {
      const r = await post({ type: 'delta', runId: randomUUID(), delta: 'x' })
      assert(r.status === 404, `[404] expected 404 on unknown runId, got ${r.status}`)

      console.log('PASS: [4] unknown runId → 404')
    }

    // ─── Test 5: Replay detection ─────────────────────────────────────────────────
    // Same eventId submitted twice → 200 both times, only 1 row in DB
    {
      const runId = randomUUID()
      runIds.push(runId)
      await db.insert(messengerAgentRuns).values({ id: runId, agentId, conversationId, status: 'pending' })

      const eventId = randomUUID()

      const first = await post({ type: 'delta', runId, delta: 'hello', eventId })
      assert(first.status === 200, `[replay] first submit 200, got ${first.status}`)
      assert(first.body.persistedEventId === eventId, `[replay] first: persistedEventId should equal client eventId, got ${first.body.persistedEventId}`)

      const second = await post({ type: 'delta', runId, delta: 'hello', eventId })
      assert(second.status === 200, `[replay] second submit 200, got ${second.status}`)
      assert(second.body.persistedEventId === eventId, `[replay] second: same persistedEventId returned, got ${second.body.persistedEventId}`)

      const events = await db
        .select({ id: messengerAgentRunEvents.id })
        .from(messengerAgentRunEvents)
        .where(eq(messengerAgentRunEvents.runId, runId))
      assert(events.length === 1, `[replay] expected 1 row (no duplicate), got ${events.length}`)

      console.log('PASS: [5] replay detection — duplicate eventId returns 200 without row duplication')
    }

    console.log('\nPASS: all integration tests passed (5/5)')
  } finally {
    await app.close()
    // Cleanup: cascade delete removes events with their runs
    for (const runId of runIds) {
      await db.delete(messengerAgentRuns).where(eq(messengerAgentRuns.id, runId))
    }
    await db.delete(messengerAgents).where(eq(messengerAgents.id, agentId))
    await db.delete(messengerConversations).where(eq(messengerConversations.id, conversationId))
    await db.delete(messengerUsers).where(eq(messengerUsers.id, userId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
