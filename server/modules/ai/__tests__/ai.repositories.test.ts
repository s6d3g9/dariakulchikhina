/**
 * Smoke-style integration tests for ai.repository and rag.repository.
 *
 * Requires a live PostgreSQL at DATABASE_URL (loaded via --env-file=.env).
 * No Ollama / Gemma network calls — the embedding vector is inlined.
 *
 * Run: pnpm test:server:ai
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

import {
  listLegalSourceCounts,
  findProjectBySlug,
  listPageContentByProject,
  findClientById,
  findContractorById,
} from '../ai.repository.ts'
import { searchLegalChunksByEmbedding, countLegalChunks } from '../rag.repository.ts'
import { config } from '~/server/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIQUE_SUFFIX = Date.now()
const TEST_PROJECT_SLUG = `__test-ai-repo-${UNIQUE_SUFFIX}`
const TEST_CONTRACTOR_SLUG = `__test-ai-contractor-${UNIQUE_SUFFIX}`
const TEST_SOURCE = `__test_src_${UNIQUE_SUFFIX}`

// 768-dim unit vector [1, 0, 0, ..., 0] — same as nomic-embed-text dimension.
// Cosine similarity with itself equals 1.0.
const UNIT_EMBEDDING_768 = '[' + [1, ...new Array(767).fill(0)].join(',') + ']'

// ---------------------------------------------------------------------------
// Fixture state
// ---------------------------------------------------------------------------
let sql: ReturnType<typeof postgres>
let testProjectId: number
let testClientId: number
let testContractorId: number

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('ai + rag repositories', async () => {
  before(async () => {
    sql = postgres(config.DATABASE_URL)

    const [proj] = await sql`
      INSERT INTO projects (slug, title, status)
      VALUES (${TEST_PROJECT_SLUG}, 'Test Project (AI repo smoke)', 'lead')
      RETURNING id
    `
    testProjectId = (proj as { id: number }).id

    await sql`
      INSERT INTO page_content (project_id, page_slug, content)
      VALUES (${testProjectId}, 'smoke-page', ${{ hello: 'world' }})
    `

    const [client] = await sql`
      INSERT INTO clients (name) VALUES ('Smoke Client (AI repo)') RETURNING id
    `
    testClientId = (client as { id: number }).id

    const [contractor] = await sql`
      INSERT INTO contractors (slug, name)
      VALUES (${TEST_CONTRACTOR_SLUG}, 'Smoke Contractor (AI repo)')
      RETURNING id
    `
    testContractorId = (contractor as { id: number }).id

    await sql`
      INSERT INTO legal_chunks (source, source_name, article_num, text, embedding)
      VALUES (
        ${TEST_SOURCE},
        'Smoke Legal Source',
        '42',
        'Тестовая правовая норма для smoke-теста.',
        ${UNIT_EMBEDDING_768}::vector
      )
    `
  })

  after(async () => {
    await sql`DELETE FROM legal_chunks  WHERE source = ${TEST_SOURCE}`
    await sql`DELETE FROM page_content  WHERE project_id = ${testProjectId}`
    await sql`DELETE FROM projects      WHERE id = ${testProjectId}`
    await sql`DELETE FROM clients       WHERE id = ${testClientId}`
    await sql`DELETE FROM contractors   WHERE id = ${testContractorId}`
    await sql.end()
  })

  // ── ai.repository ────────────────────────────────────────────────────────

  it('listLegalSourceCounts – returns aggregated rows including seeded source', async () => {
    const rows = await listLegalSourceCounts()
    assert.ok(Array.isArray(rows), 'should return an array')
    const row = rows.find((r) => r.source === TEST_SOURCE)
    assert.ok(row, `source "${TEST_SOURCE}" should appear in results`)
    assert.equal(Number(row.total), 1, 'total should be 1')
    assert.equal(Number(row.indexed), 1, 'indexed should be 1 (embedding present)')
  })

  it('findProjectBySlug – returns the seeded project', async () => {
    const proj = await findProjectBySlug(TEST_PROJECT_SLUG)
    assert.ok(proj, 'should find project')
    assert.equal(proj.slug, TEST_PROJECT_SLUG)
    assert.equal(proj.title, 'Test Project (AI repo smoke)')
  })

  it('findProjectBySlug – returns null for an unknown slug', async () => {
    const proj = await findProjectBySlug('__nonexistent_slug_xyz_smoke__')
    assert.equal(proj, null)
  })

  it('listPageContentByProject – returns the seeded page-content row', async () => {
    const rows = await listPageContentByProject(testProjectId)
    assert.ok(rows.length >= 1, 'should return at least one row')
    assert.ok(
      rows.some((r) => r.pageSlug === 'smoke-page'),
      'smoke-page should be present',
    )
  })

  it('findClientById – returns the seeded client', async () => {
    const client = await findClientById(testClientId)
    assert.ok(client, 'should find client')
    assert.equal(client.name, 'Smoke Client (AI repo)')
  })

  it('findClientById – returns null for an unknown id', async () => {
    const c = await findClientById(-1)
    assert.equal(c, null)
  })

  it('findContractorById – returns the seeded contractor', async () => {
    const contractor = await findContractorById(testContractorId)
    assert.ok(contractor, 'should find contractor')
    assert.equal(contractor.name, 'Smoke Contractor (AI repo)')
  })

  it('findContractorById – returns null for an unknown id', async () => {
    const c = await findContractorById(-1)
    assert.equal(c, null)
  })

  // ── rag.repository ───────────────────────────────────────────────────────

  it('countLegalChunks – returns a positive count after seeding', async () => {
    const count = await countLegalChunks()
    assert.ok(count >= 1, `expected count >= 1, got ${count}`)
  })

  it('searchLegalChunksByEmbedding – finds seeded chunk with similarity ≥ 0.99', async () => {
    const results = await searchLegalChunksByEmbedding(UNIT_EMBEDDING_768, 10)
    assert.ok(Array.isArray(results), 'should return an array')
    assert.ok(results.length >= 1, 'should return at least one result')
    const hit = results.find((r) => r.source === TEST_SOURCE)
    assert.ok(hit, 'seeded chunk should appear in top-10 results')
    assert.ok(
      Number(hit.similarity) >= 0.99,
      `cosine similarity should be ≥ 0.99, got ${hit.similarity}`,
    )
  })
})
