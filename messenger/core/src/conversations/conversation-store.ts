import { eq, and, isNull, sql } from 'drizzle-orm'

import { findMessengerAgentById, type MessengerAgentRecord } from '../agents/agent-store.ts'
import type { MessengerUserRecord } from '../auth/auth-store.ts'
import { readMessengerConfig } from '../config.ts'
import type { MessengerDevicePublicKeyRecord } from '../crypto/crypto-store.ts'
import { useMessengerDb } from '../db/client.ts'
import { messengerConversations } from '../db/schema.ts'
import {
  insertMessage,
  listAllMessagesForConversation,
  updateMessagePayload,
  softDeleteMessage,
  getMessageRow,
  findMessageById,
  updateConversationTimestamp,
  markConversationMessagesReadByUser,
  rowToMessengerMessageRecord,
  getLastMessageForConversation,
} from './message-store.ts'

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
    attachment?: { name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload }
  }
  commentOn?: {
    id: string
    body: string
    kind: 'text' | 'file'
    own: boolean
    senderDisplayName: string
    attachment?: { name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload }
  }
  forwardedFrom?: {
    messageId: string
    conversationId: string
    body: string
    encryptedBody?: MessengerEncryptedPayload
    kind: 'text' | 'file'
    senderDisplayName: string
    attachment?: { name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload }
  }
}

type ConvPolicyRow = MessengerConversationPolicy & {
  _agentId?: string
  _encryption?: {
    algorithm: 'aes-gcm-256'
    keyPackages: Record<string, MessengerConversationKeyPackageRecord>
  }
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

function normalizePair(leftId: string, rightId: string): [string, string] {
  const pair = [leftId, rightId].sort()
  return [pair[0], pair[1]] as [string, string]
}

function rowToConversationRecord(row: typeof messengerConversations.$inferSelect): MessengerConversationRecord {
  const stored = (row.policy ?? {}) as ConvPolicyRow
  const { _agentId, _encryption, ...policyFields } = stored
  return {
    id: row.id,
    kind: row.kind as MessengerConversationKind,
    userAId: row.userAId ?? '',
    userBId: _agentId ?? row.userBId ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    policy: Object.keys(policyFields).length ? (policyFields as MessengerConversationPolicy) : undefined,
    encryption: _encryption,
  }
}

function getConversationPolicy(conversation: Pick<MessengerConversationRecord, 'kind' | 'policy'>): MessengerConversationPolicy {
  if (conversation.policy) {
    return conversation.policy
  }
  if (conversation.kind === 'direct-secret') return buildSecretPolicy()
  if (conversation.kind === 'agent') return buildAgentPolicy()
  return buildDirectPolicy()
}

function isParticipant(conversation: MessengerConversationRecord, userId: string): boolean {
  if (conversation.kind === 'agent') {
    return conversation.userAId === userId
  }
  return conversation.userAId === userId || conversation.userBId === userId
}

function getStoredTextBody(body: string, conversation: Pick<MessengerConversationRecord, 'kind' | 'policy'>): string {
  return getConversationPolicy(conversation).secret ? '' : body.trim()
}

function getMessageBodyPreview(
  message: Pick<MessengerMessageRecord, 'body' | 'kind' | 'attachment' | 'deletedAt' | 'encryptedBody'>,
  conversation?: Pick<MessengerConversationRecord, 'kind' | 'policy'>,
): string {
  if (message.deletedAt) return 'Сообщение удалено'

  if (conversation?.policy?.hideListPreview || conversation?.kind === 'direct-secret') {
    if (message.kind === 'file' && message.attachment) {
      if (message.attachment.mimeType.startsWith('audio/')) return 'Голосовое сообщение защищено'
      return 'Вложение защищено'
    }
    return 'Секретное сообщение'
  }

  if (message.kind === 'file' && message.attachment) {
    if (message.attachment.mimeType.startsWith('audio/')) return 'Аудиосообщение'
    if (message.attachment.mimeType.startsWith('image/')) return 'Фото'
    return message.attachment.name
  }

  if (message.encryptedBody) return 'Защищённое сообщение'
  return message.body
}

function buildMessageReactions(reactions: MessengerMessageReactionRecord[] | undefined, actorId: string) {
  if (!reactions?.length) return undefined

  const normalized = reactions
    .map((reaction) => {
      const uniqueUserIds = Array.from(new Set(reaction.userIds.filter(Boolean)))
      if (!reaction.emoji || !uniqueUserIds.length) return null
      return { emoji: reaction.emoji, count: uniqueUserIds.length, own: uniqueUserIds.includes(actorId) }
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))

  if (!normalized.length) return undefined
  return normalized.sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji, 'ru'))
}

async function resolvePeer(
  conversation: MessengerConversationRecord,
  actorId: string,
  users: MessengerUserRecord[],
): Promise<{ id: string; displayName: string; login: string; peerType: MessengerPeerType; description?: string } | null> {
  const peerId = conversation.userAId === actorId ? conversation.userBId : conversation.userAId

  if (conversation.kind === 'agent') {
    const agent = await findMessengerAgentById(peerId)
    if (!agent) return null
    return { id: agent.id, displayName: agent.displayName, login: agent.login, peerType: 'agent', description: agent.description }
  }

  const peer = users.find(u => u.id === peerId)
  if (!peer) return null
  return { id: peer.id, displayName: peer.displayName, login: peer.login, peerType: 'user' }
}

async function resolveSenderDisplayName(senderId: string, users: MessengerUserRecord[]): Promise<string> {
  const user = users.find(u => u.id === senderId)
  if (user) return user.displayName
  const agent = await findMessengerAgentById(senderId)
  return agent?.displayName || 'Unknown'
}

export async function findConversationById(conversationId: string): Promise<MessengerConversationRecord | null> {
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerConversations)
    .where(and(eq(messengerConversations.id, conversationId), isNull(messengerConversations.deletedAt)))
    .limit(1)
    .then(rows => rows[0] ?? null)

  return row ? rowToConversationRecord(row) : null
}

export async function findOrCreateDirectConversation(userId: string, peerUserId: string): Promise<MessengerConversationRecord> {
  const db = useMessengerDb()
  const [userAId, userBId] = normalizePair(userId, peerUserId)

  const existing = await db
    .select()
    .from(messengerConversations)
    .where(
      and(
        eq(messengerConversations.kind, 'direct'),
        eq(messengerConversations.userAId, userAId),
        eq(messengerConversations.userBId, userBId),
        isNull(messengerConversations.deletedAt),
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (existing) {
    return rowToConversationRecord(existing)
  }

  const policy = buildDirectPolicy()
  const now = new Date()
  const [row] = await db
    .insert(messengerConversations)
    .values({ kind: 'direct', userAId, userBId, policy, createdAt: now, updatedAt: now })
    .returning()

  return rowToConversationRecord(row)
}

export async function findOrCreateSecretConversation(userId: string, peerUserId: string): Promise<MessengerConversationRecord> {
  const db = useMessengerDb()
  const [userAId, userBId] = normalizePair(userId, peerUserId)

  const existing = await db
    .select()
    .from(messengerConversations)
    .where(
      and(
        eq(messengerConversations.kind, 'direct-secret'),
        eq(messengerConversations.userAId, userAId),
        eq(messengerConversations.userBId, userBId),
        isNull(messengerConversations.deletedAt),
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (existing) {
    return rowToConversationRecord(existing)
  }

  const policy = buildSecretPolicy()
  const now = new Date()
  const [row] = await db
    .insert(messengerConversations)
    .values({ kind: 'direct-secret', userAId, userBId, policy, createdAt: now, updatedAt: now })
    .returning()

  return rowToConversationRecord(row)
}

export async function findOrCreateAgentConversation(userId: string, agentId: string): Promise<MessengerConversationRecord> {
  if (!readMessengerConfig().MESSENGER_ENABLE_AGENTS) {
    throw new Error('AGENTS_DISABLED')
  }

  const db = useMessengerDb()
  const existing = await db
    .select()
    .from(messengerConversations)
    .where(
      and(
        eq(messengerConversations.kind, 'agent'),
        eq(messengerConversations.userAId, userId),
        isNull(messengerConversations.deletedAt),
        sql`${messengerConversations.policy}->>'_agentId' = ${agentId}`,
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (existing) {
    return rowToConversationRecord(existing)
  }

  const policy = { ...buildAgentPolicy(), _agentId: agentId }
  const now = new Date()
  const [row] = await db
    .insert(messengerConversations)
    .values({ kind: 'agent', userAId: userId, userBId: null, policy, createdAt: now, updatedAt: now })
    .returning()

  return rowToConversationRecord(row)
}

export async function listConversationsForUser(user: MessengerUserRecord, users: MessengerUserRecord[], query: string): Promise<ConversationOverviewItem[]> {
  const db = useMessengerDb()
  const normalizedQuery = query.trim().toLowerCase()
  const agentsEnabled = readMessengerConfig().MESSENGER_ENABLE_AGENTS

  const rows = await db
    .select()
    .from(messengerConversations)
    .where(
      and(
        isNull(messengerConversations.deletedAt),
        sql`(${messengerConversations.userAId} = ${user.id} OR ${messengerConversations.userBId} = ${user.id})`,
      ),
    )

  const items = await Promise.all(
    rows
      .filter(row => agentsEnabled || row.kind !== 'agent')
      .map(async (row) => {
        const conversation = rowToConversationRecord(row)
        const policy = getConversationPolicy(conversation)
        const peer = await resolvePeer(conversation, user.id, users)
        if (!peer) return null

        if (
          normalizedQuery
          && !peer.displayName.toLowerCase().includes(normalizedQuery)
          && !peer.login.toLowerCase().includes(normalizedQuery)
          && !peer.description?.toLowerCase().includes(normalizedQuery)
        ) {
          return null
        }

        const lastRow = await getLastMessageForConversation(conversation.id)
        const lastMsgRecord = lastRow ? rowToMessengerMessageRecord(lastRow) : null

        return {
          id: conversation.id,
          kind: conversation.kind,
          secret: policy.secret,
          peerUserId: peer.id,
          peerDisplayName: peer.displayName,
          peerLogin: peer.login,
          peerType: peer.peerType,
          peerDescription: peer.description,
          updatedAt: lastMsgRecord?.createdAt || conversation.updatedAt,
          policy,
          lastMessage: lastMsgRecord
            ? {
                id: lastMsgRecord.id,
                body: getMessageBodyPreview(lastMsgRecord, conversation),
                encryptedBody: lastMsgRecord.deletedAt ? undefined : lastMsgRecord.encryptedBody,
                createdAt: lastMsgRecord.createdAt,
                own: lastMsgRecord.senderUserId === user.id,
              }
            : null,
        } satisfies ConversationOverviewItem
      }),
  )

  return items
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function listMessagesForConversation(conversationId: string, actor: MessengerUserRecord, users: MessengerUserRecord[]): Promise<ConversationMessageOverviewItem[]> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const rows = await listAllMessagesForConversation(conversationId)
  const records = rows.map(rowToMessengerMessageRecord)
  const recordMap = new Map(records.map(r => [r.id, r]))

  return Promise.all(
    records.map(async (message) => {
      const replyTo = message.replyToMessageId ? recordMap.get(message.replyToMessageId) : undefined
      const commentOn = message.commentOnMessageId ? recordMap.get(message.commentOnMessageId) : undefined

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
        replyTo: replyTo ? {
          id: replyTo.id,
          body: getMessageBodyPreview(replyTo, conversation),
          kind: replyTo.kind,
          own: replyTo.senderUserId === actor.id,
          senderDisplayName: await resolveSenderDisplayName(replyTo.senderUserId, users),
          attachment: replyTo.deletedAt ? undefined : replyTo.attachment,
        } : undefined,
        commentOn: commentOn ? {
          id: commentOn.id,
          body: getMessageBodyPreview(commentOn, conversation),
          kind: commentOn.kind,
          own: commentOn.senderUserId === actor.id,
          senderDisplayName: await resolveSenderDisplayName(commentOn.senderUserId, users),
          attachment: commentOn.deletedAt ? undefined : commentOn.attachment,
        } : undefined,
        forwardedFrom: message.forwardedFrom,
      } satisfies ConversationMessageOverviewItem
    }),
  )
}

export async function markConversationReadByUser(conversationId: string, actor: MessengerUserRecord): Promise<{ updated: boolean; conversation: MessengerConversationRecord }> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const updated = await markConversationMessagesReadByUser(conversationId, actor.id)
  return { updated, conversation }
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
    plaintext?: boolean
  },
): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !options?.encryptedBody && !options?.plaintext) throw new Error('MESSAGE_ENCRYPTION_REQUIRED')

  if (options?.replyToMessageId) {
    const rel = await getMessageRow(options.replyToMessageId, conversationId)
    if (!rel) throw new Error('MESSAGE_NOT_FOUND')
  }
  if (options?.commentOnMessageId) {
    const rel = await getMessageRow(options.commentOnMessageId, conversationId)
    if (!rel) throw new Error('MESSAGE_NOT_FOUND')
  }

  const storedBody = getStoredTextBody(body, conversation)
  const row = await insertMessage({
    conversationId,
    senderUserId: actor.id,
    payload: {
      body: storedBody,
      encryptedBody: options?.encryptedBody,
      kind: 'text',
      replyToMessageId: options?.replyToMessageId,
      commentOnMessageId: options?.commentOnMessageId,
      forwardedFrom: options?.forwardedFrom,
    },
    plaintext: options?.plaintext,
  })
  await updateConversationTimestamp(conversationId)
  return rowToMessengerMessageRecord(row) as MessengerMessageRecord
}

export async function addAgentMessageToConversation(
  conversationId: string,
  agent: MessengerAgentRecord,
  body: string,
  options?: { plaintext?: boolean },
): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (conversation.kind !== 'agent' || conversation.userBId !== agent.id) throw new Error('CONVERSATION_FORBIDDEN')

  const row = await insertMessage({
    conversationId,
    senderUserId: null,
    payload: { body: body.trim(), kind: 'text', agentId: agent.id },
    plaintext: options?.plaintext,
  })
  await updateConversationTimestamp(conversationId)
  return rowToMessengerMessageRecord(row) as MessengerMessageRecord
}

export async function forwardMessageToConversation(
  conversationId: string,
  sourceMessageId: string,
  actor: MessengerUserRecord,
  users: MessengerUserRecord[],
): Promise<MessengerMessageRecord> {
  const targetConversation = await findConversationById(conversationId)
  if (!targetConversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(targetConversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const sourceMsgRow = await findMessageById(sourceMessageId)
  if (!sourceMsgRow) throw new Error('MESSAGE_NOT_FOUND')

  const sourceConversation = await findConversationById(sourceMsgRow.conversationId)
  if (!sourceConversation) throw new Error('CONVERSATION_NOT_FOUND')

  if (
    getConversationPolicy(targetConversation).secret
    || !getConversationPolicy(sourceConversation).allowForwardOut
  ) {
    throw new Error('FORWARD_FORBIDDEN_IN_SECRET_CHAT')
  }

  if (!isParticipant(sourceConversation, actor.id)) throw new Error('MESSAGE_FORBIDDEN')

  const sourceMsg = rowToMessengerMessageRecord(sourceMsgRow) as MessengerMessageRecord
  if (sourceMsg.encryptedBody) throw new Error('MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD')

  const sender = users.find(u => u.id === sourceMsg.senderUserId)
  const row = await insertMessage({
    conversationId,
    senderUserId: actor.id,
    payload: {
      body: sourceMsg.deletedAt ? 'Сообщение удалено' : sourceMsg.body,
      kind: sourceMsg.kind,
      attachment: sourceMsg.deletedAt ? undefined : sourceMsg.attachment,
      forwardedFrom: {
        messageId: sourceMsg.id,
        conversationId: sourceMsgRow.conversationId,
        senderUserId: sourceMsg.senderUserId,
        senderDisplayName: sender?.displayName || 'Unknown',
        body: sourceMsg.deletedAt ? 'Сообщение удалено' : sourceMsg.body,
        encryptedBody: sourceMsg.deletedAt ? undefined : sourceMsg.encryptedBody,
        kind: sourceMsg.kind,
        attachment: sourceMsg.deletedAt ? undefined : sourceMsg.attachment,
      },
    },
  })
  await updateConversationTimestamp(conversationId)
  return rowToMessengerMessageRecord(row) as MessengerMessageRecord
}

export async function addAttachmentMessageToConversation(
  conversationId: string,
  actor: MessengerUserRecord,
  attachment: { name: string; mimeType: string; size: number; url: string; encryptedFile?: MessengerEncryptedBinaryPayload; klipy?: MessengerKlipyAttachmentRecord },
): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !attachment.encryptedFile) throw new Error('MESSAGE_ENCRYPTION_REQUIRED')

  const attachmentLabel = attachment.mimeType.startsWith('audio/')
    ? 'Аудиосообщение'
    : attachment.mimeType.startsWith('image/')
      ? 'Фото'
      : attachment.name

  const row = await insertMessage({
    conversationId,
    senderUserId: actor.id,
    payload: { body: attachmentLabel, kind: 'file', attachment },
  })
  await updateConversationTimestamp(conversationId)
  return rowToMessengerMessageRecord(row) as MessengerMessageRecord
}

export async function editMessageInConversation(
  conversationId: string,
  messageId: string,
  actor: MessengerUserRecord,
  body: string,
  encryptedBody?: MessengerEncryptedPayload,
): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const row = await getMessageRow(messageId, conversationId)
  if (!row) throw new Error('MESSAGE_NOT_FOUND')

  const message = rowToMessengerMessageRecord(row) as MessengerMessageRecord
  if (message.senderUserId !== actor.id) throw new Error('MESSAGE_FORBIDDEN')
  if (message.kind !== 'text' || message.deletedAt) throw new Error('MESSAGE_NOT_EDITABLE')

  const policy = getConversationPolicy(conversation)
  if (policy.secret && !encryptedBody) throw new Error('MESSAGE_ENCRYPTION_REQUIRED')

  const payload = {
    ...message,
    body: getStoredTextBody(body, conversation),
    encryptedBody,
    editedAt: new Date().toISOString(),
  }
  await updateMessagePayload(messageId, payload)
  await updateConversationTimestamp(conversationId)
  return { ...message, body: payload.body, encryptedBody, editedAt: payload.editedAt }
}

export async function deleteMessageFromConversation(conversationId: string, messageId: string, actor: MessengerUserRecord): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const row = await getMessageRow(messageId, conversationId)
  if (!row) throw new Error('MESSAGE_NOT_FOUND')

  const message = rowToMessengerMessageRecord(row) as MessengerMessageRecord
  const policy = getConversationPolicy(conversation)
  if (message.senderUserId !== actor.id && !policy.allowMutualDelete) throw new Error('MESSAGE_FORBIDDEN')
  if (message.deletedAt) return message

  await softDeleteMessage(messageId)
  await updateConversationTimestamp(conversationId)
  return { ...message, body: '', encryptedBody: undefined, attachment: undefined, reactions: undefined, deletedAt: new Date().toISOString(), editedAt: undefined }
}

export async function toggleReactionInConversation(
  conversationId: string,
  messageId: string,
  actor: MessengerUserRecord,
  emoji: string,
): Promise<MessengerMessageRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const row = await getMessageRow(messageId, conversationId)
  if (!row) throw new Error('MESSAGE_NOT_FOUND')

  const message = rowToMessengerMessageRecord(row) as MessengerMessageRecord
  if (message.deletedAt) throw new Error('MESSAGE_NOT_REACTABLE')

  const normalizedEmoji = emoji.trim()
  if (!normalizedEmoji) throw new Error('REACTION_EMOJI_REQUIRED')

  const now = new Date().toISOString()
  const reactions = message.reactions ? [...message.reactions] : []
  const currentReaction = reactions.find(r => r.emoji === normalizedEmoji)

  if (!currentReaction) {
    reactions.push({ emoji: normalizedEmoji, userIds: [actor.id], updatedAt: now })
  } else if (currentReaction.userIds.includes(actor.id)) {
    currentReaction.userIds = currentReaction.userIds.filter(uid => uid !== actor.id)
    currentReaction.updatedAt = now
  } else {
    currentReaction.userIds = [...currentReaction.userIds, actor.id]
    currentReaction.updatedAt = now
  }

  const updatedReactions = reactions.filter(r => r.userIds.length) || undefined
  const payload = { ...message, reactions: updatedReactions?.length ? updatedReactions : undefined }
  await updateMessagePayload(messageId, payload)
  return { ...message, reactions: updatedReactions }
}

export async function deleteConversationForUser(conversationId: string, actor: MessengerUserRecord): Promise<MessengerConversationRecord> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const db = useMessengerDb()
  const conv = await db.select().from(messengerConversations).where(eq(messengerConversations.id, conversationId)).limit(1).then(rows => rows[0])
  if (!conv) throw new Error('CONVERSATION_NOT_FOUND')

  await db.update(messengerConversations)
    .set({ deletedAt: new Date(), version: conv.version + 1 })
    .where(eq(messengerConversations.id, conversationId))

  const msgRows = await listAllMessagesForConversation(conversationId)
  for (const row of msgRows) {
    if (!row.deletedAt) await softDeleteMessage(row.id)
  }

  return conversation
}

export async function getConversationKeyPackageForUser(conversationId: string, actor: MessengerUserRecord): Promise<MessengerConversationKeyPackageRecord | null> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')
  return conversation.encryption?.keyPackages[actor.id] ?? null
}

export async function saveConversationKeyPackages(
  conversationId: string,
  actor: MessengerUserRecord,
  packages: MessengerConversationKeyPackageRecord[],
): Promise<NonNullable<MessengerConversationRecord['encryption']>> {
  const conversation = await findConversationById(conversationId)
  if (!conversation) throw new Error('CONVERSATION_NOT_FOUND')
  if (!isParticipant(conversation, actor.id)) throw new Error('CONVERSATION_FORBIDDEN')

  const db = useMessengerDb()
  const convRow = await db.select().from(messengerConversations).where(eq(messengerConversations.id, conversationId)).limit(1).then(rows => rows[0])
  if (!convRow) throw new Error('CONVERSATION_NOT_FOUND')

  const stored = (convRow.policy ?? {}) as ConvPolicyRow
  const nextPackages = { ...(stored._encryption?.keyPackages ?? {}) }

  for (const item of packages) {
    if (!isParticipant(conversation, item.recipientUserId)) throw new Error('CONVERSATION_FORBIDDEN')
    if (!nextPackages[item.recipientUserId]) {
      nextPackages[item.recipientUserId] = item
    }
  }

  const encryption = { algorithm: 'aes-gcm-256' as const, keyPackages: nextPackages }
  await db.update(messengerConversations)
    .set({ policy: { ...stored, _encryption: encryption }, version: convRow.version + 1 })
    .where(eq(messengerConversations.id, conversationId))

  return encryption
}
