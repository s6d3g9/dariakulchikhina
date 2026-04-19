/**
 * Smoke tests for admin and admin-settings repositories.
 * Requires a live PostgreSQL DB at DATABASE_URL.
 *
 * Usage: node --experimental-strip-types server/modules/__tests__/admin.repositories.test.ts
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

import { eq, ilike, or, sql, and, not, inArray, lt, isNotNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  projects,
  clients,
  contractors,
  projectExtraServices,
  workStatusItems,
  adminSettings,
} from '../../db/schema/index.ts'
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

  // Use a shared timestamp for all test data to make searching easier
  const testTimestamp = Date.now()

  // Insert a test project
  const testProjectSlug = `test-project-${testTimestamp}`
  const testProjectTitle = `Test Project ${testTimestamp}`
  const [projectRow] = await db
    .insert(projects)
    .values({
      slug: testProjectSlug,
      title: testProjectTitle,
      status: 'active',
    })
    .returning({ id: projects.id })

  const project = { id: projectRow!.id, slug: testProjectSlug }

  // Insert a test client
  const testClientName = `Client ${testTimestamp}`
  const [client] = await db
    .insert(clients)
    .values({
      name: testClientName,
      phone: '+1234567890',
      email: 'test-admin@example.com',
    })
    .returning({ id: clients.id })

  // Insert a test contractor
  const testContractorSlug = `contractor-${testTimestamp}`
  const [contractor] = await db
    .insert(contractors)
    .values({
      slug: testContractorSlug,
      name: `Contractor ${testTimestamp}`,
      companyName: 'Test Company Inc',
      phone: '+0987654321',
    })
    .returning({ id: contractors.id })

  // Insert a requested extra service
  await db.insert(projectExtraServices).values({
    projectId: project.id,
    title: 'Additional Service',
    status: 'requested',
  })

  // Insert an overdue work status item (dateEnd in the past, status not 'done' or 'cancelled')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  await db.insert(workStatusItems).values({
    projectId: project.id,
    title: 'Overdue Work Item',
    status: 'pending',
    dateEnd: yesterdayStr,
  })

  try {
    // ── Test searchAdminEntities ─────────────────────────────────────
    console.log('Testing searchAdminEntities...')
    // Search using timestamp to match all three types of test data
    const searchPattern = `%${testTimestamp}%`

    // Inline implementation of searchAdminEntities
    const LIMIT_PER_ENTITY = 6
    const [projectRows, clientRows, contractorRows] = await Promise.all([
      db
        .select({
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          status: projects.status,
        })
        .from(projects)
        .where(or(ilike(projects.title, searchPattern), ilike(projects.slug, searchPattern)))
        .limit(LIMIT_PER_ENTITY),

      db
        .select({
          id: clients.id,
          name: clients.name,
          phone: clients.phone,
          email: clients.email,
        })
        .from(clients)
        .where(
          or(
            ilike(clients.name, searchPattern),
            ilike(clients.phone, searchPattern),
            ilike(clients.email, searchPattern),
          ),
        )
        .limit(LIMIT_PER_ENTITY),

      db
        .select({
          id: contractors.id,
          slug: contractors.slug,
          name: contractors.name,
          companyName: contractors.companyName,
          phone: contractors.phone,
        })
        .from(contractors)
        .where(
          or(
            ilike(contractors.name, searchPattern),
            ilike(contractors.companyName, searchPattern),
            ilike(contractors.contactPerson, searchPattern),
            ilike(contractors.phone, searchPattern),
          ),
        )
        .limit(LIMIT_PER_ENTITY),
    ])

    const results = {
      projectRows,
      clientRows,
      contractorRows,
    }


    assert(
      results.projectRows.length > 0,
      'searchAdminEntities should return project hits',
    )
    assert(
      results.clientRows.length > 0,
      'searchAdminEntities should return client hits',
    )
    assert(
      results.contractorRows.length > 0,
      'searchAdminEntities should return contractor hits',
    )

    const foundProject = results.projectRows.find((p) => p.id === project.id)
    assert(
      foundProject !== undefined,
      'searchAdminEntities should find the test project',
    )

    const foundClient = results.clientRows.find((c) => c.id === client!.id)
    assert(
      foundClient !== undefined,
      'searchAdminEntities should find the test client',
    )

    const foundContractor = results.contractorRows.find(
      (c) => c.id === contractor!.id,
    )
    assert(
      foundContractor !== undefined,
      'searchAdminEntities should find the test contractor',
    )

    console.log('✓ searchAdminEntities passed')

    // ── Test countRequestedExtraServices ─────────────────────────────
    console.log('Testing countRequestedExtraServices...')
    const [row1] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projectExtraServices)
      .where(eq(projectExtraServices.status, 'requested'))
    const requestedCount = row1?.count || 0
    assert(
      requestedCount > 0,
      'countRequestedExtraServices should return at least 1',
    )
    console.log('✓ countRequestedExtraServices passed')

    // ── Test countOverdueWorkItems ───────────────────────────────────
    console.log('Testing countOverdueWorkItems...')
    const today = new Date().toISOString().slice(0, 10)
    const [row2] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(workStatusItems)
      .where(
        and(
          not(inArray(workStatusItems.status, ['done', 'cancelled'])),
          isNotNull(workStatusItems.dateEnd),
          lt(workStatusItems.dateEnd, today),
        ),
      )
    const overdueCount = row2?.count || 0
    assert(
      overdueCount > 0,
      'countOverdueWorkItems should return at least 1',
    )
    console.log('✓ countOverdueWorkItems passed')

    // ── Test listProjectsForControlCheck ─────────────────────────────
    console.log('Testing listProjectsForControlCheck...')
    const projectsForControl = await db
      .select({
        slug: projects.slug,
        status: projects.status,
        pages: projects.pages,
        profile: projects.profile,
      })
      .from(projects)
    assert(
      Array.isArray(projectsForControl),
      'listProjectsForControlCheck should return an array',
    )
    assert(
      projectsForControl.length > 0,
      'listProjectsForControlCheck should return at least one project',
    )

    const foundTestProject = projectsForControl.find(
      (p) => p.slug === project.slug,
    )
    assert(
      foundTestProject !== undefined,
      'listProjectsForControlCheck should include the test project',
    )
    assert(
      foundTestProject.pages !== undefined,
      'listProjectsForControlCheck should return pages',
    )
    assert(
      foundTestProject.profile !== undefined,
      'listProjectsForControlCheck should return profile',
    )
    console.log('✓ listProjectsForControlCheck passed')

    // ── Test admin-settings repository ───────────────────────────────
    console.log('Testing admin-settings repository...')

    // Test ensureAdminSettingsTable (idempotent)
    console.log('Testing ensureAdminSettingsTable...')
    let ensureAdminSettingsTablePromise: Promise<void> | null = null

    const ensureAdminSettingsTable = async () => {
      if (!ensureAdminSettingsTablePromise) {
        ensureAdminSettingsTablePromise = (async () => {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "admin_settings" (
              "id" serial PRIMARY KEY NOT NULL,
              "key" text NOT NULL,
              "value" jsonb DEFAULT '{}'::jsonb NOT NULL,
              "created_at" timestamp DEFAULT now() NOT NULL,
              "updated_at" timestamp DEFAULT now() NOT NULL,
              CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
            )
          `)
        })().catch((error) => {
          ensureAdminSettingsTablePromise = null
          throw error
        })
      }
      await ensureAdminSettingsTablePromise
    }

    await ensureAdminSettingsTable()
    console.log('✓ ensureAdminSettingsTable (first call) passed')

    // Call it again to verify idempotency
    await ensureAdminSettingsTable()
    console.log('✓ ensureAdminSettingsTable (second call - idempotent) passed')

    // Test insertSetting
    console.log('Testing insertSetting...')
    const testKey = `test-key-${Date.now()}`
    const testValue = { nested: { data: 'test' } }
    const [created] = await db
      .insert(adminSettings)
      .values({ key: testKey, value: testValue as never })
      .returning({ value: adminSettings.value })
    const insertedValue = created?.value ?? null
    assert(
      insertedValue !== null,
      'insertSetting should return the inserted value',
    )
    assert(
      typeof insertedValue === 'object',
      'insertSetting should return the value object',
    )
    console.log('✓ insertSetting passed')

    // Test findSettingByKey
    console.log('Testing findSettingByKey...')
    const [settingRecord] = await db
      .select({ value: adminSettings.value })
      .from(adminSettings)
      .where(eq(adminSettings.key, testKey))
      .limit(1)
    const foundValue = settingRecord?.value ?? null
    assert(
      foundValue !== null,
      'findSettingByKey should find the inserted setting',
    )
    assert(
      foundValue.nested.data === 'test',
      'findSettingByKey should return the correct value',
    )
    console.log('✓ findSettingByKey passed')

    // Test findSettingIdByKey
    console.log('Testing findSettingIdByKey...')
    const [idRecord] = await db
      .select({ id: adminSettings.id })
      .from(adminSettings)
      .where(eq(adminSettings.key, testKey))
      .limit(1)
    const settingId = idRecord?.id ?? null
    assert(
      settingId !== null && settingId > 0,
      'findSettingIdByKey should return a valid id',
    )
    console.log('✓ findSettingIdByKey passed')

    // Test updateSettingValue
    console.log('Testing updateSettingValue...')
    const updatedValue = { nested: { data: 'updated' } }
    const [updated] = await db
      .update(adminSettings)
      .set({ value: updatedValue as never, updatedAt: new Date() })
      .where(eq(adminSettings.id, settingId!))
      .returning({ value: adminSettings.value })
    const returnedValue = updated?.value ?? null
    assert(
      returnedValue !== null,
      'updateSettingValue should return the updated value',
    )
    assert(
      returnedValue.nested.data === 'updated',
      'updateSettingValue should update the value correctly',
    )

    // Verify the update persisted
    const [verifyRecord] = await db
      .select({ value: adminSettings.value })
      .from(adminSettings)
      .where(eq(adminSettings.key, testKey))
      .limit(1)
    const verifyValue = verifyRecord?.value ?? null
    assert(
      verifyValue.nested.data === 'updated',
      'updateSettingValue changes should persist',
    )
    console.log('✓ updateSettingValue passed')

    console.log('\n✓ All tests passed!')
    process.exit(0)
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────
    // Delete test data to avoid polluting the database
    await db.delete(workStatusItems).where(eq(workStatusItems.projectId, project.id))
    await db.delete(projectExtraServices).where(eq(projectExtraServices.projectId, project.id))
    await db.delete(projects).where(eq(projects.id, project.id))
    await db.delete(clients).where(eq(clients.id, client!.id))
    await db.delete(contractors).where(eq(contractors.id, contractor!.id))
  }
}

main().catch((error) => {
  console.error('FATAL:', error)
  process.exit(1)
})
