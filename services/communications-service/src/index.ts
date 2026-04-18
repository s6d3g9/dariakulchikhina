import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'

import { actorKey, hasAdminScope, readAccessToken, signToken, verifyToken } from './auth/auth.ts'
import { readConfig } from './config.ts'
import { createCommunicationStore } from './store/pg-store.ts'
import type {
  AuthenticatedActor,
  EncryptedMessageEnvelope,
  PublishedKeyBundle,
  RoomParticipant,
  ServiceActorRole,
  ServiceTokenPayload,
  SignalEnvelope,
  SignalKind,
} from './types.ts'

type JsonRecord = Record<string, unknown>

interface SseSubscriber {
  id: string
  roomId: string
  actorKey: string
  response: ServerResponse
}

const config = readConfig()
const store = await createCommunicationStore(config)
const subscribers = new Map<string, SseSubscriber>()

function setCorsHeaders(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', config.corsOrigin)
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-csrf-token')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
}

function writeJson(response: ServerResponse, statusCode: number, payload: JsonRecord) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  setCorsHeaders(response)
  response.end(JSON.stringify(payload))
}

function writeError(response: ServerResponse, statusCode: number, message: string) {
  writeJson(response, statusCode, { error: message })
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (!chunks.length) {
    return {}
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(raw) as JsonRecord
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`)
  }

  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeNickname(value: unknown, options: { allowEmpty?: boolean } = {}) {
  if (typeof value !== 'string') {
    if (options.allowEmpty) {
      return undefined
    }
    throw new Error('nickname must be a string')
  }

  const normalized = value.trim().replace(/^@+/, '').toLowerCase()
  if (!normalized) {
    if (options.allowEmpty) {
      return undefined
    }
    throw new Error('nickname is required')
  }

  if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(normalized)) {
    throw new Error('nickname must contain 3-32 letters, numbers, dots, underscores or dashes')
  }

  return normalized
}

function normalizeParticipants(value: unknown): Array<Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>> {
  if (!Array.isArray(value)) {
    return []
  }

  const participants: Array<Pick<RoomParticipant, 'actorId' | 'role' | 'displayName' | 'nickname'>> = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const participant = item as Record<string, unknown>
    const actorId = typeof participant.actorId === 'string' ? participant.actorId.trim() : ''
    const role = typeof participant.role === 'string' ? participant.role.trim() : ''
    if (!actorId || !role) {
      continue
    }

    participants.push({
      actorId,
      role: role as ServiceActorRole,
      displayName: typeof participant.displayName === 'string' ? participant.displayName.trim() : undefined,
      nickname: typeof participant.nickname === 'string' ? normalizeNickname(participant.nickname, { allowEmpty: true }) : undefined,
    })
  }

  return participants
}

function normalizeEncryptedMessage(value: unknown): EncryptedMessageEnvelope {
  if (!isRecord(value)) {
    throw new Error('encrypted payload is required')
  }

  const version = requireString(value.version, 'encrypted.version')
  const algorithm = requireString(value.algorithm, 'encrypted.algorithm')
  const ciphertext = requireString(value.ciphertext, 'encrypted.ciphertext')
  const iv = requireString(value.iv, 'encrypted.iv')
  const senderKeyId = requireString(value.senderKeyId, 'encrypted.senderKeyId')
  const mimeType = typeof value.mimeType === 'string' && value.mimeType.trim() ? value.mimeType.trim() : undefined

  if (version !== 'e2ee-v1') {
    throw new Error('Unsupported encrypted.version')
  }

  if (algorithm !== 'AES-GCM-256') {
    throw new Error('Unsupported encrypted.algorithm')
  }

  return {
    version: 'e2ee-v1',
    algorithm: 'AES-GCM-256',
    ciphertext,
    iv,
    senderKeyId,
    mimeType,
  }
}

function normalizeKeyBundle(value: unknown, actor: AuthenticatedActor, roomId: string): Omit<PublishedKeyBundle, 'id' | 'createdAt'> {
  if (!isRecord(value)) {
    throw new Error('key bundle payload is required')
  }

  const keyId = requireString(value.keyId, 'keyId')
  const algorithm = requireString(value.algorithm, 'algorithm')
  if (algorithm !== 'ECDH-P256') {
    throw new Error('Unsupported key bundle algorithm')
  }

  const publicKeyJwk = value.publicKeyJwk
  if (!isRecord(publicKeyJwk)) {
    throw new Error('publicKeyJwk must be an object')
  }

  return {
    roomId,
    actorId: actor.actorId,
    actorRole: actor.role,
    actorDisplayName: actor.displayName,
    keyId,
    algorithm: 'ECDH-P256',
    publicKeyJwk: publicKeyJwk as JsonWebKey,
    deviceId: typeof value.deviceId === 'string' && value.deviceId.trim() ? value.deviceId.trim() : undefined,
  }
}

function authenticate(request: IncomingMessage, url: URL) {
  const token = readAccessToken(request, url)
  if (!token) {
    return null
  }

  return verifyToken(token, config.authSecret)
}

async function canAccessRoom(actor: AuthenticatedActor, roomId: string) {
  const room = await store.getRoomById(roomId)
  if (!room) {
    return false
  }

  if (hasAdminScope(actor)) {
    return true
  }

  if (actor.roomRefs.includes(room.externalRef)) {
    return true
  }

  return await store.hasParticipant(roomId, actor)
}

async function requireRoomAccess(response: ServerResponse, actor: AuthenticatedActor, roomId: string) {
  const room = await store.getRoomById(roomId)
  if (!room) {
    writeError(response, 404, 'Room not found')
    return null
  }

  if (!(await canAccessRoom(actor, roomId))) {
    writeError(response, 403, 'Room access denied')
    return null
  }

  return room
}

function pushSse(response: ServerResponse, eventName: string, payload: JsonRecord) {
  response.write(`event: ${eventName}\n`)
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function broadcastRoomEvent(roomId: string, eventName: string, payload: JsonRecord, options: { targetActorKey?: string | null; excludeActorKey?: string | null } = {}) {
  let delivered = 0
  for (const subscriber of subscribers.values()) {
    if (subscriber.roomId !== roomId) {
      continue
    }

    if (options.targetActorKey && subscriber.actorKey !== options.targetActorKey) {
      continue
    }

    if (options.excludeActorKey && subscriber.actorKey === options.excludeActorKey) {
      continue
    }

    pushSse(subscriber.response, eventName, payload)
    delivered += 1
  }

  return delivered
}

function startSse(response: ServerResponse) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': config.corsOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-csrf-token',
  })
}

const server = createServer(async (request, response) => {
  setCorsHeaders(response)

  if (!request.url) {
    writeError(response, 400, 'Invalid request URL')
    return
  }

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  const { pathname } = url

  if (request.method === 'GET' && pathname === '/health') {
    writeJson(response, 200, {
      status: 'ok',
      service: 'communications-service',
      storage: store.driver,
      time: new Date().toISOString(),
      subscribers: subscribers.size,
    })
    return
  }

  if (request.method === 'POST' && pathname === '/v1/dev/token') {
    if (!config.allowDevTokenIssue) {
      writeError(response, 403, 'Dev token issue is disabled')
      return
    }

    try {
      const body = await readJsonBody(request)
      const ttlSeconds = typeof body.ttlSeconds === 'number' && body.ttlSeconds > 0 ? body.ttlSeconds : 3600
      const payload: ServiceTokenPayload = {
        actorId: requireString(body.actorId, 'actorId'),
        role: requireString(body.role, 'role') as ServiceActorRole,
        displayName: typeof body.displayName === 'string' ? body.displayName.trim() : undefined,
        scopes: Array.isArray(body.scopes) ? body.scopes.filter((item): item is string => typeof item === 'string') : [],
        roomRefs: Array.isArray(body.roomRefs) ? body.roomRefs.filter((item): item is string => typeof item === 'string') : [],
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      }
      writeJson(response, 200, {
        token: signToken(payload, config.authSecret),
        payload,
      })
    } catch (error) {
      writeError(response, 400, error instanceof Error ? error.message : 'Invalid token request')
    }
    return
  }

  const actor = authenticate(request, url)
  if (!actor) {
    writeError(response, 401, 'Unauthorized')
    return
  }

  if (request.method === 'POST' && pathname === '/v1/rooms') {
    try {
      const body = await readJsonBody(request)
      const room = await store.createOrGetRoom({
        externalRef: requireString(body.externalRef, 'externalRef'),
        title: typeof body.title === 'string' ? body.title : undefined,
        kind: typeof body.kind === 'string' ? body.kind as 'project' | 'group' | 'direct' : undefined,
        participants: normalizeParticipants(body.participants),
        metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? body.metadata as Record<string, unknown>
          : undefined,
      }, actor)

      writeJson(response, 201, { room })
    } catch (error) {
      writeError(response, 400, error instanceof Error ? error.message : 'Unable to create room')
    }
    return
  }

  if (request.method === 'GET' && pathname === '/v1/rooms') {
    const kind = url.searchParams.get('kind')?.trim() || undefined
    const externalRefPrefix = url.searchParams.get('externalRefPrefix')?.trim() || undefined
    const rooms = await store.listRooms({
      kind: kind as ServiceActorRole extends never ? never : 'project' | 'group' | 'direct' | undefined,
      externalRefPrefix,
    })

    const visibleRooms = []
    for (const room of rooms) {
      if (hasAdminScope(actor) || actor.roomRefs.includes(room.externalRef) || await store.hasParticipant(room.id, actor)) {
        visibleRooms.push(room)
      }
    }

    writeJson(response, 200, { rooms: visibleRooms })
    return
  }

  if (request.method === 'GET' && pathname === '/v1/rooms/by-external') {
    const externalRef = url.searchParams.get('externalRef')?.trim()
    if (!externalRef) {
      writeError(response, 400, 'externalRef is required')
      return
    }

    const room = await store.getRoomByExternalRef(externalRef)
    if (!room) {
      writeError(response, 404, 'Room not found')
      return
    }

    if (!(await canAccessRoom(actor, room.id)) && !actor.roomRefs.includes(room.externalRef)) {
      writeError(response, 403, 'Room access denied')
      return
    }

    writeJson(response, 200, { room })
    return
  }

  const roomMatch = pathname.match(/^\/v1\/rooms\/([^/]+)$/)
  if (request.method === 'GET' && roomMatch) {
    const roomId = roomMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    writeJson(response, 200, { room })
    return
  }

  const participantsMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/participants$/)
  if (request.method === 'POST' && participantsMatch) {
    const roomId = participantsMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    try {
      const body = await readJsonBody(request)
      const participantActorId = requireString(body.actorId, 'actorId')
      const participantRole = requireString(body.role, 'role') as ServiceActorRole
      const updatedRoom = await store.upsertParticipant(room.id, {
        actorId: participantActorId,
        role: participantRole,
        displayName: typeof body.displayName === 'string' ? body.displayName.trim() : undefined,
        nickname: typeof body.nickname === 'string' ? normalizeNickname(body.nickname, { allowEmpty: true }) : undefined,
      })

      broadcastRoomEvent(room.id, 'participant.updated', {
        roomId: room.id,
        participant: updatedRoom.participants.find((item) => item.actorId === participantActorId && item.role === participantRole) || null,
      })

      writeJson(response, 200, { room: updatedRoom })
    } catch (error) {
      writeError(response, 400, error instanceof Error ? error.message : 'Unable to update participant')
    }
    return
  }

  const selfNicknameMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/me\/nickname$/)
  if (request.method === 'PUT' && selfNicknameMatch) {
    const roomId = selfNicknameMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    try {
      const body = await readJsonBody(request)
      const nickname = normalizeNickname(body.nickname, { allowEmpty: true })
      const currentActorKey = actorKey(actor)
      const duplicate = nickname
        ? room.participants.some((participant) => participant.nickname?.toLowerCase() === nickname && actorKey(participant) !== currentActorKey)
        : false

      if (duplicate) {
        writeError(response, 409, 'Такой никнейм уже занят в этой комнате')
        return
      }

      const updatedRoom = await store.upsertParticipant(room.id, {
        actorId: actor.actorId,
        role: actor.role,
        displayName: actor.displayName,
        nickname,
      })
      const updatedParticipant = updatedRoom.participants.find((participant) => actorKey(participant) === currentActorKey) || null

      broadcastRoomEvent(room.id, 'participant.updated', {
        roomId: room.id,
        participant: updatedParticipant,
      })

      writeJson(response, 200, {
        room: updatedRoom,
        participant: updatedParticipant,
      })
    } catch (error) {
      writeError(response, 400, error instanceof Error ? error.message : 'Unable to update nickname')
    }
    return
  }

  const keyBundlesMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/key-bundles$/)
  if (keyBundlesMatch) {
    const roomId = keyBundlesMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    if (request.method === 'GET') {
      writeJson(response, 200, {
        room,
        keyBundles: await store.listKeyBundles(room.id),
      })
      return
    }

    if (request.method === 'POST') {
      try {
        const body = await readJsonBody(request)
        const keyBundle = await store.publishKeyBundle(room.id, normalizeKeyBundle(body, actor, room.id))
        broadcastRoomEvent(room.id, 'key-bundle.published', { roomId: room.id, keyBundle })
        writeJson(response, 201, { keyBundle })
      } catch (error) {
        writeError(response, 400, error instanceof Error ? error.message : 'Unable to publish key bundle')
      }
      return
    }
  }

  const messagesMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/messages$/)
  if (messagesMatch) {
    const roomId = messagesMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    if (request.method === 'GET') {
      const limitParam = Number(url.searchParams.get('limit'))
      const limit = Number.isFinite(limitParam) ? limitParam : 50
      writeJson(response, 200, {
        room,
        messages: await store.listMessages(room.id, limit),
      })
      return
    }

    if (request.method === 'POST') {
      try {
        const body = await readJsonBody(request)
        const encrypted = normalizeEncryptedMessage(body.encrypted)
        const message = await store.addMessage({ roomId: room.id, encrypted, actor })
        broadcastRoomEvent(room.id, 'message.created', { roomId: room.id, message })
        writeJson(response, 201, { message })
      } catch (error) {
        writeError(response, 400, error instanceof Error ? error.message : 'Unable to create message')
      }
      return
    }
  }

  const eventsMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/events$/)
  if (request.method === 'GET' && eventsMatch) {
    const roomId = eventsMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    startSse(response)

    const subscriberId = randomUUID()
    const subscriber: SseSubscriber = {
      id: subscriberId,
      roomId: room.id,
      actorKey: actorKey(actor),
      response,
    }
    subscribers.set(subscriberId, subscriber)

    pushSse(response, 'ready', {
      room,
      actor: {
        actorId: actor.actorId,
        role: actor.role,
        displayName: actor.displayName,
      },
      keyBundles: await store.listKeyBundles(room.id),
      messages: await store.listMessages(room.id, 20),
    })

    const heartbeat = setInterval(() => {
      pushSse(response, 'heartbeat', { time: new Date().toISOString() })
    }, 25000)

    response.on('close', () => {
      clearInterval(heartbeat)
      subscribers.delete(subscriberId)
    })

    return
  }

  const signalsMatch = pathname.match(/^\/v1\/rooms\/([^/]+)\/signals$/)
  if (request.method === 'POST' && signalsMatch) {
    const roomId = signalsMatch[1]
    const room = await requireRoomAccess(response, actor, roomId)
    if (!room) {
      return
    }

    try {
      const body = await readJsonBody(request)
      const kind = requireString(body.kind, 'kind') as SignalKind
      const signal: SignalEnvelope = {
        roomId: room.id,
        callId: typeof body.callId === 'string' && body.callId.trim() ? body.callId.trim() : randomUUID(),
        kind,
        targetActorKey: typeof body.targetActorKey === 'string' && body.targetActorKey.trim()
          ? body.targetActorKey.trim()
          : null,
        senderActorId: actor.actorId,
        senderRole: actor.role,
        senderDisplayName: actor.displayName,
        payload: body.payload ?? null,
        createdAt: new Date().toISOString(),
      }

      await store.appendSignal(signal)

      const deliveredTo = broadcastRoomEvent(room.id, 'signal', { roomId: room.id, signal }, {
        targetActorKey: signal.targetActorKey,
        excludeActorKey: signal.targetActorKey ? null : actorKey(actor),
      })

      writeJson(response, 202, {
        signal,
        deliveredTo,
      })
    } catch (error) {
      writeError(response, 400, error instanceof Error ? error.message : 'Unable to send signal')
    }
    return
  }

  writeError(response, 404, 'Route not found')
})

server.listen(config.port, config.host, () => {
  console.log(`[communications-service] listening on http://${config.host}:${config.port} using ${store.driver} storage`)
})