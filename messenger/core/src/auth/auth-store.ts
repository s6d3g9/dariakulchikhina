import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import { eq, isNull } from 'drizzle-orm'

import { useMessengerDb } from '../db/client.ts'
import { messengerUsers } from '../db/schema.ts'

export interface MessengerUserRecord {
  id: string
  login: string
  displayName: string
  passwordHash: string
  createdAt: string
}

export interface RegisterMessengerUserInput {
  login: string
  password: string
  displayName: string
}

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

function rowToRecord(row: typeof messengerUsers.$inferSelect): MessengerUserRecord {
  const pk = row.publicKey as Record<string, unknown> | null
  return {
    id: row.id,
    login: row.login,
    displayName: row.displayName ?? '',
    passwordHash: typeof pk?._pwHash === 'string' ? pk._pwHash : '',
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listMessengerUsers(): Promise<MessengerUserRecord[]> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerUsers)
    .where(isNull(messengerUsers.deletedAt))
  return rows.map(rowToRecord)
}

export async function findMessengerUserByLogin(login: string): Promise<MessengerUserRecord | null> {
  const normalized = normalizeLogin(login)
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerUsers)
    .where(eq(messengerUsers.login, normalized))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row || row.deletedAt) {
    return null
  }

  return rowToRecord(row)
}

export async function findMessengerUserById(id: string): Promise<MessengerUserRecord | null> {
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerUsers)
    .where(eq(messengerUsers.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row || row.deletedAt) {
    return null
  }

  return rowToRecord(row)
}

export async function registerMessengerUser(input: RegisterMessengerUserInput): Promise<MessengerUserRecord> {
  const login = normalizeLogin(input.login)
  const db = useMessengerDb()
  const existing = await findMessengerUserByLogin(login)
  if (existing) {
    throw new Error('USER_EXISTS')
  }

  const passwordHash = createPasswordHash(input.password)
  const now = new Date()
  const [row] = await db
    .insert(messengerUsers)
    .values({
      login,
      displayName: input.displayName.trim(),
      publicKey: { _pwHash: passwordHash },
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return rowToRecord(row)
}

export async function authenticateMessengerUser(login: string, password: string): Promise<MessengerUserRecord | null> {
  const user = await findMessengerUserByLogin(login)
  if (!user) {
    return null
  }

  return verifyPasswordHash(password, user.passwordHash) ? user : null
}
