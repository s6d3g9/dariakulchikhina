import type {
  CommunicationCallE2EEPublicKey,
  CommunicationCallSecurityContext,
  E2eeEncryptedEnvelope,
} from '~/shared/types/communications'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const CALL_VERIFICATION_EMOJIS = ['🔒', '🎧', '🎤', '🛡️', '🎼', '🌿', '🔥', '⚡', '🌊', '🪐', '🍀', '🧩', '🛰️', '🎯', '🌙', '🫧', '🎹', '🦋', '☀️', '🧭', '💎', '🪶', '🎛️', '🧠', '🐚', '🕊️', '🧿', '🪙', '🌈', '❄️', '🍃', '🔑']

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

function buildCommunicationCtrCounter(counterSalt: Uint8Array, timestampValue: number) {
  const counter = new Uint8Array(16)
  counter.set(counterSalt.slice(0, 8), 0)

  let nextValue = BigInt(Math.max(0, Math.floor(timestampValue)))
  for (let index = 15; index >= 8; index -= 1) {
    counter[index] = Number(nextValue & BigInt(255))
    nextValue >>= BigInt(8)
  }

  return counter
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
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

export function supportsCommunicationCallEncryption() {
  return typeof globalThis.RTCRtpSender !== 'undefined'
    && typeof globalThis.RTCRtpReceiver !== 'undefined'
    && typeof (globalThis.RTCRtpSender.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof (globalThis.RTCRtpReceiver.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof globalThis.TransformStream !== 'undefined'
    && typeof globalThis.crypto?.subtle !== 'undefined'
}

export function encodeCommunicationCallBase64(buffer: ArrayBuffer | Uint8Array) {
  return toBase64(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
}

export function decodeCommunicationCallBase64(value: string) {
  return fromBase64(value)
}

export async function generateCommunicationCallE2EEKeyPair() {
  const cryptoApi = getCrypto()
  const keyPair = await cryptoApi.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  return {
    publicKey: await cryptoApi.subtle.exportKey('jwk', keyPair.publicKey) as CommunicationCallE2EEPublicKey,
    privateKey: await cryptoApi.subtle.exportKey('jwk', keyPair.privateKey),
  }
}

async function importCommunicationCallPrivateKey(privateKey: JsonWebKey) {
  const cryptoApi = getCrypto()
  return await cryptoApi.subtle.importKey('jwk', privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
}

async function importCommunicationCallPublicKey(publicKey: CommunicationCallE2EEPublicKey) {
  const cryptoApi = getCrypto()
  return await cryptoApi.subtle.importKey('jwk', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

async function deriveCommunicationCallSharedSecret(privateKey: JsonWebKey, publicKey: CommunicationCallE2EEPublicKey) {
  const cryptoApi = getCrypto()
  const importedPrivateKey = await importCommunicationCallPrivateKey(privateKey)
  const importedPublicKey = await importCommunicationCallPublicKey(publicKey)
  const bits = await cryptoApi.subtle.deriveBits(
    { name: 'ECDH', public: importedPublicKey },
    importedPrivateKey,
    256,
  )

  return new Uint8Array(bits)
}

async function deriveCommunicationCallHkdfBits(secret: Uint8Array, salt: Uint8Array, label: string, length: number) {
  const cryptoApi = getCrypto()
  const hkdfKey = await cryptoApi.subtle.importKey('raw', toArrayBuffer(secret), 'HKDF', false, ['deriveBits'])
  const bits = await cryptoApi.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: toArrayBuffer(salt),
    info: encoder.encode(label),
  }, hkdfKey, length)

  return new Uint8Array(bits)
}

async function buildCommunicationCallVerificationEmojis(secret: Uint8Array) {
  const cryptoApi = getCrypto()
  const digest = new Uint8Array(await cryptoApi.subtle.digest('SHA-256', toArrayBuffer(secret)))
  return Array.from({ length: 4 }, (_, index) => CALL_VERIFICATION_EMOJIS[digest[index] % CALL_VERIFICATION_EMOJIS.length])
}

export async function activateCommunicationCallSecurityContext(context: CommunicationCallSecurityContext, remotePublicKey: CommunicationCallE2EEPublicKey) {
  const cryptoApi = getCrypto()
  const sharedSecret = await deriveCommunicationCallSharedSecret(context.localPrivateKey, remotePublicKey)
  const txLabel = context.role === 'initiator' ? 'caller->callee' : 'callee->caller'
  const rxLabel = context.role === 'initiator' ? 'callee->caller' : 'caller->callee'
  const encryptKeyBytes = await deriveCommunicationCallHkdfBits(sharedSecret, context.salt, `${txLabel}:key`, 256)
  const decryptKeyBytes = await deriveCommunicationCallHkdfBits(sharedSecret, context.salt, `${rxLabel}:key`, 256)
  const encryptCounterSalt = await deriveCommunicationCallHkdfBits(sharedSecret, context.salt, `${txLabel}:ctr`, 128)
  const decryptCounterSalt = await deriveCommunicationCallHkdfBits(sharedSecret, context.salt, `${rxLabel}:ctr`, 128)

  context.remotePublicKey = remotePublicKey
  context.encryptKey = await cryptoApi.subtle.importKey('raw', encryptKeyBytes, 'AES-CTR', false, ['encrypt'])
  context.decryptKey = await cryptoApi.subtle.importKey('raw', decryptKeyBytes, 'AES-CTR', false, ['decrypt'])
  context.encryptCounterSalt = encryptCounterSalt
  context.decryptCounterSalt = decryptCounterSalt
  context.verificationEmojis = await buildCommunicationCallVerificationEmojis(sharedSecret)
  context.active = true
  return context
}

async function transformCommunicationEncodedFrame(frame: { data: ArrayBuffer; timestamp?: number }, key: CryptoKey, counterSalt: Uint8Array, action: 'encrypt' | 'decrypt') {
  const cryptoApi = getCrypto()
  const timestampValue = Number(frame.timestamp || 0)
  const transformed = action === 'encrypt'
    ? await cryptoApi.subtle.encrypt({ name: 'AES-CTR', counter: buildCommunicationCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)
    : await cryptoApi.subtle.decrypt({ name: 'AES-CTR', counter: buildCommunicationCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)

  frame.data = transformed
  return frame
}

export function applyCommunicationSenderCallSecurity(sender: RTCRtpSender, context: CommunicationCallSecurityContext | null, transformedSenders: WeakSet<object>) {
  if (!context?.active || !context.encryptKey || !context.encryptCounterSalt || transformedSenders.has(sender)) {
    return false
  }

  const maybeSender = sender as RTCRtpSender & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeSender.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeSender.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformCommunicationEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, context.encryptKey!, context.encryptCounterSalt!, 'encrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedSenders.add(sender)
  return true
}

export function applyCommunicationReceiverCallSecurity(receiver: RTCRtpReceiver, context: CommunicationCallSecurityContext | null, transformedReceivers: WeakSet<object>) {
  if (!context?.active || !context.decryptKey || !context.decryptCounterSalt || transformedReceivers.has(receiver)) {
    return false
  }

  const maybeReceiver = receiver as RTCRtpReceiver & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeReceiver.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeReceiver.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformCommunicationEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, context.decryptKey!, context.decryptCounterSalt!, 'decrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedReceivers.add(receiver)
  return true
}