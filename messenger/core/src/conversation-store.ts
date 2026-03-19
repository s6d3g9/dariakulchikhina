import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

import type { MessengerUserRecord } from './auth-store.ts'
import { resolveMessengerDataPath } from './storage-paths.ts'

export interface MessengerConversationRecord {
  id: string
  kind: 'direct'
  userAId: string
  userBId: string
  createdAt: string
  updatedAt: string
}

export interface MessengerMessageRecord {
  id: string
  conversationId: string
  senderUserId: string
  body: string
  kind: 'text' | 'file'
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
  }
  createdAt: string
}

interface ConversationsFile {
  conversations: MessengerConversationRecord[]
  messages: MessengerMessageRecord[]
}

export interface ConversationOverviewItem {
  id: string
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  updatedAt: string
  lastMessage: {
    id: string
    body: string
    createdAt: string
    own: boolean
  } | null
}

export interface ConversationMessageOverviewItem {
  id: string
  body: string
  kind: 'text' | 'file'
  createdAt: string
  own: boolean
  senderDisplayName: string
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
  }
}

const STORAGE_PATH = resolveMessengerDataPath('conversations.json')

function normalizePair(leftId: string, rightId: string) {
  return [leftId, rightId].sort()
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readConversationsFile(): Promise<ConversationsFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ConversationsFile>
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations as MessengerConversationRecord[] : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages as MessengerMessageRecord[] : [],
    }
  } catch {
    return {
      conversations: [],
      messages: [],
    }
  }
}

async function writeConversationsFile(payload: ConversationsFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function isParticipant(conversation: MessengerConversationRecord, userId: string) {
  return conversation.userAId === userId || conversation.userBId === userId
}

function getPeerId(conversation: MessengerConversationRecord, userId: string) {
  return conversation.userAId === userId ? conversation.userBId : conversation.userAId
}

export async function findConversationById(conversationId: string) {
  const payload = await readConversationsFile()
  return payload.conversations.find(item => item.id === conversationId) ?? null
}

export async function findOrCreateDirectConversation(userId: string, peerUserId: string) {
  const payload = await readConversationsFile()
  const [userAId, userBId] = normalizePair(userId, peerUserId)
  const existing = payload.conversations.find(item => item.kind === 'direct' && item.userAId === userAId && item.userBId === userBId)
  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const conversation: MessengerConversationRecord = {
    id: randomUUID(),
    kind: 'direct',
    userAId,
    userBId,
    createdAt: now,
    updatedAt: now,
  }

  payload.conversations.push(conversation)
  await writeConversationsFile(payload)
  return conversation
}

export async function listConversationsForUser(user: MessengerUserRecord, users: MessengerUserRecord[], query: string) {
  const payload = await readConversationsFile()
  const normalizedQuery = query.trim().toLowerCase()

  return payload.conversations
    .filter(conversation => isParticipant(conversation, user.id))
    .map((conversation) => {
      const peerUserId = getPeerId(conversation, user.id)
      const peer = users.find(item => item.id === peerUserId)
      if (!peer) {
        return null
      }

      if (normalizedQuery && !peer.displayName.toLowerCase().includes(normalizedQuery) && !peer.login.toLowerCase().includes(normalizedQuery)) {
        return null
      }

      const lastMessage = payload.messages
        .filter(message => message.conversationId === conversation.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null

      return {
        id: conversation.id,
        peerUserId,
        peerDisplayName: peer.displayName,
        peerLogin: peer.login,
        updatedAt: lastMessage?.createdAt || conversation.updatedAt,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          body: lastMessage.kind === 'file' && lastMessage.attachment ? `Файл: ${lastMessage.attachment.name}` : lastMessage.body,
          createdAt: lastMessage.createdAt,
          own: lastMessage.senderUserId === user.id,
        } : null,
      } satisfies ConversationOverviewItem
    })
    .filter((item): item is ConversationOverviewItem => Boolean(item))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

export async function listMessagesForConversation(conversationId: string, actor: MessengerUserRecord, users: MessengerUserRecord[]) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  return payload.messages
    .filter(message => message.conversationId === conversationId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map((message) => {
      const sender = users.find(item => item.id === message.senderUserId)
      return {
        id: message.id,
        body: message.body,
        kind: message.kind,
        createdAt: message.createdAt,
        own: message.senderUserId === actor.id,
        senderDisplayName: sender?.displayName || 'Unknown',
        attachment: message.attachment,
      } satisfies ConversationMessageOverviewItem
    })
}

export async function addMessageToConversation(conversationId: string, actor: MessengerUserRecord, body: string) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: actor.id,
    body: body.trim(),
    kind: 'text',
    createdAt: now,
  }

  payload.messages.push(message)
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function addAttachmentMessageToConversation(
  conversationId: string,
  actor: MessengerUserRecord,
  attachment: { name: string; mimeType: string; size: number; url: string },
) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: actor.id,
    body: attachment.name,
    kind: 'file',
    attachment,
    createdAt: now,
  }

  payload.messages.push(message)
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}