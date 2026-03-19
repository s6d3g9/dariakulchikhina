interface MessengerAuthUser {
  id: string
  login: string
  displayName: string
}

export interface MessengerContactsOverview {
  contacts: Array<{
    id: string
    displayName: string
    login: string
    createdAt: string
  }>
  invites: Array<{
    id: string
    displayName: string
    login: string
    direction: 'incoming' | 'outgoing'
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: string
  }>
  discover: Array<{
    id: string
    displayName: string
    login: string
    relationship: 'none' | 'incoming' | 'outgoing' | 'contact'
  }>
}

interface MessengerAuthResponse {
  token: string
  user: MessengerAuthUser
}

const STORAGE_KEY = 'daria-messenger-token'

export function useMessengerAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('messenger-auth-token', () => null)
  const user = useState<MessengerAuthUser | null>('messenger-auth-user', () => null)
  const ready = useState<boolean>('messenger-auth-ready', () => false)

  function readStoredToken() {
    if (!import.meta.client) {
      return null
    }

    return window.localStorage.getItem(STORAGE_KEY)
  }

  function writeStoredToken(value: string | null) {
    if (!import.meta.client) {
      return
    }

    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value)
      return
    }

    window.localStorage.removeItem(STORAGE_KEY)
  }

  async function request<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
    const headers = new Headers(options.headers as HeadersInit | undefined)
    if (token.value) {
      headers.set('Authorization', `Bearer ${token.value}`)
    }

    return await $fetch<T>(`${config.public.messengerCoreBaseUrl}${path}`, {
      ...options,
      headers,
    })
  }

  async function hydrate() {
    if (ready.value) {
      return
    }

    token.value = readStoredToken()
    if (!token.value) {
      ready.value = true
      return
    }

    try {
      const response = await request<{ user: MessengerAuthUser }>('/auth/me')
      user.value = response.user
    } catch {
      token.value = null
      user.value = null
      writeStoredToken(null)
    } finally {
      ready.value = true
    }
  }

  function acceptAuth(response: MessengerAuthResponse) {
    token.value = response.token
    user.value = response.user
    writeStoredToken(response.token)
    ready.value = true
  }

  async function login(payload: { login: string; password: string }) {
    const response = await request<MessengerAuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    })
    acceptAuth(response)
  }

  async function register(payload: { login: string; password: string; displayName: string }) {
    const response = await request<MessengerAuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    })
    acceptAuth(response)
  }

  function logout() {
    token.value = null
    user.value = null
    writeStoredToken(null)
  }

  return {
    token,
    user,
    ready,
    request,
    hydrate,
    login,
    register,
    logout,
  }
}
