import { createHmac, timingSafeEqual } from 'node:crypto'

import type { MessengerUserRecord } from './auth-store.ts'

export interface MessengerAuthPayload {
  sub: string
  login: string
  displayName: string
  exp: number
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

function signData(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function createMessengerToken(user: MessengerUserRecord, secret: string) {
  const payload: MessengerAuthPayload = {
    sub: user.id,
    login: user.login,
    displayName: user.displayName,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signData(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export function verifyMessengerToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expected = Buffer.from(signData(encodedPayload, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as MessengerAuthPayload
    if (!payload.sub || !payload.login || !payload.displayName || !payload.exp) {
      return null
    }

    if (payload.exp * 1000 < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function readBearerToken(value: string | undefined) {
  if (!value) {
    return null
  }

  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}
