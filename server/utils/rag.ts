/**
 * RAG-поиск по правовой базе.
 * Использует nomic-embed-text (Ollama) для эмбеддингов и pgvector для поиска.
 */
import { sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'

const OLLAMA_BASE = process.env.GEMMA_URL || 'http://localhost:11434'
const EMBED_MODEL  = 'nomic-embed-text'

/** Получить векторное представление текста через Ollama */
export async function getEmbedding(text: string): Promise<number[]> {
  const resp = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
    signal:  AbortSignal.timeout(30_000),
  })
  if (!resp.ok) throw new Error(`Embeds HTTP ${resp.status}`)
  const data = await resp.json() as { embeddings: number[][] }
  return data.embeddings[0]
}

export interface LegalChunk {
  source:        string
  source_name:   string
  article_num:   string | null
  article_title: string | null
  chapter:       string | null
  text:          string
}

export interface LegalChunkWithScore extends LegalChunk {
  similarity: number
}

/** Найти релевантные правовые нормы по семантическому сходству */
export async function retrieveLegalContext(
  query: string,
  topK  = 6,
): Promise<string> {
  const { context } = await retrieveLegalContextWithChunks(query, topK)
  return context
}

/**
 * Найти релевантные нормы и вернуть и строку для промпта, и сырые чанки.
 * Используется в document-stream для последующей отправки цитат клиенту.
 */
export async function retrieveLegalContextWithChunks(
  query: string,
  topK  = 6,
): Promise<{ context: string; chunks: LegalChunkWithScore[] }> {
  try {
    const db        = useDb()
    const embedding = await getEmbedding(query)
    const embStr    = `[${embedding.join(',')}]`

    const result = await db.execute(sql`
      SELECT
        source, source_name, article_num, article_title, chapter, text,
        1 - (embedding <=> ${embStr}::vector) AS similarity
      FROM legal_chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embStr}::vector
      LIMIT ${topK}
    `)

    const rows = result.rows as Array<LegalChunk & { similarity: number }>
    if (!rows.length) return { context: '', chunks: [] }

    // Фильтруем: берём только достаточно релевантные (similarity > 0.5)
    const relevant = rows.filter(r => Number(r.similarity) > 0.50)
    if (!relevant.length) return { context: '', chunks: [] }

    const ctx = relevant.map(r => {
      const ref = [
        r.source_name,
        r.chapter ? `Глава «${r.chapter}»` : null,
        r.article_num ? `Статья ${r.article_num}` : null,
        r.article_title ? `«${r.article_title}»` : null,
      ].filter(Boolean).join(', ')
      return `[${ref}]\n${r.text}`
    }).join('\n\n---\n\n')

    const context = `\n\n### ПРИМЕНИМЫЕ НОРМЫ ПРАВА ###\n${ctx}\n### КОНЕЦ ПРАВОВОЙ СПРАВКИ ###\n`
    return { context, chunks: relevant as LegalChunkWithScore[] }
  } catch (err) {
    // RAG не критичен — если упал, работаем без него
    console.warn('[RAG] Ошибка retrieval:', (err as Error).message)
    return { context: '', chunks: [] }
  }
}

/** Проверить, заполнена ли правовая база */
export async function legalBaseReady(): Promise<{ ready: boolean; count: number }> {
  try {
    const db     = useDb()
    const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM legal_chunks`)
    const count  = Number((result.rows[0] as any).cnt)
    return { ready: count > 0, count }
  } catch {
    return { ready: false, count: 0 }
  }
}
