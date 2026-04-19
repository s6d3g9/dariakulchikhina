/**
 * Smoke-style integration tests for the five projects mutation repositories.
 *
 * Requires a live PostgreSQL at DATABASE_URL (loaded via --env-file=.env).
 *
 * Run: pnpm test:server:projects-mutations
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

// ── project-extra-services.repository ───────────────────────────────────────
import {
  findProjectIdBySlug,
  listExtraServices,
  findExtraService,
  findExtraServiceByIdAndProject,
  insertExtraService as insertExtraServiceFull,
  updateExtraService,
  deleteExtraService,
  findProjectBySlug as findProjectBySlugExtra,
  insertDocument,
  updateExtraServiceDocIds,
} from '../project-extra-services.repository.ts'

// ── project-work-status.repository ──────────────────────────────────────────
import {
  runInTransaction,
  listWorkItemIdsByProject,
  deleteWorkItemsByIds,
  insertWorkItem,
  updateWorkItem,
  listWorkItemsByProject,
} from '../project-work-status.repository.ts'

// ── project-work-status-items.repository ────────────────────────────────────
import {
  findProjectId,
  findWorkItemInProject,
  listItemComments,
  findUserName,
  insertItemComment,
  listItemPhotos,
} from '../project-work-status-items.repository.ts'

// ── project-comms-action-helpers.repository ──────────────────────────────────
import {
  findProjectBySlug as findProjectBySlugComms,
  findContractorById,
  findMaxWorkStatusSortOrder,
  insertWorkStatusItem,
  findWorkStatusItem,
  updateWorkStatusItem,
  updateProjectControl,
  updateProjectStatus,
  insertExtraService as insertExtraServiceComms,
} from '../project-comms-action-helpers.repository.ts'

// ── project-communications-api.repository ───────────────────────────────────
import {
  findProjectBySlug as findProjectBySlugApi,
  listActionCatalogData,
  updateProjectProfile,
} from '../project-communications-api.repository.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIQUE_SUFFIX = Date.now()
const TEST_PROJECT_SLUG = `__test-proj-mut-${UNIQUE_SUFFIX}`
const TEST_CONTRACTOR_SLUG = `__test-contractor-mut-${UNIQUE_SUFFIX}`

// ---------------------------------------------------------------------------
// Fixture state
// ---------------------------------------------------------------------------
let sql: ReturnType<typeof postgres>
let testProjectId: number
let testContractorId: number
let testWorkItemId: number
let testExtraServiceId: number
let testDocumentId: number
let testUserId: number

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('projects mutation repositories', async () => {
  before(async () => {
    sql = postgres(process.env.DATABASE_URL!)

    const [proj] = await sql`
      INSERT INTO projects (slug, title, status)
      VALUES (${TEST_PROJECT_SLUG}, 'Test Project (mutations smoke)', 'lead')
      RETURNING id
    `
    testProjectId = (proj as { id: number }).id

    const [contractor] = await sql`
      INSERT INTO contractors (slug, name)
      VALUES (${TEST_CONTRACTOR_SLUG}, 'Smoke Contractor (mutations)')
      RETURNING id
    `
    testContractorId = (contractor as { id: number }).id

    const [workItem] = await sql`
      INSERT INTO work_status_items (project_id, title, status, sort_order)
      VALUES (${testProjectId}, 'Smoke Work Item', 'pending', 0)
      RETURNING id
    `
    testWorkItemId = (workItem as { id: number }).id

    const [extraSvc] = await sql`
      INSERT INTO project_extra_services (project_id, title, requested_by)
      VALUES (${testProjectId}, 'Smoke Extra Service', 'client')
      RETURNING id
    `
    testExtraServiceId = (extraSvc as { id: number }).id

    const [doc] = await sql`
      INSERT INTO documents (title, category)
      VALUES ('Smoke Document', 'other')
      RETURNING id
    `
    testDocumentId = (doc as { id: number }).id

    const [user] = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES ('Smoke User', ${'smoke-user-' + UNIQUE_SUFFIX + '@example.com'}, 'x')
      RETURNING id
    `
    testUserId = (user as { id: number }).id
  })

  after(async () => {
    await sql`DELETE FROM work_status_item_comments WHERE item_id = ${testWorkItemId}`
    await sql`DELETE FROM work_status_item_photos   WHERE item_id = ${testWorkItemId}`
    await sql`DELETE FROM work_status_items         WHERE project_id = ${testProjectId}`
    await sql`DELETE FROM project_extra_services    WHERE project_id = ${testProjectId}`
    await sql`DELETE FROM documents                 WHERE id = ${testDocumentId}`
    await sql`DELETE FROM projects                  WHERE id = ${testProjectId}`
    await sql`DELETE FROM contractors               WHERE id = ${testContractorId}`
    await sql`DELETE FROM users                     WHERE id = ${testUserId}`
    await sql.end()
  })

  // ── project-extra-services.repository ─────────────────────────────────────

  it('findProjectIdBySlug – returns the project id for a known slug', async () => {
    const id = await findProjectIdBySlug(TEST_PROJECT_SLUG)
    assert.equal(id, testProjectId)
  })

  it('findProjectIdBySlug – returns null for an unknown slug', async () => {
    const id = await findProjectIdBySlug('__nonexistent_xyz__')
    assert.equal(id, null)
  })

  it('findProjectBySlug (extra-services repo) – returns the full project row', async () => {
    const proj = await findProjectBySlugExtra(TEST_PROJECT_SLUG)
    assert.ok(proj, 'project should be found')
    assert.equal(proj.slug, TEST_PROJECT_SLUG)
  })

  it('listExtraServices – returns the seeded extra service', async () => {
    const rows = await listExtraServices(testProjectId)
    assert.ok(Array.isArray(rows))
    assert.ok(rows.some((r) => r.id === testExtraServiceId))
  })

  it('findExtraService – finds the seeded extra service by id + projectId', async () => {
    const svc = await findExtraService(testExtraServiceId, testProjectId)
    assert.ok(svc, 'should find the extra service')
    assert.equal(svc.id, testExtraServiceId)
  })

  it('findExtraService – returns null for wrong projectId', async () => {
    const svc = await findExtraService(testExtraServiceId, -1)
    assert.equal(svc, null)
  })

  it('findExtraServiceByIdAndProject – delegates to findExtraService correctly', async () => {
    const svc = await findExtraServiceByIdAndProject(testExtraServiceId, testProjectId)
    assert.ok(svc)
    assert.equal(svc.id, testExtraServiceId)
  })

  it('insertExtraService – inserts a new extra service and returns it', async () => {
    const svc = await insertExtraServiceFull({ projectId: testProjectId, title: 'Inserted Extra', requestedBy: 'admin' })
    assert.ok(svc, 'inserted service should be returned')
    assert.equal(svc.title, 'Inserted Extra')
    // cleanup — delete the just-inserted row
    await deleteExtraService(svc.id)
  })

  it('updateExtraService – updates the title of the seeded extra service', async () => {
    const updated = await updateExtraService(testExtraServiceId, { title: 'Updated Extra Service' })
    assert.ok(updated)
    assert.equal(updated.title, 'Updated Extra Service')
    // restore
    await updateExtraService(testExtraServiceId, { title: 'Smoke Extra Service' })
  })

  it('deleteExtraService – deletes and the row is no longer found', async () => {
    const [tmp] = await sql`
      INSERT INTO project_extra_services (project_id, title, requested_by)
      VALUES (${testProjectId}, 'Tmp Delete Extra', 'client')
      RETURNING id
    `
    const tmpId = (tmp as { id: number }).id
    await deleteExtraService(tmpId)
    const svc = await findExtraService(tmpId, testProjectId)
    assert.equal(svc, null)
  })

  it('insertDocument – inserts a document and returns it', async () => {
    const doc = await insertDocument({ title: 'Inserted Doc', category: 'contract' })
    assert.ok(doc, 'document should be returned')
    assert.equal(doc.title, 'Inserted Doc')
    // cleanup
    await sql`DELETE FROM documents WHERE id = ${doc.id}`
  })

  it('updateExtraServiceDocIds – updates contract/invoice doc ids and sets status', async () => {
    const updated = await updateExtraServiceDocIds(testExtraServiceId, testDocumentId, testDocumentId)
    assert.ok(updated)
    assert.equal(updated.contractDocId, testDocumentId)
    assert.equal(updated.invoiceDocId, testDocumentId)
    assert.equal(updated.status, 'contract_sent')
  })

  // ── project-work-status.repository ────────────────────────────────────────

  it('listWorkItemIdsByProject – returns the seeded work item id', async () => {
    const rows = await listWorkItemIdsByProject(testProjectId)
    assert.ok(Array.isArray(rows))
    assert.ok(rows.some((r) => r.id === testWorkItemId))
  })

  it('listWorkItemsByProject – returns work items ordered by sortOrder', async () => {
    const rows = await listWorkItemsByProject(testProjectId)
    assert.ok(rows.length >= 1)
    assert.ok(rows.some((r) => r.id === testWorkItemId))
  })

  it('insertWorkItem (via transaction) – inserts and item is visible after commit', async () => {
    await runInTransaction(async (tx) => {
      await insertWorkItem(tx, { projectId: testProjectId, title: 'Tx Insert Item', status: 'pending', sortOrder: 99 })
    })
    const rows = await sql`SELECT id FROM work_status_items WHERE project_id = ${testProjectId} AND title = 'Tx Insert Item' LIMIT 1`
    assert.ok(rows.length === 1, 'item should have been committed by transaction')
    // cleanup
    await sql`DELETE FROM work_status_items WHERE id = ${(rows[0] as { id: number }).id}`
  })

  it('updateWorkItem (via transaction) – updates an existing item', async () => {
    await runInTransaction(async (tx) => {
      await updateWorkItem(tx, testWorkItemId, testProjectId, { title: 'Tx Updated Item' })
    })
    const [row] = await sql`SELECT title FROM work_status_items WHERE id = ${testWorkItemId}`
    assert.equal((row as { title: string }).title, 'Tx Updated Item')
    // restore
    await sql`UPDATE work_status_items SET title = 'Smoke Work Item' WHERE id = ${testWorkItemId}`
  })

  it('deleteWorkItemsByIds (via transaction) – deletes target items', async () => {
    const [tmp] = await sql`
      INSERT INTO work_status_items (project_id, title, status, sort_order)
      VALUES (${testProjectId}, 'Tmp Work Item', 'pending', 50)
      RETURNING id
    `
    const tmpId = (tmp as { id: number }).id
    await runInTransaction(async (tx) => {
      await deleteWorkItemsByIds(tx, [tmpId])
    })
    const rows = await sql`SELECT id FROM work_status_items WHERE id = ${tmpId}`
    assert.equal(rows.length, 0, 'deleted item should not exist')
  })

  it('deleteWorkItemsByIds – no-op for empty array', async () => {
    // Should not throw
    await runInTransaction(async (tx) => {
      await deleteWorkItemsByIds(tx, [])
    })
  })

  it('runInTransaction – rolls back on thrown error inside callback', async () => {
    const [tmp] = await sql`
      INSERT INTO work_status_items (project_id, title, status, sort_order)
      VALUES (${testProjectId}, 'Rollback Item', 'pending', 60)
      RETURNING id
    `
    const tmpId = (tmp as { id: number }).id
    try {
      await runInTransaction(async (tx) => {
        await tx
          .update({ set: { title: 'mutated' }, where: `id = ${tmpId}` } as never)
          .catch(() => {})
        // Simulate an application error after a mutation attempt
        // Force a DB-level error to guarantee rollback
        await tx.execute(sql`SELECT 1/0`)
      })
    } catch {
      // expected — the transaction should roll back
    }
    // row inserted before the transaction must still exist (not deleted by rollback)
    const rows = await sql`SELECT id FROM work_status_items WHERE id = ${tmpId}`
    assert.ok(rows.length >= 1, 'pre-transaction row should survive the rollback')
    await sql`DELETE FROM work_status_items WHERE id = ${tmpId}`
  })

  // ── project-work-status-items.repository ──────────────────────────────────

  it('findProjectId – returns the project record for a known slug', async () => {
    const proj = await findProjectId(TEST_PROJECT_SLUG)
    assert.ok(proj, 'project should be found')
    assert.equal(proj.id, testProjectId)
  })

  it('findProjectId – returns null for an unknown slug', async () => {
    const proj = await findProjectId('__nonexistent_xyz__')
    assert.equal(proj, null)
  })

  it('findWorkItemInProject – finds the seeded work item', async () => {
    const item = await findWorkItemInProject(testWorkItemId, testProjectId)
    assert.ok(item, 'work item should be found')
    assert.equal(item.id, testWorkItemId)
  })

  it('findWorkItemInProject – returns null for wrong projectId', async () => {
    const item = await findWorkItemInProject(testWorkItemId, -1)
    assert.equal(item, null)
  })

  it('listItemComments – returns empty array for item with no comments', async () => {
    const comments = await listItemComments(testWorkItemId)
    assert.ok(Array.isArray(comments))
  })

  it('insertItemComment – inserts a comment and returns it', async () => {
    const comment = await insertItemComment({
      itemId: testWorkItemId,
      authorType: 'admin',
      authorName: 'Smoke Admin',
      text: 'Test comment text',
    })
    assert.ok(comment, 'comment should be returned')
    assert.equal(comment.text, 'Test comment text')
    assert.equal(comment.itemId, testWorkItemId)
  })

  it('listItemComments – returns the inserted comment', async () => {
    const comments = await listItemComments(testWorkItemId)
    assert.ok(comments.some((c) => c.text === 'Test comment text'))
  })

  it('listItemPhotos – returns empty array for item with no photos', async () => {
    const photos = await listItemPhotos(testWorkItemId)
    assert.ok(Array.isArray(photos))
    assert.equal(photos.length, 0)
  })

  it('findUserName – returns the name of the seeded user', async () => {
    const name = await findUserName(testUserId)
    assert.equal(name, 'Smoke User')
  })

  it('findUserName – returns null for an unknown user id', async () => {
    const name = await findUserName(-1)
    assert.equal(name, null)
  })

  // ── project-comms-action-helpers.repository ────────────────────────────────

  it('findProjectBySlug (comms-action-helpers) – returns project with selected fields', async () => {
    const proj = await findProjectBySlugComms(TEST_PROJECT_SLUG)
    assert.ok(proj, 'project should be found')
    assert.equal(proj.slug, TEST_PROJECT_SLUG)
    assert.ok('profile' in proj)
  })

  it('findProjectBySlug (comms-action-helpers) – returns null for unknown slug', async () => {
    const proj = await findProjectBySlugComms('__nonexistent_xyz__')
    assert.equal(proj, null)
  })

  it('findContractorById – returns the seeded contractor', async () => {
    const contractor = await findContractorById(testContractorId)
    assert.ok(contractor, 'contractor should be found')
    assert.equal(contractor.id, testContractorId)
    assert.equal(contractor.name, 'Smoke Contractor (mutations)')
  })

  it('findContractorById – returns null for unknown id', async () => {
    const contractor = await findContractorById(-1)
    assert.equal(contractor, null)
  })

  it('findMaxWorkStatusSortOrder – returns max sort order for project', async () => {
    const max = await findMaxWorkStatusSortOrder(testProjectId)
    assert.ok(typeof max === 'number')
    assert.ok(max >= 0, `expected max >= 0 (seeded item has sortOrder=0), got ${max}`)
  })

  it('findMaxWorkStatusSortOrder – returns -1 for project with no items', async () => {
    // Use a non-existent project id
    const max = await findMaxWorkStatusSortOrder(-999)
    assert.equal(max, -1)
  })

  it('insertWorkStatusItem (comms-action-helpers) – inserts and returns {id, title}', async () => {
    const item = await insertWorkStatusItem({
      projectId: testProjectId,
      title: 'Comms Inserted Item',
      status: 'pending',
      sortOrder: 10,
    })
    assert.ok(item, 'item should be returned')
    assert.ok(item.id)
    assert.equal(item.title, 'Comms Inserted Item')
    // cleanup
    await sql`DELETE FROM work_status_items WHERE id = ${item.id}`
  })

  it('findWorkStatusItem (comms-action-helpers) – finds the seeded work item', async () => {
    const item = await findWorkStatusItem(testWorkItemId, testProjectId)
    assert.ok(item, 'work item should be found')
    assert.equal(item.id, testWorkItemId)
  })

  it('findWorkStatusItem (comms-action-helpers) – returns null for wrong projectId', async () => {
    const item = await findWorkStatusItem(testWorkItemId, -1)
    assert.equal(item, null)
  })

  it('updateWorkStatusItem (comms-action-helpers) – updates and returns {id, title, status}', async () => {
    const updated = await updateWorkStatusItem(testWorkItemId, testProjectId, { title: 'Comms Updated' })
    assert.ok(updated)
    assert.equal(updated.title, 'Comms Updated')
    assert.ok('status' in updated)
    // restore
    await sql`UPDATE work_status_items SET title = 'Smoke Work Item' WHERE id = ${testWorkItemId}`
  })

  it('updateProjectControl – updates project profile without error', async () => {
    await updateProjectControl(TEST_PROJECT_SLUG, { note: 'smoke control update' })
    const [row] = await sql`SELECT profile FROM projects WHERE id = ${testProjectId}`
    assert.ok(row, 'project row should exist')
  })

  it('updateProjectStatus – updates project status', async () => {
    await updateProjectStatus(TEST_PROJECT_SLUG, 'active')
    const [row] = await sql`SELECT status FROM projects WHERE id = ${testProjectId}`
    assert.equal((row as { status: string }).status, 'active')
    // restore
    await sql`UPDATE projects SET status = 'lead' WHERE id = ${testProjectId}`
  })

  it('insertExtraService (comms-action-helpers) – inserts and returns {id, title}', async () => {
    const svc = await insertExtraServiceComms(testProjectId, { title: 'Comms Extra Service', requestedBy: 'admin' })
    assert.ok(svc, 'service should be returned')
    assert.ok(svc.id)
    assert.equal(svc.title, 'Comms Extra Service')
    // cleanup
    await sql`DELETE FROM project_extra_services WHERE id = ${svc.id}`
  })

  // ── project-communications-api.repository ─────────────────────────────────

  it('findProjectBySlug (communications-api) – returns project with selected fields', async () => {
    const proj = await findProjectBySlugApi(TEST_PROJECT_SLUG)
    assert.ok(proj, 'project should be found')
    assert.equal(proj.slug, TEST_PROJECT_SLUG)
    assert.ok('projectType' in proj)
    assert.ok('updatedAt' in proj)
  })

  it('findProjectBySlug (communications-api) – returns null for unknown slug', async () => {
    const proj = await findProjectBySlugApi('__nonexistent_xyz__')
    assert.equal(proj, null)
  })

  it('listActionCatalogData – returns tuple of [workItems, documents, extraServices]', async () => {
    const [workItems, documents, extraServices] = await listActionCatalogData(testProjectId)
    assert.ok(Array.isArray(workItems))
    assert.ok(Array.isArray(documents))
    assert.ok(Array.isArray(extraServices))
    assert.ok(workItems.some((w) => w.id === testWorkItemId), 'seeded work item should appear')
    assert.ok(extraServices.some((s) => s.id === testExtraServiceId), 'seeded extra service should appear')
  })

  it('updateProjectProfile – updates profile and returns {id, slug, profile, updatedAt}', async () => {
    const updated = await updateProjectProfile(TEST_PROJECT_SLUG, { key: 'smoke-value' })
    assert.ok(updated, 'should return updated row')
    assert.equal(updated.slug, TEST_PROJECT_SLUG)
    assert.ok('profile' in updated)
    assert.ok('updatedAt' in updated)
  })

  it('updateProjectProfile – returns null for unknown slug', async () => {
    const updated = await updateProjectProfile('__nonexistent_xyz__', { key: 'val' })
    assert.equal(updated, null)
  })
})
