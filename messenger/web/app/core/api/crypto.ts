import { messengerAuthRequest } from './auth'
import type { MessengerDevicePublicKey, MessengerConversationKeyPackage } from '../../entities/messages/model/useMessengerCrypto'

/**
 * Decode a message body when content_type is 'text/plain' and key_id is null
 * (CLI-agent messages stored as raw UTF-8, no e2e encryption applied).
 * Returns null when the message uses the normal encrypted/JSON format.
 */
export function decodeCliAgentMessageBody(
  ciphertext: string | Uint8Array | null | undefined,
  contentType: string | null | undefined,
  keyId: string | null | undefined,
): string | null {
  if (contentType !== 'text/plain' || keyId != null) return null
  if (!ciphertext) return ''
  if (typeof ciphertext === 'string') return ciphertext
  return new TextDecoder().decode(ciphertext)
}

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
