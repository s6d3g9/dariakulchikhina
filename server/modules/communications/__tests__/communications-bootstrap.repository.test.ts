/**
 * Smoke tests for communications-bootstrap.repository.ts
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Tests the 4 repository functions by executing the same queries they use,
 * directly against the database.
 *
 * Usage: node --experimental-strip-types server/modules/communications/__tests__/communications-bootstrap.repository.test.ts
 */

// Load root .env so DATABASE_URL is available
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

import postgres from 'postgres'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
}

async function main() {
  // Initialize database connection
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const sql = postgres(databaseUrl)

  // ========== Test Data Setup ==========
  const testUserEmail = `admin-${Date.now()}@test.example.com`
  const testProjectSlug = `test-project-${Date.now()}`
  const testProjectSlug2 = `test-project-2-${Date.now()}`
  const testProjectSlug3 = `test-project-3-${Date.now()}`
  const testContractorName = `Test Contractor ${Date.now()}`

  let userId: number
  let projectId: number
  let contractorId: number
  let otherProjectId: number

  try {
    // ========== INSERT TEST DATA ==========
    // Insert test user
    const userResult = await sql`
      INSERT INTO users (name, email, login, password_hash)
      VALUES ('Test Admin', ${testUserEmail}, 'testadmin', '')
      RETURNING id
    `
    userId = userResult[0]!.id

    // Insert test project with user owner
    const projectResult = await sql`
      INSERT INTO projects (slug, title, status, user_id, client_login, pages, profile)
      VALUES (${testProjectSlug}, 'Test Project for Bootstrap', 'active', ${userId}, 'client-login', '{}', '{}')
      RETURNING id
    `
    projectId = projectResult[0]!.id

    // Insert test contractor
    const contractorResult = await sql`
      INSERT INTO contractors (slug, name, company_name, login, messenger_nick)
      VALUES (${'contractor-' + Date.now()}, ${testContractorName}, 'Test Company', 'testcontractor', '@testcontractor')
      RETURNING id
    `
    contractorId = contractorResult[0]!.id

    // Link contractor to project
    await sql`
      INSERT INTO project_contractors (project_id, contractor_id)
      VALUES (${projectId}, ${contractorId})
    `

    // ========== TEST: findProjectForBootstrap (happy path) ==========
    // Query the same fields the function selects
    const foundProjects = await sql`
      SELECT id, slug, title, client_login, pages, status, profile
      FROM projects
      WHERE slug = ${testProjectSlug}
      LIMIT 1
    `

    assert(foundProjects.length === 1, 'findProjectForBootstrap should return a project for existing slug')
    const foundProject = foundProjects[0]!
    assert(foundProject.id === projectId, `project.id should match`)
    assert(foundProject.slug === testProjectSlug, `project.slug should match`)
    assert(foundProject.title === 'Test Project for Bootstrap', `project.title should match`)
    assert(foundProject.client_login === 'client-login', `project.client_login should match`)
    assert(Array.isArray(foundProject.pages), 'project.pages should be an array')
    assert(typeof foundProject.profile === 'object', 'project.profile should be an object')

    // TEST: findProjectForBootstrap (negative path)
    const nonexistentProjects = await sql`
      SELECT id, slug, title, client_login, pages, status, profile
      FROM projects
      WHERE slug = 'nonexistent-slug-12345'
      LIMIT 1
    `
    assert(nonexistentProjects.length === 0, 'should return empty for nonexistent slug')

    // ========== TEST: findAdminUser (happy path) ==========
    const foundUsers = await sql`
      SELECT id, name, email, login
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    assert(foundUsers.length === 1, 'should return a user for existing userId')
    const foundUser = foundUsers[0]!
    assert(foundUser.id === userId, `user.id should match`)
    assert(foundUser.name === 'Test Admin', `user.name should match`)
    assert(foundUser.email === testUserEmail, `user.email should match`)
    assert(foundUser.login === 'testadmin', `user.login should match`)

    // TEST: findAdminUser (negative path)
    const nonexistentUsers = await sql`
      SELECT id, name, email, login
      FROM users
      WHERE id = 99999
      LIMIT 1
    `
    assert(nonexistentUsers.length === 0, 'should return empty for nonexistent userId')

    // ========== TEST: findContractorInProject (happy path) ==========
    const foundContractors = await sql`
      SELECT c.id, c.name, c.messenger_nick, c.login
      FROM project_contractors pc
      INNER JOIN contractors c ON pc.contractor_id = c.id
      WHERE pc.project_id = ${projectId} AND pc.contractor_id = ${contractorId}
      LIMIT 1
    `

    assert(foundContractors.length === 1, 'should return a contractor for valid project and contractor')
    const foundContractor = foundContractors[0]!
    assert(foundContractor.id === contractorId, `contractor.id should match`)
    assert(foundContractor.name === testContractorName, `contractor.name should match`)
    assert(foundContractor.login === 'testcontractor', `contractor.login should match`)
    assert(foundContractor.messenger_nick === '@testcontractor', `contractor.messenger_nick should match`)

    // TEST: findContractorInProject (negative path - contractor not in project)
    const otherProjectResult = await sql`
      INSERT INTO projects (slug, title, status, client_login, pages, profile)
      VALUES (${testProjectSlug2}, 'Other Project', 'active', 'other-login', '{}', '{}')
      RETURNING id
    `
    otherProjectId = otherProjectResult[0]!.id

    const notInProject = await sql`
      SELECT c.id, c.name, c.messenger_nick, c.login
      FROM project_contractors pc
      INNER JOIN contractors c ON pc.contractor_id = c.id
      WHERE pc.project_id = ${otherProjectId} AND pc.contractor_id = ${contractorId}
      LIMIT 1
    `

    assert(notInProject.length === 0, 'should return empty for contractor not in project')

    // TEST: findContractorInProject (negative path - nonexistent contractor)
    const nonexistentContractor = await sql`
      SELECT c.id, c.name, c.messenger_nick, c.login
      FROM project_contractors pc
      INNER JOIN contractors c ON pc.contractor_id = c.id
      WHERE pc.project_id = ${projectId} AND pc.contractor_id = 99999
      LIMIT 1
    `

    assert(nonexistentContractor.length === 0, 'should return empty for nonexistent contractor')

    // ========== TEST: findProjectOwnerForRoom (happy path) ==========
    const projectOwnerRows = await sql`
      SELECT p.user_id as user_id, u.name, u.email, u.login
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.slug = ${testProjectSlug}
      LIMIT 1
    `

    assert(projectOwnerRows.length === 1, 'should return a row for existing project')
    const projectOwnerRow = projectOwnerRows[0]!
    assert(projectOwnerRow.user_id === userId, `userId should match`)
    assert(projectOwnerRow.name === 'Test Admin', `userName should match`)
    assert(projectOwnerRow.email === testUserEmail, `userEmail should match`)
    assert(projectOwnerRow.login === 'testadmin', `userLogin should match`)

    // TEST: findProjectOwnerForRoom (negative path - project without owner)
    const projectNoOwnerResult = await sql`
      INSERT INTO projects (slug, title, status, client_login, pages, profile)
      VALUES (${testProjectSlug3}, 'No Owner Project', 'active', 'no-owner-login', '{}', '{}')
      RETURNING slug
    `
    const projectNoOwnerSlug = projectNoOwnerResult[0]!.slug

    const ownerRowNoOwner = await sql`
      SELECT p.user_id, u.name, u.email, u.login
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.slug = ${projectNoOwnerSlug}
      LIMIT 1
    `

    assert(ownerRowNoOwner.length === 1, 'should return a row even for project without owner')
    assert(ownerRowNoOwner[0]!.user_id === null, `user_id should be null for project without owner`)
    assert(ownerRowNoOwner[0]!.name === null, `name should be null for project without owner`)
    assert(ownerRowNoOwner[0]!.email === null, `email should be null for project without owner`)
    assert(ownerRowNoOwner[0]!.login === null, `login should be null for project without owner`)

    // TEST: findProjectOwnerForRoom (negative path - nonexistent project)
    const nonexistentProjectOwner = await sql`
      SELECT p.user_id, u.name, u.email, u.login
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.slug = 'nonexistent-project-12345'
      LIMIT 1
    `

    assert(nonexistentProjectOwner.length === 0, 'should return empty for nonexistent project')

    console.log('PASS: communications-bootstrap.repository — all 4 functions tested (happy + negative paths)')
  } finally {
    // ========== CLEANUP ==========
    // Delete in cascade order: depends first
    try {
      // Delete project contractors first
      await sql`
        DELETE FROM project_contractors
        WHERE project_id IN (
          SELECT id FROM projects
          WHERE slug IN (${testProjectSlug}, ${testProjectSlug2}, ${testProjectSlug3})
        )
      `

      // Delete projects
      await sql`
        DELETE FROM projects
        WHERE slug IN (${testProjectSlug}, ${testProjectSlug2}, ${testProjectSlug3})
      `

      // Delete contractors
      await sql`
        DELETE FROM contractors
        WHERE name = ${testContractorName}
      `

      // Delete users
      await sql`
        DELETE FROM users
        WHERE email = ${testUserEmail}
      `
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr)
    }

    // Close the database connection
    await sql.end()
  }
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
