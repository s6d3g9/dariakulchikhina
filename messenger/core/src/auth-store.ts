import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto'

import { resolveMessengerDataPath } from './storage-paths.ts'

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
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [salt, existingHash] = storedHash.split(':')
  if (!salt || !existingHash) {
    return false
  }

  const derived = scryptSync(password, salt, 64)
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

export async function registerMessengerUser(input: RegisterMessengerUserInput) {
  const payload = await readUsersFile()
  const login = normalizeLogin(input.login)
  const existing = payload.users.find(user => user.login === login)
  if (existing) {
    throw new Error('USER_EXISTS')
  }

  const user: MessengerUserRecord = {
    id: randomUUID(),
    login,
    displayName: input.displayName.trim(),
    passwordHash: createPasswordHash(input.password),
    createdAt: new Date().toISOString(),
  }

  payload.users.push(user)
  await writeUsersFile(payload)
  return user
}

export async function authenticateMessengerUser(login: string, password: string) {
  const user = await findMessengerUserByLogin(login)
  if (!user) {
    return null
  }

  return verifyPasswordHash(password, user.passwordHash) ? user : null
}
