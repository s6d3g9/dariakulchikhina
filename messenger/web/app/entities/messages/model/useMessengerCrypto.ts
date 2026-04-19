import { useMessengerCryptoApi } from '../../../core/api/crypto'

type MessengerRequest = <T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) => Promise<T>

export interface MessengerDevicePublicKey {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

export interface MessengerEncryptedPayload {
  algorithm: 'aes-gcm-256'
  ciphertext: string
  iv: string
}

export interface MessengerEncryptedBinaryPayload {
  algorithm: 'aes-gcm-256'
  iv: string
}

export interface MessengerConversationKeyPackage {
  recipientUserId: string
  wrappedKey: string
  iv: string
  senderPublicKey: MessengerDevicePublicKey
  createdAt: string
}

export interface MessengerConversationSecuritySummary {
  protocolLabel: string
  protocolMeta: string
  deviceKeyReady: boolean
  deviceKeyMeta: string
  peerDeviceKeyReady: boolean
  peerDeviceKeyMeta: string
  conversationKeyReady: boolean
  conversationKeyMeta: string
  keyPackageCreatedAt?: string
}

interface MessengerStoredDeviceKeyPair {
  publicKey: MessengerDevicePublicKey
  privateKey: JsonWebKey
}

const DEVICE_KEY_PREFIX = 'daria-messenger-device-key:'
const CONVERSATION_KEY_PREFIX = 'daria-messenger-conversation-key:'

function encodeBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''

  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }

  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function importDevicePrivateKey(privateKey: JsonWebKey) {
  return await crypto.subtle.importKey(
    'jwk',
    privateKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
}

async function importDevicePublicKey(publicKey: MessengerDevicePublicKey) {
  return await crypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  )
}

async function importConversationKey(rawKey: Uint8Array) {
  return await crypto.subtle.importKey('raw', rawKey as unknown as ArrayBuffer, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

async function deriveWrappingKey(privateKey: JsonWebKey, publicKey: MessengerDevicePublicKey) {
  const importedPrivateKey = await importDevicePrivateKey(privateKey)
  const importedPublicKey = await importDevicePublicKey(publicKey)
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedPublicKey },
    importedPrivateKey,
    256,
  )

  return await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export function useMessengerCrypto() {
  const cryptoApi = useMessengerCryptoApi()
  const deviceKeys = useState<Record<string, MessengerStoredDeviceKeyPair>>('messenger-device-keys', () => ({}))
  const conversationKeys = useState<Record<string, string>>('messenger-conversation-keys', () => ({}))
  const registeredUserIds = useState<Record<string, string>>('messenger-crypto-registered-users', () => ({}))

  function deviceStorageKey(userId: string) {
    return `${DEVICE_KEY_PREFIX}${userId}`
  }

  function conversationStorageKey(userId: string, conversationId: string) {
    return `${CONVERSATION_KEY_PREFIX}${userId}:${conversationId}`
  }

  function readStoredDeviceKey(userId: string) {
    if (!import.meta.client) {
      return null
    }

    const raw = window.localStorage.getItem(deviceStorageKey(userId))
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as MessengerStoredDeviceKeyPair
    } catch {
      return null
    }
  }

  function writeStoredDeviceKey(userId: string, value: MessengerStoredDeviceKeyPair) {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(deviceStorageKey(userId), JSON.stringify(value))
  }

  function readStoredConversationKey(userId: string, conversationId: string) {
    if (!import.meta.client) {
      return null
    }

    return window.localStorage.getItem(conversationStorageKey(userId, conversationId))
  }

  function writeStoredConversationKey(userId: string, conversationId: string, value: string) {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(conversationStorageKey(userId, conversationId), value)
  }

  async function generateDeviceKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    )

    return {
      publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey) as MessengerDevicePublicKey,
      privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
    }
  }

  async function ensureDeviceIdentity(userId: string) {
    if (!import.meta.client) {
      throw new Error('CRYPTO_CLIENT_ONLY')
    }

    let stored = deviceKeys.value[userId] || readStoredDeviceKey(userId)
    if (!stored) {
      stored = await generateDeviceKeyPair()
      writeStoredDeviceKey(userId, stored)
    }

    deviceKeys.value[userId] = stored

    if (registeredUserIds.value[userId] !== stored.publicKey.x) {
      await cryptoApi.putDeviceKey(stored.publicKey)
      registeredUserIds.value[userId] = stored.publicKey.x
    }

    return stored
  }

  async function wrapConversationKeyForPeer(
    rawConversationKey: Uint8Array,
    ownPrivateKey: JsonWebKey,
    ownPublicKey: MessengerDevicePublicKey,
    peerPublicKey: MessengerDevicePublicKey,
    peerUserId: string,
  ) {
    const wrappingKey = await deriveWrappingKey(ownPrivateKey, peerPublicKey)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const wrapped = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrappingKey,
      rawConversationKey as unknown as ArrayBuffer,
    )

    return {
      recipientUserId: peerUserId,
      wrappedKey: encodeBase64(wrapped),
      iv: encodeBase64(iv),
      senderPublicKey: ownPublicKey,
    }
  }

  async function unwrapConversationKey(packageRecord: MessengerConversationKeyPackage, ownPrivateKey: JsonWebKey) {
    const wrappingKey = await deriveWrappingKey(ownPrivateKey, packageRecord.senderPublicKey)
    const rawKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64(packageRecord.iv) },
      wrappingKey,
      decodeBase64(packageRecord.wrappedKey),
    )

    return new Uint8Array(rawKey)
  }

  async function ensureConversationKey(
    request: MessengerRequest,
    userId: string,
    conversationId: string,
    peerUserId: string,
  ) {
    if (!import.meta.client) {
      throw new Error('CRYPTO_CLIENT_ONLY')
    }

    const cacheKey = `${userId}:${conversationId}`
    const storedRawKey = conversationKeys.value[cacheKey] || readStoredConversationKey(userId, conversationId)
    if (storedRawKey) {
      conversationKeys.value[cacheKey] = storedRawKey
      return await importConversationKey(decodeBase64(storedRawKey))
    }

    const deviceIdentity = await ensureDeviceIdentity(userId)
    const encryptionState = await request<{ keyPackage: MessengerConversationKeyPackage | null }>(`/conversations/${conversationId}/encryption`, {
      method: 'GET',
    })

    if (encryptionState.keyPackage) {
      const rawConversationKey = await unwrapConversationKey(encryptionState.keyPackage, deviceIdentity.privateKey)
      const encodedRawConversationKey = encodeBase64(rawConversationKey)
      conversationKeys.value[cacheKey] = encodedRawConversationKey
      writeStoredConversationKey(userId, conversationId, encodedRawConversationKey)
      return await importConversationKey(rawConversationKey)
    }

    const peerKeyResponse = await cryptoApi.getDeviceKey(peerUserId)

    if (!peerKeyResponse.publicKey) {
      throw new Error('PEER_DEVICE_KEY_MISSING')
    }

    const conversationKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    const rawConversationKey = new Uint8Array(await crypto.subtle.exportKey('raw', conversationKey))
    const encodedRawConversationKey = encodeBase64(rawConversationKey)

    conversationKeys.value[cacheKey] = encodedRawConversationKey
    writeStoredConversationKey(userId, conversationId, encodedRawConversationKey)

    await request(`/conversations/${conversationId}/encryption`, {
      method: 'POST',
      body: {
        packages: [
          await wrapConversationKeyForPeer(
            rawConversationKey,
            deviceIdentity.privateKey,
            deviceIdentity.publicKey,
            peerKeyResponse.publicKey,
            peerUserId,
          ),
        ],
      },
    })

    return conversationKey
  }

  async function encryptText(request: MessengerRequest, userId: string, conversationId: string, peerUserId: string, body: string) {
    const conversationKey = await ensureConversationKey(request, userId, conversationId, peerUserId)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedBody = new TextEncoder().encode(body)
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      conversationKey,
      encodedBody,
    )

    return {
      algorithm: 'aes-gcm-256' as const,
      ciphertext: encodeBase64(ciphertext),
      iv: encodeBase64(iv),
    }
  }

  async function decryptText(
    request: MessengerRequest,
    userId: string,
    conversationId: string,
    peerUserId: string,
    encryptedBody: MessengerEncryptedPayload,
  ) {
    const conversationKey = await ensureConversationKey(request, userId, conversationId, peerUserId)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64(encryptedBody.iv) },
      conversationKey,
      decodeBase64(encryptedBody.ciphertext),
    )

    return new TextDecoder().decode(plaintext)
  }

  async function encryptBinary(
    request: MessengerRequest,
    userId: string,
    conversationId: string,
    peerUserId: string,
    input: ArrayBuffer,
  ) {
    const conversationKey = await ensureConversationKey(request, userId, conversationId, peerUserId)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      conversationKey,
      input,
    )

    return {
      payload: new Blob([ciphertext], { type: 'application/octet-stream' }),
      encryption: {
        algorithm: 'aes-gcm-256' as const,
        iv: encodeBase64(iv),
      },
    }
  }

  async function decryptBinary(
    request: MessengerRequest,
    userId: string,
    conversationId: string,
    peerUserId: string,
    encryptedFile: MessengerEncryptedBinaryPayload,
    input: ArrayBuffer,
  ) {
    const conversationKey = await ensureConversationKey(request, userId, conversationId, peerUserId)
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64(encryptedFile.iv) },
      conversationKey,
      input,
    )
  }

  async function getConversationSecuritySummary(
    request: MessengerRequest,
    userId: string,
    conversationId: string,
    peerUserId: string,
  ): Promise<MessengerConversationSecuritySummary> {
    const storedDeviceKey = deviceKeys.value[userId] || readStoredDeviceKey(userId)
    const storedConversationKey = conversationKeys.value[`${userId}:${conversationId}`] || readStoredConversationKey(userId, conversationId)
    const keyPackageResponse = await request<{ keyPackage: MessengerConversationKeyPackage | null }>(`/conversations/${conversationId}/encryption`, {
      method: 'GET',
    })
    const peerKeyResponse = await request<{ publicKey: MessengerDevicePublicKey | null }>(`/users/${peerUserId}/device-key`, {
      method: 'GET',
    })

    return {
      protocolLabel: 'E2EE активно',
      protocolMeta: 'Для текста используется AES-GCM 256, а обмен ключом чата идёт через ECDH P-256.',
      deviceKeyReady: Boolean(storedDeviceKey),
      deviceKeyMeta: storedDeviceKey
        ? 'Ключ устройства хранится только в браузере на этом устройстве и не показывается в интерфейсе.'
        : 'Ключ устройства ещё не подготовлен.',
      peerDeviceKeyReady: Boolean(peerKeyResponse.publicKey),
      peerDeviceKeyMeta: peerKeyResponse.publicKey
        ? 'Публичный ключ собеседника зарегистрирован и используется только для обмена ключом чата.'
        : 'Публичный ключ собеседника пока недоступен.',
      conversationKeyReady: Boolean(storedConversationKey || keyPackageResponse.keyPackage),
      conversationKeyMeta: storedConversationKey
        ? 'Ключ этого чата уже сохранён локально на устройстве.'
        : keyPackageResponse.keyPackage
          ? 'Для этого чата есть зашифрованный пакет ключа. Он будет расшифрован только на устройстве.'
          : 'Ключ чата появится после первого защищённого сообщения.',
      keyPackageCreatedAt: keyPackageResponse.keyPackage?.createdAt,
    }
  }

  return {
    ensureDeviceIdentity,
    ensureConversationKey,
    encryptText,
    decryptText,
    encryptBinary,
    decryptBinary,
    getConversationSecuritySummary,
  }
}