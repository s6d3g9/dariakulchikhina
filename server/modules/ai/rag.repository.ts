import { sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import type { LegalChunk } from './rag.service'

export interface LegalChunkWithSimilarity extends LegalChunk {
  similarity: number
}

/**
 * Top-K semantic search over `legal_chunks` using pgvector cosine
 * distance (`<=>`). `embStr` is a pg-compatible vector literal —
 * `[x, y, z, ...]` — prepared by the caller from the query embedding.
 */
export async function searchLegalChunksByEmbedding(
  embStr: string,
  topK: number,
): Promise<LegalChunkWithSimilarity[]> {
  const db = useDb()
  const result = await db.execute(sql`
    SELECT
      source, source_name, article_num, article_title, chapter, text,
      1 - (embedding <=> ${embStr}::vector) AS similarity
    FROM legal_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embStr}::vector
    LIMIT ${topK}
  `)
  return result as unknown as LegalChunkWithSimilarity[]
}

/**
 * Row count in `legal_chunks`. Zero means the RAG base has not been
 * ingested yet.
 */
export async function countLegalChunks(): Promise<number> {
  const db = useDb()
  const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM legal_chunks`)
  // Postgres COUNT returns bigint; sql-tag row is Record<string, unknown>.
  const row = result[0] as { cnt: string | number } | undefined
  return Number(row?.cnt ?? 0)
}
