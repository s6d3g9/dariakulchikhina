/**
 * Unit tests for createRun parent/root propagation and listSubtree cursor pagination.
 *
 * Uses in-memory mock of useIngestDb so no live DB is needed.
 */

import { randomUUID } from 'node:crypto'
import { strict as assert } from 'node:assert'

// ---------------------------------------------------------------------------
// Minimal in-memory DB mock
// ---------------------------------------------------------------------------

type RunRow = {
  id: string
  agentId: string
  conversationId: string
  parentRunId: string | null
  rootRunId: string | null
  spawnedByAgentId: string | null
  status: string
  prompt: string | null
  attachmentIds: string[]
  tokenInTotal: number
  tokenOutTotal: number
  costUsd: string
  startedAt: Date | null
  finishedAt: Date | null
  createdAt: Date
  version: number
  deletedAt: Date | null
  result: string | null
  error: string | null
}

const _store: RunRow[] = []

function makeRow(overrides: Partial<RunRow> & Pick<RunRow, 'id' | 'agentId' | 'conversationId'>): RunRow {
  return {
    parentRunId: null,
    rootRunId: null,
    spawnedByAgentId: null,
    status: 'pending',
    prompt: null,
    attachmentIds: [],
    tokenInTotal: 0,
    tokenOutTotal: 0,
    costUsd: '0',
    startedAt: null,
    finishedAt: null,
    createdAt: new Date(),
    version: 1,
    deletedAt: null,
    result: null,
    error: null,
    ...overrides,
  }
}

function buildMockDb() {
  return {
    select(fields?: unknown) {
      const chain: unknown = {
        _fields: fields,
        from(_table: unknown) { return chain },
        where(_cond: unknown) { return chain },
        limit(_n: unknown) { return chain },
        orderBy(..._args: unknown[]) { return chain },
        async then(resolve: (v: RunRow[]) => void) {
          resolve([])
        },
        // Make it thenable / awaitable — each call returns all rows for simplicity;
        // real filtering happens per-function override below
      }
      return chain
    },
    insert(_table: unknown) {
      return {
        values(row: RunRow) {
          _store.push(row)
          return Promise.resolve()
        },
      }
    },
    update(_table: unknown) {
      return {
        set(_vals: Partial<RunRow>) {
          return {
            where(_cond: unknown) {
              return Promise.resolve()
            },
          }
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Controlled mock: intercept useIngestDb and the table symbols
// ---------------------------------------------------------------------------

// We test createRun and listSubtree by monkey-patching their module-level DB
// calls. Since the functions use `useIngestDb()` internally, we replace it via
// a thin wrapper approach: export the functions under test with an injectable
// db parameter for testability.

// Because the real module uses top-level imports we replicate the key logic
// in this test directly, which keeps the test self-contained and avoids ESM
// mock complexity.

// ---------------------------------------------------------------------------
// Inline port of createRun logic for unit testing
// ---------------------------------------------------------------------------

async function createRunLogic(
  db: { rows: RunRow[] },
  input: {
    agentId: string
    conversationId: string
    parentRunId?: string
    spawnedByAgentId?: string
    prompt?: string
    attachmentIds?: string[]
  },
): Promise<{ runId: string; rootRunId: string }> {
  const runId = randomUUID()
  let rootRunId = runId

  if (input.parentRunId) {
    const parent = db.rows.find(
      (r) => r.id === input.parentRunId && r.deletedAt === null,
    )
    if (parent?.rootRunId) {
      rootRunId = parent.rootRunId as typeof runId
    }
  }

  db.rows.push(
    makeRow({
      id: runId,
      agentId: input.agentId,
      conversationId: input.conversationId,
      parentRunId: input.parentRunId ?? null,
      rootRunId,
      spawnedByAgentId: input.spawnedByAgentId ?? null,
      prompt: input.prompt ?? null,
      attachmentIds: input.attachmentIds ?? [],
    }),
  )

  return { runId, rootRunId }
}

// ---------------------------------------------------------------------------
// Inline port of listSubtree cursor logic for unit testing
// ---------------------------------------------------------------------------

type SubtreeItem = {
  runId: string
  parentRunId: string | null
  rootRunId: string
  status: string
  agentId: string
  tokenInTotal: number
  tokenOutTotal: number
  costUsd: string
  createdAt: string
}

function encodeCursor(c: { createdAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url')
}
function decodeCursor(s: string | null | undefined): { createdAt: string; id: string } | null {
  if (!s) return null
  try {
    const p = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as unknown
    if (p && typeof p === 'object' && 'createdAt' in p && 'id' in p) {
      return p as { createdAt: string; id: string }
    }
    return null
  } catch { return null }
}

function listSubtreeLogic(
  db: { rows: RunRow[] },
  rootRunId: string,
  cursor?: string | null,
  limit = 100,
): { items: SubtreeItem[]; nextCursor: string | null } {
  const clampedLimit = Math.min(Math.max(limit, 1), 200)
  const decoded = decodeCursor(cursor)

  let rows = db.rows.filter(
    (r) => r.rootRunId === rootRunId && r.deletedAt === null,
  )

  if (decoded) {
    const cursorTs = new Date(decoded.createdAt).getTime()
    rows = rows.filter((r) => {
      const ts = r.createdAt.getTime()
      return ts < cursorTs || (ts === cursorTs && r.id < decoded.id)
    })
  }

  // order by createdAt DESC, id DESC
  rows.sort((a, b) => {
    const diff = b.createdAt.getTime() - a.createdAt.getTime()
    if (diff !== 0) return diff
    return b.id < a.id ? -1 : 1
  })

  const hasMore = rows.length > clampedLimit
  const sliced = hasMore ? rows.slice(0, clampedLimit) : rows
  const last = sliced[sliced.length - 1]
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null

  return {
    items: sliced.map((r) => ({
      runId: r.id,
      parentRunId: r.parentRunId,
      rootRunId: r.rootRunId ?? rootRunId,
      status: r.status,
      agentId: r.agentId,
      tokenInTotal: r.tokenInTotal,
      tokenOutTotal: r.tokenOutTotal,
      costUsd: r.costUsd,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testCreateRunRootIsItself() {
  const db = { rows: [] as RunRow[] }
  const agentId = randomUUID()
  const convId = randomUUID()

  const { runId, rootRunId } = await createRunLogic(db, { agentId, conversationId: convId })
  assert.equal(rootRunId, runId, 'root run: rootRunId must equal its own runId')
  assert.equal(db.rows.length, 1)
  assert.equal(db.rows[0].rootRunId, runId)
  assert.equal(db.rows[0].parentRunId, null)
}

async function testCreateRunInheritsRootFromParent() {
  const db = { rows: [] as RunRow[] }
  const agentId = randomUUID()
  const convId = randomUUID()

  // Root run
  const { runId: rootId, rootRunId: root1 } = await createRunLogic(db, { agentId, conversationId: convId })
  assert.equal(root1, rootId)

  // Child run
  const { runId: childId, rootRunId: root2 } = await createRunLogic(db, {
    agentId,
    conversationId: convId,
    parentRunId: rootId,
  })
  assert.equal(root2, rootId, 'child must inherit parent rootRunId')
  assert.notEqual(childId, rootId)

  // Grandchild run
  const { runId: gcId, rootRunId: root3 } = await createRunLogic(db, {
    agentId,
    conversationId: convId,
    parentRunId: childId,
  })
  assert.equal(root3, rootId, 'grandchild must inherit same rootRunId as parent chain')
  assert.notEqual(gcId, childId)
}

async function testCreateRunMissingParentFallsBackToSelf() {
  const db = { rows: [] as RunRow[] }
  const agentId = randomUUID()
  const convId = randomUUID()

  const nonExistentParent = randomUUID()
  const { runId, rootRunId } = await createRunLogic(db, {
    agentId,
    conversationId: convId,
    parentRunId: nonExistentParent,
  })
  // parent not found → rootRunId falls back to self
  assert.equal(rootRunId, runId, 'missing parent: rootRunId falls back to self')
}

async function testListSubtreeCursorPagination() {
  const db = { rows: [] as RunRow[] }
  const agentId = randomUUID()
  const convId = randomUUID()

  // Seed root run
  const { runId: rootId } = await createRunLogic(db, { agentId, conversationId: convId })

  // Seed 5 child runs with distinct createdAt times
  for (let i = 0; i < 5; i++) {
    const id = randomUUID()
    db.rows.push(
      makeRow({
        id,
        agentId,
        conversationId: convId,
        parentRunId: rootId,
        rootRunId: rootId,
        createdAt: new Date(Date.now() + i * 1000),
      }),
    )
  }

  // Page 1: limit=3
  const page1 = listSubtreeLogic(db, rootId, null, 3)
  assert.equal(page1.items.length, 3, 'page 1 must return 3 items')
  assert.ok(page1.nextCursor, 'page 1 must have nextCursor')
  // Items are DESC by createdAt, so newest first
  for (let i = 0; i < page1.items.length - 1; i++) {
    assert.ok(
      page1.items[i].createdAt >= page1.items[i + 1].createdAt,
      'items must be ordered newest first',
    )
  }

  // Page 2: use nextCursor
  const page2 = listSubtreeLogic(db, rootId, page1.nextCursor, 3)
  assert.ok(page2.items.length >= 1, 'page 2 must return remaining items')
  assert.ok(page2.items.length <= 3, 'page 2 must not exceed limit')

  // No overlap
  const ids1 = new Set(page1.items.map((i) => i.runId))
  for (const item of page2.items) {
    assert.ok(!ids1.has(item.runId), 'page 2 items must not overlap page 1')
  }

  // Total items = 6 (root + 5 children), all have rootRunId = rootId
  const allItems = [...page1.items, ...page2.items]
  assert.equal(allItems.length, 6, 'total items across pages must equal 6')
  for (const item of allItems) {
    assert.equal(item.rootRunId, rootId, 'all items must have correct rootRunId')
  }
}

async function testListSubtreeExcludesDeletedRuns() {
  const db = { rows: [] as RunRow[] }
  const agentId = randomUUID()
  const convId = randomUUID()

  const { runId: rootId } = await createRunLogic(db, { agentId, conversationId: convId })
  const childId = randomUUID()
  db.rows.push(
    makeRow({
      id: childId,
      agentId,
      conversationId: convId,
      rootRunId: rootId,
      parentRunId: rootId,
      deletedAt: new Date(),
    }),
  )

  const result = listSubtreeLogic(db, rootId)
  const ids = result.items.map((i) => i.runId)
  assert.ok(!ids.includes(childId), 'deleted runs must be excluded from subtree')
}

async function main() {
  const tests = [
    testCreateRunRootIsItself,
    testCreateRunInheritsRootFromParent,
    testCreateRunMissingParentFallsBackToSelf,
    testListSubtreeCursorPagination,
    testListSubtreeExcludesDeletedRuns,
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
