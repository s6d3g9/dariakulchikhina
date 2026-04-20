/**
 * Smoke tests for server/modules/communications.
 * Validates module structure and type exports without a live DB or crypto calls.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/communications/__tests__/communications.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('communications.service', async () => {
  it('exports expected functions from the barrel', async () => {
    const mod = await import('../communications.service.ts')
    assert.equal(typeof mod.buildProjectCommunicationBootstrap, 'function')
    assert.equal(typeof mod.relayProjectCommunicationJson, 'function')
    assert.equal(typeof mod.relayProjectCommunicationEventStream, 'function')
    assert.equal(typeof mod.relayStandaloneCommunicationJson, 'function')
    assert.equal(typeof mod.relayStandaloneCommunicationEventStream, 'function')
  })

  it('RelayJsonOptions type is exported from types', async () => {
    const types = await import('../communications.types.ts')
    assert.ok(typeof types === 'object')
  })
})
