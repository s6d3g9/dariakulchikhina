import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

import { findMessengerAgentById, type MessengerAgentRecord } from '../agents/agent-store.ts'
import type { MessengerUserRecord } from '../auth/auth-store.ts'
import { readMessengerConfig } from '../config.ts'
import type { MessengerDevicePublicKeyRecord } from '../crypto/crypto-store.ts'
import { resolveMessengerDataPath } from '../media/storage-paths.ts'

type MessengerConversationKind = 'direct' | 'direct-secret' | 'agent'
type MessengerPeerType = 'user' | 'agent'

export interface MessengerEncryptedPayload {
  algorithm: 'aes-gcm-256'
  ciphertext: string
  iv: string
}

export interface MessengerEncryptedBinaryPayload {
  algorithm: 'aes-gcm-256'
  iv: string
}

export interface MessengerKlipyAttachmentRecord {
  id: string
  slug: string
  kind: 'gif' | 'sticker'
  title: string
  previewUrl: string
  originalUrl: string
  mimeType: string
  width?: number
  height?: number
}

export interface MessengerMessageReactionRecord {
  emoji: string
  userIds: string[]
  updatedAt: string
}

export interface MessengerConversationKeyPackageRecord {
  recipientUserId: string
  wrappedKey: string
  iv: string
  senderPublicKey: MessengerDevicePublicKeyRecord
  createdAt: string
}

export interface MessengerConversationPolicy {
  secret: boolean
  allowMutualDelete: boolean
  encryptedMessages: boolean
  encryptedAttachments: boolean
  encryptedVoice: boolean
  callsSecurityMode: 'webrtc-only' | 'beta-e2ee'
  allowForwardOut: boolean
  hideListPreview: boolean
}

export interface MessengerConversationRecord {
  id: string
  kind: MessengerConversationKind
  userAId: string
  userBId: string
  createdAt: string
  updatedAt: string
  policy?: MessengerConversationPolicy
  encryption?: {
    algorithm: 'aes-gcm-256'
    keyPackages: Record<string, MessengerConversationKeyPackageRecord>
  }
}

export interface MessengerMessageRecord {
  id: string
  conversationId: string
  senderUserId: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
    encryptedFile?: MessengerEncryptedBinaryPayload
    klipy?: MessengerKlipyAttachmentRecord
  }
  reactions?: MessengerMessageReactionRecord[]
  createdAt: string
  readAt?: string
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
    encryptedBody?: MessengerEncryptedPayload
    kind: 'text' | 'file'
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
      encryptedFile?: MessengerEncryptedBinaryPayload
      klipy?: MessengerKlipyAttachmentRecord
    }
  }
}

interface ConversationsFile {
  conversations: MessengerConversationRecord[]
  messages: MessengerMessageRecord[]
}

function buildDirectPolicy(): MessengerConversationPolicy {
  return {
    secret: false,
    allowMutualDelete: false,
    encryptedMessages: true,
    encryptedAttachments: false,
    encryptedVoice: false,
    callsSecurityMode: 'webrtc-only',
    allowForwardOut: true,
    hideListPreview: false,
  }
}

function buildAgentPolicy(): MessengerConversationPolicy {
  return {
    secret: false,
    allowMutualDelete: false,
    encryptedMessages: false,
    encryptedAttachments: false,
    encryptedVoice: false,
    callsSecurityMode: 'webrtc-only',
    allowForwardOut: false,
    hideListPreview: false,
  }
}

function buildSecretPolicy(): MessengerConversationPolicy {
  return {
    secret: true,
    allowMutualDelete: true,
    encryptedMessages: true,
    encryptedAttachments: false,
    encryptedVoice: false,
    callsSecurityMode: 'webrtc-only',
    allowForwardOut: false,
    hideListPreview: true,
  }
}

function getConversationPolicy(conversation: Pick<MessengerConversationRecord, 'kind' | 'policy'>): MessengerConversationPolicy {
  if (conversation.policy) {
    return conversation.policy
  }

  if (conversation.kind === 'direct-secret') {
    return buildSecretPolicy()
  }

  if (conversation.kind === 'agent') {
    return buildAgentPolicy()
  }

  return buildDirectPolicy()
}

export interface ConversationOverviewItem {
  id: string
  kind: MessengerConversationKind
  secret: boolean
  peerUserId: string
  peerDisplayName: string
  peerLogin: string
  peerType: MessengerPeerType
  peerDescription?: string
  updatedAt: string
  policy: MessengerConversationPolicy
  lastMessage: {
    id: string
    body: string
    encryptedBody?: MessengerEncryptedPayload
    createdAt: string
    own: boolean
  } | null
}

export interface ConversationMessageOverviewItem {
  id: string
  body: string
  encryptedBody?: MessengerEncryptedPayload
  kind: 'text' | 'file'
  createdAt: string
  readAt?: string
  editedAt?: string
  deletedAt?: string
  own: boolean
  senderDisplayName: string
  attachment?: {
    name: string
    mimeType: string
    size: number
    url: string
    encryptedFile?: MessengerEncryptedBinaryPayload
  }
  reactions?: Array<{
    emoji: string
    count: number
    own: boolean
  }>
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
      encryptedFile?: MessengerEncryptedBinaryPayload
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
      encryptedFile?: MessengerEncryptedBinaryPayload
    }
  }
  forwardedFrom?: {
    messageId: string
    conversationId: string
    body: string
    encryptedBody?: MessengerEncryptedPayload
    kind: 'text' | 'file'
    senderDisplayName: string
    attachment?: {
      name: string
      mimeType: string
      size: number
      url: string
      encryptedFile?: MessengerEncryptedBinaryPayload
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
  if (conversation.kind === 'agent') {
    return conversation.userAId === userId
  }

  return conversation.userAId === userId || conversation.userBId === userId
}

function getPeerId(conversation: MessengerConversationRecord, userId: string) {
  return conversation.userAId === userId ? conversation.userBId : conversation.userAId
}

function buildMessageRelationPreview(
  message: MessengerMessageRecord,
  actorId: string,
  users: MessengerUserRecord[],
  conversation?: Pick<MessengerConversationRecord, 'kind' | 'policy'>,
) {
  const sender = users.find(item => item.id === message.senderUserId)

  return {
    id: message.id,
    body: getMessageBodyPreview(message, conversation),
    encryptedBody: message.deletedAt ? undefined : message.encryptedBody,
    kind: message.kind,
    own: message.senderUserId === actorId,
    senderDisplayName: sender?.displayName || 'Unknown',
    attachment: message.deletedAt ? undefined : message.attachment,
  }
}

function getMessageBodyPreview(
  message: Pick<MessengerMessageRecord, 'body' | 'kind' | 'attachment' | 'deletedAt' | 'encryptedBody'>,
  conversation?: Pick<MessengerConversationRecord, 'kind' | 'policy'>,
) {
  if (message.deletedAt) {
    return 'Сообщение удалено'
  }

  if (conversation?.policy?.hideListPreview || conversation?.kind === 'direct-secret') {
    if (message.kind === 'file' && message.attachment) {
      if (message.attachment.mimeType.startsWith('audio/')) {
        return 'Голосовое сообщение защищено'
      }

      return 'Вложение защищено'
    }

    return 'Секретное сообщение'
  }

  if (message.kind === 'file' && message.attachment) {
    if (message.attachment.mimeType.startsWith('audio/')) {
      return 'Аудиосообщение'
    }

    if (message.attachment.mimeType.startsWith('image/')) {
      return 'Фото'
    }

    return message.attachment.name
  }

  if (message.encryptedBody) {
    return 'Защищённое сообщение'
  }

  return message.body
}

function getStoredTextBody(body: string, conversation: Pick<MessengerConversationRecord, 'kind' | 'policy'>) {
  return getConversationPolicy(conversation).secret ? '' : body.trim()
}

function buildMessageReactions(
  reactions: MessengerMessageReactionRecord[] | undefined,
  actorId: string,
) {
  if (!reactions?.length) {
    return undefined
  }

  const normalized = reactions
    .map((reaction) => {
      const uniqueUserIds = Array.from(new Set(reaction.userIds.filter(Boolean)))
      if (!reaction.emoji || !uniqueUserIds.length) {
        return null
      }

      return {
        emoji: reaction.emoji,
        count: uniqueUserIds.length,
        own: uniqueUserIds.includes(actorId),
      }
    })
    .filter((reaction): reaction is NonNullable<typeof reaction> => Boolean(reaction))

  if (!normalized.length) {
    return undefined
  }

  return normalized.sort((left, right) => right.count - left.count || left.emoji.localeCompare(right.emoji, 'ru'))
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
    if (!existing.policy) {
      existing.policy = buildDirectPolicy()
      await writeConversationsFile(payload)
    }
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
    policy: buildDirectPolicy(),
  }

  payload.conversations.push(conversation)
  await writeConversationsFile(payload)
  return conversation
}

export async function findOrCreateSecretConversation(userId: string, peerUserId: string) {
  const payload = await readConversationsFile()
  const [userAId, userBId] = normalizePair(userId, peerUserId)
  const existing = payload.conversations.find(item => item.kind === 'direct-secret' && item.userAId === userAId && item.userBId === userBId)
  if (existing) {
    if (!existing.policy) {
      existing.policy = buildSecretPolicy()
      await writeConversationsFile(payload)
    }
    return existing
  }

  const now = new Date().toISOString()
  const conversation: MessengerConversationRecord = {
    id: randomUUID(),
    kind: 'direct-secret',
    userAId,
    userBId,
    createdAt: now,
    updatedAt: now,
    policy: buildSecretPolicy(),
  }

  payload.conversations.push(conversation)
  await writeConversationsFile(payload)
  return conversation
}

export async function findOrCreateAgentConversation(userId: string, agentId: string) {
  if (!readMessengerConfig().MESSENGER_ENABLE_AGENTS) {
    throw new Error('AGENTS_DISABLED')
  }

  const payload = await readConversationsFile()
  const existing = payload.conversations.find(item => item.kind === 'agent' && item.userAId === userId && item.userBId === agentId)
  if (existing) {
    if (!existing.policy) {
      existing.policy = buildAgentPolicy()
      await writeConversationsFile(payload)
    }
    return existing
  }

  const now = new Date().toISOString()
  const conversation: MessengerConversationRecord = {
    id: randomUUID(),
    kind: 'agent',
    userAId: userId,
    userBId: agentId,
    createdAt: now,
    updatedAt: now,
    policy: buildAgentPolicy(),
  }

  payload.conversations.push(conversation)
  await writeConversationsFile(payload)
  return conversation
}

async function resolvePeer(
  conversation: MessengerConversationRecord,
  actorId: string,
  users: MessengerUserRecord[],
): Promise<{ id: string; displayName: string; login: string; peerType: MessengerPeerType; description?: string } | null> {
  const peerUserId = getPeerId(conversation, actorId)

  if (conversation.kind === 'agent') {
    const agent = await findMessengerAgentById(peerUserId)
    if (!agent) {
      return null
    }

    return {
      id: agent.id,
      displayName: agent.displayName,
      login: agent.login,
      peerType: 'agent',
      description: agent.description,
    }
  }

  const peer = users.find(item => item.id === peerUserId)
  if (!peer) {
    return null
  }

  return {
    id: peer.id,
    displayName: peer.displayName,
    login: peer.login,
    peerType: 'user',
  }
}

async function resolveSenderDisplayName(senderId: string, users: MessengerUserRecord[]) {
  const user = users.find(item => item.id === senderId)
  if (user) {
    return user.displayName
  }

  const agent = await findMessengerAgentById(senderId)
  return agent?.displayName || 'Unknown'
}

export async function listConversationsForUser(user: MessengerUserRecord, users: MessengerUserRecord[], query: string) {
  const payload = await readConversationsFile()
  const normalizedQuery = query.trim().toLowerCase()
  const agentsEnabled = readMessengerConfig().MESSENGER_ENABLE_AGENTS

  const items = await Promise.all(payload.conversations
    .filter(conversation => isParticipant(conversation, user.id))
    .filter(conversation => agentsEnabled || conversation.kind !== 'agent')
    .map(async (conversation) => {
      const policy = getConversationPolicy(conversation)
      const peer = await resolvePeer(conversation, user.id, users)
      if (!peer) {
        return null
      }

      if (normalizedQuery
        && !peer.displayName.toLowerCase().includes(normalizedQuery)
        && !peer.login.toLowerCase().includes(normalizedQuery)
        && !peer.description?.toLowerCase().includes(normalizedQuery)) {
        return null
      }

      const lastMessage = payload.messages
        .filter(message => message.conversationId === conversation.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null

      return {
        id: conversation.id,
        kind: conversation.kind,
        secret: policy.secret,
        peerUserId: peer.id,
        peerDisplayName: peer.displayName,
        peerLogin: peer.login,
        peerType: peer.peerType,
        peerDescription: peer.description,
        updatedAt: lastMessage?.createdAt || conversation.updatedAt,
        policy,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          body: getMessageBodyPreview(lastMessage, conversation),
          encryptedBody: lastMessage.deletedAt ? undefined : lastMessage.encryptedBody ?? undefined,
          createdAt: lastMessage.createdAt,
          own: lastMessage.senderUserId === user.id,
        } : null,
      }
    }))
  const normalizedItems = items.filter(item => item !== null)

  return normalizedItems
    .map(item => item satisfies ConversationOverviewItem)
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

  return await Promise.all(payload.messages
    .filter(message => message.conversationId === conversationId)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map(async (message) => {
      const replyTo = message.replyToMessageId
        ? payload.messages.find(item => item.id === message.replyToMessageId && item.conversationId === conversationId)
        : undefined
      const commentOn = message.commentOnMessageId
        ? payload.messages.find(item => item.id === message.commentOnMessageId && item.conversationId === conversationId)
        : undefined

      return {
        id: message.id,
        body: getMessageBodyPreview(message, conversation),
        encryptedBody: message.deletedAt ? undefined : message.encryptedBody,
        kind: message.kind,
        createdAt: message.createdAt,
        readAt: message.readAt,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
        own: message.senderUserId === actor.id,
        senderDisplayName: await resolveSenderDisplayName(message.senderUserId, users),
        attachment: message.deletedAt ? undefined : message.attachment,
        reactions: message.deletedAt ? undefined : buildMessageReactions(message.reactions, actor.id),
        replyTo: replyTo ? buildMessageRelationPreview(replyTo, actor.id, users, conversation) : undefined,
        commentOn: commentOn ? buildMessageRelationPreview(commentOn, actor.id, users, conversation) : undefined,
        forwardedFrom: message.forwardedFrom,
      } satisfies ConversationMessageOverviewItem
    }))
}

export async function markConversationReadByUser(conversationId: string, actor: MessengerUserRecord) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const now = new Date().toISOString()
  let updated = false

  for (const message of payload.messages) {
    if (message.conversationId !== conversationId) {
      continue
    }

    if (message.senderUserId === actor.id || message.deletedAt || message.readAt) {
      continue
    }

    message.readAt = now
    updated = true
  }

  if (updated) {
    await writeConversationsFile(payload)
  }

  return {
    updated,
    conversation,
  }
}

export async function addMessageToConversation(
  conversationId: string,
  actor: MessengerUserRecord,
  body: string,
  options?: {
    encryptedBody?: MessengerEncryptedPayload
    replyToMessageId?: string
    commentOnMessageId?: string
    forwardedFrom?: MessengerMessageRecord['forwardedFrom']
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

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !options?.encryptedBody) {
    throw new Error('MESSAGE_ENCRYPTION_REQUIRED')
  }

  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: actor.id,
    body: getStoredTextBody(body, conversation),
    encryptedBody: options?.encryptedBody,
    kind: 'text',
    createdAt: now,
    replyToMessageId: assertMessageRelation(payload, conversation, options?.replyToMessageId, actor.id),
    commentOnMessageId: assertMessageRelation(payload, conversation, options?.commentOnMessageId, actor.id),
    forwardedFrom: options?.forwardedFrom,
  }

  payload.messages.push(message)
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function addAgentMessageToConversation(
  conversationId: string,
  agent: MessengerAgentRecord,
  body: string,
) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (conversation.kind !== 'agent' || conversation.userBId !== agent.id) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: agent.id,
    body: body.trim(),
    kind: 'text',
    createdAt: now,
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

  if (getConversationPolicy(targetConversation).secret || !getConversationPolicy(sourceConversation).allowForwardOut) {
    throw new Error('FORWARD_FORBIDDEN_IN_SECRET_CHAT')
  }

  if (!isParticipant(sourceConversation, actor.id)) {
    throw new Error('MESSAGE_FORBIDDEN')
  }

  const sender = users.find(item => item.id === sourceMessage.senderUserId)
  if (sourceMessage.encryptedBody) {
    throw new Error('MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD')
  }

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
      encryptedBody: sourceMessage.deletedAt ? undefined : sourceMessage.encryptedBody,
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
  attachment: { name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload; klipy?: MessengerKlipyAttachmentRecord },
) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !attachment.encryptedFile) {
    throw new Error('MESSAGE_ENCRYPTION_REQUIRED')
  }

  const attachmentLabel = attachment.mimeType.startsWith('audio/')
    ? 'Аудиосообщение'
    : attachment.mimeType.startsWith('image/')
      ? 'Фото'
      : attachment.name

  const now = new Date().toISOString()
  const message: MessengerMessageRecord = {
    id: randomUUID(),
    conversationId,
    senderUserId: actor.id,
    body: attachmentLabel,
    kind: 'file',
    attachment,
    createdAt: now,
  }

  payload.messages.push(message)
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function editMessageInConversation(
  conversationId: string,
  messageId: string,
  actor: MessengerUserRecord,
  body: string,
  encryptedBody?: MessengerEncryptedPayload,
) {
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

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !encryptedBody) {
    throw new Error('MESSAGE_ENCRYPTION_REQUIRED')
  }

  const now = new Date().toISOString()
  message.body = getStoredTextBody(body, conversation)
  message.encryptedBody = encryptedBody
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

  const policy = getConversationPolicy(conversation)
  if (message.senderUserId !== actor.id && !policy.allowMutualDelete) {
    throw new Error('MESSAGE_FORBIDDEN')
  }

  if (message.deletedAt) {
    return message
  }

  const now = new Date().toISOString()
  message.body = ''
  message.encryptedBody = undefined
  message.attachment = undefined
  message.reactions = undefined
  message.deletedAt = now
  message.editedAt = undefined
  conversation.updatedAt = now
  await writeConversationsFile(payload)
  return message
}

export async function toggleReactionInConversation(
  conversationId: string,
  messageId: string,
  actor: MessengerUserRecord,
  emoji: string,
) {
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

  if (message.deletedAt) {
    throw new Error('MESSAGE_NOT_REACTABLE')
  }

  const normalizedEmoji = emoji.trim()
  if (!normalizedEmoji) {
    throw new Error('REACTION_EMOJI_REQUIRED')
  }

  const now = new Date().toISOString()
  const reactions = message.reactions ? [...message.reactions] : []
  const currentReaction = reactions.find(item => item.emoji === normalizedEmoji)

  if (!currentReaction) {
    reactions.push({
      emoji: normalizedEmoji,
      userIds: [actor.id],
      updatedAt: now,
    })
  } else if (currentReaction.userIds.includes(actor.id)) {
    currentReaction.userIds = currentReaction.userIds.filter(userId => userId !== actor.id)
    currentReaction.updatedAt = now
  } else {
    currentReaction.userIds = [...currentReaction.userIds, actor.id]
    currentReaction.updatedAt = now
  }

  message.reactions = reactions.filter(item => item.userIds.length)
  if (!message.reactions.length) {
    message.reactions = undefined
  }

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

export async function getConversationKeyPackageForUser(conversationId: string, actor: MessengerUserRecord) {
  const conversation = await findConversationById(conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  return conversation.encryption?.keyPackages[actor.id] ?? null
}

export async function saveConversationKeyPackages(
  conversationId: string,
  actor: MessengerUserRecord,
  packages: MessengerConversationKeyPackageRecord[],
) {
  const payload = await readConversationsFile()
  const conversation = payload.conversations.find(item => item.id === conversationId)
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }

  if (!isParticipant(conversation, actor.id)) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }

  const nextPackages = conversation.encryption?.keyPackages ?? {}

  for (const item of packages) {
    if (!isParticipant(conversation, item.recipientUserId)) {
      throw new Error('CONVERSATION_FORBIDDEN')
    }

    if (!nextPackages[item.recipientUserId]) {
      nextPackages[item.recipientUserId] = item
    }
  }

  conversation.encryption = {
    algorithm: 'aes-gcm-256',
    keyPackages: nextPackages,
  }
  await writeConversationsFile(payload)
  return conversation.encryption
}