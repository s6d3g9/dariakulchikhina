/**
 * Smoke test for the ingest endpoint.
 * Requires a live PostgreSQL DB at MESSENGER_DB_URL or DATABASE_URL.
 *
 * Usage: node --experimental-strip-types messenger/core/src/agents/__tests__/ingest-handler.smoke.ts
 */

// Load root .env so DATABASE_URL / MESSENGER_DB_URL are available without a process runner
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

  const userId = randomUUID()
  const conversationId = randomUUID()
  const agentId = randomUUID()
  const runId = randomUUID()
  const ingestToken = randomUUID()

  // Setup: user → conversation → agent → run
  await db.insert(messengerUsers).values({ id: userId, login: `smoke-${userId}`, displayName: 'Smoke' })
  await db.insert(messengerConversations).values({ id: conversationId, kind: 'agent', userAId: userId })
  await db.insert(messengerAgents).values({ id: agentId, ownerUserId: userId, name: 'Smoke Agent', ingestToken })
  await db.insert(messengerAgentRuns).values({ id: runId, agentId, conversationId, status: 'pending' })

  const app = Fastify({ logger: false })
  const broadcasted: unknown[] = []
  registerIngestRoutes(app, (_channel, event) => broadcasted.push(event))
  await app.listen({ host: '127.0.0.1', port: 0 })
  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('unexpected server address')
  const baseUrl = `http://127.0.0.1:${(address as { port: number }).port}`

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ingestToken}` },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: await res.json() as Record<string, unknown> }
  }

  try {
    // Sequence: run_start → delta → tokens → complete
    const r1 = await post({ type: 'run_start', runId, prompt: 'hello' })
    assert(r1.status === 200, `run_start 200, got ${r1.status}`)
    assert(typeof r1.body.persistedEventId === 'string', 'run_start returns persistedEventId')

    const r2 = await post({ type: 'delta', runId, delta: 'Hello' })
    assert(r2.status === 200, `delta 200, got ${r2.status}`)

    const r3 = await post({ type: 'tokens', runId, tokenIn: 10, tokenOut: 5 })
    assert(r3.status === 200, `tokens 200, got ${r3.status}`)

    const r4 = await post({ type: 'complete', runId, finalText: 'Done!' })
    assert(r4.status === 200, `complete 200, got ${r4.status}`)

    // Assert 4 rows in messenger_agent_run_events
    const events = await db
      .select({ id: messengerAgentRunEvents.id })
      .from(messengerAgentRunEvents)
      .where(eq(messengerAgentRunEvents.runId, runId))
    assert(events.length === 4, `expected 4 event rows, got ${events.length}`)

    // Assert run status = completed
    const [run] = await db
      .select({ status: messengerAgentRuns.status })
      .from(messengerAgentRuns)
      .where(eq(messengerAgentRuns.id, runId))
      .limit(1)
    assert(run?.status === 'completed', `expected run status=completed, got ${run?.status}`)

    // Assert WS broadcasts fired
    assert(broadcasted.length === 8, `expected 8 broadcasts, got ${broadcasted.length}`)

    // Auth rejection
    const bad = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: JSON.stringify({ type: 'delta', runId, delta: 'x' }),
    })
    assert(bad.status === 401, `expected 401 on bad token, got ${bad.status}`)

    // Unknown runId → 404
    const r404 = await post({ type: 'delta', runId: randomUUID(), delta: 'x' })
    assert(r404.status === 404, `expected 404 on unknown runId, got ${r404.status}`)

    console.log('PASS: ingest smoke — 4 events persisted, run=completed, broadcasts=8 (agent-stream + agent-tree per event)')
  } finally {
    await app.close()
    // Cleanup (cascade: events deleted with run)
    await db.delete(messengerAgentRuns).where(eq(messengerAgentRuns.id, runId))
    await db.delete(messengerAgents).where(eq(messengerAgents.id, agentId))
    await db.delete(messengerConversations).where(eq(messengerConversations.id, conversationId))
    await db.delete(messengerUsers).where(eq(messengerUsers.id, userId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
