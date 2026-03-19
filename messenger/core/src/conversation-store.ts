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
  editedAt?: string
  deletedAt?: string
  replyToMessageId?: string
  commentOnMessageId?: string
  forwardedFrom?: {
    messageId: string
    conversationId: string
    senderUserId: string
    senderDisplayName: string
    body: string
    kind: 'text' | 'file'
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
    }
  }
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
  editedAt?: string
  deletedAt?: string
  own: boolean
  senderDisplayName: string
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
  }
  replyTo?: {
    id: string
    body: string
    kind: 'text' | 'file'
    own: boolean
    senderDisplayName: string
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
    }
  }
  commentOn?: {
    id: string
    body: string
    kind: 'text' | 'file'
    own: boolean
    senderDisplayName: string
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
    }
  }
  forwardedFrom?: {
    messageId: string
    conversationId: string
    body: string
    kind: 'text' | 'file'
    senderDisplayName: string
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
    }
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

function buildMessageRelationPreview(
  message: MessengerMessageRecord,
  actorId: string,
  users: MessengerUserRecord[],
) {
  const sender = users.find(item => item.id === message.senderUserId)

  return {
    id: message.id,
    body: message.deletedAt ? 'Сообщение удалено' : message.body,
    kind: message.kind,
    own: message.senderUserId === actorId,
    senderDisplayName: sender?.displayName || 'Unknown',
    attachment: message.deletedAt ? undefined : message.attachment,
  }
}

function assertMessageRelation(
  payload: ConversationsFile,
  conversation: MessengerConversationRecord,
  relationMessageId: string | undefined,
  actorId: string,
) {
  if (!relationMessageId) {
    return undefined
  }

  const relationMessage = payload.messages.find(item => item.id === relationMessageId && item.conversationId === conversation.id)
  if (!relationMessage) {
    throw new Error('MESSAGE_NOT_FOUND')
  }

  if (!isParticipant(conversation, actorId)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  return relationMessage.id
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
      const replyTo = message.replyToMessageId
        ? payload.messages.find(item => item.id === message.replyToMessageId && item.conversationId === conversationId)
        : undefined
      const commentOn = message.commentOnMessageId
        ? payload.messages.find(item => item.id === message.commentOnMessageId && item.conversationId === conversationId)
        : undefined

      return {
        id: message.id,
        body: message.deletedAt ? 'Сообщение удалено' : message.body,
        kind: message.kind,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
        own: message.senderUserId === actor.id,
        senderDisplayName: sender?.displayName || 'Unknown',
        attachment: message.deletedAt ? undefined : message.attachment,
        replyTo: replyTo ? buildMessageRelationPreview(replyTo, actor.id, users) : undefined,
        commentOn: commentOn ? buildMessageRelationPreview(commentOn, actor.id, users) : undefined,
        forwardedFrom: message.forwardedFrom,
      } satisfies ConversationMessageOverviewItem
    })
}

export async function addMessageToConversation(
  conversationId: string,
  actor: MessengerUserRecord,
  body: string,
  options?: {
    replyToMessageId?: string
    commentOnMessageId?: string
  },
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
    body: body.trim(),
    kind: 'text',
    createdAt: now,
    replyToMessageId: assertMessageRelation(payload, conversation, options?.replyToMessageId, actor.id),
    commentOnMessageId: assertMessageRelation(payload, conversation, options?.commentOnMessageId, actor.id),
  }

  payload.messages.push(message)
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function forwardMessageToConversation(
  conversationId: string,
  sourceMessageId: string,
  actor: MessengerUserRecord,
  users: MessengerUserRecord[],
) {
  const payload = await readConversationsFile()
  const targetConversation = payload.conversations.find(item => item.id === conversationId)
  if (!targetConversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(targetConversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const sourceMessage = payload.messages.find(item => item.id === sourceMessageId)
  if (!sourceMessage) {
    throw new Error('MESSAGE_NOT_FOUND')
  }

  const sourceConversation = payload.conversations.find(item => item.id === sourceMessage.conversationId)
  if (!sourceConversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(sourceConversation, actor.id)) {
    throw new Error('MESSAGE_FORBIDDEN')
  }

  const sender = users.find(item => item.id === sourceMessage.senderUserId)
  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: actor.id,
    body: sourceMessage.deletedAt ? 'Сообщение удалено' : sourceMessage.body,
    kind: sourceMessage.kind,
    attachment: sourceMessage.deletedAt ? undefined : sourceMessage.attachment,
    createdAt: now,
    forwardedFrom: {
      messageId: sourceMessage.id,
      conversationId: sourceMessage.conversationId,
      senderUserId: sourceMessage.senderUserId,
      senderDisplayName: sender?.displayName || 'Unknown',
      body: sourceMessage.deletedAt ? 'Сообщение удалено' : sourceMessage.body,
      kind: sourceMessage.kind,
      attachment: sourceMessage.deletedAt ? undefined : sourceMessage.attachment,
    },
  }

  payload.messages.push(message)
  targetConversation.updatedAt = now
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

export async function editMessageInConversation(conversationId: string, messageId: string, actor: MessengerUserRecord, body: string) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const message = payload.messages.find(item => item.id === messageId && item.conversationId === conversationId)
  if (!message) {
    throw new Error('MESSAGE_NOT_FOUND')
  }

  if (message.senderUserId !== actor.id) {
    throw new Error('MESSAGE_FORBIDDEN')
  }

  if (message.kind !== 'text' || message.deletedAt) {
    throw new Error('MESSAGE_NOT_EDITABLE')
  }

  const now = new Date().toISOString()
  message.body = body.trim()
  message.editedAt = now
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function deleteMessageFromConversation(conversationId: string, messageId: string, actor: MessengerUserRecord) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const message = payload.messages.find(item => item.id === messageId && item.conversationId === conversationId)
  if (!message) {
    throw new Error('MESSAGE_NOT_FOUND')
  }

  if (message.senderUserId !== actor.id) {
    throw new Error('MESSAGE_FORBIDDEN')
  }

  if (message.deletedAt) {
    return message
  }

  const now = new Date().toISOString()
  message.body = ''
  message.attachment = undefined
  message.deletedAt = now
  message.editedAt = undefined
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function deleteConversationForUser(conversationId: string, actor: MessengerUserRecord) {
  const payload = await readConversationsFile()
  const conversationIndex = payload.conversations.findIndex(item => item.id === conversationId)
  if (conversationIndex === -1) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  const conversation = payload.conversations[conversationIndex]
  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  payload.conversations.splice(conversationIndex, 1)
  payload.messages = payload.messages.filter(item => item.conversationId !== conversationId)
  await writeConversationsFile(payload)
  return conversation
}