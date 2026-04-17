/**
 * RAG-поиск по правовой базе.
 * Использует nomic-embed-text (Ollama) для эмбеддингов и pgvector для поиска.
 */
import { config } from '~/server/config'
import * as repo from './rag.repository'

const OLLAMA_BASE = config.GEMMA_URL || 'http://localhost:11434'
const EMBED_MODEL = 'nomic-embed-text'
const SIMILARITY_THRESHOLD = 0.5

export async function getEmbedding(text: string): Promise<number[]> {
  const resp = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 2000) }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!resp.ok) throw new Error(`Embeds HTTP ${resp.status}`)
  const data = (await resp.json()) as { embeddings: number[][] }
  const embedding = data.embeddings[0]
  if (!embedding) throw new Error('Ollama embed: пустой ответ embeddings')
  return embedding
}

export interface LegalChunk {
  source: string
  source_name: string
  article_num: string | null
  article_title: string | null
  chapter: string | null
  text: string
}

export interface LegalChunkWithScore extends LegalChunk {
  similarity: number
}

export async function retrieveLegalContext(query: string, topK = 6): Promise<string> {
  const { context } = await retrieveLegalContextWithChunks(query, topK)
  return context
}

export async function retrieveLegalContextWithChunks(
  query: string,
  topK = 6,
): Promise<{ context: string; chunks: LegalChunkWithScore[] }> {
  try {
    const embedding = await getEmbedding(query)
    const embStr = `[${embedding.join(',')}]`

    const rows = await repo.searchLegalChunksByEmbedding(embStr, topK)
    if (!rows.length) return { context: '', chunks: [] }

    const relevant = rows.filter((r) => Number(r.similarity) > SIMILARITY_THRESHOLD)
    if (!relevant.length) return { context: '', chunks: [] }

    const ctx = relevant
      .map((r) => {
        const ref = [
          r.source_name,
          r.chapter ? `Глава «${r.chapter}»` : null,
          r.article_num ? `Статья ${r.article_num}` : null,
          r.article_title ? `«${r.article_title}»` : null,
        ]
          .filter(Boolean)
          .join(', ')
        return `[${ref}]\n${r.text}`
      })
      .join('\n\n---\n\n')

    const context = `\n\n### ПРИМЕНИМЫЕ НОРМЫ ПРАВА ###\n${ctx}\n### КОНЕЦ ПРАВОВОЙ СПРАВКИ ###\n`
    return { context, chunks: relevant as LegalChunkWithScore[] }
  } catch (err) {
    // eslint-disable-next-line no-console -- pino logger not yet wired to this hot path; stderr is acceptable
    console.warn('[RAG] Ошибка retrieval:', (err as Error).message)
    return { context: '', chunks: [] }
  }
}

export async function legalBaseReady(): Promise<{ ready: boolean; count: number }> {
  try {
    const count = await repo.countLegalChunks()
    return { ready: count > 0, count }
  } catch {
    return { ready: false, count: 0 }
  }
}
