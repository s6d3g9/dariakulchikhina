import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { hashPassword, verifyPassword } from '~/server/utils/auth'

export interface StandaloneChatUserRecord {
  id: string
  login: string
  displayName: string
  nickname?: string
  passwordHash: string
  createdAt: string
}

export interface StandaloneChatUserPublic {
  id: string
  login: string
  displayName: string
  nickname?: string
  createdAt: string
}

export interface StandaloneChatInviteRecord {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  resolvedAt?: string
}

export interface StandaloneChatContactInvite {
  inviteId: string
  status: StandaloneChatInviteRecord['status']
  createdAt: string
  resolvedAt?: string
  user: StandaloneChatUserPublic
}

export interface StandaloneChatDirectoryEntry extends StandaloneChatUserPublic {
  relation: 'none' | 'incoming' | 'outgoing' | 'accepted'
  inviteId?: string
}

interface StandaloneChatUsersFile {
  users: StandaloneChatUserRecord[]
  invites: StandaloneChatInviteRecord[]
}

const CHAT_USERS_FILE = join(process.cwd(), 'server', 'data', 'standalone-chat-users.json')

let cache: StandaloneChatUsersFile | null = null
let writeQueue = Promise.resolve()

function normalizeLogin(value: string) {
  return value.trim().toLowerCase()
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeNickname(value?: string | null) {
  if (!value) return undefined
  const normalized = value.trim().replace(/^@+/, '').toLowerCase()
  return normalized || undefined
}

async function ensureFile() {
  await mkdir(join(process.cwd(), 'server', 'data'), { recursive: true })
  try {
    await readFile(CHAT_USERS_FILE, 'utf8')
  } catch {
    await writeFile(CHAT_USERS_FILE, JSON.stringify({ users: [] }, null, 2), 'utf8')
  }
}

async function readStore() {
  if (cache) return cache
  await ensureFile()
  try {
    const raw = await readFile(CHAT_USERS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StandaloneChatUsersFile>
    cache = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    }
  } catch {
    cache = { users: [], invites: [] }
  }
  return cache
}

async function persistStore(nextStore: StandaloneChatUsersFile) {
  cache = nextStore
  writeQueue = writeQueue.then(async () => {
    await ensureFile()
    await writeFile(CHAT_USERS_FILE, JSON.stringify(nextStore, null, 2), 'utf8')
  })
  await writeQueue
}

function toPublicUser(user: StandaloneChatUserRecord): StandaloneChatUserPublic {
  return {
    id: user.id,
    login: user.login,
    displayName: user.displayName,
    nickname: user.nickname,
    createdAt: user.createdAt,
  }
}

function sanitizeNicknameValue(value?: string | null) {
  const nickname = normalizeNickname(value)
  if (!nickname) return undefined
  if (!/^[a-z0-9._-]{3,32}$/.test(nickname)) {
    throw createError({ statusCode: 400, statusMessage: 'Никнейм должен содержать 3-32 символа: латиница, цифры, точка, дефис или подчёркивание' })
  }
  return nickname
}

function getPairKey(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join(':')
}

function buildRelationState(viewerId: string, targetId: string, invites: StandaloneChatInviteRecord[]) {
  const related = invites
    .filter((invite) => getPairKey(invite.fromUserId, invite.toUserId) === getPairKey(viewerId, targetId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  const acceptedInvite = related.find((invite) => invite.status === 'accepted')
  if (acceptedInvite) {
    return { relation: 'accepted' as const, inviteId: acceptedInvite.id }
  }

  const pendingInvite = related.find((invite) => invite.status === 'pending')
  if (!pendingInvite) {
    return { relation: 'none' as const }
  }

  if (pendingInvite.toUserId === viewerId) {
    return { relation: 'incoming' as const, inviteId: pendingInvite.id }
  }

  return { relation: 'outgoing' as const, inviteId: pendingInvite.id }
}

function buildDirectoryEntry(viewerId: string, user: StandaloneChatUserRecord, invites: StandaloneChatInviteRecord[]): StandaloneChatDirectoryEntry {
  const relationState = buildRelationState(viewerId, user.id, invites)
  return {
    ...toPublicUser(user),
    relation: relationState.relation,
    inviteId: relationState.inviteId,
  }
}

export function sanitizeStandaloneChatLogin(value: string) {
  const login = normalizeLogin(value)
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    throw createError({ statusCode: 400, statusMessage: 'Логин должен содержать 3-32 символа: латиница, цифры, точка, дефис или подчёркивание' })
  }
  return login
}

export function sanitizeStandaloneChatDisplayName(value: string) {
  const displayName = normalizeDisplayName(value)
  if (displayName.length < 2 || displayName.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Имя должно содержать от 2 до 60 символов' })
  }
  return displayName
}

export async function listStandaloneChatUsers() {
  const store = await readStore()
  return [...store.users]
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ru'))
    .map(toPublicUser)
}

export async function findStandaloneChatUserById(userId: string) {
  const store = await readStore()
  return store.users.find((user) => user.id === userId) || null
}

export async function findStandaloneChatUserByLogin(login: string) {
  const store = await readStore()
  return store.users.find((user) => user.login === normalizeLogin(login)) || null
}

export async function createStandaloneChatUser(input: { login: string; displayName: string; password: string }) {
  const login = sanitizeStandaloneChatLogin(input.login)
  const displayName = sanitizeStandaloneChatDisplayName(input.displayName)
  const password = input.password.trim()

  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Пароль должен содержать минимум 8 символов' })
  }

  const store = await readStore()
  if (store.users.some((user) => user.login === login)) {
    throw createError({ statusCode: 409, statusMessage: 'Такой логин уже зарегистрирован' })
  }

  const user: StandaloneChatUserRecord = {
    id: randomUUID(),
    login,
    displayName,
    nickname: normalizeNickname(login),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  const nextStore: StandaloneChatUsersFile = {
    users: [...store.users, user],
    invites: store.invites,
  }
  await persistStore(nextStore)
  return toPublicUser(user)
}

export async function authenticateStandaloneChatUser(input: { login: string; password: string }) {
  const login = sanitizeStandaloneChatLogin(input.login)
  const password = input.password.trim()
  const user = await findStandaloneChatUserByLogin(login)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  return toPublicUser(user)
}

export async function listStandaloneChatContacts(userId: string) {
  const store = await readStore()
  const usersById = new Map(store.users.map((user) => [user.id, user]))

  const contacts: StandaloneChatUserPublic[] = []
  const incomingInvites: StandaloneChatContactInvite[] = []
  const outgoingInvites: StandaloneChatContactInvite[] = []

  for (const invite of store.invites.sort((left, right) => right.createdAt.localeCompare(left.createdAt))) {
    if (invite.status === 'accepted' && (invite.fromUserId === userId || invite.toUserId === userId)) {
      const peerId = invite.fromUserId === userId ? invite.toUserId : invite.fromUserId
      const peer = usersById.get(peerId)
      if (peer && !contacts.some((item) => item.id === peer.id)) contacts.push(toPublicUser(peer))
      continue
    }

    if (invite.status !== 'pending') continue

    if (invite.toUserId === userId) {
      const fromUser = usersById.get(invite.fromUserId)
      if (fromUser) {
        incomingInvites.push({
          inviteId: invite.id,
          status: invite.status,
          createdAt: invite.createdAt,
          resolvedAt: invite.resolvedAt,
          user: toPublicUser(fromUser),
        })
      }
      continue
    }

    if (invite.fromUserId === userId) {
      const toUser = usersById.get(invite.toUserId)
      if (toUser) {
        outgoingInvites.push({
          inviteId: invite.id,
          status: invite.status,
          createdAt: invite.createdAt,
          resolvedAt: invite.resolvedAt,
          user: toPublicUser(toUser),
        })
      }
    }
  }

  contacts.sort((left, right) => left.displayName.localeCompare(right.displayName, 'ru'))
  return { contacts, incomingInvites, outgoingInvites }
}

export async function searchStandaloneChatDirectory(input: { viewerId: string; search?: string; limit?: number }) {
  const store = await readStore()
  const search = input.search?.trim().toLowerCase() || ''
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 100)

  const items = store.users
    .filter((user) => user.id !== input.viewerId)
    .filter((user) => {
      if (!search) return true
      const haystack = [user.displayName, user.login, user.nickname ? `@${user.nickname}` : ''].join(' ').toLowerCase()
      return haystack.includes(search)
    })
    .map((user) => buildDirectoryEntry(input.viewerId, user, store.invites))
    .sort((left, right) => {
      const relationWeight = { incoming: 0, accepted: 1, outgoing: 2, none: 3 }
      const byRelation = relationWeight[left.relation] - relationWeight[right.relation]
      if (byRelation !== 0) return byRelation
      return left.displayName.localeCompare(right.displayName, 'ru')
    })

  return items.slice(0, limit)
}

export async function createStandaloneChatInvite(input: { fromUserId: string; toUserId: string }) {
  if (input.fromUserId === input.toUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Нельзя пригласить самого себя' })
  }

  const store = await readStore()
  const fromUser = store.users.find((user) => user.id === input.fromUserId)
  const toUser = store.users.find((user) => user.id === input.toUserId)

  if (!fromUser || !toUser) {
    throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })
  }

  const pairKey = getPairKey(input.fromUserId, input.toUserId)
  const relatedInvites = store.invites
    .filter((invite) => getPairKey(invite.fromUserId, invite.toUserId) === pairKey)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  const acceptedInvite = relatedInvites.find((invite) => invite.status === 'accepted')
  if (acceptedInvite) {
    return {
      inviteId: acceptedInvite.id,
      relation: 'accepted' as const,
      user: toPublicUser(toUser),
    }
  }

  const reversePending = relatedInvites.find((invite) => invite.status === 'pending' && invite.fromUserId === input.toUserId && invite.toUserId === input.fromUserId)
  if (reversePending) {
    reversePending.status = 'accepted'
    reversePending.resolvedAt = new Date().toISOString()
    await persistStore({ users: store.users, invites: [...store.invites] })
    return {
      inviteId: reversePending.id,
      relation: 'accepted' as const,
      user: toPublicUser(toUser),
    }
  }

  const existingPending = relatedInvites.find((invite) => invite.status === 'pending' && invite.fromUserId === input.fromUserId && invite.toUserId === input.toUserId)
  if (existingPending) {
    return {
      inviteId: existingPending.id,
      relation: 'outgoing' as const,
      user: toPublicUser(toUser),
    }
  }

  const invite: StandaloneChatInviteRecord = {
    id: randomUUID(),
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  await persistStore({
    users: store.users,
    invites: [...store.invites, invite],
  })

  return {
    inviteId: invite.id,
    relation: 'outgoing' as const,
    user: toPublicUser(toUser),
  }
}

export async function respondToStandaloneChatInvite(input: { inviteId: string; userId: string; action: 'accept' | 'reject' }) {
  const store = await readStore()
  const invite = store.invites.find((item) => item.id === input.inviteId)

  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Приглашение не найдено' })
  }

  if (invite.toUserId !== input.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Нельзя обработать чужое приглашение' })
  }

  if (invite.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Приглашение уже обработано' })
  }

  invite.status = input.action === 'accept' ? 'accepted' : 'rejected'
  invite.resolvedAt = new Date().toISOString()
  await persistStore({ users: store.users, invites: [...store.invites] })

  return {
    inviteId: invite.id,
    status: invite.status,
  }
}

export async function updateStandaloneChatProfile(userId: string, input: { displayName?: string; nickname?: string | null }) {
  const store = await readStore()
  const user = store.users.find((item) => item.id === userId)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })
  }

  const nextDisplayName = input.displayName === undefined ? user.displayName : sanitizeStandaloneChatDisplayName(input.displayName)
  const nextNickname = input.nickname === undefined ? user.nickname : sanitizeNicknameValue(input.nickname)

  if (nextNickname && store.users.some((item) => item.id !== userId && item.nickname === nextNickname)) {
    throw createError({ statusCode: 409, statusMessage: 'Такой никнейм уже занят' })
  }

  user.displayName = nextDisplayName
  user.nickname = nextNickname
  await persistStore({ users: [...store.users], invites: store.invites })
  return toPublicUser(user)
}