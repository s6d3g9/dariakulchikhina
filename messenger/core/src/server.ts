import { randomUUID } from 'node:crypto'

import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import websocket from '@fastify/websocket'
import { z } from 'zod'

import { authenticateMessengerUser, findMessengerUserById, listMessengerUsers, registerMessengerUser } from './auth-store.ts'
import { createMessengerToken, readBearerToken, verifyMessengerToken } from './auth.ts'
import { addAttachmentMessageToConversation, addMessageToConversation, findConversationById, findOrCreateDirectConversation, listConversationsForUser, listMessagesForConversation } from './conversation-store.ts'
import { buildContactsOverview, createInvite, respondToInvite } from './contact-store.ts'
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
  const conversationParamsSchema = z.object({
    conversationId: z.string().uuid(),
  })
  const messageSchema = z.object({
    body: z.string().trim().min(1).max(4000),
  })
  const callSignalSchema = z.object({
    kind: z.enum(['invite', 'ringing', 'offer', 'answer', 'ice-candidate', 'reject', 'hangup', 'busy']),
    callId: z.string().min(1).max(120),
    payload: z.record(z.string(), z.unknown()).optional(),
  })

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
      const message = await addMessageToConversation(parsedParams.data.conversationId, session.user, parsedBody.data.body)
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

    try {
      const stored = await storeUploadedMedia({
        filename: file.filename,
        mimeType: file.mimetype,
        buffer: Buffer.concat(chunks),
      })

      const message = await addAttachmentMessageToConversation(parsedParams.data.conversationId, session.user, stored)
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