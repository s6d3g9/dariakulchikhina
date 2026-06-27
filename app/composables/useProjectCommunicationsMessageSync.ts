import { computed, nextTick, ref, type Ref } from 'vue'
import type {
  CommunicationActorRole,
  CommunicationKeyBundle,
  CommunicationKeyBundlesResponse,
  CommunicationMessage,
  CommunicationMessagesResponse,
  ProjectCommunicationBootstrap,
} from '~~/shared/types/communications'
import {
  createCommunicationRoomKey,
  decryptCommunicationText,
  exportCommunicationPrivateKey,
  exportCommunicationPublicKey,
  exportCommunicationRoomKey,
  generateCommunicationIdentityKeyPair,
  importCommunicationPrivateKey,
  importCommunicationRoomKey,
  wrapCommunicationRoomKeyForPeer,
} from '~~/shared/utils/communications-e2ee'

type CommunicationsApiFetch = <T>(path: string, options?: any) => Promise<T>

type DecryptedUiMessage = {
  id: string
  createdAt: string
  senderActorKey: string
  senderDisplayName: string
  text: string
}

type UseProjectCommunicationsMessageSyncOptions = {
  projectSlug: string
  actorKey: Ref<string>
  actor: Ref<ProjectCommunicationBootstrap['actor'] | null>
  currentChatRoomId: Ref<string>
  currentChatExternalRef: Ref<string>
  messagesEl: Ref<HTMLElement | null>
  apiFetch: CommunicationsApiFetch
}

export function useProjectCommunicationsMessageSync(options: UseProjectCommunicationsMessageSyncOptions) {
  const decryptedMessages = ref<DecryptedUiMessage[]>([])
  const keyBundles = ref<CommunicationKeyBundle[]>([])
  const syncStatus = ref('')
  const roomKeyReady = ref(false)
  const identityPrivateKey = ref<CryptoKey | null>(null)
  const identityPublicKeyJwk = ref<JsonWebKey | null>(null)
  const roomKey = ref<CryptoKey | null>(null)
  const myKeyId = ref('')

  const roomStorageKey = computed(() => `comm-room-key:${options.currentChatExternalRef.value || options.projectSlug}:${options.actorKey.value}`)
  const identityStorageKey = computed(() => `comm-identity:${options.projectSlug}:${options.actorKey.value}`)

  async function ensureIdentity() {
    if (identityPrivateKey.value && identityPublicKeyJwk.value && myKeyId.value) return

    if (import.meta.client) {
      const raw = sessionStorage.getItem(identityStorageKey.value)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { keyId: string; privateKeyJwk: JsonWebKey; publicKeyJwk: JsonWebKey }
          identityPrivateKey.value = await importCommunicationPrivateKey(parsed.privateKeyJwk)
          identityPublicKeyJwk.value = parsed.publicKeyJwk
          myKeyId.value = parsed.keyId
          return
        } catch {
          sessionStorage.removeItem(identityStorageKey.value)
        }
      }
    }

    const pair = await generateCommunicationIdentityKeyPair()
    identityPrivateKey.value = pair.privateKey
    identityPublicKeyJwk.value = await exportCommunicationPublicKey(pair.publicKey)
    myKeyId.value = `${options.actor.value?.role || 'actor'}-${options.actor.value?.actorId || '0'}-${Math.random().toString(36).slice(2, 8)}`

    if (import.meta.client) {
      const privateKeyJwk = await exportCommunicationPrivateKey(pair.privateKey)
      sessionStorage.setItem(identityStorageKey.value, JSON.stringify({
        keyId: myKeyId.value,
        privateKeyJwk,
        publicKeyJwk: identityPublicKeyJwk.value,
      }))
    }
  }

  async function ensureStoredRoomKey() {
    if (roomKey.value) {
      roomKeyReady.value = true
      return roomKey.value
    }

    if (import.meta.client) {
      const raw = sessionStorage.getItem(roomStorageKey.value)
      if (raw) {
        roomKey.value = await importCommunicationRoomKey(raw)
        roomKeyReady.value = true
        return roomKey.value
      }
    }

    return null
  }

  async function persistRoomKey(nextRoomKey: CryptoKey) {
    roomKey.value = nextRoomKey
    roomKeyReady.value = true
    if (import.meta.client) {
      sessionStorage.setItem(roomStorageKey.value, await exportCommunicationRoomKey(nextRoomKey))
    }
  }

  function resetMessageSyncState() {
    keyBundles.value = []
    decryptedMessages.value = []
    roomKey.value = null
    roomKeyReady.value = false
    syncStatus.value = ''
  }

  function mergeKeyBundle(bundle: CommunicationKeyBundle) {
    const bundleActorKey = `${bundle.actorRole}:${bundle.actorId}`
    const index = keyBundles.value.findIndex((item) => `${item.actorRole}:${item.actorId}` === bundleActorKey && item.keyId === bundle.keyId)
    if (index >= 0) keyBundles.value[index] = bundle
    else keyBundles.value = [...keyBundles.value, bundle]
  }

  async function publishMyKeyBundle() {
    if (!options.currentChatRoomId.value || !identityPublicKeyJwk.value || !myKeyId.value) return

    const actorRole = options.actor.value?.role as CommunicationActorRole | undefined
    const actorId = options.actor.value?.actorId || '0'
    const response = await options.apiFetch<{ keyBundle: CommunicationKeyBundle }>(`/rooms/${options.currentChatRoomId.value}/key-bundles`, {
      method: 'POST',
      body: {
        keyId: myKeyId.value,
        algorithm: 'ECDH-P256',
        publicKeyJwk: identityPublicKeyJwk.value,
        deviceId: `${actorRole || 'actor'}-${actorId}`,
      },
    })
    mergeKeyBundle(response.keyBundle)
  }

  async function rebuildDecryptedMessages(messages: CommunicationMessage[]) {
    const activeRoomKey = await ensureStoredRoomKey()
    if (!activeRoomKey) {
      decryptedMessages.value = messages.map((message) => ({
        id: message.id,
        createdAt: message.createdAt,
        senderActorKey: `${message.senderRole}:${message.senderActorId}`,
        senderDisplayName: message.senderDisplayName || message.senderActorId,
        text: '[ ЗАШИФРОВАНО ]',
      }))
      return
    }

    const result: DecryptedUiMessage[] = []
    for (const message of messages) {
      let text = '[ НЕ УДАЛОСЬ РАСШИФРОВАТЬ ]'
      try {
        text = await decryptCommunicationText({ roomKey: activeRoomKey, encrypted: message.encrypted })
      } catch {
        text = '[ НЕ УДАЛОСЬ РАСШИФРОВАТЬ ]'
      }
      result.push({
        id: message.id,
        createdAt: message.createdAt,
        senderActorKey: `${message.senderRole}:${message.senderActorId}`,
        senderDisplayName: message.senderDisplayName || message.senderActorId,
        text,
      })
    }

    decryptedMessages.value = result
    await nextTick()
    options.messagesEl.value?.scrollTo({ top: options.messagesEl.value.scrollHeight, behavior: 'smooth' })
  }

  async function fetchMessagesAndKeys() {
    if (!options.currentChatRoomId.value) return
    await publishMyKeyBundle()
    const [messageResponse, bundleResponse] = await Promise.all([
      options.apiFetch<CommunicationMessagesResponse>(`/rooms/${options.currentChatRoomId.value}/messages?limit=100`, { method: 'GET' }),
      options.apiFetch<CommunicationKeyBundlesResponse>(`/rooms/${options.currentChatRoomId.value}/key-bundles`, { method: 'GET' }),
    ])
    keyBundles.value = bundleResponse.keyBundles || []
    await rebuildDecryptedMessages(messageResponse.messages || [])
  }

  async function createAndBroadcastRoomKeyIfNeeded() {
    const existingRoomKey = await ensureStoredRoomKey()
    if (existingRoomKey || !identityPrivateKey.value) return existingRoomKey

    const newRoomKey = await createCommunicationRoomKey()
    await persistRoomKey(newRoomKey)
    await shareRoomKeyWithKnownPeers()
    return newRoomKey
  }

  async function shareRoomKeyWithKnownPeers(targetActorKey?: string) {
    if (!options.currentChatRoomId.value || !roomKey.value || !identityPrivateKey.value || !identityPublicKeyJwk.value) return

    const rawRoomKey = await exportCommunicationRoomKey(roomKey.value)
    const peerBundles = keyBundles.value.filter((bundle) => {
      const bundleActorKey = `${bundle.actorRole}:${bundle.actorId}`
      return bundleActorKey !== options.actorKey.value && (!targetActorKey || targetActorKey === bundleActorKey)
    })

    for (const bundle of peerBundles) {
      const wrapped = await wrapCommunicationRoomKeyForPeer({
        roomKeyBase64: rawRoomKey,
        senderPrivateKey: identityPrivateKey.value,
        recipientPublicKeyJwk: bundle.publicKeyJwk,
      })
      await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: {
          kind: 'room-key',
          callId: `room-key-${Date.now()}`,
          targetActorKey: `${bundle.actorRole}:${bundle.actorId}`,
          payload: {
            senderKeyId: myKeyId.value,
            senderPublicKeyJwk: identityPublicKeyJwk.value,
            wrappedCiphertext: wrapped.ciphertext,
            iv: wrapped.iv,
          },
        },
      })
    }
  }

  async function refreshMessagesOnly() {
    if (!options.currentChatRoomId.value) return
    const response = await options.apiFetch<CommunicationMessagesResponse>(`/rooms/${options.currentChatRoomId.value}/messages?limit=100`, { method: 'GET' })
    await rebuildDecryptedMessages(response.messages || [])
  }

  return {
    decryptedMessages,
    keyBundles,
    syncStatus,
    roomKeyReady,
    identityPrivateKey,
    roomKey,
    myKeyId,
    ensureIdentity,
    ensureStoredRoomKey,
    persistRoomKey,
    resetMessageSyncState,
    mergeKeyBundle,
    rebuildDecryptedMessages,
    fetchMessagesAndKeys,
    createAndBroadcastRoomKeyIfNeeded,
    shareRoomKeyWithKnownPeers,
    refreshMessagesOnly,
  }
}