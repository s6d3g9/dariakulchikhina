/**
 * Unit suite for server/modules/documents/documents.repository.ts
 * and server/modules/gallery/gallery.repository.ts.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage (via pnpm):
 *   pnpm test:server:documents-gallery
 *
 * Direct:
 *   node --experimental-strip-types \
 *        --import=./server/modules/documents/__tests__/tilde-register.mjs \
 *        server/modules/__tests__/documents-gallery.repositories.test.ts
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

// Load root .env so DATABASE_URL is available before any module that reads it
const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../.env')
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
  const { useDb } = await import('../../db/index.ts')
  const { documents, projects, clients, contractors, galleryItems } = await import('../../db/schema/index.ts')
  const {
    findDocumentById,
    findProjectBySlug,
    listDocumentsByProjectId,
    listAllDocumentsWithProject,
    insertDocument,
    updateDocumentRow,
    deleteDocumentRow,
    listPageContentByProjectId,
    listClientsByIds,
    listAllClients,
    listProjectContractorIds,
    listContractorsByIds,
    listAllContractors,
  } = await import('../documents/documents.repository.ts')

  const {
    findGalleryItemById,
    listGalleryItems,
    insertGalleryItem,
    updateGalleryItemRow,
    deleteGalleryItemRow,
    reorderGalleryItemsRows,
  } = await import('../gallery/gallery.repository.ts')

  let projectId: number | undefined
  let clientId: number | undefined
  let contractorId: number | undefined
  let docId: number | undefined
  let galItem1Id: number | undefined
  let galItem2Id: number | undefined
  let galItem3Id: number | undefined

  try {
    // ── Documents repository ─────────────────────────────────────────────────

    // Create a test project
    const db = useDb()
    const uid = randomUUID()
    const projectSlug = `test-doc-project-${uid}`
    const projectRes = await db
      .insert(projects)
      .values({
        slug: projectSlug,
        title: `Test Doc Project ${uid}`,
        profile: {},
      })
      .returning()
    projectId = projectRes[0].id

    // Create test clients
    const client1Res = await db
      .insert(clients)
      .values({
        name: `Test Client 1 ${uid}`,
      })
      .returning()
    clientId = client1Res[0].id

    // Create test contractor
    const contractorRes = await db
      .insert(contractors)
      .values({
        slug: `test-contractor-${uid}`,
        name: `Test Contractor ${uid}`,
      })
      .returning()
    contractorId = contractorRes[0].id

    // insertDocument
    const doc = await insertDocument({
      title: `Test Doc ${uid}`,
      category: 'reference',
      filename: 'test.pdf',
      url: null,
      projectId,
      notes: 'test notes',
      content: null,
      templateKey: null,
    })
    docId = doc.id
    assert(doc.id > 0, 'insertDocument: returns positive id')
    assert(doc.title === `Test Doc ${uid}`, 'insertDocument: title matches')
    assert(doc.category === 'reference', 'insertDocument: category matches')

    // findDocumentById — found, miss
    const foundDoc = await findDocumentById(doc.id)
    assert(foundDoc?.id === doc.id, 'findDocumentById: found')
    const notFoundDoc = await findDocumentById(-1)
    assert(notFoundDoc === null, 'findDocumentById: null on miss')

    // findProjectBySlug — found, miss
    const foundProj = await findProjectBySlug(projectSlug)
    assert(foundProj?.id === projectId, 'findProjectBySlug: found')
    const notFoundProj = await findProjectBySlug(`no-such-slug-${uid}`)
    assert(notFoundProj === null, 'findProjectBySlug: null on miss')

    // listDocumentsByProjectId
    const docsByProj = await listDocumentsByProjectId(projectId)
    assert(docsByProj.length > 0, 'listDocumentsByProjectId: returns documents')
    assert(docsByProj.some((d) => d.id === doc.id), 'listDocumentsByProjectId: includes created doc')

    // listAllDocumentsWithProject
    const allDocs = await listAllDocumentsWithProject()
    assert(allDocs.length > 0, 'listAllDocumentsWithProject: returns documents')
    const withProj = allDocs.find((d) => d.id === doc.id)
    assert(withProj !== undefined, 'listAllDocumentsWithProject: includes created doc')
    assert(withProj?.projectSlug === projectSlug, 'listAllDocumentsWithProject: project info attached')

    // updateDocumentRow
    const updatedDoc = await updateDocumentRow(doc.id, {
      title: `Updated Title ${uid}`,
      notes: 'updated notes',
    })
    assert(updatedDoc?.title === `Updated Title ${uid}`, 'updateDocumentRow: title updated')
    assert(updatedDoc?.notes === 'updated notes', 'updateDocumentRow: notes updated')

    // listPageContentByProjectId (may return empty or have items)
    const pageContent = await listPageContentByProjectId(projectId)
    assert(Array.isArray(pageContent), 'listPageContentByProjectId: returns array')

    // listClientsByIds — with items, empty list
    const clientsByIds = await listClientsByIds([clientId])
    assert(clientsByIds.length === 1, 'listClientsByIds: returns items')
    assert(clientsByIds[0].id === clientId, 'listClientsByIds: correct client')
    const emptyClients = await listClientsByIds([])
    assert(emptyClients.length === 0, 'listClientsByIds: empty array for empty input')

    // listAllClients
    const allClients = await listAllClients()
    assert(allClients.length > 0, 'listAllClients: returns clients')
    assert(allClients.some((c) => c.id === clientId), 'listAllClients: includes created client')

    // listProjectContractorIds (should be empty for new project)
    const contractorIds = await listProjectContractorIds(projectId)
    assert(Array.isArray(contractorIds), 'listProjectContractorIds: returns array')

    // listContractorsByIds — with items, empty list
    const contractorsByIds = await listContractorsByIds([contractorId])
    assert(contractorsByIds.length === 1, 'listContractorsByIds: returns items')
    assert(contractorsByIds[0].id === contractorId, 'listContractorsByIds: correct contractor')
    const emptyContractors = await listContractorsByIds([])
    assert(emptyContractors.length === 0, 'listContractorsByIds: empty array for empty input')

    // listAllContractors
    const allContractors = await listAllContractors()
    assert(allContractors.length > 0, 'listAllContractors: returns contractors')
    assert(allContractors.some((c) => c.id === contractorId), 'listAllContractors: includes created contractor')

    // deleteDocumentRow — verify deletion
    const deletedDoc = await deleteDocumentRow(doc.id)
    assert(deletedDoc?.id === doc.id, 'deleteDocumentRow: returns deleted doc')
    const afterDelete = await findDocumentById(doc.id)
    assert(afterDelete === null, 'deleteDocumentRow: document truly deleted')

    // ── Gallery repository ───────────────────────────────────────────────────

    const gUid = randomUUID()

    // insertGalleryItem
    const item1 = await insertGalleryItem({
      title: `Gallery Item 1 ${gUid}`,
      category: 'interior',
      image: 'image1.jpg',
      images: ['image1.jpg', 'image2.jpg'],
      tags: ['modern', 'living-room'],
      description: 'A beautiful modern interior',
      featured: true,
      width: 800,
      height: 600,
      sortOrder: 1,
      properties: { color: 'blue' },
    })
    galItem1Id = item1.id
    assert(item1.id > 0, 'insertGalleryItem: returns positive id')
    assert(item1.title === `Gallery Item 1 ${gUid}`, 'insertGalleryItem: title matches')
    assert(item1.featured === true, 'insertGalleryItem: featured matches')

    const item2 = await insertGalleryItem({
      title: `Gallery Item 2 ${gUid}`,
      category: 'interior',
      image: 'image3.jpg',
      images: ['image3.jpg'],
      tags: ['modern'],
      description: 'Another interior',
      featured: false,
      width: 600,
      height: 400,
      sortOrder: 2,
      properties: {},
    })
    galItem2Id = item2.id

    const item3 = await insertGalleryItem({
      title: `Gallery Item 3 ${gUid}`,
      category: 'exterior',
      image: null,
      images: [],
      tags: ['landscape'],
      description: null,
      featured: false,
      width: null,
      height: null,
      sortOrder: 3,
      properties: {},
    })
    galItem3Id = item3.id

    // findGalleryItemById — found, miss
    const foundItem = await findGalleryItemById(item1.id)
    assert(foundItem?.id === item1.id, 'findGalleryItemById: found')
    const notFoundItem = await findGalleryItemById(-1)
    assert(notFoundItem === null, 'findGalleryItemById: null on miss')

    // listGalleryItems — no filters, with category, with featured
    const allItems = await listGalleryItems()
    assert(allItems.length >= 3, 'listGalleryItems: returns items')

    const byCategory = await listGalleryItems({ category: 'interior' })
    assert(byCategory.length >= 2, 'listGalleryItems: filter by category')
    assert(byCategory.every((i) => i.category === 'interior'), 'listGalleryItems: all match category')

    const featured = await listGalleryItems({ featured: 'true' })
    assert(featured.length > 0, 'listGalleryItems: filter by featured')
    assert(featured.some((i) => i.id === item1.id), 'listGalleryItems: featured includes item1')

    const searched = await listGalleryItems({ search: `Item 2 ${gUid}` })
    assert(searched.length > 0, 'listGalleryItems: search filter works')
    assert(searched.some((i) => i.id === item2.id), 'listGalleryItems: search finds item2')

    const byTag = await listGalleryItems({ tag: 'modern' })
    assert(byTag.length >= 2, 'listGalleryItems: filter by tag')

    // updateGalleryItemRow
    const updatedItem = await updateGalleryItemRow(item1.id, {
      title: `Updated Gallery ${gUid}`,
      featured: false,
      width: 1024,
    })
    assert(updatedItem?.title === `Updated Gallery ${gUid}`, 'updateGalleryItemRow: title updated')
    assert(updatedItem?.featured === false, 'updateGalleryItemRow: featured updated')
    assert(updatedItem?.width === 1024, 'updateGalleryItemRow: width updated')

    // reorderGalleryItemsRows — permute and verify identity/order
    const newOrder = [
      { id: item3.id, sortOrder: 10 },
      { id: item1.id, sortOrder: 20 },
      { id: item2.id, sortOrder: 30 },
    ]
    await reorderGalleryItemsRows(newOrder)

    // Verify reorder preserved IDs and set correct sort order
    const reorderedItem1 = await findGalleryItemById(item1.id)
    assert(reorderedItem1?.id === item1.id, 'reorderGalleryItemsRows: identity preserved for item1')
    assert(reorderedItem1?.sortOrder === 20, 'reorderGalleryItemsRows: sortOrder 20 for item1')

    const reorderedItem2 = await findGalleryItemById(item2.id)
    assert(reorderedItem2?.id === item2.id, 'reorderGalleryItemsRows: identity preserved for item2')
    assert(reorderedItem2?.sortOrder === 30, 'reorderGalleryItemsRows: sortOrder 30 for item2')

    const reorderedItem3 = await findGalleryItemById(item3.id)
    assert(reorderedItem3?.id === item3.id, 'reorderGalleryItemsRows: identity preserved for item3')
    assert(reorderedItem3?.sortOrder === 10, 'reorderGalleryItemsRows: sortOrder 10 for item3')

    // Verify list order reflects new sort order
    const reorderedList = await listGalleryItems()
    const indices = [
      reorderedList.findIndex((i) => i.id === item3.id),
      reorderedList.findIndex((i) => i.id === item1.id),
      reorderedList.findIndex((i) => i.id === item2.id),
    ]
    assert(indices[0] < indices[1], 'reorderGalleryItemsRows: item3 comes before item1 in list')
    assert(indices[1] < indices[2], 'reorderGalleryItemsRows: item1 comes before item2 in list')

    // deleteGalleryItemRow — verify deletion
    const deletedItem = await deleteGalleryItemRow(item1.id)
    assert(deletedItem?.id === item1.id, 'deleteGalleryItemRow: returns deleted item')
    const afterDelItem = await findGalleryItemById(item1.id)
    assert(afterDelItem === null, 'deleteGalleryItemRow: item truly deleted')

    console.log('PASS: documents-gallery.repositories — all 19 exported functions covered, all assertions green')
  } finally {
    if (docId !== undefined) {
      try {
        const db = useDb()
        await db.delete(documents).where(eq(documents.id, docId))
      } catch { /* already deleted */ }
    }
    if (galItem1Id !== undefined) {
      try {
        const db = useDb()
        await db.delete(galleryItems).where(eq(galleryItems.id, galItem1Id))
      } catch { /* already deleted */ }
    }
    if (galItem2Id !== undefined) {
      try {
        const db = useDb()
        await db.delete(galleryItems).where(eq(galleryItems.id, galItem2Id))
      } catch { /* already deleted */ }
    }
    if (galItem3Id !== undefined) {
      try {
        const db = useDb()
        await db.delete(galleryItems).where(eq(galleryItems.id, galItem3Id))
      } catch { /* already deleted */ }
    }
    if (clientId !== undefined) {
      try {
        const db = useDb()
        await db.delete(clients).where(eq(clients.id, clientId))
      } catch { /* already deleted */ }
    }
    if (contractorId !== undefined) {
      try {
        const db = useDb()
        await db.delete(contractors).where(eq(contractors.id, contractorId))
      } catch { /* already deleted */ }
    }
    if (projectId !== undefined) {
      try {
        const db = useDb()
        await db.delete(projects).where(eq(projects.id, projectId))
      } catch { /* already deleted */ }
    }
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
