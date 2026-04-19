/**
 * Smoke-style integration tests for designers.repository and
 * designer-documents.repository.
 *
 * Requires a live PostgreSQL at DATABASE_URL (loaded via --env-file=.env).
 *
 * Run: pnpm test:server:designers
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

import {
  findDesignerById,
  listAllDesigners,
  insertDesigner,
  updateDesignerAndClearProjectKeys,
  deleteDesignerRow,
  listDesignerProjectsWithInfo,
  listClientsForDesignerProject,
  listContractorsForDesignerProject,
  insertProject,
  findProjectBySlug,
  updateProjectPages,
  insertDesignerProject,
  findDesignerProjectOwned,
  updateDesignerProjectRow,
  updateProjectTitle,
  insertDesignerProjectClient,
  insertDesignerProjectContractor,
  deleteDesignerProjectClientLink,
  deleteDesignerProjectContractorLink,
  listDesignerProjectIds,
  listSellersForProjectIds,
  listManagersForProjectIds,
  listAllGalleryOrderedBySortOrder,
} from '../designers.repository.ts'

import {
  listDesignerDocumentsByPrefix,
  insertDesignerDocument,
  findDesignerDocumentByIdAndPrefix,
  deleteDesignerDocumentRow,
} from '../designer-documents.repository.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIQUE_SUFFIX = Date.now()
const TEST_SLUG_1 = `__test-designer-proj1-${UNIQUE_SUFFIX}`
const TEST_SLUG_2 = `__test-designer-proj2-${UNIQUE_SUFFIX}`
const TEST_DOC_PREFIX = `designer_test_${UNIQUE_SUFFIX}`

// ---------------------------------------------------------------------------
// Fixture state
// ---------------------------------------------------------------------------
let sql: ReturnType<typeof postgres>
let testDesignerId: number
let testProjectId1: number
let testProjectId2: number
let testDpId1: number
let testDpId2: number
let testClientId: number
let testContractorId: number
let testSellerId: number
let testManagerId: number
let testGalleryItemId: number
let testDocId: number

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('designers + designer-documents repositories', async () => {
  before(async () => {
    sql = postgres(process.env.DATABASE_URL!)

    // Designer
    const [des] = await sql`
      INSERT INTO designers (name, company_name, specializations, services, packages, subscriptions)
      VALUES ('Smoke Designer', 'Smoke Co', ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
      RETURNING id
    `
    testDesignerId = (des as { id: number }).id

    // Two projects
    const [p1] = await sql`
      INSERT INTO projects (slug, title, pages, profile)
      VALUES (${TEST_SLUG_1}, 'Smoke Project 1', ARRAY[]::text[], '{}'::jsonb)
      RETURNING id
    `
    testProjectId1 = (p1 as { id: number }).id

    const [p2] = await sql`
      INSERT INTO projects (slug, title, pages, profile)
      VALUES (${TEST_SLUG_2}, 'Smoke Project 2', ARRAY[]::text[], '{}'::jsonb)
      RETURNING id
    `
    testProjectId2 = (p2 as { id: number }).id

    // Two designer-projects
    const [dp1] = await sql`
      INSERT INTO designer_projects (designer_id, project_id, package_key, status)
      VALUES (${testDesignerId}, ${testProjectId1}, 'pkg-a', 'draft')
      RETURNING id
    `
    testDpId1 = (dp1 as { id: number }).id

    const [dp2] = await sql`
      INSERT INTO designer_projects (designer_id, project_id, status)
      VALUES (${testDesignerId}, ${testProjectId2}, 'active')
      RETURNING id
    `
    testDpId2 = (dp2 as { id: number }).id

    // Client
    const [cli] = await sql`
      INSERT INTO clients (name) VALUES ('Smoke Client (designers repo)') RETURNING id
    `
    testClientId = (cli as { id: number }).id

    // Contractor
    const [con] = await sql`
      INSERT INTO contractors (slug, name)
      VALUES (${`__smoke-con-${UNIQUE_SUFFIX}`}, 'Smoke Contractor (designers repo)')
      RETURNING id
    `
    testContractorId = (con as { id: number }).id

    // Seller + seller-project link (for aggregation tests)
    const [sel] = await sql`
      INSERT INTO sellers (name, categories) VALUES ('Smoke Seller', ARRAY[]::text[]) RETURNING id
    `
    testSellerId = (sel as { id: number }).id
    await sql`
      INSERT INTO seller_projects (seller_id, project_id) VALUES (${testSellerId}, ${testProjectId1})
    `

    // Manager + manager-project link
    const [mgr] = await sql`
      INSERT INTO managers (slug, name)
      VALUES (${`__smoke-mgr-${UNIQUE_SUFFIX}`}, 'Smoke Manager') RETURNING id
    `
    testManagerId = (mgr as { id: number }).id
    await sql`
      INSERT INTO manager_projects (manager_id, project_id) VALUES (${testManagerId}, ${testProjectId1})
    `

    // Gallery item
    const [gal] = await sql`
      INSERT INTO gallery_items (category, title, images, tags, featured, properties, sort_order)
      VALUES ('smoke', 'Smoke Gallery', '[]'::jsonb, ARRAY[]::text[], false, '{}'::jsonb, 9999)
      RETURNING id
    `
    testGalleryItemId = (gal as { id: number }).id

    // Document (designer category, null project_id)
    const [doc] = await sql`
      INSERT INTO documents (project_id, category, title, filename, url)
      VALUES (NULL, ${TEST_DOC_PREFIX + '_contract'}, 'Smoke Doc', 'smoke.pdf', '/smoke.pdf')
      RETURNING id
    `
    testDocId = (doc as { id: number }).id
  })

  after(async () => {
    await sql`DELETE FROM designer_project_clients     WHERE designer_project_id IN (${testDpId1}, ${testDpId2})`
    await sql`DELETE FROM designer_project_contractors WHERE designer_project_id IN (${testDpId1}, ${testDpId2})`
    await sql`DELETE FROM designer_projects            WHERE designer_id = ${testDesignerId}`
    await sql`DELETE FROM documents                    WHERE id = ${testDocId}`
    await sql`DELETE FROM seller_projects              WHERE seller_id = ${testSellerId}`
    await sql`DELETE FROM manager_projects             WHERE manager_id = ${testManagerId}`
    await sql`DELETE FROM projects                     WHERE id IN (${testProjectId1}, ${testProjectId2})`
    await sql`DELETE FROM designers                    WHERE id = ${testDesignerId}`
    await sql`DELETE FROM clients                      WHERE id = ${testClientId}`
    await sql`DELETE FROM contractors                  WHERE id = ${testContractorId}`
    await sql`DELETE FROM sellers                      WHERE id = ${testSellerId}`
    await sql`DELETE FROM managers                     WHERE id = ${testManagerId}`
    await sql`DELETE FROM gallery_items                WHERE id = ${testGalleryItemId}`
    await sql.end()
  })

  // ── Designer CRUD ──────────────────────────────────────────────────────────

  it('findDesignerById – returns the seeded designer', async () => {
    const d = await findDesignerById(testDesignerId)
    assert.ok(d, 'should find designer')
    assert.equal(d.id, testDesignerId)
    assert.equal(d.name, 'Smoke Designer')
  })

  it('findDesignerById – returns null for unknown id', async () => {
    const d = await findDesignerById(-1)
    assert.equal(d, null)
  })

  it('listAllDesigners – includes the seeded designer', async () => {
    const rows = await listAllDesigners()
    assert.ok(Array.isArray(rows))
    assert.ok(rows.some((r) => r.id === testDesignerId))
  })

  it('insertDesigner – creates and returns a new designer row', async () => {
    const d = await insertDesigner({
      name: `Inserted-${UNIQUE_SUFFIX}`,
      companyName: null,
      phone: null,
      email: null,
      telegram: null,
      website: null,
      city: null,
      experience: null,
      about: null,
      specializations: [],
      services: [],
      packages: [],
      subscriptions: [],
    })
    assert.ok(d.id > 0)
    assert.equal(d.name, `Inserted-${UNIQUE_SUFFIX}`)
    // Cleanup
    await sql`DELETE FROM designers WHERE id = ${d.id}`
  })

  it('updateDesignerAndClearProjectKeys – updates name and clears packageKey on dp1', async () => {
    const updated = await updateDesignerAndClearProjectKeys(
      testDesignerId,
      { name: `Updated-${UNIQUE_SUFFIX}` },
      [testDpId1],
    )
    assert.ok(updated, 'should return updated designer')
    assert.equal(updated.name, `Updated-${UNIQUE_SUFFIX}`)
    // Verify packageKey was cleared on dp1
    const [dp] = await sql`SELECT package_key FROM designer_projects WHERE id = ${testDpId1}`
    assert.equal((dp as { package_key: string | null }).package_key, null)
    // Restore name
    await sql`UPDATE designers SET name = 'Smoke Designer' WHERE id = ${testDesignerId}`
    await sql`UPDATE designer_projects SET package_key = 'pkg-a' WHERE id = ${testDpId1}`
  })

  it('deleteDesignerRow – removes a temporary designer', async () => {
    const [tmp] = await sql`
      INSERT INTO designers (name, specializations, services, packages, subscriptions)
      VALUES ('TmpDesigner', ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
      RETURNING id
    `
    const tmpId = (tmp as { id: number }).id
    await deleteDesignerRow(tmpId)
    const d = await findDesignerById(tmpId)
    assert.equal(d, null)
  })

  // ── Designer projects ──────────────────────────────────────────────────────

  it('listDesignerProjectsWithInfo – returns 2 rows for seeded designer', async () => {
    const rows = await listDesignerProjectsWithInfo(testDesignerId)
    assert.ok(rows.length >= 2)
    const slugs = rows.map((r) => r.projectSlug)
    assert.ok(slugs.includes(TEST_SLUG_1))
    assert.ok(slugs.includes(TEST_SLUG_2))
  })

  it('insertProject – creates project and returns row', async () => {
    const slug = `__test-ins-proj-${UNIQUE_SUFFIX}`
    const p = await insertProject({ slug, title: 'Inserted Project', pages: [], profile: {} })
    assert.ok(p.id > 0)
    assert.equal(p.slug, slug)
    await sql`DELETE FROM projects WHERE id = ${p.id}`
  })

  it('findProjectBySlug – returns seeded project', async () => {
    const p = await findProjectBySlug(TEST_SLUG_1)
    assert.ok(p)
    assert.equal(p.slug, TEST_SLUG_1)
  })

  it('findProjectBySlug – returns null for unknown slug', async () => {
    const p = await findProjectBySlug('__nonexistent_slug_designers_smoke__')
    assert.equal(p, null)
  })

  it('updateProjectPages – sets new pages array', async () => {
    await updateProjectPages(testProjectId1, ['page-a', 'page-b'])
    const [row] = await sql`SELECT pages FROM projects WHERE id = ${testProjectId1}`
    assert.deepEqual((row as { pages: string[] }).pages, ['page-a', 'page-b'])
  })

  it('insertDesignerProject – creates a dp row linked to a new project', async () => {
    const slug = `__test-dp-ins-${UNIQUE_SUFFIX}`
    const p = await insertProject({ slug, title: 'DP Insert Test', pages: [], profile: {} })
    const dp = await insertDesignerProject({
      designerId: testDesignerId,
      projectId: p.id,
      packageKey: null,
      pricePerSqm: null,
      area: null,
      totalPrice: null,
      status: 'draft',
      notes: null,
    })
    assert.ok(dp.id > 0)
    assert.equal(dp.designerId, testDesignerId)
    await sql`DELETE FROM designer_projects WHERE id = ${dp.id}`
    await sql`DELETE FROM projects WHERE id = ${p.id}`
  })

  it('findDesignerProjectOwned – returns dp when owner matches', async () => {
    const dp = await findDesignerProjectOwned(testDpId1, testDesignerId)
    assert.ok(dp)
    assert.equal(dp.id, testDpId1)
  })

  it('findDesignerProjectOwned – returns null when owner does not match', async () => {
    const dp = await findDesignerProjectOwned(testDpId1, -1)
    assert.equal(dp, null)
  })

  it('updateDesignerProjectRow – updates status on dp2', async () => {
    await updateDesignerProjectRow(testDpId2, { status: 'completed' })
    const [row] = await sql`SELECT status FROM designer_projects WHERE id = ${testDpId2}`
    assert.equal((row as { status: string }).status, 'completed')
    await sql`UPDATE designer_projects SET status = 'active' WHERE id = ${testDpId2}`
  })

  it('updateProjectTitle – updates title on project 2', async () => {
    await updateProjectTitle(testProjectId2, 'Updated Title')
    const [row] = await sql`SELECT title FROM projects WHERE id = ${testProjectId2}`
    assert.equal((row as { title: string }).title, 'Updated Title')
  })

  // ── Link management ────────────────────────────────────────────────────────

  it('insertDesignerProjectClient – links client to dp1', async () => {
    const link = await insertDesignerProjectClient(testDpId1, testClientId)
    assert.ok(link.id > 0)
    assert.equal(link.clientId, testClientId)
  })

  it('listClientsForDesignerProject – returns linked client', async () => {
    const rows = await listClientsForDesignerProject(testDpId1)
    assert.ok(rows.some((r) => r.id === testClientId))
  })

  it('insertDesignerProjectContractor – links contractor to dp1', async () => {
    const link = await insertDesignerProjectContractor(testDpId1, testContractorId, 'executor')
    assert.ok(link.id > 0)
    assert.equal(link.contractorId, testContractorId)
  })

  it('listContractorsForDesignerProject – returns linked contractor', async () => {
    const rows = await listContractorsForDesignerProject(testDpId1)
    assert.ok(rows.some((r) => r.id === testContractorId))
    const row = rows.find((r) => r.id === testContractorId)!
    assert.equal(row.role, 'executor')
  })

  it('deleteDesignerProjectClientLink – removes client link', async () => {
    const [linkRow] = await sql`
      SELECT id FROM designer_project_clients
      WHERE designer_project_id = ${testDpId1} AND client_id = ${testClientId}
    `
    const linkId = (linkRow as { id: number }).id
    await deleteDesignerProjectClientLink(linkId)
    const rows = await listClientsForDesignerProject(testDpId1)
    assert.ok(!rows.some((r) => r.id === testClientId))
  })

  it('deleteDesignerProjectContractorLink – removes contractor link', async () => {
    const [linkRow] = await sql`
      SELECT id FROM designer_project_contractors
      WHERE designer_project_id = ${testDpId1} AND contractor_id = ${testContractorId}
    `
    const linkId = (linkRow as { id: number }).id
    await deleteDesignerProjectContractorLink(linkId)
    const rows = await listContractorsForDesignerProject(testDpId1)
    assert.ok(!rows.some((r) => r.id === testContractorId))
  })

  // ── Linked-entities aggregation ────────────────────────────────────────────

  it('listDesignerProjectIds – returns project ids for both linked projects', async () => {
    const ids = await listDesignerProjectIds(testDesignerId)
    assert.ok(Array.isArray(ids))
    assert.ok(ids.includes(testProjectId1), 'project 1 should be in list')
    assert.ok(ids.includes(testProjectId2), 'project 2 should be in list')
  })

  it('listSellersForProjectIds – returns seller linked to project 1', async () => {
    const rows = await listSellersForProjectIds([testProjectId1])
    assert.ok(Array.isArray(rows))
    const hit = rows.find((r) => r.id === testSellerId)
    assert.ok(hit, 'seeded seller should appear')
    assert.equal(hit.projectId, testProjectId1)
  })

  it('listSellersForProjectIds – returns empty array for empty input', async () => {
    const rows = await listSellersForProjectIds([])
    assert.deepEqual(rows, [])
  })

  it('listManagersForProjectIds – returns manager linked to project 1', async () => {
    const rows = await listManagersForProjectIds([testProjectId1])
    assert.ok(Array.isArray(rows))
    const hit = rows.find((r) => r.id === testManagerId)
    assert.ok(hit, 'seeded manager should appear')
    assert.equal(hit.projectId, testProjectId1)
  })

  it('listManagersForProjectIds – returns empty array for empty input', async () => {
    const rows = await listManagersForProjectIds([])
    assert.deepEqual(rows, [])
  })

  it('listAllGalleryOrderedBySortOrder – returns array including seeded item', async () => {
    const rows = await listAllGalleryOrderedBySortOrder()
    assert.ok(Array.isArray(rows))
    assert.ok(rows.some((r) => r.id === testGalleryItemId))
  })

  // ── designer-documents repository ─────────────────────────────────────────

  it('insertDesignerDocument – creates document with null projectId', async () => {
    const doc = await insertDesignerDocument({
      projectId: null,
      category: TEST_DOC_PREFIX + '_inserted',
      title: 'Inserted Doc',
      filename: 'inserted.pdf',
      url: '/inserted.pdf',
      notes: null,
    })
    assert.ok(doc.id > 0)
    assert.equal(doc.title, 'Inserted Doc')
    assert.equal(doc.projectId, null)
    await sql`DELETE FROM documents WHERE id = ${doc.id}`
  })

  it('listDesignerDocumentsByPrefix – returns seeded doc matching prefix', async () => {
    const rows = await listDesignerDocumentsByPrefix(TEST_DOC_PREFIX)
    assert.ok(Array.isArray(rows))
    assert.ok(rows.some((r) => r.id === testDocId))
  })

  it('listDesignerDocumentsByPrefix – returns empty for non-matching prefix', async () => {
    const rows = await listDesignerDocumentsByPrefix('__no_match_prefix_xyz__')
    assert.deepEqual(rows, [])
  })

  it('findDesignerDocumentByIdAndPrefix – returns doc when id and prefix match', async () => {
    const doc = await findDesignerDocumentByIdAndPrefix(testDocId, TEST_DOC_PREFIX)
    assert.ok(doc)
    assert.equal(doc.id, testDocId)
  })

  it('findDesignerDocumentByIdAndPrefix – returns null for wrong prefix', async () => {
    const doc = await findDesignerDocumentByIdAndPrefix(testDocId, '__wrong_prefix__')
    assert.equal(doc, null)
  })

  it('findDesignerDocumentByIdAndPrefix – returns null for unknown id', async () => {
    const doc = await findDesignerDocumentByIdAndPrefix(-1, TEST_DOC_PREFIX)
    assert.equal(doc, null)
  })

  it('deleteDesignerDocumentRow – removes the document', async () => {
    const [tmp] = await sql`
      INSERT INTO documents (project_id, category, title, filename, url)
      VALUES (NULL, ${TEST_DOC_PREFIX + '_tmp'}, 'Tmp Doc', 'tmp.pdf', '/tmp.pdf')
      RETURNING id
    `
    const tmpId = (tmp as { id: number }).id
    await deleteDesignerDocumentRow(tmpId)
    const doc = await findDesignerDocumentByIdAndPrefix(tmpId, TEST_DOC_PREFIX)
    assert.equal(doc, null)
  })
})
