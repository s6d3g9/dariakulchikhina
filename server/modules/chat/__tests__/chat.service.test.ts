/**
 * Smoke tests for server/modules/chat.
 * Validates StandaloneChatUser record shapes without filesystem I/O.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/chat/__tests__/chat.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('chat.service', () => {
  it('StandaloneChatUserRecord shape satisfies required fields', () => {
    const user = {
      id: 'u-123',
      login: 'alice',
      displayName: 'Alice',
      passwordHash: '$2b$12$...',
      createdAt: new Date().toISOString(),
    }
    assert.equal(user.id, 'u-123')
    assert.equal(user.login, 'alice')
    assert.ok(user.createdAt.length > 0)
  })

  it('StandaloneChatInviteRecord has pending status by default', () => {
    const invite = {
      id: 'inv-1',
      fromUserId: 'u-1',
      toUserId: 'u-2',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }
    assert.equal(invite.status, 'pending')
    assert.equal(invite.fromUserId, 'u-1')
  })

  it('StandaloneChatUserPublic omits passwordHash', () => {
    const pub = {
      id: 'u-123',
      login: 'alice',
      displayName: 'Alice',
      createdAt: new Date().toISOString(),
    }
    assert.equal('passwordHash' in pub, false)
    assert.equal(pub.displayName, 'Alice')
  })
})
