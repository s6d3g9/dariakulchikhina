/**
 * Smoke tests for sellers and managers repositories.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage: node --experimental-strip-types server/modules/__tests__/sellers-managers.repositories.test.ts
 */

// Load root .env so DATABASE_URL is available
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dir = dirname(fileURLToPath(import.meta.url))
const _envPath = resolve(_dir, '../../../.env')
try {
  const _envContent = readFileSync(_envPath, 'utf8')
  for (const line of _envContent.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    // eslint-disable-next-line no-restricted-syntax
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch { /* .env absent — rely on pre-set env vars */ }

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { projects, sellers, managers, sellerProjects, managerProjects } from '../../db/schema/index.ts'
import * as schema from '../../db/schema/index.ts'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  // Initialize database connection
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set')
  }

  const pgClient = postgres(dbUrl)
  const db = drizzle(pgClient, { schema })

  // ── Setup: create test data ──────────────────────────────────────

  const testTimestamp = Date.now()

  // Insert two test projects
  const testProjectSlug1 = `test-project-1-${testTimestamp}`
  const testProjectSlug2 = `test-project-2-${testTimestamp}`

  const [project1] = await db
    .insert(projects)
    .values({
      slug: testProjectSlug1,
      title: `Test Project 1 ${testTimestamp}`,
      status: 'active',
    })
    .returning({ id: projects.id })

  const [project2] = await db
    .insert(projects)
    .values({
      slug: testProjectSlug2,
      title: `Test Project 2 ${testTimestamp}`,
      status: 'active',
    })
    .returning({ id: projects.id })

  const projectIds = {
    p1: project1!.id,
    p2: project2!.id,
  }

  try {
    // ── Test Sellers Repository ──────────────────────────────────────

    console.log('Testing Sellers Repository...')

    // Test insertSeller
    console.log('Testing insertSeller...')
    const sellerData = {
      name: `Test Seller ${testTimestamp}`,
      companyName: 'Test Company',
      contactPerson: 'John Doe',
      phone: '+1234567890',
      email: `seller-${testTimestamp}@example.com`,
      telegram: '@testseller',
      website: 'https://seller.test',
      city: 'Moscow',
      categories: ['category1', 'category2'],
      notes: 'Test notes',
    }
    const seller = await db.insert(sellers).values(sellerData).returning()
    const sellerId = seller[0]!.id
    assert(sellerId > 0, 'insertSeller: returns positive id')
    assert(seller[0]!.name === sellerData.name, 'insertSeller: name matches')
    console.log('✓ insertSeller passed')

    // Test findSellerById — happy path
    console.log('Testing findSellerById...')
    const [foundSeller] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1)
    const foundSellerOrNull = foundSeller ?? null
    assert(
      foundSellerOrNull !== null && foundSellerOrNull.id === sellerId,
      'findSellerById: finds existing seller',
    )
    console.log('✓ findSellerById (happy) passed')

    // Test findSellerById — not found
    console.log('Testing findSellerById (not found)...')
    const [notFoundSeller] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.id, 999999))
      .limit(1)
    const notFoundSellerOrNull = notFoundSeller ?? null
    assert(
      notFoundSellerOrNull === null,
      'findSellerById: returns null for non-existent seller',
    )
    console.log('✓ findSellerById (not found) passed')

    // Test listAllSellers
    console.log('Testing listAllSellers...')
    const allSellers = await db.select().from(sellers)
    assert(
      Array.isArray(allSellers) && allSellers.length > 0,
      'listAllSellers: returns non-empty array',
    )
    assert(
      allSellers.some((s) => s.id === sellerId),
      'listAllSellers: includes inserted seller',
    )
    console.log('✓ listAllSellers passed')

    // Link seller to project 1
    await db.insert(sellerProjects).values({
      sellerId,
      projectId: projectIds.p1,
    })

    // Test listSellersByProjectSlug — happy path
    console.log('Testing listSellersByProjectSlug...')
    const [projectForQuery1] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, testProjectSlug1))
      .limit(1)
    assert(projectForQuery1 !== undefined, 'setup: project 1 exists')

    const sellersForProject1 = await db
      .select({ seller: sellers })
      .from(sellerProjects)
      .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
      .where(eq(sellerProjects.projectId, projectIds.p1))

    const sellersForProject1OrNull =
      sellersForProject1.length > 0 ? sellersForProject1.map((r) => r.seller) : null
    assert(
      sellersForProject1OrNull !== null && sellersForProject1OrNull.length > 0,
      'listSellersByProjectSlug: returns sellers for project',
    )
    assert(
      sellersForProject1OrNull.some((s) => s.id === sellerId),
      'listSellersByProjectSlug: includes linked seller',
    )
    console.log('✓ listSellersByProjectSlug (happy) passed')

    // Test listSellersByProjectSlug — project with no sellers
    console.log('Testing listSellersByProjectSlug (empty)...')
    const sellersForProject2 = await db
      .select({ seller: sellers })
      .from(sellerProjects)
      .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
      .where(eq(sellerProjects.projectId, projectIds.p2))

    const sellersForProject2OrNull = sellersForProject2.length > 0 ? sellersForProject2.map((r) => r.seller) : []
    assert(
      sellersForProject2OrNull.length === 0,
      'listSellersByProjectSlug: returns empty for project with no sellers',
    )
    console.log('✓ listSellersByProjectSlug (empty) passed')

    // Test listSellersByProjectSlug — only returns sellers for that project
    console.log('Testing listSellersByProjectSlug (isolation)...')
    const allInProject1 = sellersForProject1OrNull.every((s) => s.id === sellerId)
    assert(
      allInProject1,
      'listSellersByProjectSlug: only returns sellers linked to project',
    )
    console.log('✓ listSellersByProjectSlug (isolation) passed')

    // Test updateSellerRow
    console.log('Testing updateSellerRow...')
    const [updatedSeller] = await db
      .update(sellers)
      .set({ name: `Updated Seller ${testTimestamp}` })
      .where(eq(sellers.id, sellerId))
      .returning()
    const updatedSellerOrNull = updatedSeller ?? null
    assert(
      updatedSellerOrNull !== null &&
        updatedSellerOrNull.name === `Updated Seller ${testTimestamp}`,
      'updateSellerRow: updates and returns seller',
    )
    console.log('✓ updateSellerRow passed')

    // Test listSellerProjects
    console.log('Testing listSellerProjects...')
    const sellerProjectsList = await db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
      })
      .from(sellerProjects)
      .innerJoin(projects, eq(sellerProjects.projectId, projects.id))
      .where(eq(sellerProjects.sellerId, sellerId))

    assert(
      Array.isArray(sellerProjectsList) && sellerProjectsList.length > 0,
      'listSellerProjects: returns non-empty array',
    )
    assert(
      sellerProjectsList.some((p) => p.id === projectIds.p1),
      'listSellerProjects: includes linked project',
    )
    console.log('✓ listSellerProjects passed')

    // Test deleteSellerRow
    console.log('Testing deleteSellerRow...')
    await db.delete(sellers).where(eq(sellers.id, sellerId))
    const [deletedCheck] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1)
    assert(
      deletedCheck === undefined,
      'deleteSellerRow: seller no longer exists',
    )
    console.log('✓ deleteSellerRow passed')

    // ── Test Managers Repository ─────────────────────────────────────

    console.log('\nTesting Managers Repository...')

    // Test insertManager
    console.log('Testing insertManager...')
    const managerData = {
      name: `Test Manager ${testTimestamp}`,
      slug: `test-manager-${testTimestamp}`,
      role: 'Project Manager',
      phone: '+9876543210',
      email: `manager-${testTimestamp}@example.com`,
      telegram: '@testmanager',
      city: 'Moscow',
      notes: 'Test manager notes',
    }
    const manager = await db.insert(managers).values(managerData).returning()
    const managerId = manager[0]!.id
    assert(managerId > 0, 'insertManager: returns positive id')
    assert(manager[0]!.name === managerData.name, 'insertManager: name matches')
    console.log('✓ insertManager passed')

    // Test findManagerById — happy path
    console.log('Testing findManagerById...')
    const [foundManager] = await db
      .select()
      .from(managers)
      .where(eq(managers.id, managerId))
      .limit(1)
    const foundManagerOrNull = foundManager ?? null
    assert(
      foundManagerOrNull !== null && foundManagerOrNull.id === managerId,
      'findManagerById: finds existing manager',
    )
    console.log('✓ findManagerById (happy) passed')

    // Test findManagerById — not found
    console.log('Testing findManagerById (not found)...')
    const [notFoundManager] = await db
      .select()
      .from(managers)
      .where(eq(managers.id, 999999))
      .limit(1)
    const notFoundManagerOrNull = notFoundManager ?? null
    assert(
      notFoundManagerOrNull === null,
      'findManagerById: returns null for non-existent manager',
    )
    console.log('✓ findManagerById (not found) passed')

    // Test listAllManagers
    console.log('Testing listAllManagers...')
    const allManagers = await db.select().from(managers)
    assert(
      Array.isArray(allManagers) && allManagers.length > 0,
      'listAllManagers: returns non-empty array',
    )
    assert(
      allManagers.some((m) => m.id === managerId),
      'listAllManagers: includes inserted manager',
    )
    console.log('✓ listAllManagers passed')

    // Link manager to project 1
    await db.insert(managerProjects).values({
      managerId,
      projectId: projectIds.p1,
      role: 'Lead',
    })

    // Test listManagersByProjectSlug — happy path
    console.log('Testing listManagersByProjectSlug...')
    const managersForProject1 = await db
      .select({ manager: managers })
      .from(managerProjects)
      .innerJoin(managers, eq(managerProjects.managerId, managers.id))
      .where(eq(managerProjects.projectId, projectIds.p1))

    const managersForProject1OrNull =
      managersForProject1.length > 0 ? managersForProject1.map((r) => r.manager) : null
    assert(
      managersForProject1OrNull !== null && managersForProject1OrNull.length > 0,
      'listManagersByProjectSlug: returns managers for project',
    )
    assert(
      managersForProject1OrNull.some((m) => m.id === managerId),
      'listManagersByProjectSlug: includes linked manager',
    )
    console.log('✓ listManagersByProjectSlug (happy) passed')

    // Test listManagersByProjectSlug — project with no managers
    console.log('Testing listManagersByProjectSlug (empty)...')
    const managersForProject2 = await db
      .select({ manager: managers })
      .from(managerProjects)
      .innerJoin(managers, eq(managerProjects.managerId, managers.id))
      .where(eq(managerProjects.projectId, projectIds.p2))

    const managersForProject2OrNull = managersForProject2.length > 0 ? managersForProject2.map((r) => r.manager) : []
    assert(
      managersForProject2OrNull.length === 0,
      'listManagersByProjectSlug: returns empty for project with no managers',
    )
    console.log('✓ listManagersByProjectSlug (empty) passed')

    // Test listManagersByProjectSlug — only returns managers for that project
    console.log('Testing listManagersByProjectSlug (isolation)...')
    const allInProject1Managers = managersForProject1OrNull.every((m) => m.id === managerId)
    assert(
      allInProject1Managers,
      'listManagersByProjectSlug: only returns managers linked to project',
    )
    console.log('✓ listManagersByProjectSlug (isolation) passed')

    // Test updateManagerRow
    console.log('Testing updateManagerRow...')
    const [updatedManager] = await db
      .update(managers)
      .set({ name: `Updated Manager ${testTimestamp}` })
      .where(eq(managers.id, managerId))
      .returning()
    const updatedManagerOrNull = updatedManager ?? null
    assert(
      updatedManagerOrNull !== null &&
        updatedManagerOrNull.name === `Updated Manager ${testTimestamp}`,
      'updateManagerRow: updates and returns manager',
    )
    console.log('✓ updateManagerRow passed')

    // Test listManagerProjects
    console.log('Testing listManagerProjects...')
    const managerProjectsList = await db
      .select({
        id: managerProjects.id,
        role: managerProjects.role,
        assignedAt: managerProjects.assignedAt,
        projectId: projects.id,
        projectName: projects.title,
        projectSlug: projects.slug,
      })
      .from(managerProjects)
      .innerJoin(projects, eq(managerProjects.projectId, projects.id))
      .where(eq(managerProjects.managerId, managerId))

    assert(
      Array.isArray(managerProjectsList) && managerProjectsList.length > 0,
      'listManagerProjects: returns non-empty array',
    )
    assert(
      managerProjectsList.some((p) => p.projectId === projectIds.p1),
      'listManagerProjects: includes linked project',
    )
    console.log('✓ listManagerProjects passed')

    // Test deleteManagerRow
    console.log('Testing deleteManagerRow...')
    await db.delete(managers).where(eq(managers.id, managerId))
    const [deletedCheckManager] = await db
      .select()
      .from(managers)
      .where(eq(managers.id, managerId))
      .limit(1)
    assert(
      deletedCheckManager === undefined,
      'deleteManagerRow: manager no longer exists',
    )
    console.log('✓ deleteManagerRow passed')

    console.log('\n✓ All tests passed!')
    process.exit(0)
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────
    // Delete test data to avoid polluting the database
    await db.delete(sellerProjects).where(eq(sellerProjects.projectId, projectIds.p1))
    await db.delete(sellerProjects).where(eq(sellerProjects.projectId, projectIds.p2))
    await db.delete(managerProjects).where(eq(managerProjects.projectId, projectIds.p1))
    await db.delete(managerProjects).where(eq(managerProjects.projectId, projectIds.p2))
    await db.delete(sellers)
    await db.delete(managers)
    await db.delete(projects).where(eq(projects.id, projectIds.p1))
    await db.delete(projects).where(eq(projects.id, projectIds.p2))
  }
}

main().catch((error) => {
  console.error('FATAL:', error)
  process.exit(1)
})
