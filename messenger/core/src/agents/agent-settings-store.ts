import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveMessengerDataPath } from '../media/storage-paths.ts'

export type MessengerAgentConnectionMode = 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
export type MessengerAgentKnowledgeSourceType = 'rag' | 'vector'

export interface MessengerAgentConnectionRecord {
  targetAgentId: string
  mode: MessengerAgentConnectionMode
}

export type MessengerAgentRepositoryType = 'ssh' | 'github' | 'gitlab' | 'bitbucket' | 'local' | 'custom'

export interface MessengerAgentRepositoryRecord {
  id: string
  label: string
  path: string
  type: MessengerAgentRepositoryType
  url?: string
  owner?: string
  repo?: string
  branch?: string
  token?: string
  instanceUrl?: string
  protocol?: string
  credentials?: string
}

export interface MessengerAgentKnowledgeSourceRecord {
  id: string
  label: string
  repositoryId: string
  path: string
  type: MessengerAgentKnowledgeSourceType
  enabled: boolean
}

export type MessengerAgentEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface MessengerAgentSettingsRecord {
  agentId: string
  subscriptionId: string
  model: string
  effort: MessengerAgentEffort
  apiKey: string
  ssh: {
    host: string
    login: string
    port: number
    privateKey: string
    workspacePath: string
    repositories: MessengerAgentRepositoryRecord[]
    activeRepositoryId: string
  }
  knowledge: {
    sources: MessengerAgentKnowledgeSourceRecord[]
  }
  connections: MessengerAgentConnectionRecord[]
  graphPosition: {
    x: number
    y: number
  }
  updatedAt: string
}

interface AgentSettingsFile {
  settings: MessengerAgentSettingsRecord[]
}

interface LegacyMessengerAgentSettingsRecord extends Partial<MessengerAgentSettingsRecord> {
  connectedAgentIds?: string[]
}

const STORAGE_PATH = resolveMessengerDataPath('agent-settings.json')

function createDefaultSettings(agentId: string): MessengerAgentSettingsRecord {
  return {
    agentId,
    subscriptionId: 'builtin-claude-code-cli',
    model: 'claude-sonnet-4-6',
    effort: 'medium' as MessengerAgentEffort,
    apiKey: '',
    ssh: {
      host: '',
      login: '',
      port: 22,
      privateKey: '',
      workspacePath: '',
      repositories: [],
      activeRepositoryId: '',
    },
    knowledge: {
      sources: [],
    },
    connections: [],
    graphPosition: {
      x: 32,
      y: 32,
    },
    updatedAt: new Date().toISOString(),
  }
}

function normalizeRepositoryId(value: string, fallbackIndex: number) {
  const normalized = value.trim()
  return normalized || `repo-${fallbackIndex + 1}`
}

function normalizeRepositoryLabel(value: string, path: string, fallbackIndex: number) {
  const normalized = value.trim()
  if (normalized) {
    return normalized
  }

  const tail = path.split('/').filter(Boolean).pop()
  return tail || `Repo ${fallbackIndex + 1}`
}

function normalizeRepositories(repositories: unknown, fallbackWorkspacePath = '') {
  const normalized = new Map<string, MessengerAgentRepositoryRecord>()
  const list = Array.isArray(repositories) ? repositories : []

  list.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const candidate = item as Partial<MessengerAgentRepositoryRecord>
    const path = typeof candidate.path === 'string' ? candidate.path.trim() : ''
    if (!path) {
      return
    }

    const type = ['ssh', 'github', 'gitlab', 'bitbucket', 'local', 'custom'].includes(String(candidate.type))
      ? candidate.type as MessengerAgentRepositoryType
      : 'ssh'

    const repoPath = type === 'ssh' || type === 'local' ? path : ''

    normalized.set(path, {
      id: normalizeRepositoryId(typeof candidate.id === 'string' ? candidate.id : '', index),
      label: normalizeRepositoryLabel(typeof candidate.label === 'string' ? candidate.label : '', path, index),
      path: repoPath,
      type,
      ...(candidate.url && typeof candidate.url === 'string' ? { url: candidate.url.trim() } : {}),
      ...(candidate.owner && typeof candidate.owner === 'string' ? { owner: candidate.owner.trim() } : {}),
      ...(candidate.repo && typeof candidate.repo === 'string' ? { repo: candidate.repo.trim() } : {}),
      ...(candidate.branch && typeof candidate.branch === 'string' ? { branch: candidate.branch.trim() } : {}),
      ...(candidate.token && typeof candidate.token === 'string' ? { token: candidate.token.trim() } : {}),
      ...(candidate.instanceUrl && typeof candidate.instanceUrl === 'string' ? { instanceUrl: candidate.instanceUrl.trim() } : {}),
      ...(candidate.protocol && typeof candidate.protocol === 'string' ? { protocol: candidate.protocol.trim() } : {}),
      ...(candidate.credentials && typeof candidate.credentials === 'string' ? { credentials: candidate.credentials.trim() } : {}),
    })
  })

  if (!normalized.size && fallbackWorkspacePath.trim()) {
    normalized.set(fallbackWorkspacePath.trim(), {
      id: 'repo-1',
      label: normalizeRepositoryLabel('', fallbackWorkspacePath.trim(), 0),
      path: fallbackWorkspacePath.trim(),
      type: 'ssh',
    })
  }

  return Array.from(normalized.values())
}

function normalizeKnowledgeSources(sources: unknown, repositories: MessengerAgentRepositoryRecord[]) {
  const allowedRepositoryIds = new Set(repositories.map(item => item.id))
  const normalized: MessengerAgentKnowledgeSourceRecord[] = []

  for (const [index, item] of (Array.isArray(sources) ? sources : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerAgentKnowledgeSourceRecord>
    const path = typeof candidate.path === 'string' ? candidate.path.trim() : ''
    if (!path) {
      continue
    }

    const repositoryId = typeof candidate.repositoryId === 'string' && allowedRepositoryIds.has(candidate.repositoryId)
      ? candidate.repositoryId
      : ''
    const type = candidate.type === 'vector' ? 'vector' : 'rag'
    const label = typeof candidate.label === 'string' && candidate.label.trim()
      ? candidate.label.trim()
      : path.split('/').filter(Boolean).pop() || `Source ${index + 1}`

    normalized.push({
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `source-${index + 1}`,
      label,
      repositoryId,
      path,
      type,
      enabled: candidate.enabled !== false,
    })
  }

  return normalized
}

export function resolveMessengerAgentActiveRepository(settings: MessengerAgentSettingsRecord) {
  return settings.ssh.repositories.find(item => item.id === settings.ssh.activeRepositoryId) ?? null
}

export function resolveMessengerAgentWorkspacePath(settings: MessengerAgentSettingsRecord) {
  return resolveMessengerAgentActiveRepository(settings)?.path || settings.ssh.workspacePath.trim()
}

function normalizeGraphPosition(position?: { x?: number; y?: number }, fallback?: { x: number; y: number }) {
  return {
    x: Number.isFinite(position?.x) ? Math.max(0, Math.round(position!.x!)) : (fallback?.x ?? 32),
    y: Number.isFinite(position?.y) ? Math.max(0, Math.round(position!.y!)) : (fallback?.y ?? 32),
  }
}

function normalizeConnectionMode(mode?: string): MessengerAgentConnectionMode {
  switch (mode) {
    case 'review':
    case 'enrich':
    case 'validate':
    case 'summarize':
    case 'route':
      return mode
    default:
      return 'review'
  }
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readSettingsFile(): Promise<AgentSettingsFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AgentSettingsFile>
    return {
      settings: Array.isArray(parsed.settings)
        ? parsed.settings.map((rawItem) => {
            const item = rawItem as LegacyMessengerAgentSettingsRecord
            const normalized = createDefaultSettings(String(item?.agentId || ''))

            return {
              ...normalized,
              agentId: String(item?.agentId || normalized.agentId),
              subscriptionId: typeof item?.subscriptionId === 'string' ? item.subscriptionId : normalized.subscriptionId,
              model: typeof item?.model === 'string' ? item.model : normalized.model,
              effort: normalizeEffort(item?.effort),
              apiKey: typeof item?.apiKey === 'string' ? item.apiKey : normalized.apiKey,
              ssh: (() => {
                const repositories = normalizeRepositories(item?.ssh?.repositories, typeof item?.ssh?.workspacePath === 'string' ? item.ssh.workspacePath : normalized.ssh.workspacePath)
                const activeRepositoryIdCandidate = typeof item?.ssh?.activeRepositoryId === 'string' ? item.ssh.activeRepositoryId.trim() : ''
                const activeRepositoryId = repositories.some(repository => repository.id === activeRepositoryIdCandidate)
                  ? activeRepositoryIdCandidate
                  : (repositories[0]?.id || '')

                const ssh = {
                host: typeof item?.ssh?.host === 'string' ? item.ssh.host : normalized.ssh.host,
                login: typeof item?.ssh?.login === 'string' ? item.ssh.login : normalized.ssh.login,
                port: Number.isFinite(item?.ssh?.port) ? Math.min(65535, Math.max(1, Math.round(item.ssh?.port ?? normalized.ssh.port))) : normalized.ssh.port,
                privateKey: typeof item?.ssh?.privateKey === 'string' ? item.ssh.privateKey : normalized.ssh.privateKey,
                  workspacePath: typeof item?.ssh?.workspacePath === 'string' ? item.ssh.workspacePath.trim() : normalized.ssh.workspacePath,
                  repositories,
                  activeRepositoryId,
                }

                return {
                  ...ssh,
                  workspacePath: resolveMessengerAgentWorkspacePath({
                    ...normalized,
                    ssh,
                    knowledge: normalized.knowledge,
                  }),
                }
              })(),
              knowledge: (() => {
                const repositories = normalizeRepositories(item?.ssh?.repositories, typeof item?.ssh?.workspacePath === 'string' ? item.ssh.workspacePath : normalized.ssh.workspacePath)
                return {
                  sources: normalizeKnowledgeSources(item?.knowledge?.sources, repositories),
                }
              })(),
              connections: Array.isArray(item?.connections)
                ? item.connections
                  .map((connection) => {
                    if (!connection || typeof connection !== 'object') {
                      return null
                    }

                    const targetAgentId = typeof connection.targetAgentId === 'string' ? connection.targetAgentId.trim() : ''
                    if (!targetAgentId) {
                      return null
                    }

                    return {
                      targetAgentId,
                      mode: normalizeConnectionMode(typeof connection.mode === 'string' ? connection.mode : undefined),
                    }
                  })
                  .filter((connection): connection is MessengerAgentConnectionRecord => Boolean(connection))
                : Array.isArray(item?.connectedAgentIds)
                  ? item.connectedAgentIds
                    .filter((value): value is string => typeof value === 'string')
                    .map(targetAgentId => ({
                      targetAgentId,
                      mode: 'review' as const,
                    }))
                  : normalized.connections,
              graphPosition: normalizeGraphPosition(item?.graphPosition, normalized.graphPosition),
              updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : normalized.updatedAt,
            }
          })
        : [],
    }
  } catch {
    return { settings: [] }
  }
}

async function writeSettingsFile(payload: AgentSettingsFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function normalizeConnections(agentId: string, connections: MessengerAgentConnectionRecord[]) {
  const normalized = new Map<string, MessengerAgentConnectionRecord>()

  for (const connection of connections) {
    const targetAgentId = connection.targetAgentId.trim()
    if (!targetAgentId || targetAgentId === agentId) {
      continue
    }

    normalized.set(targetAgentId, {
      targetAgentId,
      mode: normalizeConnectionMode(connection.mode),
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.targetAgentId.localeCompare(right.targetAgentId, 'en'))
}

export async function getMessengerAgentSettings(agentId: string) {
  const payload = await readSettingsFile()
  return payload.settings.find(item => item.agentId === agentId) ?? createDefaultSettings(agentId)
}

const VALID_EFFORTS = new Set<string>(['low', 'medium', 'high', 'xhigh', 'max'])
function normalizeEffort(value: unknown): MessengerAgentEffort {
  return (typeof value === 'string' && VALID_EFFORTS.has(value)) ? value as MessengerAgentEffort : 'medium'
}

export async function updateMessengerAgentSettings(
  agentId: string,
  input: Pick<MessengerAgentSettingsRecord, 'subscriptionId' | 'model' | 'effort' | 'apiKey' | 'ssh' | 'knowledge' | 'connections'> & {
    graphPosition?: MessengerAgentSettingsRecord['graphPosition']
  },
) {
  const payload = await readSettingsFile()
  const currentSettings = payload.settings.find(item => item.agentId === agentId) ?? createDefaultSettings(agentId)
  const repositories = normalizeRepositories(input.ssh.repositories, input.ssh.workspacePath)
  const activeRepositoryId = repositories.some(repository => repository.id === input.ssh.activeRepositoryId)
    ? input.ssh.activeRepositoryId.trim()
    : (repositories[0]?.id || '')
  const nextWorkspacePath = repositories.find(repository => repository.id === activeRepositoryId)?.path || input.ssh.workspacePath.trim()
  const nextSettings: MessengerAgentSettingsRecord = {
    agentId,
    subscriptionId: input.subscriptionId?.trim() || currentSettings.subscriptionId,
    model: input.model.trim() || 'claude-sonnet-4-6',
    effort: normalizeEffort(input.effort),
    apiKey: input.apiKey.trim(),
    ssh: {
      host: input.ssh.host.trim(),
      login: input.ssh.login.trim(),
      port: Math.min(65535, Math.max(1, Math.round(Number.isFinite(input.ssh.port) ? input.ssh.port : 22))),
      privateKey: input.ssh.privateKey.trim(),
      workspacePath: nextWorkspacePath,
      repositories,
      activeRepositoryId,
    },
    knowledge: {
      sources: normalizeKnowledgeSources(input.knowledge.sources, repositories),
    },
    connections: normalizeConnections(agentId, input.connections),
    graphPosition: normalizeGraphPosition(input.graphPosition, currentSettings.graphPosition),
    updatedAt: new Date().toISOString(),
  }

  const existingIndex = payload.settings.findIndex(item => item.agentId === agentId)
  if (existingIndex === -1) {
    payload.settings.push(nextSettings)
  } else {
    payload.settings[existingIndex] = nextSettings
  }

  await writeSettingsFile(payload)
  return nextSettings
}

export async function updateMessengerAgentGraph(
  graph: Record<string, {
    connections: MessengerAgentConnectionRecord[]
    graphPosition: MessengerAgentSettingsRecord['graphPosition']
  }>,
) {
  const payload = await readSettingsFile()
  const timestamp = new Date().toISOString()

  for (const [agentId, graphNode] of Object.entries(graph)) {
    const currentSettings = payload.settings.find(item => item.agentId === agentId) ?? createDefaultSettings(agentId)
    const nextSettings: MessengerAgentSettingsRecord = {
      ...currentSettings,
      agentId,
      connections: normalizeConnections(agentId, graphNode.connections || []),
      graphPosition: normalizeGraphPosition(graphNode.graphPosition, currentSettings.graphPosition),
      updatedAt: timestamp,
    }

    const existingIndex = payload.settings.findIndex(item => item.agentId === agentId)
    if (existingIndex === -1) {
      payload.settings.push(nextSettings)
    } else {
      payload.settings[existingIndex] = nextSettings
    }
  }

  await writeSettingsFile(payload)
  return payload.settings
}