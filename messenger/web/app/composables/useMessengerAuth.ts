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

type MessengerAuthPersistenceMode = 'local' | 'session'

const LOCAL_STORAGE_KEY = 'daria-messenger-token'
const SESSION_STORAGE_KEY = 'daria-messenger-token-session'

export function useMessengerAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('messenger-auth-token', () => null)
  const user = useState<MessengerAuthUser | null>('messenger-auth-user', () => null)
  const ready = useState<boolean>('messenger-auth-ready', () => false)
  const persistenceMode = useState<MessengerAuthPersistenceMode>('messenger-auth-persistence-mode', () => 'local')

  function readStoredToken() {
    if (!import.meta.client) {
      return null
    }

    const sessionToken = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (sessionToken) {
      return {
        token: sessionToken,
        mode: 'session' as const,
      }
    }

    const localToken = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (localToken) {
      return {
        token: localToken,
        mode: 'local' as const,
      }
    }

    return null
  }

  function clearStoredTokens() {
    if (!import.meta.client) {
      return
    }

    window.localStorage.removeItem(LOCAL_STORAGE_KEY)
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }

  function writeStoredToken(value: string | null, mode = persistenceMode.value) {
    if (!import.meta.client) {
      return
    }

    clearStoredTokens()

    if (value) {
      if (mode === 'session') {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, value)
      } else {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, value)
      }
      return
    }
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

    const stored = readStoredToken()
    token.value = stored?.token || null
    persistenceMode.value = stored?.mode || 'local'

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
      writeStoredToken(null, persistenceMode.value)
    } finally {
      ready.value = true
    }
  }

  function acceptAuth(response: MessengerAuthResponse) {
    token.value = response.token
    user.value = response.user
    writeStoredToken(response.token, persistenceMode.value)
    ready.value = true
  }

  function setPersistence(mode: MessengerAuthPersistenceMode) {
    persistenceMode.value = mode

    if (token.value) {
      writeStoredToken(token.value, mode)
    }
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
    writeStoredToken(null, persistenceMode.value)
  }

  return {
    token,
    user,
    ready,
    persistenceMode,
    request,
    hydrate,
    login,
    register,
    setPersistence,
    logout,
  }
}
