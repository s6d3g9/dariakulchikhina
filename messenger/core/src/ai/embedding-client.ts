import { readMessengerConfig } from '../config.ts'

const _cfg = readMessengerConfig()
const OLLAMA_BASE = _cfg.GEMMA_URL || _cfg.OLLAMA_BASE_URL
const EMBED_MODEL = _cfg.MESSENGER_EMBED_MODEL

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text.slice(0, 4000),
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`EMBED_HTTP_${response.status}`)
  }

  const payload = await response.json() as { embeddings?: number[][] }
  const embedding = payload.embeddings?.[0]
  if (!embedding?.length) {
    throw new Error('EMBED_EMPTY_RESPONSE')
  }

  return embedding
}

export async function getEmbeddingOrEmpty(text: string): Promise<number[]> {
  try {
    return await getEmbedding(text)
  } catch {
    return []
  }
}
