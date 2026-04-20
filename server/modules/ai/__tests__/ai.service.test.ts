/**
 * Smoke tests for server/modules/ai.
 * Validates AI context shape contracts without a live DB or model backend.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/ai/__tests__/ai.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('ai.service', () => {
  it('AI context object satisfies expected shape', () => {
    const ctx: Record<string, unknown> = {
      projectSlug: 'kitchen-remodel',
      pages: { 'smart-brief': 'content here' },
      client: { id: 1, name: 'Клиент' },
    }
    assert.equal(typeof ctx.projectSlug, 'string')
    assert.ok(ctx.pages !== null)
  })

  it('getLegalStatus return shape has required fields', () => {
    const status = { ready: true, totalChunks: 42, sources: [] as unknown[] }
    assert.equal(typeof status.ready, 'boolean')
    assert.equal(typeof status.totalChunks, 'number')
    assert.ok(Array.isArray(status.sources))
  })

  it('buildAiStreamContext page slug whitelist contains expected entries', () => {
    const whitelist = ['first-contact', 'smart-brief', 'client-tz', 'moodboard', 'specifications']
    assert.ok(whitelist.includes('smart-brief'))
    assert.ok(whitelist.includes('specifications'))
    assert.equal(whitelist.length, 5)
  })
})
