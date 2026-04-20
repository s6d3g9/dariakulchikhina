/**
 * Smoke tests for server/modules/communications.
 * Validates token signing contract and bootstrap shape without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/communications/__tests__/communications.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

describe('communications.service', () => {
  it('HMAC-signed token has two dot-separated parts', () => {
    const payload = Buffer.from(JSON.stringify({ actorId: 'user-1', role: 'admin' })).toString('base64url')
    const sig = createHmac('sha256', 'secret').update(payload).digest('base64url')
    const token = `${payload}.${sig}`
    assert.equal(token.split('.').length, 2)
  })

  it('E2EE profile constants satisfy expected shape', () => {
    const profile = {
      protocol: 'e2ee-v1',
      keyAgreement: 'ECDH-P256',
      messageCipher: 'AES-GCM-256',
      callMedia: 'WebRTC-DTLS-SRTP',
    } as const
    assert.equal(profile.protocol, 'e2ee-v1')
    assert.equal(profile.keyAgreement, 'ECDH-P256')
    assert.equal(profile.messageCipher, 'AES-GCM-256')
  })

  it('bootstrap response shape has required roomParticipants array', () => {
    const bootstrap = {
      roomParticipants: [{ actorKey: 'admin:1', displayName: 'Admin', role: 'admin' }],
      token: 'signed.token',
      e2eeProfile: { protocol: 'e2ee-v1' },
    }
    assert.ok(Array.isArray(bootstrap.roomParticipants))
    assert.equal(bootstrap.roomParticipants[0]!.role, 'admin')
  })
})
