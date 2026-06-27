/**
 * Server-side encryption at rest for open chat messages.
 *
 * Uses AES-256-GCM with a master key from MESSENGER_ENCRYPTION_KEY env var.
 * Messages in non-secret chats are encrypted before writing to JSON storage,
 * and decrypted when read by the server. This ensures:
 * - Developers with the key can read messages (for moderation/support)
 * - Attackers with filesystem access see only ciphertext
 * - Secret chats use E2EE — server encryption is skipped (server can't read anyway)
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const SALT_LENGTH = 16

// Prefix to identify server-encrypted values in storage
const ENCRYPTED_PREFIX = '$enc$'

let _derivedKey: Buffer | null = null
let _rawKey: string | null = null

function getDerivedKey(masterKey: string): Buffer {
  if (_derivedKey && _rawKey === masterKey) {
    return _derivedKey
  }

  // Derive a 256-bit key from the master key using a fixed salt
  // The fixed salt is acceptable here because the master key itself is high-entropy
  const salt = Buffer.from('messenger-at-rest-v1', 'utf8')
  _derivedKey = scryptSync(masterKey, salt, 32) as Buffer
  _rawKey = masterKey
  return _derivedKey
}

/**
 * Encrypt a plaintext message body for storage.
 * Returns a string prefixed with $enc$ containing base64-encoded iv+tag+ciphertext.
 */
export function encryptAtRest(plaintext: string, masterKey: string): string {
  if (!plaintext) return plaintext

  const key = getDerivedKey(masterKey)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  // Format: $enc$<base64(iv + tag + ciphertext)>
  const combined = Buffer.concat([iv, tag, encrypted])
  return `${ENCRYPTED_PREFIX}${combined.toString('base64')}`
}

/**
 * Decrypt a server-encrypted message body.
 * If the value is not encrypted (no $enc$ prefix), returns as-is.
 */
export function decryptAtRest(stored: string, masterKey: string): string {
  if (!stored || !stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored // Not encrypted (legacy or empty)
  }

  const key = getDerivedKey(masterKey)
  const combined = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64')

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    return stored // Malformed — return as-is
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if server-side encryption at rest is configured.
 */
export function isEncryptionAtRestEnabled(encryptionKey: string | undefined): boolean {
  return Boolean(encryptionKey && encryptionKey.length >= 32)
}
