import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveMessengerDataPath } from './storage-paths.ts'

export interface MessengerUserUiSettingsRecord {
  userId: string
  projectActionsRailOrder: string[]
  updatedAt: string
}

interface MessengerUserUiSettingsFile {
  settings: MessengerUserUiSettingsRecord[]
}

const STORAGE_PATH = resolveMessengerDataPath('user-ui-settings.json')
const RAIL_ORDER_KEY_PATTERN = /^[a-z0-9:-]{1,64}$/u
const MAX_RAIL_ORDER_ITEMS = 32

function createDefaultMessengerUserUiSettings(userId: string): MessengerUserUiSettingsRecord {
  return {
    userId,
    projectActionsRailOrder: [],
    updatedAt: new Date().toISOString(),
  }
}

function normalizeRailOrderItem(value: string | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return RAIL_ORDER_KEY_PATTERN.test(normalized) ? normalized : ''
}

function normalizeRailOrder(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const item of value) {
    const key = normalizeRailOrderItem(item)
    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    normalized.push(key)

    if (normalized.length >= MAX_RAIL_ORDER_ITEMS) {
      break
    }
  }

  return normalized
}

function normalizeRecord(userId: string, value?: Partial<MessengerUserUiSettingsRecord>): MessengerUserUiSettingsRecord {
  const defaults = createDefaultMessengerUserUiSettings(userId)

  return {
    ...defaults,
    userId,
    projectActionsRailOrder: normalizeRailOrder(value?.projectActionsRailOrder),
    updatedAt: typeof value?.updatedAt === 'string' && value.updatedAt.trim()
      ? value.updatedAt
      : defaults.updatedAt,
  }
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readSettingsFile(): Promise<MessengerUserUiSettingsFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerUserUiSettingsFile>

    return {
      settings: Array.isArray(parsed.settings)
        ? parsed.settings.reduce<MessengerUserUiSettingsRecord[]>((list, item) => {
          if (!item || typeof item !== 'object') {
            return list
          }

          const normalized = normalizeRecord(String((item as Partial<MessengerUserUiSettingsRecord>).userId || ''), item as Partial<MessengerUserUiSettingsRecord>)
          if (!normalized.userId) {
            return list
          }

          list.push(normalized)
          return list
        }, [])
        : [],
    }
  } catch {
    return { settings: [] }
  }
}

async function writeSettingsFile(payload: MessengerUserUiSettingsFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

export async function getMessengerUserUiSettings(userId: string) {
  const payload = await readSettingsFile()
  return payload.settings.find(item => item.userId === userId) ?? createDefaultMessengerUserUiSettings(userId)
}

export async function updateMessengerUserUiSettings(
  userId: string,
  patch: Partial<Pick<MessengerUserUiSettingsRecord, 'projectActionsRailOrder'>>,
) {
  const payload = await readSettingsFile()
  const existingIndex = payload.settings.findIndex(item => item.userId === userId)
  const current = existingIndex >= 0 ? payload.settings[existingIndex] : createDefaultMessengerUserUiSettings(userId)
  const next = normalizeRecord(userId, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  })

  if (existingIndex >= 0) {
    payload.settings[existingIndex] = next
  } else {
    payload.settings.push(next)
  }

  await writeSettingsFile(payload)
  return next
}