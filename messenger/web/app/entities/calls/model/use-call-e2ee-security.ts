export interface MessengerCallE2EEPublicKey {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

export interface MessengerCallE2EEPayload {
  supported: boolean
  publicKey?: MessengerCallE2EEPublicKey
  salt?: string
}

export interface MessengerCallSecurityContext {
  callId: string
  role: 'initiator' | 'responder'
  localPublicKey: MessengerCallE2EEPublicKey
  localPrivateKey: JsonWebKey
  remotePublicKey?: MessengerCallE2EEPublicKey
  salt: Uint8Array
  encryptKey?: CryptoKey
  decryptKey?: CryptoKey
  encryptCounterSalt?: Uint8Array
  decryptCounterSalt?: Uint8Array
  verificationEmojis: string[]
  active: boolean
}

const CALL_VERIFICATION_EMOJIS = ['🔒', '🎧', '🎤', '🛡️', '🎼', '🌿', '🔥', '⚡', '🌊', '🪐', '🍀', '🧩', '🛰️', '🎯', '🌙', '🫧', '🎹', '🦋', '☀️', '🧭', '💎', '🪶', '🎛️', '🧠', '🐚', '🕊️', '🧿', '🪙', '🌈', '❄️', '🍃', '🔑']

let callSecurityContext: MessengerCallSecurityContext | null = null
const transformedSenders = new WeakSet<object>()
const transformedReceivers = new WeakSet<object>()

function isExperimentalCallE2EEEnabled() {
  if (!import.meta.client) {
    return false
  }

  try {
    return window.localStorage.getItem('daria-messenger-call-e2ee') === '1'
  } catch {
    return false
  }
}

function supportsInsertableCallEncryption() {
  if (!import.meta.client || typeof RTCRtpSender === 'undefined' || typeof RTCRtpReceiver === 'undefined') {
    return false
  }

  if (!isExperimentalCallE2EEEnabled()) {
    return false
  }

  return typeof (RTCRtpSender.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof (RTCRtpReceiver.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof crypto?.subtle !== 'undefined'
}

function encodeCallBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''

  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }

  return btoa(binary)
}

function decodeCallBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function buildCtrCounter(counterSalt: Uint8Array, timestampValue: number) {
  const counter = new Uint8Array(16)
  counter.set(counterSalt.slice(0, 8), 0)

  let nextValue = BigInt(Math.max(0, Math.floor(timestampValue)))
  for (let index = 15; index >= 8; index -= 1) {
    counter[index] = Number(nextValue & BigInt(255))
    nextValue >>= BigInt(8)
  }

  return counter
}

async function generateCallE2EEKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  return {
    publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey) as MessengerCallE2EEPublicKey,
    privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
  }
}

async function importCallPrivateKey(privateKey: JsonWebKey) {
  return await crypto.subtle.importKey('jwk', privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
}

async function importCallPublicKey(publicKey: MessengerCallE2EEPublicKey) {
  return await crypto.subtle.importKey('jwk', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

async function deriveCallSharedSecret(privateKey: JsonWebKey, publicKey: MessengerCallE2EEPublicKey) {
  const importedPrivateKey = await importCallPrivateKey(privateKey)
  const importedPublicKey = await importCallPublicKey(publicKey)
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedPublicKey },
    importedPrivateKey,
    256,
  )

  return new Uint8Array(bits)
}

async function deriveCallHkdfBits(secret: Uint8Array, salt: Uint8Array, label: string, length: number) {
  const hkdfKey = await crypto.subtle.importKey('raw', secret as unknown as ArrayBuffer, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: salt as unknown as ArrayBuffer,
    info: new TextEncoder().encode(label),
  }, hkdfKey, length)

  return new Uint8Array(bits)
}

async function buildCallVerificationEmojis(secret: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', secret as unknown as ArrayBuffer))
  return Array.from({ length: 4 }, (_, index) => CALL_VERIFICATION_EMOJIS[digest[index]! % CALL_VERIFICATION_EMOJIS.length]!)
}

async function activateCallSecurityContext(remotePublicKey: MessengerCallE2EEPublicKey) {
  if (!callSecurityContext) {
    return false
  }

  const sharedSecret = await deriveCallSharedSecret(callSecurityContext.localPrivateKey, remotePublicKey)
  const txLabel = callSecurityContext.role === 'initiator' ? 'caller->callee' : 'callee->caller'
  const rxLabel = callSecurityContext.role === 'initiator' ? 'callee->caller' : 'caller->callee'
  const encryptKeyBytes = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${txLabel}:key`, 256)
  const decryptKeyBytes = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${rxLabel}:key`, 256)
  const encryptCounterSalt = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${txLabel}:ctr`, 128)
  const decryptCounterSalt = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${rxLabel}:ctr`, 128)

  callSecurityContext.remotePublicKey = remotePublicKey
  callSecurityContext.encryptKey = await crypto.subtle.importKey('raw', encryptKeyBytes, 'AES-CTR', false, ['encrypt'])
  callSecurityContext.decryptKey = await crypto.subtle.importKey('raw', decryptKeyBytes, 'AES-CTR', false, ['decrypt'])
  callSecurityContext.encryptCounterSalt = encryptCounterSalt
  callSecurityContext.decryptCounterSalt = decryptCounterSalt
  callSecurityContext.verificationEmojis = await buildCallVerificationEmojis(sharedSecret)
  callSecurityContext.active = true
  return true
}

async function transformEncodedFrame(frame: { data: ArrayBuffer; timestamp?: number }, key: CryptoKey, counterSalt: Uint8Array, action: 'encrypt' | 'decrypt') {
  const timestampValue = Number(frame.timestamp || 0)
  const transformed = action === 'encrypt'
    ? await crypto.subtle.encrypt({ name: 'AES-CTR', counter: buildCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)
    : await crypto.subtle.decrypt({ name: 'AES-CTR', counter: buildCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)

  frame.data = transformed
  return frame
}

function applySenderCallSecurity(sender: RTCRtpSender) {
  if (!callSecurityContext?.active || !callSecurityContext.encryptKey || !callSecurityContext.encryptCounterSalt || transformedSenders.has(sender)) {
    return false
  }

  const maybeSender = sender as RTCRtpSender & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeSender.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeSender.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, callSecurityContext!.encryptKey!, callSecurityContext!.encryptCounterSalt!, 'encrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedSenders.add(sender)
  return true
}

function applyReceiverCallSecurity(receiver: RTCRtpReceiver) {
  if (!callSecurityContext?.active || !callSecurityContext.decryptKey || !callSecurityContext.decryptCounterSalt || transformedReceivers.has(receiver)) {
    return false
  }

  const maybeReceiver = receiver as RTCRtpReceiver & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeReceiver.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeReceiver.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, callSecurityContext!.decryptKey!, callSecurityContext!.decryptCounterSalt!, 'decrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedReceivers.add(receiver)
  return true
}

function clearCallSecurityContext() {
  callSecurityContext = null
}

function getCallSecurityContext() {
  return callSecurityContext
}

function setCallSecurityContext(ctx: MessengerCallSecurityContext | null) {
  callSecurityContext = ctx
}

export function useCallE2EESecurity() {
  return {
    supportsInsertableCallEncryption,
    isExperimentalCallE2EEEnabled,
    encodeCallBase64,
    decodeCallBase64,
    generateCallE2EEKeyPair,
    activateCallSecurityContext,
    clearCallSecurityContext,
    applySenderCallSecurity,
    applyReceiverCallSecurity,
    getCallSecurityContext,
    setCallSecurityContext,
  }
}
