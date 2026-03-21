import { randomUUID } from 'node:crypto'

import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import { z } from 'zod'

import { authenticateMessengerUser, findMessengerUserById, listMessengerUsers, registerMessengerUser } from './auth-store.ts'
import { createMessengerToken, readBearerToken, verifyMessengerToken } from './auth.ts'
import { addAttachmentMessageToConversation, addMessageToConversation, deleteConversationForUser, deleteMessageFromConversation, editMessageInConversation, findConversationById, findOrCreateDirectConversation, findOrCreateSecretConversation, forwardMessageToConversation, getConversationKeyPackageForUser, listConversationsForUser, listMessagesForConversation, markConversationReadByUser, saveConversationKeyPackages, toggleReactionInConversation } from './conversation-store.ts'
import { buildContactsOverview, createInvite, deleteContactForUser, respondToInvite } from './contact-store.ts'
import { findMessengerDevicePublicKeyByUserId, saveMessengerDevicePublicKey } from './crypto-store.ts'
import { readMessengerConfig } from './config.ts'
import { MESSENGER_UPLOADS_ROOT, storeUploadedMedia } from './media-store.ts'

export async function createMessengerServer() {
  const config = readMessengerConfig()
  const app = Fastify({
    logger: {
      level: config.MESSENGER_CORE_LOG_LEVEL,
    },
  })

  await app.register(cors, {
    origin: config.MESSENGER_CORE_CORS_ORIGIN,
  })
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 20 * 1024 * 1024,
    },
  })
  await app.register(fastifyStatic, {
    root: MESSENGER_UPLOADS_ROOT,
    prefix: '/uploads/',
  })
  await app.register(websocket)

  const clients = new Map<string, { userId: string; socket: { send: (payload: string) => void; close: () => void; readyState: number; on: (event: string, cb: () => void) => void } }>()

  function emitToUsers(userIds: string[], event: Record<string, unknown>) {
    const uniqueUserIds = new Set(userIds)
    const payload = JSON.stringify(event)

    for (const client of clients.values()) {
      if (!uniqueUserIds.has(client.userId)) {
        continue
      }

      if (client.socket.readyState !== 1) {
        continue
      }

      client.socket.send(payload)
    }
  }

  const authSchema = z.object({
    login: z.string().trim().min(3).max(32),
    password: z.string().min(8).max(128),
    displayName: z.string().trim().min(2).max(80).optional(),
  })
  const contactsQuerySchema = z.object({
    query: z.string().trim().max(80).optional(),
  })
  const inviteSchema = z.object({
    targetUserId: z.string().uuid(),
  })
  const inviteParamsSchema = z.object({
    inviteId: z.string().uuid(),
  })
  const conversationsQuerySchema = z.object({
    query: z.string().trim().max(80).optional(),
  })
  const directConversationSchema = z.object({
    peerUserId: z.string().uuid(),
  })
  const userParamsSchema = z.object({
    userId: z.string().uuid(),
  })
  const contactParamsSchema = z.object({
    peerUserId: z.string().uuid(),
  })
  const conversationParamsSchema = z.object({
    conversationId: z.string().uuid(),
  })
  const messageIdSchema = z.string().trim().min(1).max(64)
  const messageParamsSchema = z.object({
    conversationId: z.string().uuid(),
    messageId: messageIdSchema,
  })
  const publicKeySchema = z.object({
    kty: z.literal('EC'),
    crv: z.literal('P-256'),
    x: z.string().min(1).max(512),
    y: z.string().min(1).max(512),
    ext: z.boolean().optional(),
    key_ops: z.array(z.string().min(1).max(24)).max(8).optional(),
  })
  const encryptedPayloadSchema = z.object({
    algorithm: z.literal('aes-gcm-256'),
    ciphertext: z.string().min(1).max(32768),
    iv: z.string().min(1).max(512),
  })
  const encryptedBinaryPayloadSchema = z.object({
    algorithm: z.literal('aes-gcm-256'),
    iv: z.string().min(1).max(512),
  })
  const klipyAttachmentSchema = z.object({
    id: z.string().trim().min(1).max(255),
    slug: z.string().trim().min(1).max(255),
    kind: z.enum(['gif', 'sticker']),
    title: z.string().trim().min(1).max(255),
    previewUrl: z.string().trim().url().max(2048),
    originalUrl: z.string().trim().url().max(2048),
    mimeType: z.string().trim().min(1).max(120),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  const attachmentMetadataSchema = z.object({
    encryptedFile: encryptedBinaryPayloadSchema.optional(),
    originalName: z.string().trim().min(1).max(255).optional(),
    originalMimeType: z.string().trim().min(1).max(120).optional(),
    klipy: klipyAttachmentSchema.optional(),
  })
  const forwardedSnapshotSchema = z.object({
    messageId: messageIdSchema,
    conversationId: z.string().uuid(),
    senderUserId: z.string().uuid(),
    senderDisplayName: z.string().trim().min(1).max(80),
    body: z.string().trim().max(4000).optional().default(''),
    encryptedBody: encryptedPayloadSchema.optional(),
    kind: z.enum(['text', 'file']),
    attachment: z.object({
      name: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(120),
      size: z.number().int().nonnegative(),
      url: z.string().trim().min(1).max(2048),
      encryptedFile: encryptedBinaryPayloadSchema.optional(),
    }).optional(),
  })
  const messageSchema = z.object({
    body: z.string().trim().max(4000).optional(),
    encryptedBody: encryptedPayloadSchema.optional(),
    replyToMessageId: messageIdSchema.optional(),
    commentOnMessageId: messageIdSchema.optional(),
    forwardedMessageId: messageIdSchema.optional(),
    forwardedFrom: forwardedSnapshotSchema.optional(),
  }).superRefine((value, ctx) => {
    const hasBody = Boolean(value.body?.trim())
    const hasForward = Boolean(value.forwardedMessageId)
    const hasEncryptedBody = Boolean(value.encryptedBody)
    const hasForwardSnapshot = Boolean(value.forwardedFrom)

    if (!hasBody && !hasForward && !hasEncryptedBody && !hasForwardSnapshot) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MESSAGE_BODY_OR_FORWARD_REQUIRED',
      })
    }
  })
  const editMessageSchema = z.object({
    body: z.string().trim().max(4000).optional(),
    encryptedBody: encryptedPayloadSchema.optional(),
  }).superRefine((value, ctx) => {
    const hasBody = Boolean(value.body?.trim())
    const hasEncryptedBody = Boolean(value.encryptedBody)

    if (!hasBody && !hasEncryptedBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MESSAGE_BODY_REQUIRED',
      })
    }
  })
  const conversationEncryptionSchema = z.object({
    packages: z.array(z.object({
      recipientUserId: z.string().uuid(),
      wrappedKey: z.string().min(1).max(8192),
      iv: z.string().min(1).max(512),
      senderPublicKey: publicKeySchema,
    })).min(1).max(4),
  })
  const callSignalSchema = z.object({
    kind: z.enum(['invite', 'ringing', 'offer', 'answer', 'ice-candidate', 'reject', 'hangup', 'busy']),
    callId: z.string().min(1).max(120),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  const messageReactionSchema = z.object({
    emoji: z.string().trim().min(1).max(16),
  })
  const klipyKindSchema = z.enum(['gif', 'sticker'])
  const klipySearchSchema = z.object({
    query: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    kind: klipyKindSchema.default('gif'),
    page: z.coerce.number().int().min(1).max(50).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
  })
  const klipyCategoriesSchema = z.object({
    kind: klipyKindSchema.default('gif'),
  })
  const klipyMediaSchema = z.object({
    url: z.string().trim().url().max(2048),
  })

  function buildKlipyContentUrl(
    kind: z.infer<typeof klipyKindSchema>,
    action: 'search' | 'trending' | 'categories',
    customerId?: string,
    payload?: Pick<z.infer<typeof klipySearchSchema>, 'query' | 'category' | 'limit' | 'page'>,
  ) {
    const resource = kind === 'sticker' ? 'stickers' : 'gifs'
    const appKey = encodeURIComponent(config.KLIPY_APP_KEY || '')
    const url = new URL(`/api/v1/${appKey}/${resource}/${action}`, config.KLIPY_API_BASE_URL)

    if (action === 'categories') {
      url.searchParams.set('locale', 'ru_RU')
      return url
    }

    const queryText = payload?.query?.trim() || payload?.category?.trim() || ''
    const perPage = queryText ? Math.max(payload?.limit || 12, 8) : payload?.limit || 12
    url.searchParams.set('page', String(payload?.page || 1))
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('customer_id', customerId || 'anonymous')
    url.searchParams.set('locale', 'ru')
    url.searchParams.set('format_filter', kind === 'sticker' ? 'gif,webp,png,webm' : 'gif,webp,jpg,mp4,webm')

    if (queryText) {
      url.searchParams.set('q', queryText)
      url.searchParams.set('content_filter', 'high')
    }

    return url
  }

  function inferMimeTypeFromUrl(url: string) {
    if (/\.webp(\?|$)/i.test(url)) {
      return 'image/webp'
    }

    if (/\.png(\?|$)/i.test(url)) {
      return 'image/png'
    }

    if (/\.mp4(\?|$)/i.test(url)) {
      return 'video/mp4'
    }

    if (/\.webm(\?|$)/i.test(url)) {
      return 'video/webm'
    }

    if (/\.jpe?g(\?|$)/i.test(url)) {
      return 'image/jpeg'
    }

    return 'image/gif'
  }

  function pickKlipyAsset(file: any, candidates: string[]) {
    for (const candidate of candidates) {
      const [size, format] = candidate.split('.')
      const asset = file?.[size]?.[format]
      if (asset?.url) {
        return asset
      }
    }

    return null
  }

  function mapKlipyItem(item: any, kind: 'gif' | 'sticker') {
    if (!item || item.type === 'ad') {
      return null
    }

    const file = item?.file || {}
    const preview = pickKlipyAsset(file, kind === 'sticker'
      ? ['sm.webp', 'sm.gif', 'sm.png', 'md.webp', 'md.gif', 'md.png', 'xs.webp', 'xs.gif', 'xs.png']
      : ['sm.webp', 'sm.gif', 'sm.jpg', 'md.webp', 'md.gif', 'md.jpg', 'xs.webp', 'xs.gif', 'xs.jpg'])
    const original = pickKlipyAsset(file, kind === 'sticker'
      ? ['md.webp', 'md.gif', 'md.png', 'hd.webp', 'hd.gif', 'hd.png']
      : ['md.gif', 'md.webp', 'md.mp4', 'hd.gif', 'hd.webp', 'hd.mp4', 'sm.gif'])

    if (!preview?.url || !original?.url) {
      return null
    }

    return {
      id: String(item?.id || randomUUID()),
      slug: String(item?.slug || item?.id || randomUUID()),
      kind,
      title: String(item?.title || item?.slug || 'KLIPY media'),
      previewUrl: String(preview.url),
      originalUrl: String(original.url),
      mimeType: inferMimeTypeFromUrl(String(original.url)),
      width: Number(original.width || preview.width || 0) || undefined,
      height: Number(original.height || preview.height || 0) || undefined,
    }
  }

  function mapKlipyCategory(item: any) {
    const category = typeof item?.category === 'string' ? item.category.trim() : ''
    const query = typeof item?.query === 'string' ? item.query.trim() : category
    const previewUrl = typeof item?.preview_url === 'string' ? item.preview_url : ''

    if (!category || !query || !previewUrl) {
      return null
    }

    return {
      category,
      query,
      previewUrl,
    }
  }

  function isAllowedKlipyMediaUrl(value: string) {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && url.hostname === 'static.klipy.com'
    } catch {
      return false
    }
  }

  async function resolveSession(request: FastifyRequest) {
    const token = readBearerToken(request.headers.authorization)
    if (!token) {
      return null
    }

    const payload = verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET)
    if (!payload) {
      return null
    }

    const user = await findMessengerUserById(payload.sub)
    if (!user) {
      return null
    }

    return {
      user,
      payload,
    }
  }

  app.get('/health', async () => ({
    ok: true,
    service: 'messenger-core',
    transport: 'websocket',
    timestamp: new Date().toISOString(),
  }))

  app.get('/integrations/klipy/search', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipySearchSchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    if (!config.KLIPY_APP_KEY) {
      return {
        configured: false,
        items: [],
      }
    }

    const response = await fetch(buildKlipyContentUrl(
      parsedQuery.data.kind,
      parsedQuery.data.query || parsedQuery.data.category ? 'search' : 'trending',
      session.user.id,
      parsedQuery.data,
    ))
    if (!response.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const payload = await response.json() as { data?: { data?: any[] } }
    const items = Array.isArray(payload.data?.data)
      ? payload.data.data
        .map(item => mapKlipyItem(item, parsedQuery.data.kind))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

    return {
      configured: true,
      items,
    }
  })

  app.get('/integrations/klipy/categories', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipyCategoriesSchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    if (!config.KLIPY_APP_KEY) {
      return {
        configured: false,
        categories: [],
      }
    }

    const response = await fetch(buildKlipyContentUrl(parsedQuery.data.kind, 'categories', session.user.id))
    if (!response.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const payload = await response.json() as { data?: { categories?: any[] } }
    const categories = Array.isArray(payload.data?.categories)
      ? payload.data.categories
        .map(mapKlipyCategory)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

    return {
      configured: true,
      categories,
    }
  })

  app.get('/integrations/klipy/media', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = klipyMediaSchema.safeParse(request.query)
    if (!parsedQuery.success || !isAllowedKlipyMediaUrl(parsedQuery.data.url)) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const upstreamResponse = await fetch(parsedQuery.data.url)
    if (!upstreamResponse.ok) {
      return reply.code(502).send({ error: 'KLIPY_UPSTREAM_FAILED' })
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer()
    const mimeType = upstreamResponse.headers.get('content-type') || inferMimeTypeFromUrl(parsedQuery.data.url)
    const fileName = parsedQuery.data.url.split('/').pop()?.split('?')[0] || `klipy-${randomUUID()}`

    reply.header('Content-Type', mimeType)
    reply.header('Content-Length', String(arrayBuffer.byteLength))
    reply.header('Cache-Control', 'private, max-age=3600')
    reply.header('Content-Disposition', `inline; filename="${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-') || `klipy-${randomUUID()}`}"`)

    return reply.send(Buffer.from(arrayBuffer))
  })

  app.post('/auth/register', async (request, reply) => {
    const parsed = authSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const user = await registerMessengerUser({
        login: parsed.data.login,
        password: parsed.data.password,
        displayName: parsed.data.displayName || parsed.data.login,
      })
      const token = createMessengerToken(user, config.MESSENGER_CORE_AUTH_SECRET)

      return {
        token,
        user: {
          id: user.id,
          login: user.login,
          displayName: user.displayName,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_EXISTS') {
        return reply.code(409).send({ error: 'USER_EXISTS' })
      }

      throw error
    }
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = authSchema.pick({ login: true, password: true }).safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const user = await authenticateMessengerUser(parsed.data.login, parsed.data.password)
    if (!user) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' })
    }

    const token = createMessengerToken(user, config.MESSENGER_CORE_AUTH_SECRET)

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
      },
    }
  })

  app.get('/auth/me', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    return {
      user: {
        id: session.user.id,
        login: session.user.login,
        displayName: session.user.displayName,
      },
    }
  })

  app.put('/crypto/device-key', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = z.object({ publicKey: publicKeySchema }).safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const publicKey = await saveMessengerDevicePublicKey(session.user.id, parsedBody.data.publicKey)
    return { publicKey }
  })

  app.get('/users/:userId/device-key', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = userParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const targetUser = await findMessengerUserById(parsedParams.data.userId)
    if (!targetUser) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    return {
      publicKey: await findMessengerDevicePublicKeyByUserId(parsedParams.data.userId),
    }
  })

  app.get('/contacts/overview', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = contactsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const users = await listMessengerUsers()
    return await buildContactsOverview(session.user, users, parsedQuery.data.query || '')
  })

  app.post('/contacts/invites', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = inviteSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const targetUser = await findMessengerUserById(parsedBody.data.targetUserId)
    if (!targetUser) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    try {
      const invite = await createInvite(session.user.id, parsedBody.data.targetUserId)
      emitToUsers([session.user.id, parsedBody.data.targetUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return {
        invite,
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SELF_INVITE') {
          return reply.code(400).send({ error: 'SELF_INVITE' })
        }

        if (error.message === 'ALREADY_CONTACTS') {
          return reply.code(409).send({ error: 'ALREADY_CONTACTS' })
        }

        if (error.message === 'INVITE_EXISTS') {
          return reply.code(409).send({ error: 'INVITE_EXISTS' })
        }
      }

      throw error
    }
  })

  app.post('/contacts/invites/:inviteId/accept', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = inviteParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const invite = await respondToInvite(parsedParams.data.inviteId, session.user.id, 'accepted')
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'conversations.updated',
        timestamp: new Date().toISOString(),
      })
      return { invite }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVITE_NOT_FOUND') {
          return reply.code(404).send({ error: 'INVITE_NOT_FOUND' })
        }

        if (error.message === 'INVITE_FORBIDDEN') {
          return reply.code(403).send({ error: 'INVITE_FORBIDDEN' })
        }

        if (error.message === 'INVITE_ALREADY_RESOLVED') {
          return reply.code(409).send({ error: 'INVITE_ALREADY_RESOLVED' })
        }
      }

      throw error
    }
  })

  app.post('/contacts/invites/:inviteId/reject', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = inviteParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const invite = await respondToInvite(parsedParams.data.inviteId, session.user.id, 'rejected')
      emitToUsers([invite.fromUserId, invite.toUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return { invite }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVITE_NOT_FOUND') {
          return reply.code(404).send({ error: 'INVITE_NOT_FOUND' })
        }

        if (error.message === 'INVITE_FORBIDDEN') {
          return reply.code(403).send({ error: 'INVITE_FORBIDDEN' })
        }

        if (error.message === 'INVITE_ALREADY_RESOLVED') {
          return reply.code(409).send({ error: 'INVITE_ALREADY_RESOLVED' })
        }
      }

      throw error
    }
  })

  app.delete('/contacts/:peerUserId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = contactParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const result = await deleteContactForUser(session.user.id, parsedParams.data.peerUserId)
      emitToUsers([session.user.id, parsedParams.data.peerUserId], {
        type: 'contacts.updated',
        timestamp: new Date().toISOString(),
      })
      return result
    } catch (error) {
      if (error instanceof Error && error.message === 'CONTACT_NOT_FOUND') {
        return reply.code(404).send({ error: 'CONTACT_NOT_FOUND' })
      }

      throw error
    }
  })

  app.get('/conversations', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedQuery = conversationsQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY' })
    }

    const users = await listMessengerUsers()
    return {
      conversations: await listConversationsForUser(session.user, users, parsedQuery.data.query || ''),
    }
  })

  app.post('/conversations/direct', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = directConversationSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const peer = await findMessengerUserById(parsedBody.data.peerUserId)
    if (!peer) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    const overview = await buildContactsOverview(session.user, await listMessengerUsers(), '')
    const isContact = overview.contacts.some(item => item.id === peer.id)
    if (!isContact) {
      return reply.code(403).send({ error: 'DIRECT_CHAT_REQUIRES_CONTACT' })
    }

    const conversation = await findOrCreateDirectConversation(session.user.id, peer.id)
    emitToUsers([conversation.userAId, conversation.userBId], {
      type: 'conversations.updated',
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    })
    return { conversation }
  })

  app.post('/conversations/secret', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedBody = directConversationSchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const peer = await findMessengerUserById(parsedBody.data.peerUserId)
    if (!peer) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' })
    }

    const overview = await buildContactsOverview(session.user, await listMessengerUsers(), '')
    const isContact = overview.contacts.some(item => item.id === peer.id)
    if (!isContact) {
      return reply.code(403).send({ error: 'DIRECT_CHAT_REQUIRES_CONTACT' })
    }

    const conversation = await findOrCreateSecretConversation(session.user.id, peer.id)
    emitToUsers([conversation.userAId, conversation.userBId], {
      type: 'conversations.updated',
      conversationId: conversation.id,
      timestamp: new Date().toISOString(),
    })
    return { conversation }
  })

  app.delete('/conversations/:conversationId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const conversation = await deleteConversationForUser(parsedParams.data.conversationId, session.user)
      emitToUsers([conversation.userAId, conversation.userBId], {
        type: 'conversations.updated',
        timestamp: new Date().toISOString(),
      })
      emitToUsers([conversation.userAId, conversation.userBId], {
        type: 'messages.updated',
        conversationId: conversation.id,
        timestamp: new Date().toISOString(),
      })
      return { conversation }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'SECRET_CHAT_ATTACHMENTS_DISABLED') {
          return reply.code(409).send({ error: 'SECRET_CHAT_ATTACHMENTS_DISABLED' })
        }
      }

      throw error
    }
  })

  app.get('/conversations/:conversationId/encryption', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      return {
        keyPackage: await getConversationKeyPackageForUser(parsedParams.data.conversationId, session.user),
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/encryption', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = conversationEncryptionSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const encryption = await saveConversationKeyPackages(
        parsedParams.data.conversationId,
        session.user,
        parsedBody.data.packages.map(item => ({
          ...item,
          createdAt: new Date().toISOString(),
        })),
      )

      return { encryption }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.get('/conversations/:conversationId/messages', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const users = await listMessengerUsers()
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (!conversation) {
        return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
      }

      const readResult = await markConversationReadByUser(parsedParams.data.conversationId, session.user)
      if (readResult.updated) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return {
        conversation,
        messages: await listMessagesForConversation(parsedParams.data.conversationId, session.user, users),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'CONVERSATION_FORBIDDEN') {
        return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/messages', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = messageSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const users = await listMessengerUsers()
      const message = parsedBody.data.forwardedMessageId
        ? await forwardMessageToConversation(parsedParams.data.conversationId, parsedBody.data.forwardedMessageId, session.user, users)
        : await addMessageToConversation(parsedParams.data.conversationId, session.user, parsedBody.data.body || '', {
          encryptedBody: parsedBody.data.encryptedBody,
          replyToMessageId: parsedBody.data.replyToMessageId,
          commentOnMessageId: parsedBody.data.commentOnMessageId,
          forwardedFrom: parsedBody.data.forwardedFrom,
        })
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: error.message })
        }

        if (error.message === 'FORWARD_FORBIDDEN_IN_SECRET_CHAT') {
          return reply.code(403).send({ error: 'FORWARD_FORBIDDEN_IN_SECRET_CHAT' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTED_FORWARD_REQUIRES_CLIENT_PAYLOAD' })
        }
      }

      throw error
    }
  })

  app.patch('/conversations/:conversationId/messages/:messageId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    const parsedBody = editMessageSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const message = await editMessageInConversation(
        parsedParams.data.conversationId,
        parsedParams.data.messageId,
        session.user,
        parsedBody.data.body || '',
        parsedBody.data.encryptedBody,
      )
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_ENCRYPTION_REQUIRED') {
          return reply.code(409).send({ error: 'MESSAGE_ENCRYPTION_REQUIRED' })
        }

        if (error.message === 'MESSAGE_NOT_EDITABLE') {
          return reply.code(409).send({ error: 'MESSAGE_NOT_EDITABLE' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/messages/:messageId/reactions', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    const parsedBody = messageReactionSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    try {
      const message = await toggleReactionInConversation(
        parsedParams.data.conversationId,
        parsedParams.data.messageId,
        session.user,
        parsedBody.data.emoji,
      )
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }

        if (error.message === 'MESSAGE_NOT_REACTABLE' || error.message === 'REACTION_EMOJI_REQUIRED') {
          return reply.code(409).send({ error: error.message })
        }
      }

      throw error
    }
  })

  app.delete('/conversations/:conversationId/messages/:messageId', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = messageParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    try {
      const message = await deleteMessageFromConversation(parsedParams.data.conversationId, parsedParams.data.messageId, session.user)
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }
      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND' || error.message === 'MESSAGE_NOT_FOUND') {
          return reply.code(404).send({ error: error.message })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN' || error.message === 'MESSAGE_FORBIDDEN') {
          return reply.code(403).send({ error: 'MESSAGE_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/attachments', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS' })
    }

    const file = await request.file()
    if (!file) {
      return reply.code(400).send({ error: 'FILE_REQUIRED' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of file.file) {
      chunks.push(chunk)
    }

    const metadataField = Array.isArray(file.fields.metadata) ? file.fields.metadata[0] : file.fields.metadata
    const metadataValue = metadataField && 'value' in metadataField && typeof metadataField.value === 'string'
      ? metadataField.value
      : undefined

    let encryptedFile: z.infer<typeof encryptedBinaryPayloadSchema> | undefined
    let originalName: string | undefined
    let originalMimeType: string | undefined
    let klipy: z.infer<typeof klipyAttachmentSchema> | undefined
    if (metadataValue) {
      try {
        const parsedMetadata = attachmentMetadataSchema.safeParse(JSON.parse(metadataValue))
        if (!parsedMetadata.success) {
          return reply.code(400).send({ error: 'INVALID_ATTACHMENT_METADATA' })
        }

        encryptedFile = parsedMetadata.data.encryptedFile
        originalName = parsedMetadata.data.originalName
        originalMimeType = parsedMetadata.data.originalMimeType
        klipy = parsedMetadata.data.klipy
      } catch {
        return reply.code(400).send({ error: 'INVALID_ATTACHMENT_METADATA' })
      }
    }

    try {
      const stored = await storeUploadedMedia({
        filename: originalName || file.filename,
        mimeType: originalMimeType || file.mimetype,
        buffer: Buffer.concat(chunks),
      })

      const message = await addAttachmentMessageToConversation(parsedParams.data.conversationId, session.user, {
        ...stored,
        encryptedFile,
        klipy,
      })
      const conversation = await findConversationById(parsedParams.data.conversationId)
      if (conversation) {
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'conversations.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
        emitToUsers([conversation.userAId, conversation.userBId], {
          type: 'messages.updated',
          conversationId: conversation.id,
          timestamp: new Date().toISOString(),
        })
      }

      return { message }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CONVERSATION_NOT_FOUND') {
          return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
        }

        if (error.message === 'CONVERSATION_FORBIDDEN') {
          return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
        }
      }

      throw error
    }
  })

  app.post('/conversations/:conversationId/call-signal', async (request, reply) => {
    const session = await resolveSession(request)
    if (!session) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }

    const parsedParams = conversationParamsSchema.safeParse(request.params)
    const parsedBody = callSignalSchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
    }

    const conversation = await findConversationById(parsedParams.data.conversationId)
    if (!conversation) {
      return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' })
    }

    if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
      return reply.code(403).send({ error: 'CONVERSATION_FORBIDDEN' })
    }

    const targetUserId = conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId

    emitToUsers([targetUserId], {
      type: 'call.signal',
      timestamp: new Date().toISOString(),
      conversationId: conversation.id,
      signal: {
        kind: parsedBody.data.kind,
        callId: parsedBody.data.callId,
        payload: parsedBody.data.payload || {},
      },
      sender: {
        userId: session.user.id,
        displayName: session.user.displayName,
        login: session.user.login,
      },
    })

    return { ok: true }
  })

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const requestUrl = new URL(request.url || '/ws', `http://${request.headers.host || 'localhost'}`)
    const token = requestUrl.searchParams.get('token')
    const payload = token ? verifyMessengerToken(token, config.MESSENGER_CORE_AUTH_SECRET) : null
    const user = payload ? await findMessengerUserById(payload.sub) : null

    if (!payload || !user) {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'UNAUTHORIZED',
      }))
      socket.close()
      return
    }

    const clientId = randomUUID()
    clients.set(clientId, {
      userId: user.id,
      socket,
    })

    socket.send(JSON.stringify({
      type: 'hello',
      message: 'messenger-core realtime channel is ready',
      userId: user.id,
      timestamp: new Date().toISOString(),
    }))

    socket.on('message', (value: Buffer) => {
      socket.send(JSON.stringify({
        type: 'echo',
        payload: value.toString(),
      }))
    })

    socket.on('close', () => {
      clients.delete(clientId)
    })
  })

  return app
}