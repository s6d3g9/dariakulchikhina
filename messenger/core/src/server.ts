import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { z } from 'zod'

import { authenticateMessengerUser, findMessengerUserById, listMessengerUsers, registerMessengerUser } from './auth-store.ts'
import { createMessengerToken, readBearerToken, verifyMessengerToken } from './auth.ts'
import { buildContactsOverview, createInvite, respondToInvite } from './contact-store.ts'
import { readMessengerConfig } from './config.ts'

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
  await app.register(websocket)

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

  app.get('/ws', { websocket: true }, (socket) => {
    socket.send(JSON.stringify({
      type: 'hello',
      message: 'messenger-core websocket shell is ready',
      timestamp: new Date().toISOString(),
    }))

    socket.on('message', (value: Buffer) => {
      socket.send(JSON.stringify({
        type: 'echo',
        payload: value.toString(),
      }))
    })
  })

  return app
}