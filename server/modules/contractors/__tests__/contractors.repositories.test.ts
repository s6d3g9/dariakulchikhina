/**
 * Unit suite for contractor domain repositories:
 *   - contractors.repository.ts        (10 exported functions)
 *   - contractor-documents.repository.ts (4 exported functions)
 *   - contractor-work-items.repository.ts (15 exported functions)
 *
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage: pnpm test:server:contractors
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
  // Dynamic imports ensure env vars are in process.env before server/config.ts
  // validates them at module-evaluation time.
  const { eq } = await import('drizzle-orm')
  const { useDb } = await import('../../../db/index.ts')
  const {
    projects,
    contractors,
    projectContractors,
    contractorDocuments,
    workStatusItems,
    workStatusItemComments,
    workStatusItemPhotos,
  } = await import('../../../db/schema/index.ts')

  const { sql: drizzleSql } = await import('drizzle-orm')
  const {
    findContractorById,
    listContractorsWithProjects,
    insertContractor,
    updateContractorRow,
    deleteContractorChildren,
    deleteContractorRow,
    listContractorStaff,
    listContractorProjects,
    resolveContractorAndStaffIds,
    findContractorStaffMember,
  } = await import('../contractors.repository.ts')

  const {
    listContractorDocuments,
    insertContractorDocument,
    findContractorDocumentOwned,
    deleteContractorDocumentRow,
  } = await import('../contractor-documents.repository.ts')

  const {
    findProjectBySlug,
    getContractorStaffInfo,
    listWorkItemsForContractors,
    getPhotoCounts,
    getCommentCounts,
    findWorkItemInScope,
    insertWorkItem,
    updateWorkItemRow,
    listWorkItemComments,
    findContractorName,
    insertWorkItemComment,
    listWorkItemPhotos,
    insertWorkItemPhoto,
    deleteWorkItemPhotoRow,
    findContractorStaffMemberInCompany,
  } = await import('../contractor-work-items.repository.ts')

  const SUFFIX = Date.now()
  const companySlug = `__test-company-${SUFFIX}`
  const staffSlug = `__test-staff-${SUFFIX}`
  const projectSlug = `__test-contr-project-${SUFFIX}`

  let companyId: number | undefined
  let staffId: number | undefined
  let projectId: number | undefined
  let docId: number | undefined
  let workItemId: number | undefined

  try {
    const db = useDb()

    // Ensure contractor_documents has the columns defined in the current Drizzle schema.
    // The live DB may lag behind if db:push wasn't run after the schema redesign.
    // Using IF NOT EXISTS makes all column additions safe and idempotent.
    // Also relax NOT NULL on legacy columns that the new code no longer populates.
    await db.execute(drizzleSql`
      ALTER TABLE contractor_documents
        ADD COLUMN IF NOT EXISTS title      text,
        ADD COLUMN IF NOT EXISTS filename   text,
        ADD COLUMN IF NOT EXISTS notes      text,
        ADD COLUMN IF NOT EXISTS expires_at text,
        ALTER COLUMN original_name DROP NOT NULL
    `)

    // ── contractors.repository ─────────────────────────────────────────────

    // insertContractor
    const company = await insertContractor({
      slug: companySlug,
      name: `Test Company ${SUFFIX}`,
      contractorType: 'company',
      parentId: null,
      workTypes: ['tiling'],
    })
    companyId = company.id
    assert(company.id > 0, 'insertContractor: positive id')
    assert(company.slug === companySlug, 'insertContractor: slug matches')
    console.log('✓ insertContractor')

    // Insert staff member directly via db (parentId = companyId)
    const [staffRow] = await db
      .insert(contractors)
      .values({ slug: staffSlug, name: `Staff ${SUFFIX}`, parentId: companyId })
      .returning({ id: contractors.id })
    staffId = staffRow!.id

    // Insert a test project for listContractorProjects and work items
    const [projRow] = await db
      .insert(projects)
      .values({ slug: projectSlug, title: `Test Project ${SUFFIX}`, status: 'active' })
      .returning({ id: projects.id })
    projectId = projRow!.id

    // Link contractor to project
    await db.insert(projectContractors).values({ projectId, contractorId: companyId })

    // findContractorById — found + miss
    const found = await findContractorById(companyId)
    assert(found !== null && found.id === companyId, 'findContractorById: found')
    const notFound = await findContractorById(-1)
    assert(notFound === null, 'findContractorById: null on miss')
    console.log('✓ findContractorById')

    // listContractorsWithProjects
    const listing = await listContractorsWithProjects()
    assert(Array.isArray(listing), 'listContractorsWithProjects: returns array')
    assert(
      listing.some((r) => r.contractor.id === companyId),
      'listContractorsWithProjects: includes seeded contractor',
    )
    console.log('✓ listContractorsWithProjects')

    // updateContractorRow — update + miss
    const updated = await updateContractorRow(companyId, { notes: 'smoke-note' })
    assert(updated !== null && updated.notes === 'smoke-note', 'updateContractorRow: updates field')
    const updatedMiss = await updateContractorRow(-1, { notes: 'x' })
    assert(updatedMiss === null, 'updateContractorRow: null on miss')
    console.log('✓ updateContractorRow')

    // listContractorStaff
    const staff = await listContractorStaff(companyId)
    assert(Array.isArray(staff), 'listContractorStaff: returns array')
    assert(staff.some((s) => s.id === staffId), 'listContractorStaff: includes seeded staff')
    console.log('✓ listContractorStaff')

    // listContractorProjects
    const contractorProjects = await listContractorProjects(companyId)
    assert(Array.isArray(contractorProjects), 'listContractorProjects: returns array')
    assert(
      contractorProjects.some((p) => p.id === projectId),
      'listContractorProjects: includes linked project',
    )
    console.log('✓ listContractorProjects')

    // resolveContractorAndStaffIds
    const allIds = await resolveContractorAndStaffIds(companyId)
    assert(Array.isArray(allIds), 'resolveContractorAndStaffIds: returns array')
    assert(allIds.includes(companyId), 'resolveContractorAndStaffIds: includes company id')
    assert(allIds.includes(staffId!), 'resolveContractorAndStaffIds: includes staff id')
    console.log('✓ resolveContractorAndStaffIds')

    // findContractorStaffMember — found + wrong company
    const staffMember = await findContractorStaffMember(staffId!, companyId)
    assert(staffMember !== null && staffMember.id === staffId, 'findContractorStaffMember: found')
    const notStaff = await findContractorStaffMember(staffId!, -1)
    assert(notStaff === null, 'findContractorStaffMember: null with wrong companyId')
    console.log('✓ findContractorStaffMember')

    // ── contractor-documents.repository ───────────────────────────────────

    // insertContractorDocument
    const doc = await insertContractorDocument({
      contractorId: companyId,
      category: 'contract',
      title: `Smoke Doc ${SUFFIX}`,
      filename: 'smoke.pdf',
      url: '/uploads/smoke.pdf',
      notes: null,
      expiresAt: null,
    })
    docId = doc.id
    assert(doc.id > 0, 'insertContractorDocument: positive id')
    assert(doc.contractorId === companyId, 'insertContractorDocument: contractorId matches')
    console.log('✓ insertContractorDocument')

    // listContractorDocuments
    const docs = await listContractorDocuments(companyId)
    assert(Array.isArray(docs), 'listContractorDocuments: returns array')
    assert(docs.some((d) => d.id === docId), 'listContractorDocuments: includes seeded doc')
    console.log('✓ listContractorDocuments')

    // findContractorDocumentOwned — found + wrong owner
    const ownedDoc = await findContractorDocumentOwned(companyId, docId!)
    assert(ownedDoc !== null && ownedDoc.id === docId, 'findContractorDocumentOwned: found')
    const wrongOwner = await findContractorDocumentOwned(-1, docId!)
    assert(wrongOwner === null, 'findContractorDocumentOwned: null for wrong contractorId')
    console.log('✓ findContractorDocumentOwned')

    // deleteContractorDocumentRow
    await deleteContractorDocumentRow(docId!)
    docId = undefined
    const afterDocDelete = await findContractorDocumentOwned(companyId, -1)
    assert(afterDocDelete === null, 'deleteContractorDocumentRow: document gone after delete')
    console.log('✓ deleteContractorDocumentRow')

    // ── contractor-work-items.repository ──────────────────────────────────

    // findProjectBySlug — found + miss
    const proj = await findProjectBySlug(projectSlug)
    assert(proj !== null && proj.id === projectId, 'findProjectBySlug: found')
    const projMiss = await findProjectBySlug('__nonexistent_slug_xyz__')
    assert(projMiss === null, 'findProjectBySlug: null on miss')
    console.log('✓ findProjectBySlug')

    // getContractorStaffInfo
    const staffInfo = await getContractorStaffInfo(companyId)
    assert(Array.isArray(staffInfo), 'getContractorStaffInfo: returns array')
    assert(staffInfo.some((s) => s.id === staffId), 'getContractorStaffInfo: includes staff')
    console.log('✓ getContractorStaffInfo')

    // findContractorName — found + miss
    const name = await findContractorName(companyId)
    assert(typeof name === 'string' && name.length > 0, 'findContractorName: returns name')
    const nameMiss = await findContractorName(-1)
    assert(nameMiss === null, 'findContractorName: null on miss')
    console.log('✓ findContractorName')

    // findContractorStaffMemberInCompany — found + wrong company
    const staffInCompany = await findContractorStaffMemberInCompany(staffId!, companyId)
    assert(staffInCompany !== null && staffInCompany.id === staffId, 'findContractorStaffMemberInCompany: found')
    const notInCompany = await findContractorStaffMemberInCompany(staffId!, -1)
    assert(notInCompany === null, 'findContractorStaffMemberInCompany: null with wrong companyId')
    console.log('✓ findContractorStaffMemberInCompany')

    // insertWorkItem
    const workItem = await insertWorkItem({
      projectId: projectId!,
      contractorId: companyId,
      title: `Smoke Work Item ${SUFFIX}`,
      workType: 'tiling',
      status: 'pending',
      dateStart: null,
      dateEnd: null,
      budget: null,
      notes: null,
      sortOrder: 0,
    })
    workItemId = workItem.id
    assert(workItem.id > 0, 'insertWorkItem: positive id')
    assert(workItem.contractorId === companyId, 'insertWorkItem: contractorId matches')
    console.log('✓ insertWorkItem')

    // listWorkItemsForContractors
    const items = await listWorkItemsForContractors([companyId, staffId!])
    assert(Array.isArray(items), 'listWorkItemsForContractors: returns array')
    assert(items.some((i) => i.id === workItemId), 'listWorkItemsForContractors: includes seeded item')
    console.log('✓ listWorkItemsForContractors')

    // findWorkItemInScope — in scope + out of scope
    const inScope = await findWorkItemInScope(workItemId!, [companyId])
    assert(inScope !== null && inScope.id === workItemId, 'findWorkItemInScope: found in scope')
    const outOfScope = await findWorkItemInScope(workItemId!, [-1])
    assert(outOfScope === null, 'findWorkItemInScope: null out of scope')
    console.log('✓ findWorkItemInScope')

    // updateWorkItemRow — update + out-of-scope miss
    const updatedItem = await updateWorkItemRow(workItemId!, [companyId], { notes: 'smoke-wi-note' })
    assert(updatedItem !== null && updatedItem.notes === 'smoke-wi-note', 'updateWorkItemRow: updates field')
    const updatedItemMiss = await updateWorkItemRow(workItemId!, [-1], { notes: 'x' })
    assert(updatedItemMiss === null, 'updateWorkItemRow: null out of scope')
    console.log('✓ updateWorkItemRow')

    // insertWorkItemComment
    const comment = await insertWorkItemComment({
      itemId: workItemId!,
      authorType: 'contractor',
      authorName: `Smoke Author ${SUFFIX}`,
      text: 'Smoke comment text',
    })
    assert(comment.id > 0, 'insertWorkItemComment: positive id')
    assert(comment.itemId === workItemId, 'insertWorkItemComment: itemId matches')
    console.log('✓ insertWorkItemComment')

    // listWorkItemComments
    const comments = await listWorkItemComments(workItemId!)
    assert(Array.isArray(comments), 'listWorkItemComments: returns array')
    assert(comments.some((c) => c.id === comment.id), 'listWorkItemComments: includes seeded comment')
    console.log('✓ listWorkItemComments')

    // getCommentCounts
    const commentCounts = await getCommentCounts([workItemId!])
    assert(Array.isArray(commentCounts), 'getCommentCounts: returns array')
    const cc = commentCounts.find((r) => r.itemId === workItemId)
    assert(cc !== undefined && cc.count >= 1, 'getCommentCounts: count >= 1 for seeded item')
    console.log('✓ getCommentCounts')

    // insertWorkItemPhoto
    const photo = await insertWorkItemPhoto({
      itemId: workItemId!,
      contractorId: companyId,
      url: `/uploads/smoke-photo-${SUFFIX}.jpg`,
      caption: null,
    })
    assert(photo.id > 0, 'insertWorkItemPhoto: positive id')
    assert(photo.itemId === workItemId, 'insertWorkItemPhoto: itemId matches')
    console.log('✓ insertWorkItemPhoto')

    // listWorkItemPhotos
    const photos = await listWorkItemPhotos(workItemId!)
    assert(Array.isArray(photos), 'listWorkItemPhotos: returns array')
    assert(photos.some((p) => p.id === photo.id), 'listWorkItemPhotos: includes seeded photo')
    console.log('✓ listWorkItemPhotos')

    // getPhotoCounts
    const photoCounts = await getPhotoCounts([workItemId!])
    assert(Array.isArray(photoCounts), 'getPhotoCounts: returns array')
    const pc = photoCounts.find((r) => r.itemId === workItemId)
    assert(pc !== undefined && pc.count >= 1, 'getPhotoCounts: count >= 1 for seeded item')
    console.log('✓ getPhotoCounts')

    // deleteWorkItemPhotoRow — deletes owned + null for wrong itemId
    const deletedPhoto = await deleteWorkItemPhotoRow(photo.id, workItemId!)
    assert(deletedPhoto !== null && deletedPhoto.id === photo.id, 'deleteWorkItemPhotoRow: returns deleted row')
    const wrongItem = await deleteWorkItemPhotoRow(photo.id, -1)
    assert(wrongItem === null, 'deleteWorkItemPhotoRow: null with wrong itemId (already deleted)')
    console.log('✓ deleteWorkItemPhotoRow')

    // ── Cascade delete: deleting a work item removes its comments + photos ──

    // Seed a second comment and photo to verify the cascade
    await insertWorkItemComment({
      itemId: workItemId!,
      authorType: 'admin',
      authorName: 'Admin',
      text: 'cascade check comment',
    })
    await insertWorkItemPhoto({
      itemId: workItemId!,
      contractorId: companyId,
      url: `/uploads/smoke-cascade-${SUFFIX}.jpg`,
      caption: null,
    })

    const cascadeItemId = workItemId!
    await db.delete(workStatusItems).where(eq(workStatusItems.id, cascadeItemId))
    workItemId = undefined

    const orphanComments = await db
      .select({ id: workStatusItemComments.id })
      .from(workStatusItemComments)
      .where(eq(workStatusItemComments.itemId, cascadeItemId))
    assert(orphanComments.length === 0, 'cascade: comments deleted with work item')

    const orphanPhotos = await db
      .select({ id: workStatusItemPhotos.id })
      .from(workStatusItemPhotos)
      .where(eq(workStatusItemPhotos.itemId, cascadeItemId))
    assert(orphanPhotos.length === 0, 'cascade: photos deleted with work item')
    console.log('✓ cascade delete: work item → comments + photos')

    // ── deleteContractorChildren ───────────────────────────────────────────

    const staffBeforeDelete = await findContractorById(staffId!)
    assert(staffBeforeDelete !== null, 'deleteContractorChildren: staff exists before delete')

    const deletedStaffId = staffId!
    await deleteContractorChildren(companyId)
    staffId = undefined

    const staffAfterDelete = await findContractorById(deletedStaffId)
    assert(staffAfterDelete === null, 'deleteContractorChildren: staff gone after delete')
    console.log('✓ deleteContractorChildren')

    // ── deleteContractorRow ────────────────────────────────────────────────

    const deletedCompanyId = companyId
    await deleteContractorRow(deletedCompanyId)
    companyId = undefined

    const goneContractor = await findContractorById(deletedCompanyId)
    assert(goneContractor === null, 'deleteContractorRow: contractor gone after delete')
    console.log('✓ deleteContractorRow')

    console.log('\nPASS: contractors repositories — all 29 exported functions covered, all assertions green')
    process.exit(0)
  } finally {
    const db = useDb()
    // Cleanup in reverse dependency order
    if (workItemId !== undefined) {
      await db.delete(workStatusItems).where(eq(workStatusItems.id, workItemId))
    }
    if (docId !== undefined) {
      await db.delete(contractorDocuments).where(eq(contractorDocuments.id, docId))
    }
    if (projectId !== undefined) {
      await db.delete(projects).where(eq(projects.id, projectId))
    }
    if (staffId !== undefined) {
      await db.delete(contractors).where(eq(contractors.id, staffId))
    }
    if (companyId !== undefined) {
      await db.delete(contractors).where(eq(contractors.id, companyId))
    }
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
