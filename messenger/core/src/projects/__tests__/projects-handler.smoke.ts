/**
 * Smoke test for the projects API routes.
 * Requires a live PostgreSQL DB at MESSENGER_DB_URL or DATABASE_URL with the
 * messenger_projects + resource tables migration applied.
 *
 * Usage: node --experimental-strip-types messenger/core/src/projects/__tests__/projects-handler.smoke.ts
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
import { registerProjectsRoutes } from '../projects-handler.ts'
import { useIngestDb } from '../../agents/ingest-db.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerUsers } from '../../../../../server/db/schema/messenger.ts'
// eslint-disable-next-line no-restricted-imports
import { messengerProjects } from '../../../../../server/db/schema/messenger-projects.ts'
// eslint-disable-next-line no-restricted-imports
import { eq } from 'drizzle-orm'
import { createMessengerToken } from '../../auth/auth.ts'

// eslint-disable-next-line no-restricted-syntax
const AUTH_SECRET = process.env.MESSENGER_CORE_AUTH_SECRET ?? 'messenger-dev-secret'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  const db = useIngestDb()
  const userId = randomUUID()

  await db.insert(messengerUsers).values({ id: userId, login: `projects-smoke-${userId}`, displayName: 'Projects Smoke' })

  const sessionToken = createMessengerToken(
    { id: userId, login: `projects-smoke-${userId}`, displayName: 'Projects Smoke', passwordHash: '', createdAt: new Date().toISOString() },
    AUTH_SECRET,
  )

  const app = Fastify({ logger: false })
  registerProjectsRoutes(app)
  await app.listen({ host: '127.0.0.1', port: 0 })
  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('unexpected address')
  const base = `http://127.0.0.1:${(address as { port: number }).port}`

  async function req(method: string, path: string, body?: unknown, auth?: string) {
    const headers: Record<string, string> = {
      Authorization: auth ?? `Bearer ${sessionToken}`,
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, body: await res.json() as Record<string, unknown> }
  }

  let projectId = ''

  try {
    // 1. POST /projects — create
    const r1 = await req('POST', '/projects', { name: 'Smoke Test Project', description: 'For smoke testing' })
    assert(r1.status === 201, `create project 201, got ${r1.status}: ${JSON.stringify(r1.body)}`)
    assert(typeof r1.body.project === 'object' && r1.body.project !== null, 'returns project object')
    const proj = r1.body.project as Record<string, unknown>
    assert(typeof proj.id === 'string', 'project has id')
    assert(proj.name === 'Smoke Test Project', `project name matches, got ${proj.name}`)
    assert(proj.slug === 'smoke-test-project', `project slug is kebab-cased, got ${proj.slug}`)
    projectId = proj.id as string

    // 2. GET /projects — list
    const r2 = await req('GET', '/projects')
    assert(r2.status === 200, `list projects 200, got ${r2.status}`)
    const projects = r2.body.projects as Array<Record<string, unknown>>
    assert(Array.isArray(projects), 'returns projects array')
    assert(projects.some(p => p.id === projectId), 'created project appears in list')

    // 3. GET /projects/:id — detail with counts
    const r3 = await req('GET', `/projects/${projectId}`)
    assert(r3.status === 200, `get project 200, got ${r3.status}`)
    const detail = r3.body.project as Record<string, unknown>
    assert(typeof detail.counts === 'object' && detail.counts !== null, 'detail has counts')
    const counts = detail.counts as Record<string, number>
    assert(counts.connectors === 1, `connectors has default claude-cli connector, got ${counts.connectors}`)
    assert(counts.agents === 0, 'agents count starts at 0')

    // 4. PATCH /projects/:id — update (OCC)
    const r4 = await req('PATCH', `/projects/${projectId}`, { name: 'Updated Project', version: 1 })
    assert(r4.status === 200, `update project 200, got ${r4.status}: ${JSON.stringify(r4.body)}`)
    const updated = r4.body.project as Record<string, unknown>
    assert(updated.name === 'Updated Project', `name updated, got ${updated.name}`)
    assert(updated.version === 2, `version incremented, got ${updated.version}`)

    // 5. PATCH /projects/:id — stale version → 409
    const r5 = await req('PATCH', `/projects/${projectId}`, { name: 'Should fail', version: 1 })
    assert(r5.status === 409, `stale version → 409, got ${r5.status}`)

    // 6. POST /projects/:id/connectors — create connector
    const r6 = await req('POST', `/projects/${projectId}/connectors`, { type: 'postgres', label: 'Main DB', config: { host: 'localhost' } })
    assert(r6.status === 201, `create connector 201, got ${r6.status}: ${JSON.stringify(r6.body)}`)
    const connector = r6.body.connector as Record<string, unknown>
    assert(typeof connector.id === 'string', 'connector has id')
    const connectorId = connector.id as string

    // 7. GET /projects/:id/connectors — list
    const r7 = await req('GET', `/projects/${projectId}/connectors`)
    assert(r7.status === 200, `list connectors 200, got ${r7.status}`)
    const connectors = r7.body.connectors as Array<Record<string, unknown>>
    assert(connectors.some(c => c.id === connectorId), 'connector in list')

    // 8. DELETE /projects/:id/connectors/:entryId
    const r8 = await req('DELETE', `/projects/${projectId}/connectors/${connectorId}`)
    assert(r8.status === 200, `delete connector 200, got ${r8.status}: ${JSON.stringify(r8.body)}`)
    assert(r8.body.ok === true, 'delete returns ok')

    // 9. Verify connector soft-deleted (not in list anymore)
    const r9 = await req('GET', `/projects/${projectId}/connectors`)
    const connectors2 = r9.body.connectors as Array<Record<string, unknown>>
    assert(!connectors2.some(c => c.id === connectorId), 'deleted connector not in list')

    // 10. Upsert skill twice with same skillId — idempotent
    const r10a = await req('POST', `/projects/${projectId}/skills`, { skillId: 'code-review', enabled: true, config: { level: 'standard' } })
    assert(r10a.status === 200, `upsert skill first time 200, got ${r10a.status}: ${JSON.stringify(r10a.body)}`)
    const r10b = await req('POST', `/projects/${projectId}/skills`, { skillId: 'code-review', enabled: false, config: { level: 'strict' } })
    assert(r10b.status === 200, `upsert skill second time 200, got ${r10b.status}: ${JSON.stringify(r10b.body)}`)
    const skillAfter = r10b.body.skill as Record<string, unknown>
    assert(skillAfter.enabled === false, `skill enabled updated to false, got ${skillAfter.enabled}`)

    // 11. bootstrap manual mode
    const r11 = await req('POST', `/projects/${projectId}/bootstrap`, { mode: 'manual' })
    assert(r11.status === 200, `bootstrap manual 200, got ${r11.status}: ${JSON.stringify(r11.body)}`)
    assert(r11.body.ok === true, 'bootstrap manual returns ok')
    assert(r11.body.composerAgentId === null, 'manual bootstrap has no composerAgentId')
    assert(r11.body.proposal === null, 'manual bootstrap has no proposal')

    // 12. DELETE /projects/:id — soft-delete
    const r12 = await req('DELETE', `/projects/${projectId}`)
    assert(r12.status === 200, `delete project 200, got ${r12.status}`)
    assert(r12.body.ok === true, 'delete returns ok')

    // 13. GET deleted project → 404
    const r13 = await req('GET', `/projects/${projectId}`)
    assert(r13.status === 404, `deleted project → 404, got ${r13.status}`)

    // 14. Unauthorized → 401
    const r14 = await req('GET', '/projects', undefined, 'Bearer bad-token')
    assert(r14.status === 401, `bad token → 401, got ${r14.status}`)

    console.log('All smoke tests passed.')
  } finally {
    await app.close()

    // Cleanup: delete test rows (cascade handles resources/agents)
    try {
      if (projectId) {
        await db.update(messengerProjects).set({ deletedAt: new Date() }).where(eq(messengerProjects.id, projectId))
      }
      await db.update(messengerUsers).set({ deletedAt: new Date() }).where(eq(messengerUsers.id, userId))
    } catch { /* best-effort cleanup */ }
  }
}

main().catch((err) => {
  console.error('Smoke test error:', err)
  process.exit(1)
})
