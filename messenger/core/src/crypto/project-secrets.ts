import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALG = 'aes-256-gcm'

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  tag: string
}

export function encryptSecret(plaintext: string, keyHex: string): EncryptedSecret {
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  }
}

export function decryptSecret(
  ciphertext: string,
  iv: string,
  tag: string,
  keyHex: string,
): string {
  const key = Buffer.from(keyHex, 'hex')
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
