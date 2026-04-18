import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveMessengerDataPath } from '../media/storage-paths.ts'

export interface MessengerDevicePublicKeyRecord {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

interface MessengerDeviceKeysFile {
  keys: Array<{
    userId: string
    publicKey: MessengerDevicePublicKeyRecord
    updatedAt: string
  }>
}

const STORAGE_PATH = resolveMessengerDataPath('device-keys.json')

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readDeviceKeysFile(): Promise<MessengerDeviceKeysFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerDeviceKeysFile>
    return {
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
    }
  } catch {
    return {
      keys: [],
    }
  }
}

async function writeDeviceKeysFile(payload: MessengerDeviceKeysFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

export async function findMessengerDevicePublicKeyByUserId(userId: string) {
  const payload = await readDeviceKeysFile()
  return payload.keys.find(item => item.userId === userId)?.publicKey ?? null
}

export async function saveMessengerDevicePublicKey(userId: string, publicKey: MessengerDevicePublicKeyRecord) {
  const payload = await readDeviceKeysFile()
  const existing = payload.keys.find(item => item.userId === userId)
  const updatedAt = new Date().toISOString()

  if (existing) {
    existing.publicKey = publicKey
    existing.updatedAt = updatedAt
  } else {
    payload.keys.push({
      userId,
      publicKey,
      updatedAt,
    })
  }

  await writeDeviceKeysFile(payload)
  return publicKey
}