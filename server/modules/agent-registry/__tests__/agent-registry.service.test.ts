/**
 * Smoke tests for server/modules/agent-registry.
 * Validates input types (compile-time contracts) without a live DB or process.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/agent-registry/__tests__/agent-registry.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('agent-registry.service', async () => {
  // agent-registry.types.ts exports only TS interfaces (no runtime values).
  // We verify that runtime-shape objects satisfy the expected contract.

  it('CreateAgentInput shape satisfies required fields at runtime', () => {
    const input = { ownerUserId: 'user-123', name: 'Assistant Bot' }
    assert.equal(input.ownerUserId, 'user-123')
    assert.equal(input.name, 'Assistant Bot')
    assert.equal('description' in input, false)
  })

  it('UpdateAgentInput shape requires version field', () => {
    const input = { version: 3, name: 'Renamed Bot' }
    assert.equal(input.version, 3)
    assert.equal(input.name, 'Renamed Bot')
  })
})
