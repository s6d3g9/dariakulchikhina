import type { MessengerDevicePublicKey, MessengerConversationKeyPackage } from '../../entities/messages/model/useMessengerCrypto'

export type MessengerConversationKeyPackageSubmission = Omit<MessengerConversationKeyPackage, 'createdAt'>

export function useCryptoApi() {
  const auth = useMessengerAuth()

  function putDeviceKey(publicKey: MessengerDevicePublicKey) {
    return auth.request<void>('/crypto/device-key', {
      method: 'PUT',
      body: { publicKey },
    })
  }

  function getConversationEncryption(conversationId: string) {
    return auth.request<{ keyPackage: MessengerConversationKeyPackage | null }>(
      `/conversations/${conversationId}/encryption`,
      { method: 'GET' },
    )
  }

  function postConversationEncryption(conversationId: string, packages: MessengerConversationKeyPackageSubmission[]) {
    return auth.request<void>(`/conversations/${conversationId}/encryption`, {
      method: 'POST',
      body: { packages },
    })
  }

  function getUserDeviceKey(userId: string) {
    return auth.request<{ publicKey: MessengerDevicePublicKey | null }>(
      `/users/${userId}/device-key`,
      { method: 'GET' },
    )
  }

  return {
    putDeviceKey,
    getConversationEncryption,
    postConversationEncryption,
    getUserDeviceKey,
  }
}
