import { eq, and, isNull, lt, or, lte, ne } from 'drizzle-orm'

import { useMessengerDb } from '../db/client.ts'
import { messengerMessages, messengerConversations } from '../db/schema.ts'
import { decodeCursor, encodeCursor } from '../shared/cursor.ts'
import type {
  MessengerEncryptedPayload,
  MessengerEncryptedBinaryPayload,
  MessengerMessageReactionRecord,
  MessengerKlipyAttachmentRecord,
} from './conversation-store.ts'

export interface MessagePayload {
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
  readAt?: string
  editedAt?: string
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
  agentId?: string
}

export interface StoredMessageRow {
  id: string
  conversationId: string
  senderUserId: string | null
  ciphertext: Buffer
  keyId: string | null
  contentType: string
  createdAt: Date
  version: number
  deletedAt: Date | null
}

export function serializePayload(payload: MessagePayload): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf8')
}

export function deserializePayload(ciphertext: Buffer): MessagePayload {
  return JSON.parse(ciphertext.toString('utf8')) as MessagePayload
}

export function rowToMessengerMessageRecord(row: StoredMessageRow) {
  const payload = row.deletedAt
    ? { body: '', kind: 'text' as const }
    : row.contentType === 'text/plain'
      ? { body: row.ciphertext.toString('utf8'), kind: 'text' as const }
      : deserializePayload(row.ciphertext)

  const agentId = !row.deletedAt && (deserializePayload(row.ciphertext) as MessagePayload).agentId
  const effectiveSenderId = (agentId as string | undefined) ?? row.senderUserId ?? ''

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderUserId: effectiveSenderId,
    body: payload.body ?? '',
    encryptedBody: row.deletedAt ? undefined : (payload as MessagePayload).encryptedBody,
    kind: (payload as MessagePayload).kind ?? 'text',
    attachment: row.deletedAt ? undefined : (payload as MessagePayload).attachment,
    reactions: row.deletedAt ? undefined : (payload as MessagePayload).reactions,
    createdAt: row.createdAt.toISOString(),
    readAt: row.deletedAt ? undefined : (payload as MessagePayload).readAt,
    editedAt: row.deletedAt ? undefined : (payload as MessagePayload).editedAt,
    deletedAt: row.deletedAt?.toISOString(),
    replyToMessageId: row.deletedAt ? undefined : (payload as MessagePayload).replyToMessageId,
    commentOnMessageId: row.deletedAt ? undefined : (payload as MessagePayload).commentOnMessageId,
    forwardedFrom: row.deletedAt ? undefined : (payload as MessagePayload).forwardedFrom,
  }
}

export async function getMessageRow(messageId: string, conversationId: string): Promise<StoredMessageRow | null> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerMessages)
    .where(
      and(
        eq(messengerMessages.id, messageId),
        eq(messengerMessages.conversationId, conversationId),
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null) as Promise<StoredMessageRow | null>
}

export async function insertMessage(params: {
  conversationId: string
  senderUserId: string | null
  payload: MessagePayload
  plaintext?: boolean
}): Promise<StoredMessageRow> {
  const db = useMessengerDb()
  const ciphertext = params.plaintext
    ? Buffer.from(params.payload.body, 'utf8')
    : serializePayload(params.payload)
  const [row] = await db
    .insert(messengerMessages)
    .values({
      conversationId: params.conversationId,
      senderUserId: params.senderUserId ?? undefined,
      ciphertext,
      keyId: params.plaintext ? null : (params.payload.encryptedBody ? params.payload.encryptedBody.iv.slice(0, 16) : null),
      contentType: params.plaintext ? 'text/plain' : params.payload.kind,
    })
    .returning()
  return row as StoredMessageRow
}

export async function listMessages(
  conversationId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<{ items: ReturnType<typeof rowToMessengerMessageRecord>[]; nextCursor: string | null }> {
  const db = useMessengerDb()
  const limit = Math.min(opts?.limit ?? 50, 200)
  const cursor = decodeCursor(opts?.cursor)

  const baseConditions = [
    eq(messengerMessages.conversationId, conversationId),
    isNull(messengerMessages.deletedAt),
  ]

  const rows = await db
    .select()
    .from(messengerMessages)
    .where(
      cursor
        ? and(
            ...baseConditions,
            or(
              lt(messengerMessages.createdAt, new Date(cursor.createdAt)),
              and(
                lte(messengerMessages.createdAt, new Date(cursor.createdAt)),
                lt(messengerMessages.id, cursor.id),
              ),
            ),
          )
        : and(...baseConditions),
    )
    .orderBy(messengerMessages.createdAt, messengerMessages.id)
    .limit(limit + 1) as StoredMessageRow[]

  const hasMore = rows.length > limit
  const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToMessengerMessageRecord)

  const lastItem = items[items.length - 1]
  const nextCursor = hasMore && lastItem
    ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
    : null

  return { items, nextCursor }
}

export async function listAllMessagesForConversation(conversationId: string): Promise<StoredMessageRow[]> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerMessages)
    .where(eq(messengerMessages.conversationId, conversationId))
    .orderBy(messengerMessages.createdAt, messengerMessages.id) as Promise<StoredMessageRow[]>
}

export async function getLastMessageForConversation(conversationId: string): Promise<StoredMessageRow | null> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerMessages)
    .where(
      and(
        eq(messengerMessages.conversationId, conversationId),
      ),
    )
    .orderBy(messengerMessages.createdAt, messengerMessages.id)
    .limit(1) as StoredMessageRow[]
  return rows[rows.length - 1] ?? null
}

export async function updateMessagePayload(
  messageId: string,
  payload: MessagePayload,
): Promise<void> {
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerMessages)
    .where(eq(messengerMessages.id, messageId))
    .limit(1)
    .then(rows => rows[0] ?? null) as StoredMessageRow | null

  if (!row) {
    return
  }

  await db
    .update(messengerMessages)
    .set({
      ciphertext: serializePayload(payload),
      version: row.version + 1,
    })
    .where(eq(messengerMessages.id, messageId))
}

export async function softDeleteMessage(messageId: string): Promise<void> {
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerMessages)
    .where(eq(messengerMessages.id, messageId))
    .limit(1)
    .then(rows => rows[0] ?? null) as StoredMessageRow | null

  if (!row) {
    return
  }

  await db
    .update(messengerMessages)
    .set({
      deletedAt: new Date(),
      version: row.version + 1,
    })
    .where(eq(messengerMessages.id, messageId))
}

export async function markConversationMessagesReadByUser(
  conversationId: string,
  actorUserId: string,
): Promise<boolean> {
  const db = useMessengerDb()
  const rows = await db
    .select()
    .from(messengerMessages)
    .where(
      and(
        eq(messengerMessages.conversationId, conversationId),
        isNull(messengerMessages.deletedAt),
      ),
    ) as StoredMessageRow[]

  const now = new Date().toISOString()
  let updated = false

  for (const row of rows) {
    if (row.senderUserId === actorUserId || row.deletedAt) {
      continue
    }

    const payload = deserializePayload(row.ciphertext)
    if (payload.readAt) {
      continue
    }

    payload.readAt = now
    await db
      .update(messengerMessages)
      .set({ ciphertext: serializePayload(payload), version: row.version + 1 })
      .where(eq(messengerMessages.id, row.id))
    updated = true
  }

  return updated
}

export async function findMessageById(messageId: string): Promise<StoredMessageRow | null> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerMessages)
    .where(eq(messengerMessages.id, messageId))
    .limit(1)
    .then(rows => rows[0] ?? null) as Promise<StoredMessageRow | null>
}

export async function updateConversationTimestamp(conversationId: string): Promise<void> {
  const db = useMessengerDb()
  const conv = await db
    .select()
    .from(messengerConversations)
    .where(eq(messengerConversations.id, conversationId))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!conv) {
    return
  }

  await db
    .update(messengerConversations)
    .set({ updatedAt: new Date(), version: conv.version + 1 })
    .where(eq(messengerConversations.id, conversationId))
}
