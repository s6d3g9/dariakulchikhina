import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { join, posix as pathPosix } from 'node:path'
import { promisify } from 'node:util'

import {
  resolveMessengerAgentActiveRepository,
  resolveMessengerAgentWorkspacePath,
  type MessengerAgentKnowledgeSourceRecord,
  type MessengerAgentSettingsRecord,
} from './agent-settings-store.ts'
import { resolveMessengerDataPath } from '../media/storage-paths.ts'
import { getEmbedding, getEmbeddingOrEmpty } from '../ai/embedding-client.ts'

const execFileAsync = promisify(execFile)
const STORAGE_PATH = resolveMessengerDataPath('agent-knowledge.json')
const MAX_SOURCE_BYTES = 256 * 1024
const CHUNK_SIZE = 1400
const CHUNK_OVERLAP = 220
const TEXT_FILE_PATTERN = /\.(txt|md|mdx|json|ya?ml|csv|ts|tsx|js|jsx|vue|mjs|cjs|css|scss|html|htm|py|env|sh|sql)$/i

interface AgentKnowledgeIndexedChunk {
  id: string
  sourceId: string
  sourceLabel: string
  sourcePath: string
  type: 'rag' | 'vector'
  text: string
  title: string
  embedding: number[]
}

interface ParsedVectorEntry {
  title: string
  text: string
  embedding: number[] | null
}

interface AgentKnowledgeIndexedSource {
  sourceId: string
  indexedAt: string | null
  chunkCount: number
  error: string | null
}

interface AgentKnowledgeIndexRecord {
  agentId: string
  updatedAt: string | null
  sources: AgentKnowledgeIndexedSource[]
  chunks: AgentKnowledgeIndexedChunk[]
}

interface AgentKnowledgeIndexFile {
  agents: AgentKnowledgeIndexRecord[]
}

export interface MessengerAgentKnowledgeStatusItem {
  id: string
  label: string
  repositoryId: string
  path: string
  type: 'rag' | 'vector'
  enabled: boolean
  indexed: boolean
  chunkCount: number
  indexedAt: string | null
  error: string | null
}

export interface MessengerAgentKnowledgeStatus {
  ready: boolean
  indexedSources: number
  indexedChunks: number
  lastIndexedAt: string | null
  sources: MessengerAgentKnowledgeStatusItem[]
}

export interface MessengerAgentKnowledgeHit {
  sourceId: string
  sourceLabel: string
  sourcePath: string
  title: string
  score: number
  text: string
}

export interface MessengerAgentKnowledgeRetrieval {
  context: string
  hits: MessengerAgentKnowledgeHit[]
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function normalizeText(value: string) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
}

function condenseText(value: string, maxLength = 560) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function splitIntoChunks(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return []
  }

  const chunks: string[] = []
  let offset = 0
  while (offset < normalized.length) {
    const chunk = normalized.slice(offset, offset + CHUNK_SIZE).trim()
    if (chunk) {
      chunks.push(chunk)
    }

    if (offset + CHUNK_SIZE >= normalized.length) {
      break
    }

    offset += CHUNK_SIZE - CHUNK_OVERLAP
  }

  return chunks
}

function cosineSimilarity(left: number[], right: number[]) {
  const size = Math.min(left.length, right.length)
  if (!size) {
    return 0
  }

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < size; index += 1) {
    const leftValue = left[index] || 0
    const rightValue = right[index] || 0
    dot += leftValue * rightValue
    leftNorm += leftValue * leftValue
    rightNorm += rightValue * rightValue
  }

  if (!leftNorm || !rightNorm) {
    return 0
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

function tokenizeForSearch(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 2)
}

function lexicalSimilarity(query: string, text: string) {
  const queryTokens = new Set(tokenizeForSearch(query))
  if (!queryTokens.size) {
    return 0
  }

  const textTokens = new Set(tokenizeForSearch(text))
  if (!textTokens.size) {
    return 0
  }

  let matches = 0
  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      matches += 1
    }
  }

  return matches / Math.max(queryTokens.size, Math.min(textTokens.size, 12))
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readIndexFile(): Promise<AgentKnowledgeIndexFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AgentKnowledgeIndexFile>
    return {
      agents: Array.isArray(parsed.agents) ? parsed.agents as AgentKnowledgeIndexRecord[] : [],
    }
  } catch {
    return { agents: [] }
  }
}

async function writeIndexFile(payload: AgentKnowledgeIndexFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

async function withTemporaryPrivateKey<T>(privateKey: string, task: (keyPath: string) => Promise<T>) {
  const tempDir = await mkdtemp(join(tmpdir(), 'daria-agent-ssh-'))
  const keyPath = join(tempDir, 'agent-key')

  try {
    await writeFile(keyPath, privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })
    return await task(keyPath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function resolveSshTarget(settings: MessengerAgentSettingsRecord) {
  const host = settings.ssh.host.trim()
  const login = settings.ssh.login.trim()
  const privateKey = settings.ssh.privateKey.trim()

  if (!host || !login || !privateKey) {
    return null
  }

  return {
    host,
    login,
    port: settings.ssh.port,
    privateKey,
  }
}

async function execRemoteShell(settings: MessengerAgentSettingsRecord, script: string) {
  const ssh = resolveSshTarget(settings)
  if (!ssh) {
    throw new Error('AGENT_SSH_NOT_CONFIGURED')
  }

  const remoteCommand = `sh -lc ${shellQuote(script)}`

  return await withTemporaryPrivateKey(ssh.privateKey, async (keyPath) => {
    return await execFileAsync('ssh', [
      '-i', keyPath,
      '-p', String(ssh.port),
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=5',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      `${ssh.login}@${ssh.host}`,
      remoteCommand,
    ], {
      timeout: 20000,
      maxBuffer: 1024 * 1024,
    })
  })
}

function resolveKnowledgeSourcePath(settings: MessengerAgentSettingsRecord, source: MessengerAgentKnowledgeSourceRecord) {
  const repository = source.repositoryId
    ? settings.ssh.repositories.find(item => item.id === source.repositoryId) ?? null
    : resolveMessengerAgentActiveRepository(settings)
  const basePath = repository?.path || resolveMessengerAgentWorkspacePath(settings)
  const sourcePath = source.path.trim()

  if (!sourcePath) {
    throw new Error('KNOWLEDGE_SOURCE_PATH_REQUIRED')
  }

  if (repository) {
    return {
      absolutePath: pathPosix.join(repository.path, sourcePath.replace(/^\/+/, '')),
      displayPath: `${repository.label}:${sourcePath}`,
    }
  }

  if (sourcePath.startsWith('/')) {
    return {
      absolutePath: sourcePath,
      displayPath: sourcePath,
    }
  }

  if (!basePath) {
    throw new Error('AGENT_WORKSPACE_NOT_CONFIGURED')
  }

  return {
    absolutePath: pathPosix.join(basePath, sourcePath),
    displayPath: sourcePath,
  }
}

async function readLocalTextFile(filePath: string) {
  const buffer = await readFile(resolve(filePath))
  if (buffer.includes(0)) {
    throw new Error('AGENT_WORKSPACE_BINARY_FILE')
  }

  return buffer.subarray(0, MAX_SOURCE_BYTES).toString('utf8')
}

async function readRemoteTextFile(settings: MessengerAgentSettingsRecord, filePath: string) {
  const script = [
    `TARGET_INPUT=${shellQuote(filePath)}`,
    'TARGET_REAL=$(cd -- "$(dirname -- "$TARGET_INPUT")" 2>/dev/null && pwd -P)/$(basename -- "$TARGET_INPUT")',
    '[ -f "$TARGET_REAL" ] || { echo "__ERROR__FILE_NOT_FOUND"; exit 9; }',
    'if grep -qU "\\x00" "$TARGET_REAL"; then echo "__ERROR__BINARY_FILE"; exit 10; fi',
    `head -c ${MAX_SOURCE_BYTES} -- "$TARGET_REAL"`,
  ].join('\n')

  const { stdout } = await execRemoteShell(settings, script)
  if (stdout.includes('__ERROR__BINARY_FILE')) {
    throw new Error('AGENT_WORKSPACE_BINARY_FILE')
  }

  if (stdout.includes('__ERROR__FILE_NOT_FOUND')) {
    throw new Error('KNOWLEDGE_SOURCE_NOT_FOUND')
  }

  return stdout
}

async function readKnowledgeSourceContent(settings: MessengerAgentSettingsRecord, source: MessengerAgentKnowledgeSourceRecord) {
  const target = resolveKnowledgeSourcePath(settings, source)
  const content = resolveSshTarget(settings)
    ? await readRemoteTextFile(settings, target.absolutePath)
    : await readLocalTextFile(target.absolutePath)

  return {
    content,
    absolutePath: target.absolutePath,
    displayPath: target.displayPath,
  }
}

function ensureTextSourceAllowed(source: MessengerAgentKnowledgeSourceRecord) {
  if (source.type === 'vector') {
    return
  }

  if (!TEXT_FILE_PATTERN.test(source.path.trim())) {
    throw new Error('KNOWLEDGE_SOURCE_TYPE_UNSUPPORTED')
  }
}

function parseVectorPayload(raw: string): ParsedVectorEntry[] {
  const parsed = JSON.parse(raw) as unknown
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? ((parsed as { entries?: unknown[]; items?: unknown[]; vectors?: unknown[] }).entries
        || (parsed as { items?: unknown[] }).items
        || (parsed as { vectors?: unknown[] }).vectors
        || [])
      : []

  return list.flatMap((item, index) => {
    if (typeof item === 'string') {
      return [{
        title: `Vector ${index + 1}`,
        text: item,
        embedding: null,
      }]
    }

    if (!item || typeof item !== 'object') {
      return []
    }

    const candidate = item as { text?: unknown; content?: unknown; body?: unknown; chunk?: unknown; embedding?: unknown; label?: unknown; title?: unknown }
    const text = [candidate.text, candidate.content, candidate.body, candidate.chunk].find(value => typeof value === 'string') as string | undefined
    if (!text?.trim()) {
      return []
    }

    const embedding = Array.isArray(candidate.embedding) && candidate.embedding.every(value => typeof value === 'number')
      ? candidate.embedding as number[]
      : null

    return [{
      title: typeof candidate.title === 'string' && candidate.title.trim()
        ? candidate.title.trim()
        : typeof candidate.label === 'string' && candidate.label.trim()
          ? candidate.label.trim()
          : `Vector ${index + 1}`,
      text,
      embedding,
    }]
  })
}


async function buildKnowledgeChunks(settings: MessengerAgentSettingsRecord, source: MessengerAgentKnowledgeSourceRecord) {
  ensureTextSourceAllowed(source)

  const { content, displayPath } = await readKnowledgeSourceContent(settings, source)
  if (source.type === 'vector') {
    const entries = parseVectorPayload(content)
    return await Promise.all(entries.map(async (entry) => ({
      id: randomUUID(),
      sourceId: source.id,
      sourceLabel: source.label,
      sourcePath: displayPath,
      type: 'vector' as const,
      title: entry.title,
      text: condenseText(entry.text, 1800),
      embedding: entry.embedding || await getEmbeddingOrEmpty(entry.text),
    })))
  }

  const chunks = splitIntoChunks(content)
  return await Promise.all(chunks.map(async (chunk, index) => ({
    id: randomUUID(),
    sourceId: source.id,
    sourceLabel: source.label,
    sourcePath: displayPath,
    type: 'rag' as const,
    title: `${source.label} · ${index + 1}`,
    text: chunk,
    embedding: await getEmbeddingOrEmpty(chunk),
  })))
}

function getAgentIndex(payload: AgentKnowledgeIndexFile, agentId: string) {
  return payload.agents.find(item => item.agentId === agentId) ?? {
    agentId,
    updatedAt: null,
    sources: [],
    chunks: [],
  }
}

export async function getMessengerAgentKnowledgeStatus(agentId: string, settings: MessengerAgentSettingsRecord): Promise<MessengerAgentKnowledgeStatus> {
  const payload = await readIndexFile()
  const index = getAgentIndex(payload, agentId)
  const sourceMap = new Map(index.sources.map(item => [item.sourceId, item]))
  const sources = settings.knowledge.sources.map((source) => {
    const indexed = sourceMap.get(source.id)
    return {
      id: source.id,
      label: source.label,
      repositoryId: source.repositoryId,
      path: source.path,
      type: source.type,
      enabled: source.enabled,
      indexed: Boolean(indexed?.indexedAt) && source.enabled,
      chunkCount: indexed?.chunkCount || 0,
      indexedAt: indexed?.indexedAt || null,
      error: indexed?.error || null,
    }
  })

  return {
    ready: sources.some(source => source.enabled && source.indexed && !source.error),
    indexedSources: sources.filter(source => source.enabled && source.indexed && !source.error).length,
    indexedChunks: sources.reduce((total, source) => total + (source.enabled ? source.chunkCount : 0), 0),
    lastIndexedAt: index.updatedAt,
    sources,
  }
}

export async function reindexMessengerAgentKnowledge(agentId: string, settings: MessengerAgentSettingsRecord) {
  const enabledSources = settings.knowledge.sources.filter(source => source.enabled)
  const nextSources: AgentKnowledgeIndexedSource[] = []
  const nextChunks: AgentKnowledgeIndexedChunk[] = []

  for (const source of enabledSources) {
    try {
      const chunks = await buildKnowledgeChunks(settings, source)
      nextChunks.push(...chunks)
      nextSources.push({
        sourceId: source.id,
        indexedAt: new Date().toISOString(),
        chunkCount: chunks.length,
        error: null,
      })
    } catch (error) {
      nextSources.push({
        sourceId: source.id,
        indexedAt: null,
        chunkCount: 0,
        error: error instanceof Error ? error.message : 'KNOWLEDGE_INDEX_FAILED',
      })
    }
  }

  const payload = await readIndexFile()
  const nextIndex: AgentKnowledgeIndexRecord = {
    agentId,
    updatedAt: new Date().toISOString(),
    sources: nextSources,
    chunks: nextChunks,
  }
  const existingIndex = payload.agents.findIndex(item => item.agentId === agentId)
  if (existingIndex === -1) {
    payload.agents.push(nextIndex)
  } else {
    payload.agents[existingIndex] = nextIndex
  }

  await writeIndexFile(payload)
  return await getMessengerAgentKnowledgeStatus(agentId, settings)
}

export async function retrieveMessengerAgentKnowledge(agentId: string, settings: MessengerAgentSettingsRecord, query: string, topK = 5): Promise<MessengerAgentKnowledgeRetrieval> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return { context: '', hits: [] }
  }

  const payload = await readIndexFile()
  const index = getAgentIndex(payload, agentId)
  const enabledSourceIds = new Set(settings.knowledge.sources.filter(source => source.enabled).map(source => source.id))
  const chunks = index.chunks.filter(chunk => enabledSourceIds.has(chunk.sourceId))

  if (!chunks.length) {
    return { context: '', hits: [] }
  }

  try {
    const queryEmbedding = await getEmbeddingOrEmpty(normalizedQuery)
    const hits = chunks
      .map((chunk) => {
        const semanticScore = queryEmbedding.length && chunk.embedding.length
          ? cosineSimilarity(queryEmbedding, chunk.embedding)
          : 0
        const lexicalScore = lexicalSimilarity(normalizedQuery, chunk.text)
        const score = semanticScore > 0 ? semanticScore : lexicalScore

        return {
          sourceId: chunk.sourceId,
          sourceLabel: chunk.sourceLabel,
          sourcePath: chunk.sourcePath,
          title: chunk.title,
          text: chunk.text,
          score,
        }
      })
      .filter(hit => hit.score > 0.18)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)

    if (!hits.length) {
      return { context: '', hits: [] }
    }

    const context = hits.map((hit) => (
      `[${hit.sourceLabel} · ${hit.sourcePath} · score ${hit.score.toFixed(2)}]\n${condenseText(hit.text, 900)}`
    )).join('\n\n---\n\n')

    return {
      context: `### KNOWLEDGE CONTEXT ###\n${context}\n### END KNOWLEDGE CONTEXT ###`,
      hits,
    }
  } catch {
    return { context: '', hits: [] }
  }
}