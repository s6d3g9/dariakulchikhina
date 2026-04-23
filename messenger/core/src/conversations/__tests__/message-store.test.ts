import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  serializePayload,
  deserializePayload,
  rowToMessengerMessageRecord,
  type MessagePayload,
  type StoredMessageRow,
} from '../message-store.ts'

function makeRow(overrides: Partial<StoredMessageRow> & Pick<StoredMessageRow, 'ciphertext'>): StoredMessageRow {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderUserId: 'user-1',
    keyId: null,
    contentType: 'text',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    version: 1,
    deletedAt: null,
    ...overrides,
  }
}

test('serialize/deserialize round-trips a normal text payload', () => {
  const payload: MessagePayload = { body: 'hello', kind: 'text' }
  const round = deserializePayload(serializePayload(payload))
  assert.equal(round.body, 'hello')
  assert.equal(round.kind, 'text')
})

test('serialize/deserialize preserves encryptedBody for secret chats', () => {
  const payload: MessagePayload = {
    body: '',
    kind: 'text',
    encryptedBody: { algorithm: 'x25519-xchacha20poly1305', ciphertext: 'aa', iv: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', tag: 'cc' } as never,
  }
  const round = deserializePayload(serializePayload(payload))
  assert.ok(round.encryptedBody)
  assert.equal(round.encryptedBody!.iv.slice(0, 16), 'bbbbbbbbbbbbbbbb')
})

test('deserializePayload wraps raw utf8 non-JSON bytes (the "OK" regression case)', () => {
  // This is the exact shape that broke listMessages: contentType='text/plain'
  // rows whose ciphertext is literal bytes like "OK". JSON.parse throws,
  // the fallback must return a body envelope instead of propagating.
  const payload = deserializePayload(Buffer.from('OK', 'utf8'))
  assert.equal(payload.body, 'OK')
  assert.equal(payload.kind, 'text')
})

test('deserializePayload wraps JSON primitives (legacy plaintext like "4")', () => {
  // Legacy rows that stored `JSON.stringify("4")` — parses to a string primitive.
  const payload = deserializePayload(Buffer.from('"4"', 'utf8'))
  assert.equal(payload.body, '4')
  assert.equal(payload.kind, 'text')
})

test('deserializePayload handles JSON numbers as body envelopes', () => {
  const payload = deserializePayload(Buffer.from('42', 'utf8'))
  assert.equal(payload.body, '42')
  assert.equal(payload.kind, 'text')
})

test('rowToMessengerMessageRecord never throws on legacy plaintext ciphertext', () => {
  // Pre-regression-fix this call would throw SyntaxError from the second
  // unconditional JSON.parse pass — breaking listMessages for every chat
  // that had ever received a raw-bytes message.
  const row = makeRow({ ciphertext: Buffer.from('OK', 'utf8'), contentType: 'text/plain' })
  const record = rowToMessengerMessageRecord(row)
  assert.equal(record.body, 'OK')
  assert.equal(record.kind, 'text')
  assert.equal(record.senderUserId, 'user-1')
  assert.equal(record.agentId, undefined)
})

test('rowToMessengerMessageRecord routes agent messages through agentId', () => {
  const payload: MessagePayload = { body: 'agent says hi', kind: 'text', agentId: 'agent-42' }
  const row = makeRow({ ciphertext: serializePayload(payload), senderUserId: null })
  const record = rowToMessengerMessageRecord(row)
  assert.equal(record.agentId, 'agent-42')
  assert.equal(record.senderUserId, 'agent-42')
})

test('rowToMessengerMessageRecord returns empty body for deleted rows without parsing ciphertext', () => {
  // Deleted rows must short-circuit: even if ciphertext is malformed garbage,
  // the record must be safe to return (no throw, no body leak).
  const row = makeRow({
    ciphertext: Buffer.from('{not valid json at all', 'utf8'),
    deletedAt: new Date('2026-01-02T00:00:00Z'),
  })
  const record = rowToMessengerMessageRecord(row)
  assert.equal(record.body, '')
  assert.equal(record.kind, 'text')
  assert.equal(record.agentId, undefined)
  assert.ok(record.deletedAt)
})

test('rowToMessengerMessageRecord exposes encryptedBody for secret-chat rows', () => {
  const payload: MessagePayload = {
    body: '',
    kind: 'text',
    encryptedBody: { algorithm: 'x25519-xchacha20poly1305', ciphertext: 'aa', iv: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', tag: 'cc' } as never,
  }
  const row = makeRow({ ciphertext: serializePayload(payload), keyId: 'bbbbbbbbbbbbbbbb', contentType: 'text' })
  const record = rowToMessengerMessageRecord(row)
  assert.ok(record.encryptedBody)
  assert.equal(record.body, '')
})
