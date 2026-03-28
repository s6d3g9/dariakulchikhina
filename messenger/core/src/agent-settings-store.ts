import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveMessengerDataPath } from './storage-paths.ts'

export type MessengerAgentConnectionMode = 'review' | 'enrich' | 'validate' | 'summarize' | 'route'

export interface MessengerAgentConnectionRecord {
  targetAgentId: string
  mode: MessengerAgentConnectionMode
}

export interface MessengerAgentSettingsRecord {
  agentId: string
  model: string
  apiKey: string
  ssh: {
    host: string
    login: string
    port: number
    privateKey: string
    workspacePath: string
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
    model: 'GPT-5.4',
    apiKey: '',
    ssh: {
      host: '',
      login: '',
      port: 22,
      privateKey: '',
      workspacePath: '',
    },
    connections: [],
    graphPosition: {
      x: 32,
      y: 32,
    },
    updatedAt: new Date().toISOString(),
  }
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
              model: typeof item?.model === 'string' ? item.model : normalized.model,
              apiKey: typeof item?.apiKey === 'string' ? item.apiKey : normalized.apiKey,
              ssh: {
                host: typeof item?.ssh?.host === 'string' ? item.ssh.host : normalized.ssh.host,
                login: typeof item?.ssh?.login === 'string' ? item.ssh.login : normalized.ssh.login,
                port: Number.isFinite(item?.ssh?.port) ? Math.min(65535, Math.max(1, Math.round(item.ssh?.port ?? normalized.ssh.port))) : normalized.ssh.port,
                privateKey: typeof item?.ssh?.privateKey === 'string' ? item.ssh.privateKey : normalized.ssh.privateKey,
                workspacePath: typeof item?.ssh?.workspacePath === 'string' ? item.ssh.workspacePath : normalized.ssh.workspacePath,
              },
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

export async function updateMessengerAgentSettings(
  agentId: string,
  input: Pick<MessengerAgentSettingsRecord, 'model' | 'apiKey' | 'ssh' | 'connections'> & {
    graphPosition?: MessengerAgentSettingsRecord['graphPosition']
  },
) {
  const payload = await readSettingsFile()
  const currentSettings = payload.settings.find(item => item.agentId === agentId) ?? createDefaultSettings(agentId)
  const nextSettings: MessengerAgentSettingsRecord = {
    agentId,
    model: input.model.trim() || 'GPT-5.4',
    apiKey: input.apiKey.trim(),
    ssh: {
      host: input.ssh.host.trim(),
      login: input.ssh.login.trim(),
      port: Math.min(65535, Math.max(1, Math.round(Number.isFinite(input.ssh.port) ? input.ssh.port : 22))),
      privateKey: input.ssh.privateKey.trim(),
      workspacePath: input.ssh.workspacePath.trim(),
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