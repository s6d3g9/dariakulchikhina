import { test } from 'node:test'
import assert from 'node:assert/strict'

import { shouldFoldIntoBurst, BURST_MAX_GAP_MS, type BurstFoldCandidate } from '../burstGrouping.ts'

function agent(overrides: Partial<BurstFoldCandidate> = {}): BurstFoldCandidate {
  return {
    own: false,
    agentId: 'agent-1',
    runId: 'run-1',
    rootRunId: 'root-1',
    createdAt: '2026-04-26T12:00:00Z',
    kind: 'text',
    ...overrides,
  }
}

test('folds two adjacent messages from same agent + same root', () => {
  const prev = agent()
  const next = agent({ runId: 'run-2', createdAt: '2026-04-26T12:00:30Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), true)
})

test('refuses fold when prev is user-authored', () => {
  const prev = agent({ own: true, agentId: undefined })
  const next = agent({ createdAt: '2026-04-26T12:00:30Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next is user-authored', () => {
  const prev = agent()
  const next = agent({ own: true, agentId: undefined })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when prev has no agentId', () => {
  const prev = agent({ agentId: undefined })
  const next = agent()
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next has no agentId', () => {
  const prev = agent()
  const next = agent({ agentId: undefined })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when agentIds differ', () => {
  const prev = agent({ agentId: 'agent-1' })
  const next = agent({ agentId: 'agent-2', rootRunId: 'root-1' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when prev is deleted', () => {
  const prev = agent({ deletedAt: '2026-04-26T12:00:05Z' })
  const next = agent({ createdAt: '2026-04-26T12:00:30Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next is deleted', () => {
  const prev = agent()
  const next = agent({ deletedAt: '2026-04-26T12:00:35Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next is a comment reply', () => {
  const prev = agent()
  const next = agent({ commentOn: { id: 'msg-99' } })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next is a reply', () => {
  const prev = agent()
  const next = agent({ replyTo: { id: 'msg-99' } })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next is forwarded', () => {
  const prev = agent()
  const next = agent({ forwardedFrom: { messageId: 'msg-99' } })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next has an attachment', () => {
  const prev = agent()
  const next = agent({ attachment: { mimeType: 'image/png' } })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next.kind is file', () => {
  const prev = agent()
  const next = agent({ kind: 'file' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next has reactions', () => {
  const prev = agent()
  const next = agent({ reactions: [{ emoji: '👍', count: 1, own: true }] })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next has comments', () => {
  const prev = agent()
  const next = agent({ comments: [{ id: 'c-1' }] })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when next was edited', () => {
  const prev = agent()
  const next = agent({ editedAt: '2026-04-26T12:01:00Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('refuses fold when both have rootRunId but they differ', () => {
  const prev = agent({ rootRunId: 'root-A' })
  const next = agent({ rootRunId: 'root-B', createdAt: '2026-04-26T12:00:01Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('folds when both have rootRunId equal even across long gap', () => {
  const prev = agent({ createdAt: '2026-04-26T12:00:00Z', rootRunId: 'root-1' })
  // 2 hours later — would fail the time-gap heuristic, but rootRunId wins.
  const next = agent({ createdAt: '2026-04-26T14:00:00Z', rootRunId: 'root-1' })
  assert.equal(shouldFoldIntoBurst(prev, next), true)
})

test('legacy messages without rootRunId fall back to time gap — fold when within window', () => {
  const prev = agent({ rootRunId: undefined, createdAt: '2026-04-26T12:00:00Z' })
  const next = agent({ rootRunId: undefined, createdAt: '2026-04-26T12:10:00Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), true)
})

test('legacy messages without rootRunId — refuse fold past time gap', () => {
  const prev = agent({ rootRunId: undefined, createdAt: '2026-04-26T12:00:00Z' })
  // 31 minutes — past BURST_MAX_GAP_MS (30 min).
  const next = agent({ rootRunId: undefined, createdAt: '2026-04-26T12:31:00Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), false)
})

test('asymmetric rootRunId (only one side has it) falls back to time gap', () => {
  const prev = agent({ rootRunId: 'root-1', createdAt: '2026-04-26T12:00:00Z' })
  const next = agent({ rootRunId: undefined, createdAt: '2026-04-26T12:10:00Z' })
  assert.equal(shouldFoldIntoBurst(prev, next), true)
})

test('BURST_MAX_GAP_MS is 30 minutes', () => {
  assert.equal(BURST_MAX_GAP_MS, 30 * 60 * 1000)
})
