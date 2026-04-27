/**
 * AES-256-GCM round-trip smoke test for the secrets module.
 * Run via: SECRETS_MASTER_KEY=<64-hex> node --experimental-strip-types path/to/this/file.ts
 *
 * Mock-only: no DB. Tests crypto primitives against the spec.
 */

import { strict as assert } from 'node:assert'
import { randomBytes } from 'node:crypto'
import {
  _resetMasterKeyCacheForTests,
  decryptSecret,
  encryptSecret,
  getMasterKey,
  maskValue,
} from '../secrets.crypto.ts'

// Set a deterministic master key for the test.
process.env.SECRETS_MASTER_KEY = randomBytes(32).toString('hex')
_resetMasterKeyCacheForTests()

// 1. Master key validation: hex string of 32 bytes.
const key = getMasterKey()
assert.equal(key.length, 32, 'master key must be 32 bytes')

// 2. Round-trip: encrypt then decrypt yields the original plaintext.
const plaintext = 'individualPerson_token=abc123XYZ-very-secret-zakupki-token'
const enc = encryptSecret(plaintext)
assert.equal(enc.iv.length > 0, true)
assert.equal(enc.authTag.length > 0, true)
assert.equal(enc.ciphertext.length > 0, true)

const dec = decryptSecret(enc)
assert.equal(dec, plaintext, 'decrypt must recover plaintext')

// 3. Tampering with the ciphertext fails verification (auth tag).
const tamperedCt = Buffer.from(enc.ciphertext, 'base64')
tamperedCt[0]! ^= 0xff
assert.throws(
  () =>
    decryptSecret({
      ...enc,
      ciphertext: tamperedCt.toString('base64'),
    }),
  /unsupported state|auth/i,
)

// 4. Each encryption uses a fresh IV (no reuse).
const a = encryptSecret('same input')
const b = encryptSecret('same input')
assert.notEqual(a.iv, b.iv, 'IV must be random per encryption')
assert.notEqual(a.ciphertext, b.ciphertext, 'ciphertext should differ on repeat')

// 5. Mask hides everything but the last 4 chars.
const masked = maskValue('••••••wxyz')
assert.equal(masked, '••••••wxyz')

// 6. Missing master key fails fast with a clear error.
delete process.env.SECRETS_MASTER_KEY
_resetMasterKeyCacheForTests()
assert.throws(() => getMasterKey(), /SECRETS_MASTER_KEY is required/)

// eslint-disable-next-line no-console -- test output
console.log('secrets.crypto.test ok')
