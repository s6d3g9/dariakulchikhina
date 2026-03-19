import type { E2eeEncryptedEnvelope } from '~/shared/types/communications'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes: Uint8Array) {
  if (typeof globalThis.btoa === 'function') {
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return globalThis.btoa(binary)
  }

  return Buffer.from(bytes).toString('base64')
}

function fromBase64(value: string) {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }

  return new Uint8Array(Buffer.from(value, 'base64'))
}

function getCrypto() {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.subtle) {
    throw new Error('Web Crypto API is not available')
  }

  return cryptoApi
}

export async function generateCommunicationIdentityKeyPair() {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits'],
  )
}

export async function exportCommunicationPublicKey(publicKey: CryptoKey) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.exportKey('jwk', publicKey)
}

export async function exportCommunicationPrivateKey(privateKey: CryptoKey) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.exportKey('jwk', privateKey)
}

export async function importCommunicationPublicKey(publicKeyJwk: JsonWebKey) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.importKey(
    'jwk',
    publicKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    [],
  )
}

export async function importCommunicationPrivateKey(privateKeyJwk: JsonWebKey) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits'],
  )
}

export async function createCommunicationRoomKey() {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function exportCommunicationRoomKey(roomKey: CryptoKey) {
  const cryptoApi = getCrypto()
  const exported = await cryptoApi.subtle.exportKey('raw', roomKey)
  return toBase64(new Uint8Array(exported))
}

export async function importCommunicationRoomKey(rawKeyBase64: string) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.importKey(
    'raw',
    fromBase64(rawKeyBase64),
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  )
}

async function derivePeerWrappingKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  const cryptoApi = getCrypto()
  return cryptoApi.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function wrapCommunicationRoomKeyForPeer(options: {
  roomKeyBase64: string
  senderPrivateKey: CryptoKey
  recipientPublicKeyJwk: JsonWebKey
}) {
  const cryptoApi = getCrypto()
  const recipientPublicKey = await importCommunicationPublicKey(options.recipientPublicKeyJwk)
  const wrappingKey = await derivePeerWrappingKey(options.senderPrivateKey, recipientPublicKey)
  const iv = cryptoApi.getRandomValues(new Uint8Array(12))
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    fromBase64(options.roomKeyBase64),
  )

  return {
    algorithm: 'ECDH-P256/AES-GCM',
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

export async function unwrapCommunicationRoomKeyFromPeer(options: {
  wrappedCiphertextBase64: string
  ivBase64: string
  recipientPrivateKey: CryptoKey
  senderPublicKeyJwk: JsonWebKey
}) {
  const cryptoApi = getCrypto()
  const senderPublicKey = await importCommunicationPublicKey(options.senderPublicKeyJwk)
  const wrappingKey = await derivePeerWrappingKey(options.recipientPrivateKey, senderPublicKey)
  const rawKey = await cryptoApi.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(options.ivBase64),
    },
    wrappingKey,
    fromBase64(options.wrappedCiphertextBase64),
  )

  return importCommunicationRoomKey(toBase64(new Uint8Array(rawKey)))
}

export async function encryptCommunicationText(options: {
  roomKey: CryptoKey
  text: string
  senderKeyId: string
  mimeType?: string
}) {
  const cryptoApi = getCrypto()
  const iv = cryptoApi.getRandomValues(new Uint8Array(12))
  const ciphertext = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    options.roomKey,
    encoder.encode(options.text),
  )

  const envelope: E2eeEncryptedEnvelope = {
    version: 'e2ee-v1',
    algorithm: 'AES-GCM-256',
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    senderKeyId: options.senderKeyId,
    mimeType: options.mimeType || 'text/plain',
  }

  return envelope
}

export async function decryptCommunicationText(options: {
  roomKey: CryptoKey
  encrypted: E2eeEncryptedEnvelope
}) {
  const cryptoApi = getCrypto()
  const plaintext = await cryptoApi.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(options.encrypted.iv),
    },
    options.roomKey,
    fromBase64(options.encrypted.ciphertext),
  )

  return decoder.decode(plaintext)
}