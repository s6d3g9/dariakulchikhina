import { messengerAuthRequest } from './auth'
import type { MessengerDevicePublicKey, MessengerConversationKeyPackage } from '../../entities/messages/model/useMessengerCrypto'

export type MessengerConversationKeyPackageSubmission = Omit<MessengerConversationKeyPackage, 'createdAt'>

// NOTE: this module deliberately uses `messengerAuthRequest` (a plain helper
// that reads the current token via an injected provider) instead of
// `useMessengerAuth()`.  Wrapping it in a composable used to create a setup-
// time cycle:
//   useMessengerAuth → useMessengerCrypto → useCryptoApi → useMessengerAuth
// which blew the stack during Nuxt app init ("Maximum call stack size
// exceeded"). `messengerAuthRequest` has no composable dependencies so the
// cycle is broken here.
export function useCryptoApi() {
  function putDeviceKey(publicKey: MessengerDevicePublicKey) {
    return messengerAuthRequest<void>('/crypto/device-key', {
      method: 'PUT',
      body: { publicKey },
    })
  }

  function getConversationEncryption(conversationId: string) {
    return messengerAuthRequest<{ keyPackage: MessengerConversationKeyPackage | null }>(
      `/conversations/${conversationId}/encryption`,
      { method: 'GET' },
    )
  }

  function postConversationEncryption(conversationId: string, packages: MessengerConversationKeyPackageSubmission[]) {
    return messengerAuthRequest<void>(`/conversations/${conversationId}/encryption`, {
      method: 'POST',
      body: { packages },
    })
  }

  function getUserDeviceKey(userId: string) {
    return messengerAuthRequest<{ publicKey: MessengerDevicePublicKey | null }>(
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
