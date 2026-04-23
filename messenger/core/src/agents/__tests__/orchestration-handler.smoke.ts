/**
 * Smoke test for the orchestration + cli-sessions API routes.
 * Requires a live PostgreSQL DB at MESSENGER_DB_URL or DATABASE_URL with the
 * messenger_cli_sessions migration applied.
 *
 * Usage: node --experimental-strip-types messenger/core/src/agents/__tests__/orchestration-handler.smoke.ts
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
import type { SpawnSyncReturns } from 'node:child_process'
import Fastify from 'fastify'
import { registerOrchestrationRoutes } from '../orchestration-handler.ts'
import {
  useIngestDb,
  messengerAgents,
  messengerAgentRuns,
  messengerCliSessions,
  eq,
} from '../ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerUsers } from '../../../../../server/db/schema/messenger.ts'
import { createMessengerToken } from '../../auth/auth.ts'

// eslint-disable-next-line no-restricted-syntax
const AUTH_SECRET = process.env.MESSENGER_CORE_AUTH_SECRET ?? 'test-secret'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  const db = useIngestDb()

  const userId = randomUUID()
  const agentId = randomUUID()
  const ingestToken = randomUUID()

  await db.insert(messengerUsers).values({ id: userId, login: `orch-smoke-${userId}`, displayName: 'Orch Smoke' })
  await db.insert(messengerAgents).values({ id: agentId, ownerUserId: userId, name: 'Orch Smoke Agent', ingestToken })

  const sessionToken = createMessengerToken(
    { id: userId, login: `orch-smoke-${userId}`, displayName: 'Orch Smoke', passwordHash: '', createdAt: new Date().toISOString() },
    AUTH_SECRET,
  )

  const spawnCalls: string[][] = []
  const mockSpawnSync = (cmd: string, args: readonly string[]): SpawnSyncReturns<Buffer> => {
    spawnCalls.push([cmd, ...args])
    return { pid: 0, output: [], stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: 0, signal: null, error: undefined }
  }

  const app = Fastify({ logger: false })
  const broadcasted: unknown[] = []
  registerOrchestrationRoutes(app, (_ch, ev) => broadcasted.push(ev), { spawnSync: mockSpawnSync as typeof import('node:child_process').spawnSync })
  await app.listen({ host: '127.0.0.1', port: 0 })
  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('unexpected address')
  const base = `http://127.0.0.1:${(address as { port: number }).port}`

  async function req(method: string, path: string, body?: unknown, auth?: string) {
    const headers: Record<string, string> = { Authorization: auth ?? `Bearer ${sessionToken}` }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, body: await res.json() as Record<string, unknown> }
  }

  let runId = ''
  let cliSessionId = ''

  try {
    // 1. POST /agents/:agentId/runs — happy path
    const r1 = await req('POST', `/agents/${agentId}/runs`, { prompt: 'test task', model: 'claude-haiku-4-5-20251001' })
    assert(r1.status === 201 || r1.status === 200, `create run 200/201, got ${r1.status}`)
    assert(typeof r1.body.runId === 'string', 'returns runId')
    assert(typeof r1.body.cliSessionId === 'string', 'returns cliSessionId')
    runId = r1.body.runId as string
    cliSessionId = r1.body.cliSessionId as string

    // Verify DB rows
    const [dbRun] = await db.select({ id: messengerAgentRuns.id, status: messengerAgentRuns.status }).from(messengerAgentRuns).where(eq(messengerAgentRuns.id, runId)).limit(1)
    assert(dbRun?.status === 'pending', `run status=pending, got ${dbRun?.status}`)

    const [dbSession] = await db.select({ id: messengerCliSessions.id, status: messengerCliSessions.status }).from(messengerCliSessions).where(eq(messengerCliSessions.id, cliSessionId)).limit(1)
    assert(dbSession?.status === 'pending', `cli_session status=pending, got ${dbSession?.status}`)

    // 2. POST /agents/:agentId/runs — auth rejected
    const rUnauth = await req('POST', `/agents/${agentId}/runs`, { prompt: 'x' }, 'Bearer bad-token')
    assert(rUnauth.status === 401, `unauthenticated → 401, got ${rUnauth.status}`)

    // 3. POST /cli-sessions — happy path (ingest token auth)
    const r3 = await req(
      'POST',
      '/cli-sessions',
      {
        agentId,
        model: 'claude-haiku-4-5-20251001',
        tmuxWindow: 'daria:0.orch-smoke',
        claudeSessionUuid: randomUUID(),
        logPath: '/tmp/smoke.log',
        runId,
      },
      `Bearer ${ingestToken}`,
    )
    assert(r3.status === 200, `cli-sessions 200, got ${r3.status}: ${JSON.stringify(r3.body)}`)
    assert(r3.body.id === cliSessionId, 'cli-sessions upsert returns same id')

    // Verify tmuxWindow was set
    const [updated] = await db.select({ tmuxWindow: messengerCliSessions.tmuxWindow }).from(messengerCliSessions).where(eq(messengerCliSessions.id, cliSessionId)).limit(1)
    assert(updated?.tmuxWindow === 'daria:0.orch-smoke', `tmuxWindow updated, got ${updated?.tmuxWindow}`)

    // 4. POST /agents/:agentId/runs/:runId/cancel — happy path (mocked spawnSync)
    const r4 = await req('POST', `/agents/${agentId}/runs/${runId}/cancel`)
    assert(r4.status === 200, `cancel 200, got ${r4.status}: ${JSON.stringify(r4.body)}`)
    assert(r4.body.cancelled === true, 'cancel returns { cancelled: true }')
    assert(spawnCalls.length === 1, `spawnSync called once, got ${spawnCalls.length}`)
    assert(spawnCalls[0]?.[0] === 'tmux', 'spawnSync called with tmux')

    // Verify broadcast
    const broadcast = broadcasted[0] as Record<string, unknown> | undefined
    assert(broadcast?.substate === 'idle', `broadcast substate=idle, got ${broadcast?.substate}`)

    // Verify run status updated to cancelled
    const [cancelled] = await db.select({ status: messengerAgentRuns.status }).from(messengerAgentRuns).where(eq(messengerAgentRuns.id, runId)).limit(1)
    assert(cancelled?.status === 'cancelled', `run status=cancelled, got ${cancelled?.status}`)

    // 5. GET /agents/:agentId/runs?rootRunId=...
    const r5 = await req('GET', `/agents/${agentId}/runs?rootRunId=${runId}`)
    assert(r5.status === 200, `list runs 200, got ${r5.status}`)
    assert(Array.isArray(r5.body.items), 'returns items array')
    const items = r5.body.items as Array<{ id: string }>
    assert(items.some(i => i.id === runId), 'root run appears in subtree')

    // 6. GET /agents/:agentId/runs/:runId/events
    const r6 = await req('GET', `/agents/${agentId}/runs/${runId}/events`)
    assert(r6.status === 200, `events 200, got ${r6.status}`)
    assert(Array.isArray(r6.body.items), 'events returns items array')

    // 7. GET /agents/:agentId/runs/:runId/events — unknown run → 404
    const r7 = await req('GET', `/agents/${agentId}/runs/${randomUUID()}/events`)
    assert(r7.status === 404, `unknown run events → 404, got ${r7.status}`)

    console.log('PASS: orchestration smoke — all 5 routes verified')
  } finally {
    await app.close()
    if (runId) {
      await db.delete(messengerCliSessions).where(eq(messengerCliSessions.runId, runId))
      await db.delete(messengerAgentRuns).where(eq(messengerAgentRuns.id, runId))
    }
    await db.delete(messengerAgents).where(eq(messengerAgents.id, agentId))
    await db.delete(messengerUsers).where(eq(messengerUsers.id, userId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
