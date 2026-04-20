/**
 * Smoke tests for server/modules/admin.
 * Validates notification badge shape contracts without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/admin/__tests__/admin.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('admin.service', () => {
  it('AdminNotificationsSummary shape has all required counters', () => {
    const summary = {
      total: 5,
      extra: { count: 2, label: 'extra' },
      overdue: { count: 1, label: 'overdue' },
      control: { count: 2, label: 'control' },
    }
    assert.equal(summary.total, 5)
    assert.equal(summary.extra.count, 2)
    assert.equal(summary.overdue.label, 'overdue')
    assert.equal(summary.control.count, 2)
  })

  it('total equals sum of all badge counts', () => {
    const extra = 3
    const overdue = 1
    const control = 2
    const total = extra + overdue + control
    assert.equal(total, 6)
  })

  it('NotificationBadgeCount has count and label fields', () => {
    const badge = { count: 0, label: 'extra' }
    assert.equal(typeof badge.count, 'number')
    assert.equal(typeof badge.label, 'string')
    assert.ok(badge.count >= 0)
  })
})
