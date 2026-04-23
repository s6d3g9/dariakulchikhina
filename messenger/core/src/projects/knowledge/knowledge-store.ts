// eslint-disable-next-line no-restricted-imports
import { drizzle } from 'drizzle-orm/postgres-js'
// eslint-disable-next-line no-restricted-imports
import postgres from 'postgres'
// eslint-disable-next-line no-restricted-imports
import { messengerProjectKnowledgeChunks } from '../../../../../server/db/schema/messenger-project-knowledge.ts'
// eslint-disable-next-line no-restricted-imports
import { eq, and, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { readMessengerConfig } from '../../config.ts'
import { getEmbedding } from '../../ai/embedding-client.ts'

const CHUNK_SIZE = 1400
const CHUNK_OVERLAP = 220

function splitIntoChunks(text: string): string[] {
  // eslint-disable-next-line no-control-regex
  const normalized = text.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
  if (!normalized) return []
  const chunks: string[] = []
  let offset = 0
  while (offset < normalized.length) {
    const chunk = normalized.slice(offset, offset + CHUNK_SIZE).trim()
    if (chunk) chunks.push(chunk)
    if (offset + CHUNK_SIZE >= normalized.length) break
    offset += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

const schema = { messengerProjectKnowledgeChunks }
type KnowledgeDb = ReturnType<typeof drizzle<typeof schema>>

let _db: KnowledgeDb | null = null
let _pg: ReturnType<typeof postgres> | null = null

function useKnowledgeClient(): { db: KnowledgeDb; pg: ReturnType<typeof postgres> } {
  if (!_db || !_pg) {
    const config = readMessengerConfig()
    const url = config.MESSENGER_CORE_DATABASE_URL
    _pg = postgres(url, { max: 5 })
    _db = drizzle(_pg, { schema })
  }
  return { db: _db!, pg: _pg! }
}

export async function insertProjectKnowledge(params: {
  projectId: string
  sourceId: string
  sourceUri: string
  text: string
}): Promise<{ sourceId: string; chunkCount: number }> {
  const { db } = useKnowledgeClient()
  const chunks = splitIntoChunks(params.text)

  const rows = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await getEmbedding(chunk)
      return {
        id: randomUUID(),
        projectId: params.projectId,
        sourceId: params.sourceId,
        sourceUri: params.sourceUri,
        chunkIndex: index,
        chunkText: chunk,
        embedding,
        tokenCount: Math.ceil(chunk.length / 4),
      }
    }),
  )

  if (rows.length > 0) {
    await db.insert(messengerProjectKnowledgeChunks).values(rows)
  }

  return { sourceId: params.sourceId, chunkCount: rows.length }
}

export async function listProjectKnowledgeSources(projectId: string) {
  const { db } = useKnowledgeClient()
  const rows = await db
    .select({
      sourceId: messengerProjectKnowledgeChunks.sourceId,
      sourceUri: messengerProjectKnowledgeChunks.sourceUri,
      chunkCount: sql<number>`cast(count(*) as int)`,
    })
    .from(messengerProjectKnowledgeChunks)
    .where(eq(messengerProjectKnowledgeChunks.projectId, projectId))
    .groupBy(
      messengerProjectKnowledgeChunks.sourceId,
      messengerProjectKnowledgeChunks.sourceUri,
    )
  return rows
}

export async function deleteProjectKnowledgeSource(
  projectId: string,
  sourceId: string,
): Promise<boolean> {
  const { db } = useKnowledgeClient()
  const result = await db
    .delete(messengerProjectKnowledgeChunks)
    .where(
      and(
        eq(messengerProjectKnowledgeChunks.projectId, projectId),
        eq(messengerProjectKnowledgeChunks.sourceId, sourceId),
      ),
    )
    .returning({ id: messengerProjectKnowledgeChunks.id })
  return result.length > 0
}

interface KnowledgeChunkHit {
  id: string
  projectId: string
  sourceId: string
  sourceUri: string
  chunkIndex: number
  chunkText: string
  tokenCount: number
  score: number
}

export async function searchProjectKnowledge(params: {
  projectId: string
  query: string
  k: number
}): Promise<KnowledgeChunkHit[]> {
  const { pg } = useKnowledgeClient()
  const queryEmbedding = await getEmbedding(params.query)
  const vectorStr = `[${queryEmbedding.join(',')}]`

  const rows = await pg<{
    id: string
    project_id: string
    source_id: string
    source_uri: string
    chunk_index: number
    chunk_text: string
    token_count: number
    distance: string
  }[]>`
    SELECT
      id,
      project_id,
      source_id,
      source_uri,
      chunk_index,
      chunk_text,
      token_count,
      (embedding <=> ${vectorStr}::vector) AS distance
    FROM messenger_project_knowledge_chunks
    WHERE project_id = ${params.projectId}::uuid
    ORDER BY distance ASC
    LIMIT ${params.k}
  `

  return rows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    sourceId: row.source_id,
    sourceUri: row.source_uri,
    chunkIndex: Number(row.chunk_index),
    chunkText: row.chunk_text,
    tokenCount: Number(row.token_count),
    score: 1 - Number(row.distance),
  }))
}
