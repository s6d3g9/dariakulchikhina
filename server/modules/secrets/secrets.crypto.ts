/**
 * AES-256-GCM helpers for the secrets module.
 *
 * Master key is loaded from env `SECRETS_MASTER_KEY` (32 bytes,
 * hex-encoded — 64 hex chars). The main app fail-fasts at startup if
 * the key is missing or malformed (see `getMasterKey()`).
 *
 * IV is generated per record (12 bytes, recommended for GCM). The
 * auth tag is stored separately so the row can be verified
 * independently of the ciphertext blob.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12

let cachedKey: Buffer | null = null

/**
 * Lazy master-key loader. Reads from env directly (this is one of the
 * deliberate exceptions to the "config-only" rule because the secrets
 * module ships AS A library: it must work the same in main app and
 * the standalone secrets service if we ever split it out).
 *
 * In production the env is validated at process start by importing
 * this module from `server/plugins/secrets-fail-fast.ts`.
 */
export function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey
  // eslint-disable-next-line no-restricted-syntax -- module-level secret bootstrap, see docstring
  const raw = process.env.SECRETS_MASTER_KEY
  if (!raw) {
    throw new Error(
      'SECRETS_MASTER_KEY is required (32 bytes, hex-encoded). ' +
        'Generate with: openssl rand -hex 32',
    )
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      'SECRETS_MASTER_KEY must be a 64-char hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32',
    )
  }
  let buf: Buffer
  try {
    buf = Buffer.from(raw, 'hex')
  } catch {
    throw new Error('SECRETS_MASTER_KEY must be a hex string (64 chars).')
  }
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `SECRETS_MASTER_KEY must be ${KEY_BYTES} bytes (got ${buf.length}). ` +
        'Generate with: openssl rand -hex 32',
    )
  }
  cachedKey = buf
  return buf
}

export interface EncryptedPayload {
  /** Base64-encoded ciphertext. */
  ciphertext: string
  /** Base64-encoded 12-byte IV. */
  iv: string
  /** Base64-encoded 16-byte GCM auth tag. */
  authTag: string
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getMasterKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    ciphertext: ct.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getMasterKey()
  const iv = Buffer.from(payload.iv, 'base64')
  const authTag = Buffer.from(payload.authTag, 'base64')
  const ct = Buffer.from(payload.ciphertext, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}

/** Last-4-char mask for UI: `••••••1234`. Empty string for short values. */
export function maskValue(value: string): string {
  if (value.length <= 4) return '•'.repeat(Math.max(0, value.length))
  const last = value.slice(-4)
  return '•'.repeat(6) + last
}

/** Resets the cached key — used by tests that swap env between cases. */
export function _resetMasterKeyCacheForTests() {
  cachedKey = null
}
