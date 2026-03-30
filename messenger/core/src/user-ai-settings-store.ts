import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveMessengerDataPath } from './storage-paths.ts'

export interface MessengerUserAiSettingsRecord {
  userId: string
  interpretationModel: string
  summaryModel: string
  transcriptionModel: string
  updatedAt: string
}

interface MessengerUserAiSettingsFile {
  settings: MessengerUserAiSettingsRecord[]
}

const STORAGE_PATH = resolveMessengerDataPath('user-ai-settings.json')

function createDefaultMessengerUserAiSettings(userId: string): MessengerUserAiSettingsRecord {
  return {
    userId,
    interpretationModel: '',
    summaryModel: '',
    transcriptionModel: '',
    updatedAt: new Date().toISOString(),
  }
}

function normalizeModelName(value: string | undefined) {
  return typeof value === 'string' ? value.trim().slice(0, 160) : ''
}

function normalizeRecord(userId: string, value?: Partial<MessengerUserAiSettingsRecord>) {
  const defaults = createDefaultMessengerUserAiSettings(userId)

  return {
    ...defaults,
    userId,
    interpretationModel: normalizeModelName(value?.interpretationModel),
    summaryModel: normalizeModelName(value?.summaryModel),
    transcriptionModel: normalizeModelName(value?.transcriptionModel),
    updatedAt: typeof value?.updatedAt === 'string' && value.updatedAt.trim()
      ? value.updatedAt
      : defaults.updatedAt,
  }
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readSettingsFile(): Promise<MessengerUserAiSettingsFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerUserAiSettingsFile>
    return {
      settings: Array.isArray(parsed.settings)
        ? parsed.settings.reduce<MessengerUserAiSettingsRecord[]>((list, item) => {
          if (!item || typeof item !== 'object') {
            return list
          }

          const normalized = normalizeRecord(String((item as Partial<MessengerUserAiSettingsRecord>).userId || ''), item as Partial<MessengerUserAiSettingsRecord>)
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

async function writeSettingsFile(payload: MessengerUserAiSettingsFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

export async function getMessengerUserAiSettings(userId: string) {
  const payload = await readSettingsFile()
  return payload.settings.find(item => item.userId === userId) ?? createDefaultMessengerUserAiSettings(userId)
}

export async function updateMessengerUserAiSettings(
  userId: string,
  patch: Partial<Pick<MessengerUserAiSettingsRecord, 'interpretationModel' | 'summaryModel' | 'transcriptionModel'>>,
) {
  const payload = await readSettingsFile()
  const existingIndex = payload.settings.findIndex(item => item.userId === userId)
  const current = existingIndex >= 0 ? payload.settings[existingIndex] : createDefaultMessengerUserAiSettings(userId)
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