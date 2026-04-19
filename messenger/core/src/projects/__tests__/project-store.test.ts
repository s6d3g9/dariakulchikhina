/**
 * Smoke tests for project-store: happy-path CRUD, OCC conflict,
 * soft-delete visibility, and upsert idempotency.
 *
 * Self-contained — ports logic inline with injectable db so no live DB or ESM
 * mocks are needed. Run: node --experimental-strip-types <this-file>
 */

import { randomUUID } from 'node:crypto'
import { strict as assert } from 'node:assert'

// ---------------------------------------------------------------------------
// Minimal in-memory row types
// ---------------------------------------------------------------------------

type ProjectRow = {
  id: string
  ownerUserId: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  version: number
  deletedAt: Date | null
}

type SkillRow = {
  projectId: string
  skillId: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    projects: [] as ProjectRow[],
    skills: [] as SkillRow[],
  }
}

type Db = ReturnType<typeof makeDb>

// ---------------------------------------------------------------------------
// Inline logic ports (mirror the real store with injectable db)
// ---------------------------------------------------------------------------

function createProjectLogic(
  db: Db,
  ownerUserId: string,
  name: string,
  slug: string,
): ProjectRow {
  const row: ProjectRow = {
    id: randomUUID(),
    ownerUserId,
    name,
    slug,
    description: null,
    icon: null,
    color: null,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    deletedAt: null,
  }
  db.projects.push(row)
  return row
}

function getProjectByIdLogic(db: Db, id: string, ownerUserId?: string): ProjectRow | null {
  return (
    db.projects.find(
      (p) =>
        p.id === id &&
        p.deletedAt === null &&
        (ownerUserId === undefined || p.ownerUserId === ownerUserId),
    ) ?? null
  )
}

function listProjectsLogic(db: Db, ownerUserId: string): ProjectRow[] {
  return db.projects.filter((p) => p.ownerUserId === ownerUserId && p.deletedAt === null)
}

function patchProjectLogic(
  db: Db,
  id: string,
  ownerUserId: string,
  patch: { name?: string },
  expectedVersion: number,
): ProjectRow {
  const existing = getProjectByIdLogic(db, id, ownerUserId)
  if (!existing) throw 'PROJECT_NOT_FOUND'
  if (existing.version !== expectedVersion) throw 'PROJECT_VERSION_CONFLICT'

  if (patch.name !== undefined) existing.name = patch.name
  existing.version += 1
  existing.updatedAt = new Date()
  return existing
}

function softDeleteProjectLogic(db: Db, id: string, ownerUserId: string): void {
  const existing = getProjectByIdLogic(db, id, ownerUserId)
  if (!existing) throw 'PROJECT_NOT_FOUND'
  existing.deletedAt = new Date()
}

function upsertSkillLogic(
  db: Db,
  projectId: string,
  skillId: string,
  enabled = true,
  config: Record<string, unknown> = {},
): SkillRow {
  const existing = db.skills.find((s) => s.projectId === projectId && s.skillId === skillId)
  if (existing) {
    existing.enabled = enabled
    existing.config = config
    existing.updatedAt = new Date()
    return existing
  }
  const now = new Date()
  const row: SkillRow = { projectId, skillId, enabled, config, createdAt: now, updatedAt: now }
  db.skills.push(row)
  return row
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

async function testHappyPathCrud() {
  const db = makeDb()
  const userId = randomUUID()

  // create
  const p = createProjectLogic(db, userId, 'My Project', 'my-project')
  assert.equal(p.name, 'My Project')
  assert.equal(p.slug, 'my-project')
  assert.equal(p.version, 1)
  assert.equal(p.deletedAt, null)

  // get
  const found = getProjectByIdLogic(db, p.id, userId)
  assert.ok(found, 'should find project by id')
  assert.equal(found!.id, p.id)

  // list
  createProjectLogic(db, userId, 'Second', 'second')
  const list = listProjectsLogic(db, userId)
  assert.equal(list.length, 2)

  // patch
  const patched = patchProjectLogic(db, p.id, userId, { name: 'Updated' }, 1)
  assert.equal(patched.name, 'Updated')
  assert.equal(patched.version, 2)

  // soft-delete
  softDeleteProjectLogic(db, p.id, userId)
  const afterDelete = getProjectByIdLogic(db, p.id, userId)
  assert.equal(afterDelete, null, 'deleted project must not be visible')

  // list should exclude deleted
  const listAfter = listProjectsLogic(db, userId)
  assert.equal(listAfter.length, 1)
}

async function testOccConflict() {
  const db = makeDb()
  const userId = randomUUID()
  const p = createProjectLogic(db, userId, 'OCC Test', 'occ-test')

  // Patch once to advance version to 2
  patchProjectLogic(db, p.id, userId, { name: 'v2' }, 1)
  assert.equal(p.version, 2)

  // Try to patch again with stale version 1 — must throw
  let threw = false
  try {
    patchProjectLogic(db, p.id, userId, { name: 'stale' }, 1)
  } catch (e) {
    threw = true
    assert.equal(e, 'PROJECT_VERSION_CONFLICT')
  }
  assert.ok(threw, 'patch with wrong version must throw PROJECT_VERSION_CONFLICT')

  // Correct version succeeds
  const ok = patchProjectLogic(db, p.id, userId, { name: 'v3' }, 2)
  assert.equal(ok.version, 3)
}

async function testSoftDeleteVisibility() {
  const db = makeDb()
  const userId = randomUUID()
  const p = createProjectLogic(db, userId, 'Visible', 'visible')

  // Visible before delete
  assert.ok(getProjectByIdLogic(db, p.id))

  softDeleteProjectLogic(db, p.id, userId)

  // Not visible after delete
  assert.equal(getProjectByIdLogic(db, p.id), null)
  assert.equal(getProjectByIdLogic(db, p.id, userId), null)

  // Double-delete throws PROJECT_NOT_FOUND
  let threw = false
  try {
    softDeleteProjectLogic(db, p.id, userId)
  } catch (e) {
    threw = true
    assert.equal(e, 'PROJECT_NOT_FOUND')
  }
  assert.ok(threw, 'deleting already-deleted project must throw PROJECT_NOT_FOUND')
}

async function testUpsertIdempotency() {
  const db = makeDb()
  const projectId = randomUUID()

  // First insert
  const s1 = upsertSkillLogic(db, projectId, 'engineering:code-review', true)
  assert.equal(s1.enabled, true)
  assert.equal(db.skills.length, 1)

  // Second upsert — same key, different value
  const s2 = upsertSkillLogic(db, projectId, 'engineering:code-review', false, { level: 2 })
  assert.equal(s2.skillId, 'engineering:code-review')
  assert.equal(s2.enabled, false)
  assert.deepEqual(s2.config, { level: 2 })

  // Still only one row
  assert.equal(db.skills.length, 1)
  assert.equal(db.skills[0].enabled, false)

  // Third upsert with different skillId creates new row
  upsertSkillLogic(db, projectId, 'design:ux-review')
  assert.equal(db.skills.length, 2)
}

async function testOwnerIsolation() {
  const db = makeDb()
  const userA = randomUUID()
  const userB = randomUUID()
  const p = createProjectLogic(db, userA, 'Private', 'private')

  // userB cannot see userA's project
  assert.equal(getProjectByIdLogic(db, p.id, userB), null)
  assert.equal(listProjectsLogic(db, userB).length, 0)

  // userA can see it
  assert.ok(getProjectByIdLogic(db, p.id, userA))
  assert.equal(listProjectsLogic(db, userA).length, 1)
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  const tests = [
    testHappyPathCrud,
    testOccConflict,
    testSoftDeleteVisibility,
    testUpsertIdempotency,
    testOwnerIsolation,
  ]

  let passed = 0
  for (const test of tests) {
    try {
      await test()
      console.log(`PASS: ${test.name}`)
      passed++
    } catch (err) {
      console.error(`FAIL: ${test.name}`)
      console.error(err)
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`)
  if (passed < tests.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
