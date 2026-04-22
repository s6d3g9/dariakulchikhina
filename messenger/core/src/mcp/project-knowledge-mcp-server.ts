#!/usr/bin/env node
/**
 * Stdio MCP server exposing per-project knowledge search.
 * Spawned by claude-session when --project-id is provided.
 * Reads PROJECT_ID and MESSENGER_CORE_DATABASE_URL from env.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import postgres from 'postgres'

const PROJECT_ID = process.env.PROJECT_ID
const DB_URL = process.env.MESSENGER_CORE_DATABASE_URL
const OLLAMA_BASE = process.env.GEMMA_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const EMBED_MODEL = process.env.MESSENGER_EMBED_MODEL || 'nomic-embed-text'

if (!PROJECT_ID) {
  process.stderr.write('ERROR: PROJECT_ID env var is required\n')
  process.exit(1)
}
if (!DB_URL) {
  process.stderr.write('ERROR: MESSENGER_CORE_DATABASE_URL env var is required\n')
  process.exit(1)
}

const pg = postgres(DB_URL, { max: 3 })

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 4000) }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`EMBED_HTTP_${response.status}`)
  const payload = await response.json() as { embeddings?: number[][] }
  const embedding = payload.embeddings?.[0]
  if (!embedding?.length) throw new Error('EMBED_EMPTY_RESPONSE')
  return embedding
}

const server = new McpServer({
  name: 'project-knowledge',
  version: '1.0.0',
})

server.tool(
  'project_knowledge_search',
  'Search the project knowledge base using semantic similarity',
  {
    query: z.string().describe('Search query'),
    limit: z.number().int().min(1).max(20).optional().default(5).describe('Max results'),
  },
  async ({ query, limit }) => {
    const k = limit ?? 5
    let embedding: number[]
    try {
      embedding = await getEmbedding(query)
    } catch (err) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error generating embedding: ${err instanceof Error ? err.message : String(err)}`,
        }],
        isError: true,
      }
    }

    const vectorStr = `[${embedding.join(',')}]`
    const rows = await pg<{
      id: string
      source_id: string
      source_uri: string
      chunk_index: number
      chunk_text: string
      token_count: number
      distance: string
    }[]>`
      SELECT
        id,
        source_id,
        source_uri,
        chunk_index,
        chunk_text,
        token_count,
        (embedding <=> ${vectorStr}::vector) AS distance
      FROM messenger_project_knowledge_chunks
      WHERE project_id = ${PROJECT_ID}::uuid
      ORDER BY distance ASC
      LIMIT ${k}
    `

    const results = rows.map(row => ({
      sourceId: row.source_id,
      sourceUri: row.source_uri,
      chunkIndex: Number(row.chunk_index),
      score: Math.round((1 - Number(row.distance)) * 1000) / 1000,
      text: row.chunk_text,
    }))

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(results, null, 2),
      }],
    }
  },
)

server.tool(
  'project_knowledge_list',
  'List all knowledge sources for the current project',
  {},
  async () => {
    const rows = await pg<{
      source_id: string
      source_uri: string
      chunk_count: string
    }[]>`
      SELECT
        source_id,
        source_uri,
        cast(count(*) as int) AS chunk_count
      FROM messenger_project_knowledge_chunks
      WHERE project_id = ${PROJECT_ID}::uuid
      GROUP BY source_id, source_uri
      ORDER BY source_uri
    `

    const sources = rows.map(row => ({
      sourceId: row.source_id,
      sourceUri: row.source_uri,
      chunkCount: Number(row.chunk_count),
    }))

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(sources, null, 2),
      }],
    }
  },
)

async function shutdown() {
  await pg.end({ timeout: 3 })
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

const transport = new StdioServerTransport()
await server.connect(transport)
