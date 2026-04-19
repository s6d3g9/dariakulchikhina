import { useMessengerAuth } from '../../entities/auth/model/useMessengerAuth'
import { MessengerDevicePublicKey } from '../../entities/messages/model/useMessengerCrypto'

export function useMessengerCryptoApi() {
  const auth = useMessengerAuth()

  async function putDeviceKey(publicKey: MessengerDevicePublicKey) {
    return await auth.request('/crypto/device-key', {
      method: 'PUT',
      body: {
        publicKey,
      },
    })
  }

  async function getDeviceKey(userId: string) {
    return await auth.request<{ publicKey: MessengerDevicePublicKey | null }>(`/users/${userId}/device-key`, {
      method: 'GET',
    })
  }

  return {
    putDeviceKey,
    getDeviceKey,
  }
}
