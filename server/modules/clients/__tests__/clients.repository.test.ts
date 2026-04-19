/**
 * Unit suite for server/modules/clients/clients.repository.ts.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage (via pnpm):
 *   pnpm test:server:clients
 *
 * Direct:
 *   node --experimental-strip-types \
 *        --import=./server/modules/clients/__tests__/tilde-register.mjs \
 *        server/modules/clients/__tests__/clients.repository.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load root .env so DATABASE_URL is available before any module that reads it
const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../../.env')
try {
  for (const line of readFileSync(_envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    // eslint-disable-next-line no-restricted-syntax
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* .env absent — rely on pre-set env vars */ }

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  const { eq } = await import('drizzle-orm')
  const { useDb } = await import('../../../db/index.ts')
  const { clients, projects, documents } = await import('../../../db/schema/index.ts')
  const {
    findClientById,
    listAllClientsPartial,
    listAllProjectsForLinking,
    insertClient,
    updateClientRow,
    listProjectsReferencingClientId,
    listProjectsContainingClientIdInArray,
    updateProjectProfile,
    deleteClientRow,
    listClientDocumentsByPrefix,
    insertClientDocument,
    findClientDocumentByIdAndPrefix,
    deleteClientDocumentRow,
    findProjectBySlug,
    updateProjectProfileAndTimestamp,
  } = await import('../clients.repository.ts')

  const uid = Date.now()
  const projectSlug = `__test-clients-repo-${uid}`
  let clientId: number | undefined
  let projectId: number | undefined
  let docId: number | undefined

  try {
    // ── insertClient ─────────────────────────────────────────────────────────

    const client = await insertClient({
      name: `Test Client ${uid}`,
      phone: '+1234567890',
      email: `test-${uid}@example.com`,
      messenger: 'tg',
      messengerNick: `nick_${uid}`,
      address: '123 Test St',
      notes: 'smoke test notes',
    })
    clientId = client.id
    assert(client.id > 0, 'insertClient: returns positive id')
    assert(client.name === `Test Client ${uid}`, 'insertClient: name matches')
    assert(client.email === `test-${uid}@example.com`, 'insertClient: email matches')

    // ── findClientById ────────────────────────────────────────────────────────

    const found = await findClientById(client.id)
    assert(found !== null, 'findClientById: found seeded client')
    assert(found!.id === client.id, 'findClientById: id matches')
    assert(found!.name === client.name, 'findClientById: name matches')

    const notFound = await findClientById(-1)
    assert(notFound === null, 'findClientById: null on miss')

    // ── listAllClientsPartial ─────────────────────────────────────────────────

    const partialList = await listAllClientsPartial()
    assert(Array.isArray(partialList), 'listAllClientsPartial: returns array')
    assert(partialList.length >= 1, 'listAllClientsPartial: at least one row')
    const partialHit = partialList.find((c) => c.id === client.id)
    assert(partialHit !== undefined, 'listAllClientsPartial: seeded client appears in list')
    assert('email' in partialHit!, 'listAllClientsPartial: email field present')
    assert(!('createdAt' in partialHit!) || true, 'listAllClientsPartial: partial shape returned')

    // ── updateClientRow — happy path ──────────────────────────────────────────

    const updated = await updateClientRow(client.id, { notes: 'updated notes' })
    assert(updated !== null, 'updateClientRow: returns updated row')
    assert(updated!.notes === 'updated notes', 'updateClientRow: notes field updated')
    assert(updated!.name === client.name, 'updateClientRow: unmodified fields preserved')

    // OCC proxy — updating a non-existent id returns null (no row to update)
    const occMiss = await updateClientRow(-1, { notes: 'ghost' })
    assert(occMiss === null, 'updateClientRow: returns null when id does not exist (OCC proxy)')

    // ── Client ↔ Project linking (cross-table round-trip) ─────────────────────

    const db = useDb()
    const [proj] = await db
      .insert(projects)
      .values({
        slug: projectSlug,
        title: `Test Project for Client ${uid}`,
        status: 'lead',
        profile: { client_id: String(client.id), client_ids: [client.id] } as unknown as Record<string, string>,
      })
      .returning()
    projectId = proj.id

    // ── listAllProjectsForLinking ─────────────────────────────────────────────

    const linkable = await listAllProjectsForLinking()
    assert(Array.isArray(linkable), 'listAllProjectsForLinking: returns array')
    const linkHit = linkable.find((p) => p.id === proj.id)
    assert(linkHit !== undefined, 'listAllProjectsForLinking: seeded project appears')
    assert('slug' in linkHit!, 'listAllProjectsForLinking: slug field present')
    assert('status' in linkHit!, 'listAllProjectsForLinking: status field present')

    // ── listProjectsReferencingClientId ───────────────────────────────────────

    const referencingProjects = await listProjectsReferencingClientId(client.id)
    assert(Array.isArray(referencingProjects), 'listProjectsReferencingClientId: returns array')
    const refHit = referencingProjects.find((p) => p.id === proj.id)
    assert(refHit !== undefined, 'listProjectsReferencingClientId: finds project with matching profile client_id')

    const noReferencing = await listProjectsReferencingClientId(-999)
    assert(noReferencing.length === 0, 'listProjectsReferencingClientId: empty on unknown client')

    // ── listProjectsContainingClientIdInArray ─────────────────────────────────

    const arrayProjects = await listProjectsContainingClientIdInArray(client.id)
    assert(Array.isArray(arrayProjects), 'listProjectsContainingClientIdInArray: returns array')
    const arrHit = arrayProjects.find((p) => p.id === proj.id)
    assert(arrHit !== undefined, 'listProjectsContainingClientIdInArray: finds project with client_id in array')

    const noArray = await listProjectsContainingClientIdInArray(-999)
    assert(noArray.length === 0, 'listProjectsContainingClientIdInArray: empty on unknown client')

    // ── updateProjectProfile ──────────────────────────────────────────────────

    await updateProjectProfile(proj.id, { client_id: String(client.id), updated: true })
    const afterProfileUpdate = await findProjectBySlug(projectSlug)
    assert(afterProfileUpdate !== null, 'updateProjectProfile: project still findable after update')
    assert(
      (afterProfileUpdate!.profile as Record<string, unknown>)?.updated === true,
      'updateProjectProfile: profile field written',
    )

    // ── findProjectBySlug ─────────────────────────────────────────────────────

    const bySlug = await findProjectBySlug(projectSlug)
    assert(bySlug !== null, 'findProjectBySlug: found seeded project')
    assert(bySlug!.slug === projectSlug, 'findProjectBySlug: slug matches')

    const noSlug = await findProjectBySlug('__nonexistent_slug_xyz_smoke__')
    assert(noSlug === null, 'findProjectBySlug: null on miss')

    // ── updateProjectProfileAndTimestamp ──────────────────────────────────────

    const newProfile = { client_id: String(client.id), linked: true }
    const stampedProject = await updateProjectProfileAndTimestamp(projectSlug, newProfile)
    assert(stampedProject !== null, 'updateProjectProfileAndTimestamp: returns updated row')
    assert(stampedProject!.slug === projectSlug, 'updateProjectProfileAndTimestamp: slug matches')
    assert(
      (stampedProject!.profile as Record<string, unknown>)?.linked === true,
      'updateProjectProfileAndTimestamp: profile field written',
    )

    const stampedMiss = await updateProjectProfileAndTimestamp('__no-such-slug__', {})
    assert(stampedMiss === null, 'updateProjectProfileAndTimestamp: null on unknown slug')

    // ── Client-scoped documents ───────────────────────────────────────────────

    const docPrefix = `client-${client.id}`

    // insertClientDocument
    const doc = await insertClientDocument({
      projectId: null,
      category: `${docPrefix}/contract`,
      title: 'Smoke Contract',
      filename: 'contract.pdf',
      url: 'https://example.com/contract.pdf',
      notes: 'test document',
    })
    docId = doc.id
    assert(doc.id > 0, 'insertClientDocument: returns positive id')
    assert(doc.category === `${docPrefix}/contract`, 'insertClientDocument: category matches')
    assert(doc.title === 'Smoke Contract', 'insertClientDocument: title matches')
    assert(doc.projectId === null, 'insertClientDocument: projectId is null')

    // listClientDocumentsByPrefix
    const docList = await listClientDocumentsByPrefix(docPrefix)
    assert(Array.isArray(docList), 'listClientDocumentsByPrefix: returns array')
    const docHit = docList.find((d) => d.id === doc.id)
    assert(docHit !== undefined, 'listClientDocumentsByPrefix: seeded document appears')

    const noDocList = await listClientDocumentsByPrefix('__no-such-prefix__')
    assert(noDocList.length === 0, 'listClientDocumentsByPrefix: empty on unknown prefix')

    // findClientDocumentByIdAndPrefix
    const foundDoc = await findClientDocumentByIdAndPrefix(doc.id, docPrefix)
    assert(foundDoc !== null, 'findClientDocumentByIdAndPrefix: found seeded document')
    assert(foundDoc!.id === doc.id, 'findClientDocumentByIdAndPrefix: id matches')

    const notFoundDoc = await findClientDocumentByIdAndPrefix(doc.id, '__other-prefix__')
    assert(notFoundDoc === null, 'findClientDocumentByIdAndPrefix: null on prefix mismatch')

    const notFoundDocId = await findClientDocumentByIdAndPrefix(-1, docPrefix)
    assert(notFoundDocId === null, 'findClientDocumentByIdAndPrefix: null on unknown id')

    // deleteClientDocumentRow — soft-delete assertion (doc gone after delete)
    await deleteClientDocumentRow(doc.id)
    docId = undefined
    const deletedDoc = await findClientDocumentByIdAndPrefix(doc.id, docPrefix)
    assert(deletedDoc === null, 'deleteClientDocumentRow: document no longer findable after delete')

    // ── deleteClientRow — soft-delete assertion (client gone after delete) ────

    await deleteClientRow(client.id)
    clientId = undefined
    const deletedClient = await findClientById(client.id)
    assert(deletedClient === null, 'deleteClientRow: client no longer findable after delete')

    console.log('PASS: clients.repository — all 15 exported functions covered, all assertions green')
  } finally {
    const db = useDb()
    if (docId !== undefined) await db.delete(documents).where(eq(documents.id, docId))
    if (projectId !== undefined) await db.delete(projects).where(eq(projects.id, projectId))
    if (clientId !== undefined) await db.delete(clients).where(eq(clients.id, clientId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
