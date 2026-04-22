import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encryptSecret, decryptSecret } from '../project-secrets.ts'

const KEY = 'a'.repeat(64) // 32 bytes as 64 hex chars

test('round-trip: encrypt then decrypt returns original plaintext', () => {
  const plaintext = 'sk-ant-api03-test-key-value'
  const { ciphertext, iv, tag } = encryptSecret(plaintext, KEY)
  assert.equal(decryptSecret(ciphertext, iv, tag, KEY), plaintext)
})

test('produces unique IV and ciphertext for identical inputs', () => {
  const plaintext = 'same-input'
  const enc1 = encryptSecret(plaintext, KEY)
  const enc2 = encryptSecret(plaintext, KEY)
  assert.notEqual(enc1.iv, enc2.iv)
  assert.notEqual(enc1.ciphertext, enc2.ciphertext)
})

test('tampered ciphertext throws on decrypt', () => {
  const { ciphertext, iv, tag } = encryptSecret('hello', KEY)
  const tampered = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === 'ff' ? '00' : 'ff')
  assert.throws(() => decryptSecret(tampered, iv, tag, KEY))
})
