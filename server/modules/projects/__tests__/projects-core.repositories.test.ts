/**
 * Unit suite for the four "read/write core" project repositories:
 *   - projects.repository.ts          (18 fn)
 *   - project-pages.repository.ts     (6 fn)
 *   - project-relations.repository.ts (6 fn)
 *   - project-partners.repository.ts  (10 fn)
 *
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage (via pnpm):
 *   pnpm test:server:projects-core
 *
 * Direct:
 *   node --experimental-strip-types \
 *        --import=./server/modules/projects/__tests__/tilde-register.mjs \
 *        server/modules/projects/__tests__/projects-core.repositories.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

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
  // Dynamic imports ensure env vars are in process.env before server/config.ts
  // validates them at module-evaluation time.
  const { eq } = await import('drizzle-orm')
  const { useDb } = await import('../../../db/index.ts')
  const { projects } = await import('../../../db/schema/projects.ts')
  const { clients } = await import('../../../db/schema/clients.ts')
  const { contractors } = await import('../../../db/schema/contractors.ts')
  const { designers } = await import('../../../db/schema/designers.ts')
  const { sellers } = await import('../../../db/schema/sellers.ts')
  const { managers, managerProjects } = await import('../../../db/schema/managers.ts')

  const {
    insertProject,
    findProjectById,
    listProjectsWithTaskStats,
    findProjectIdBySlug,
    findProjectDetailBySlug,
    findProjectWorkStatusByProjectId,
    getWorkStatusPhotoCounts,
    getWorkStatusCommentCounts,
    updateProjectBySlug,
    updateProjectStatusBySlug,
    findProjectFull,
    updateProjectProfileBySlug,
    findProjectForDelete,
    findProjectUploads,
    findProjectWorkItemIds,
    findProjectWorkItemPhotosByItemIds,
    nullifyDocumentsProjectId,
    deleteProjectById,
  } = await import('../projects.repository.ts')

  const {
    findProjectIdBySlug: pagesGetIdBySlug,
    listPageContent,
    findPageContent,
    findPageContentId,
    insertPageContent,
    updatePageContent,
  } = await import('../project-pages.repository.ts')

  const {
    findProjectWithProfile,
    findClientsByIds,
    findProjectContractorsForProject,
    findProjectDesignersForProject,
    findProjectSellersForProject,
    findProjectManagersForProject,
  } = await import('../project-relations.repository.ts')

  const {
    findProjectIdBySlug: partnersGetIdBySlug,
    listProjectContractorRows,
    insertProjectContractor,
    deleteProjectContractor,
    listProjectDesignerRows,
    insertProjectDesigner,
    deleteProjectDesigner,
    listProjectSellerRows,
    insertProjectSeller,
    deleteProjectSeller,
  } = await import('../project-partners.repository.ts')

  const uid = randomUUID()

  // Fixture IDs for cleanup
  let projectId: number | undefined
  let projectForDeleteId: number | undefined
  let clientId: number | undefined
  let contractor1Id: number | undefined
  let contractor2Id: number | undefined
  let designer1Id: number | undefined
  let designer2Id: number | undefined
  let sellerId: number | undefined
  let managerId: number | undefined

  try {
    const slug = `test-proj-${uid}`
    const slug2 = `test-proj2-${uid}`

    // ── projects.repository.ts ─────────────────────────────────────────────

    // insertProject
    const project = await insertProject({
      slug,
      title: `Test Project ${uid}`,
      status: 'lead',
      projectType: 'apartment',
      pages: [],
      profile: {},
    })
    projectId = project.id
    assert(project.id > 0, 'insertProject: returns positive id')
    assert(project.slug === slug, 'insertProject: slug matches')
    assert(project.status === 'lead', 'insertProject: status is lead')

    // insertProject — second project used for deleteProjectById test
    const project2 = await insertProject({
      slug: slug2,
      title: `Test Project2 ${uid}`,
    })
    projectForDeleteId = project2.id
    assert(project2.id > 0, 'insertProject (second): returns positive id')

    // findProjectById — found, miss
    const byId = await findProjectById(project.id)
    assert(byId?.id === project.id, 'findProjectById: found')
    assert(byId?.slug === slug, 'findProjectById: slug matches')
    const notById = await findProjectById(-1)
    assert(notById === null, 'findProjectById: null on miss')

    // listProjectsWithTaskStats — result contains our project
    const list = await listProjectsWithTaskStats()
    const inList = list.find(p => p.id === project.id)
    assert(inList !== undefined, 'listProjectsWithTaskStats: project in list')
    assert(typeof inList!.taskTotal === 'number', 'listProjectsWithTaskStats: taskTotal is number')
    assert(inList!.taskTotal === 0, 'listProjectsWithTaskStats: taskTotal is 0 for fresh project')

    // findProjectIdBySlug — found, miss
    const bySlug = await findProjectIdBySlug(slug)
    assert(bySlug?.id === project.id, 'findProjectIdBySlug: found')
    const notBySlug = await findProjectIdBySlug('no-such-slug-xyz-' + uid)
    assert(notBySlug === null, 'findProjectIdBySlug: null on miss')

    // findProjectDetailBySlug — found, miss
    const detail = await findProjectDetailBySlug(slug)
    assert(detail?.id === project.id, 'findProjectDetailBySlug: found')
    assert(detail?.title === `Test Project ${uid}`, 'findProjectDetailBySlug: title matches')
    const notDetail = await findProjectDetailBySlug('no-such-slug-xyz-' + uid)
    assert(notDetail === null, 'findProjectDetailBySlug: null on miss')

    // findProjectWorkStatusByProjectId — empty (no work items on fresh project)
    const workItems = await findProjectWorkStatusByProjectId(project.id)
    assert(Array.isArray(workItems), 'findProjectWorkStatusByProjectId: returns array')
    assert(workItems.length === 0, 'findProjectWorkStatusByProjectId: empty for fresh project')

    // getWorkStatusPhotoCounts — empty
    const photoCounts = await getWorkStatusPhotoCounts(project.id)
    assert(Array.isArray(photoCounts), 'getWorkStatusPhotoCounts: returns array')

    // getWorkStatusCommentCounts — empty
    const commentCounts = await getWorkStatusCommentCounts(project.id)
    assert(Array.isArray(commentCounts), 'getWorkStatusCommentCounts: returns array')

    // updateProjectBySlug — mutates, verified via findProjectDetailBySlug
    const updated = await updateProjectBySlug(slug, { title: `Updated ${uid}` })
    assert(updated?.title === `Updated ${uid}`, 'updateProjectBySlug: title updated')
    const notUpdated = await updateProjectBySlug('no-such-slug-xyz-' + uid, { title: 'x' })
    assert(notUpdated === null, 'updateProjectBySlug: null on miss')

    // updateProjectStatusBySlug
    const statusUpdated = await updateProjectStatusBySlug(slug, 'active')
    assert(statusUpdated?.status === 'active', 'updateProjectStatusBySlug: status updated')
    const notStatusUpdated = await updateProjectStatusBySlug('no-such-slug-xyz-' + uid, 'done')
    assert(notStatusUpdated === null, 'updateProjectStatusBySlug: null on miss')

    // findProjectFull — full row
    const full = await findProjectFull(slug)
    assert(full?.id === project.id, 'findProjectFull: found')
    assert(full?.status === 'active', 'findProjectFull: reflects status update')
    const notFull = await findProjectFull('no-such-slug-xyz-' + uid)
    assert(notFull === null, 'findProjectFull: null on miss')

    // updateProjectProfileBySlug
    await updateProjectProfileBySlug(slug, { city: 'Moscow', area: '80' })
    const afterProfile = await findProjectFull(slug)
    assert(afterProfile?.profile?.city === 'Moscow', 'updateProjectProfileBySlug: profile field set')

    // findProjectForDelete — found, miss
    const forDelete = await findProjectForDelete(slug)
    assert(forDelete?.id === project.id, 'findProjectForDelete: found')
    const notForDelete = await findProjectForDelete('no-such-slug-xyz-' + uid)
    assert(notForDelete === null, 'findProjectForDelete: null on miss')

    // findProjectUploads — empty (no uploads for fresh project)
    const uploadsResult = await findProjectUploads(project.id)
    assert(Array.isArray(uploadsResult), 'findProjectUploads: returns array')

    // findProjectWorkItemIds — empty
    const workItemIds = await findProjectWorkItemIds(project.id)
    assert(Array.isArray(workItemIds), 'findProjectWorkItemIds: returns array')

    // findProjectWorkItemPhotosByItemIds — short-circuits on empty input
    const emptyPhotos = await findProjectWorkItemPhotosByItemIds([])
    assert(Array.isArray(emptyPhotos) && emptyPhotos.length === 0, 'findProjectWorkItemPhotosByItemIds: empty on empty input')

    // nullifyDocumentsProjectId — no-op (no documents), must not throw
    await nullifyDocumentsProjectId(project.id)

    // deleteProjectById — deletes project2, leaving main project intact
    await deleteProjectById(project2.id)
    projectForDeleteId = undefined
    const deletedCheck = await findProjectById(project2.id)
    assert(deletedCheck === null, 'deleteProjectById: project gone after delete')

    // ── project-pages.repository.ts ────────────────────────────────────────

    // findProjectIdBySlug (pages repo) — found, miss
    const pagesProjectId = await pagesGetIdBySlug(slug)
    assert(pagesProjectId === project.id, 'pages.findProjectIdBySlug: returns project id')
    const notPagesProjectId = await pagesGetIdBySlug('no-such-slug-xyz-' + uid)
    assert(notPagesProjectId === null, 'pages.findProjectIdBySlug: null on miss')

    // listPageContent — empty initially
    const emptyContent = await listPageContent(project.id)
    assert(Array.isArray(emptyContent) && emptyContent.length === 0, 'listPageContent: empty for fresh project')

    // insertPageContent
    const pageSlug = `about-${uid}`
    const inserted = await insertPageContent({
      projectId: project.id,
      pageSlug,
      content: { text: 'hello' },
    })
    assert(inserted.id > 0, 'insertPageContent: returns positive id')
    assert(inserted.pageSlug === pageSlug, 'insertPageContent: pageSlug matches')

    // listPageContent — one row after insert
    const contentList = await listPageContent(project.id)
    assert(contentList.length === 1, 'listPageContent: one row after insert')

    // findPageContent — found, miss
    const foundContent = await findPageContent(project.id, pageSlug)
    assert(foundContent?.id === inserted.id, 'findPageContent: found')
    const notFoundContent = await findPageContent(project.id, 'no-such-page-xyz')
    assert(notFoundContent === null, 'findPageContent: null on miss')

    // findPageContentId — found, miss
    const foundContentId = await findPageContentId(project.id, pageSlug)
    assert(foundContentId?.id === inserted.id, 'findPageContentId: found')
    const notFoundContentId = await findPageContentId(project.id, 'no-such-page-xyz')
    assert(notFoundContentId === null, 'findPageContentId: null on miss')

    // updatePageContent
    const updatedContent = await updatePageContent(project.id, pageSlug, { text: 'updated' })
    assert(
      (updatedContent?.content as Record<string, unknown>)?.text === 'updated',
      'updatePageContent: content updated',
    )

    // ── Partner fixtures ────────────────────────────────────────────────────

    const db = useDb()

    const [client] = await db.insert(clients).values({
      name: `Test Client ${uid}`,
      email: `client-${uid}@example.com`,
    }).returning()
    clientId = client.id

    const [c1] = await db.insert(contractors).values({
      slug: `contr1-${uid}`,
      name: `Contractor One ${uid}`,
    }).returning()
    contractor1Id = c1.id

    const [c2] = await db.insert(contractors).values({
      slug: `contr2-${uid}`,
      name: `Contractor Two ${uid}`,
    }).returning()
    contractor2Id = c2.id

    const [d1] = await db.insert(designers).values({
      name: `Designer One ${uid}`,
    }).returning()
    designer1Id = d1.id

    const [d2] = await db.insert(designers).values({
      name: `Designer Two ${uid}`,
    }).returning()
    designer2Id = d2.id

    const [s1] = await db.insert(sellers).values({
      name: `Seller One ${uid}`,
    }).returning()
    sellerId = s1.id

    const [m1] = await db.insert(managers).values({
      name: `Manager One ${uid}`,
    }).returning()
    managerId = m1.id

    // Link manager to project for the relations test below
    await db.insert(managerProjects).values({ managerId: m1.id, projectId: project.id })

    // ── project-partners.repository.ts ────────────────────────────────────

    // findProjectIdBySlug (partners repo) — found, miss
    const partnersProjectId = await partnersGetIdBySlug(slug)
    assert(partnersProjectId === project.id, 'partners.findProjectIdBySlug: returns project id')
    const notPartnersProjectId = await partnersGetIdBySlug('no-such-slug-xyz-' + uid)
    assert(notPartnersProjectId === null, 'partners.findProjectIdBySlug: null on miss')

    // insertProjectContractor — add both; second insert of c1 is idempotent
    await insertProjectContractor(project.id, contractor1Id!)
    await insertProjectContractor(project.id, contractor2Id!)
    await insertProjectContractor(project.id, contractor1Id!) // onConflictDoNothing

    // listProjectContractorRows — 2 rows (no duplicate from idempotent insert)
    const contractorRows = await listProjectContractorRows(project.id)
    assert(contractorRows.length === 2, 'listProjectContractorRows: 2 contractors')
    assert(contractorRows[0]!.contractor.id !== undefined, 'listProjectContractorRows: contractor object present')

    // deleteProjectContractor — remove c2
    await deleteProjectContractor(project.id, contractor2Id!)
    const contractorRowsAfterDelete = await listProjectContractorRows(project.id)
    assert(contractorRowsAfterDelete.length === 1, 'deleteProjectContractor: one remains')
    assert(contractorRowsAfterDelete[0]!.contractor.id === contractor1Id, 'deleteProjectContractor: correct contractor remains')

    // insertProjectDesigner — add both
    await insertProjectDesigner(project.id, designer1Id!)
    await insertProjectDesigner(project.id, designer2Id!)

    // listProjectDesignerRows — 2 rows
    const designerRows = await listProjectDesignerRows(project.id)
    assert(designerRows.length === 2, 'listProjectDesignerRows: 2 designers')
    assert(designerRows[0]!.designer.id !== undefined, 'listProjectDesignerRows: designer object present')

    // deleteProjectDesigner — remove d2
    await deleteProjectDesigner(project.id, designer2Id!)
    const designerRowsAfterDelete = await listProjectDesignerRows(project.id)
    assert(designerRowsAfterDelete.length === 1, 'deleteProjectDesigner: one remains')

    // insertProjectSeller
    await insertProjectSeller(project.id, sellerId!)

    // listProjectSellerRows — 1 row
    const sellerRows = await listProjectSellerRows(project.id)
    assert(sellerRows.length === 1, 'listProjectSellerRows: 1 seller')
    assert(sellerRows[0]!.seller.id === sellerId, 'listProjectSellerRows: correct seller')

    // deleteProjectSeller
    await deleteProjectSeller(project.id, sellerId!)
    const sellerRowsAfterDelete = await listProjectSellerRows(project.id)
    assert(sellerRowsAfterDelete.length === 0, 'deleteProjectSeller: empty after delete')

    // Re-add seller so findProjectSellersForProject below finds it
    await insertProjectSeller(project.id, sellerId!)

    // ── project-relations.repository.ts ───────────────────────────────────

    // findProjectWithProfile — found, miss
    const withProfile = await findProjectWithProfile(slug)
    assert(withProfile?.id === project.id, 'findProjectWithProfile: found')
    assert(typeof withProfile?.profile === 'object', 'findProjectWithProfile: profile is object')
    const notWithProfile = await findProjectWithProfile('no-such-slug-xyz-' + uid)
    assert(notWithProfile === null, 'findProjectWithProfile: null on miss')

    // findClientsByIds — found, empty-array short-circuit
    const clientsFound = await findClientsByIds([clientId!])
    assert(clientsFound.length === 1, 'findClientsByIds: found 1 client')
    assert(clientsFound[0]!.id === clientId, 'findClientsByIds: correct client id')
    const emptyClients = await findClientsByIds([])
    assert(emptyClients.length === 0, 'findClientsByIds: empty on empty input')

    // findProjectContractorsForProject — c1 still linked after deleting c2
    const projectContractors = await findProjectContractorsForProject(project.id)
    assert(projectContractors.length === 1, 'findProjectContractorsForProject: 1 contractor')
    assert(projectContractors[0]!.id === contractor1Id, 'findProjectContractorsForProject: correct contractor')

    // findProjectDesignersForProject — d1 still linked after deleting d2
    const projectDesigners = await findProjectDesignersForProject(project.id)
    assert(projectDesigners.length === 1, 'findProjectDesignersForProject: 1 designer')
    assert(projectDesigners[0]!.id === designer1Id, 'findProjectDesignersForProject: correct designer')

    // findProjectSellersForProject — seller re-added above
    const projectSellers = await findProjectSellersForProject(project.id)
    assert(projectSellers.length === 1, 'findProjectSellersForProject: 1 seller')
    assert(projectSellers[0]!.id === sellerId, 'findProjectSellersForProject: correct seller')

    // findProjectManagersForProject — manager linked above
    const projectManagers = await findProjectManagersForProject(project.id)
    assert(projectManagers.length === 1, 'findProjectManagersForProject: 1 manager')
    assert(projectManagers[0]!.id === managerId, 'findProjectManagersForProject: correct manager')

    console.log(
      'PASS: projects-core.repositories — all 40 exported functions covered, all assertions green',
    )
  } finally {
    const db = useDb()
    // Deleting the project cascades: pageContent, projectContractors,
    // designerProjects, sellerProjects, managerProjects.
    if (projectId !== undefined) {
      await db.delete(projects).where(eq(projects.id, projectId))
    }
    if (projectForDeleteId !== undefined) {
      await db.delete(projects).where(eq(projects.id, projectForDeleteId))
    }
    // Partner entities have no cascade from project — delete manually.
    if (managerId !== undefined) await db.delete(managers).where(eq(managers.id, managerId))
    if (sellerId !== undefined) await db.delete(sellers).where(eq(sellers.id, sellerId))
    if (designer1Id !== undefined) await db.delete(designers).where(eq(designers.id, designer1Id))
    if (designer2Id !== undefined) await db.delete(designers).where(eq(designers.id, designer2Id))
    if (contractor1Id !== undefined) await db.delete(contractors).where(eq(contractors.id, contractor1Id))
    if (contractor2Id !== undefined) await db.delete(contractors).where(eq(contractors.id, contractor2Id))
    if (clientId !== undefined) await db.delete(clients).where(eq(clients.id, clientId))
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
