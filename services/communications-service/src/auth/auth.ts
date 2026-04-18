import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

import type { AuthenticatedActor, ServiceTokenPayload } from '../types.ts'

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url')
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function createSignature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function signToken(payload: ServiceTokenPayload, secret: string) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = createSignature(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export function verifyToken(token: string, secret: string): AuthenticatedActor | null {
  const parts = token.split('.')
  if (parts.length !== 2) {
    return null
  }

  const [encodedPayload, signature] = parts
  const expectedSignature = createSignature(encodedPayload, secret)

  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (providedBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null
  }

  let parsed: ServiceTokenPayload
  try {
    parsed = JSON.parse(decodeBase64Url(encodedPayload)) as ServiceTokenPayload
  } catch {
    return null
  }

  if (!parsed || typeof parsed.actorId !== 'string' || typeof parsed.role !== 'string' || typeof parsed.exp !== 'number') {
    return null
  }

  if (parsed.exp * 1000 <= Date.now()) {
    return null
  }

  return {
    actorId: parsed.actorId,
    role: parsed.role,
    displayName: parsed.displayName,
    scopes: Array.isArray(parsed.scopes) ? parsed.scopes.filter((item): item is string => typeof item === 'string') : [],
    roomRefs: Array.isArray(parsed.roomRefs) ? parsed.roomRefs.filter((item): item is string => typeof item === 'string') : [],
  }
}

export function readAccessToken(request: IncomingMessage, url: URL) {
  const authorization = request.headers.authorization
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim()
  }

  const queryToken = url.searchParams.get('token')
  if (queryToken) {
    return queryToken
  }

  return null
}

export function actorKey(actor: Pick<AuthenticatedActor, 'role' | 'actorId'>) {
  return `${actor.role}:${actor.actorId}`
}

export function hasAdminScope(actor: AuthenticatedActor) {
  return actor.scopes.includes('rooms:admin')
}