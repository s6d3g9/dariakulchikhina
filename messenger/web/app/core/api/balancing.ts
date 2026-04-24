import type { MessengerBalancingState } from '../../entities/balancing/model/useMessengerBalancing'

export function useBalancingApi() {
  const auth = useMessengerAuth()

  function getBalancing() {
    return auth.request<{ state: MessengerBalancingState; configPath: string }>('/balancing', { method: 'GET' })
  }

  function putBalancing(state: MessengerBalancingState) {
    return auth.request<{ state: MessengerBalancingState; configPath: string }>('/balancing', {
      method: 'PUT',
      body: state,
    })
  }

  function resetBalancing() {
    return auth.request<{ state: MessengerBalancingState; configPath: string }>('/balancing/reset', {
      method: 'POST',
    })
  }

  return { getBalancing, putBalancing, resetBalancing }
}
