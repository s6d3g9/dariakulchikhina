import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto'

import { resolveMessengerDataPath } from './storage-paths.ts'

// scrypt cost parameters — OWASP recommended minimum for 2024+
const SCRYPT_COST = { N: 32768, r: 8, p: 1 }
const SCRYPT_KEYLEN = 64
const SCRYPT_MAXMEM = 256 * 1024 * 1024

export interface MessengerUserRecord {
  id: string
  login: string
  displayName: string
  passwordHash: string
  createdAt: string
}

interface MessengerUsersFile {
  users: MessengerUserRecord[]
}

export interface RegisterMessengerUserInput {
  login: string
  password: string
  displayName: string
}

const STORAGE_PATH = resolveMessengerDataPath('users.json')

function normalizeLogin(value: string) {
  return value.trim().toLowerCase()
}

function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { ...SCRYPT_COST, maxmem: SCRYPT_MAXMEM }).toString('hex')
  return `${salt}:${derived}`
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [salt, existingHash] = storedHash.split(':')
  if (!salt || !existingHash) {
    return false
  }

  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { ...SCRYPT_COST, maxmem: SCRYPT_MAXMEM })
  const expected = Buffer.from(existingHash, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readUsersFile(): Promise<MessengerUsersFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerUsersFile>
    return {
      users: Array.isArray(parsed.users) ? parsed.users as MessengerUserRecord[] : [],
    }
  } catch {
    return { users: [] }
  }
}

async function writeUsersFile(payload: MessengerUsersFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

export async function listMessengerUsers() {
  const payload = await readUsersFile()
  return payload.users
}

export async function findMessengerUserByLogin(login: string) {
  const normalized = normalizeLogin(login)
  const users = await listMessengerUsers()
  return users.find(user => user.login === normalized) ?? null
}

export async function findMessengerUserById(id: string) {
  const users = await listMessengerUsers()
  return users.find(user => user.id === id) ?? null
}

/** The first registered user is treated as admin (can manage agents, settings, etc.) */
export async function isMessengerAdmin(userId: string): Promise<boolean> {
  const users = await listMessengerUsers()
  return users.length > 0 && users[0].id === userId
}

export async function registerMessengerUser(input: RegisterMessengerUserInput) {
  const payload = await readUsersFile()
  const login = normalizeLogin(input.login)
  const existing = payload.users.find(user => user.login === login)

  // Always run scrypt to prevent timing-based username enumeration
  const passwordHash = createPasswordHash(input.password)

  if (existing) {
    throw new Error('USER_EXISTS')
  }

  const user: MessengerUserRecord = {
    id: randomUUID(),
    login,
    displayName: input.displayName.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  payload.users.push(user)
  await writeUsersFile(payload)
  return user
}

// Dummy hash used to prevent timing-based user enumeration:
// Always run scrypt even when the user does not exist.
const DUMMY_HASH = createPasswordHash('__dummy_timing_pad__')

export async function authenticateMessengerUser(login: string, password: string) {
  const user = await findMessengerUserByLogin(login)
  if (!user) {
    // Constant-time: run scrypt against dummy hash so response time
    // is indistinguishable from a real user lookup.
    verifyPasswordHash(password, DUMMY_HASH)
    return null
  }

  return verifyPasswordHash(password, user.passwordHash) ? user : null
}
