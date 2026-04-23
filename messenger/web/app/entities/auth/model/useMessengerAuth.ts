import {
  login as authLogin,
  register as authRegister,
  getMe,
  setAuthTokenProvider,
  messengerAuthRequest,
  type MessengerAuthUser,
  type MessengerAuthResponse,
} from '../../../core/api/auth'

export type { MessengerAuthUser, MessengerAuthResponse }

export interface MessengerContactsOverview {
  contacts: Array<{
    id: string
    displayName: string
    login: string
    createdAt: string
    peerType: 'user' | 'agent'
    description?: string
  }>
  invites: Array<{
    id: string
    peerUserId: string
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
    relationship: 'none' | 'incoming' | 'outgoing' | 'contact' | 'agent'
    peerType: 'user' | 'agent'
    description?: string
  }>
}

type MessengerAuthPersistenceMode = 'local' | 'session'

const LOCAL_STORAGE_KEY = 'daria-messenger-token'
const SESSION_STORAGE_KEY = 'daria-messenger-token-session'
const LOCAL_USER_STORAGE_KEY = 'daria-messenger-user'
const SESSION_USER_STORAGE_KEY = 'daria-messenger-user-session'

function isUnauthorizedError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'statusCode' in error
    && (error as { statusCode?: number }).statusCode === 401,
  )
}

export function useMessengerAuth() {
  const messengerCrypto = useMessengerCrypto()
  const token = useState<string | null>('messenger-auth-token', () => null)
  const user = useState<MessengerAuthUser | null>('messenger-auth-user', () => null)
  const ready = useState<boolean>('messenger-auth-ready', () => false)
  const persistenceMode = useState<MessengerAuthPersistenceMode>('messenger-auth-persistence-mode', () => 'local')

  setAuthTokenProvider(() => token.value)

  function readStoredToken() {
    if (!import.meta.client) {
      return null
    }

    const sessionToken = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (sessionToken) {
      return {
        token: sessionToken,
        user: JSON.parse(window.sessionStorage.getItem(SESSION_USER_STORAGE_KEY) || 'null') as MessengerAuthUser | null,
        mode: 'session' as const,
      }
    }

    const localToken = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (localToken) {
      return {
        token: localToken,
        user: JSON.parse(window.localStorage.getItem(LOCAL_USER_STORAGE_KEY) || 'null') as MessengerAuthUser | null,
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
    window.localStorage.removeItem(LOCAL_USER_STORAGE_KEY)
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY)
  }

  function writeStoredAuth(value: { token: string | null; user: MessengerAuthUser | null }, mode = persistenceMode.value) {
    if (!import.meta.client) {
      return
    }

    clearStoredTokens()

    if (value.token) {
      if (mode === 'session') {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, value.token)
        if (value.user) {
          window.sessionStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(value.user))
        }
      } else {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, value.token)
        if (value.user) {
          window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(value.user))
        }
      }
      return
    }
  }

  const request = messengerAuthRequest

  async function hydrate() {
    if (ready.value) {
      return
    }

    const stored = readStoredToken()
    token.value = stored?.token || null
    user.value = stored?.user || null
    persistenceMode.value = stored?.mode || 'local'

    if (!token.value) {
      ready.value = true
      return
    }

    try {
      const response = await getMe()
      user.value = response.user
      await useMessengerCrypto().ensureDeviceIdentity(response.user.id)
      writeStoredAuth({ token: token.value, user: user.value }, persistenceMode.value)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        token.value = null
        user.value = null
        writeStoredAuth({ token: null, user: null }, persistenceMode.value)
      }
    } finally {
      ready.value = true
    }
  }

  function acceptAuth(response: MessengerAuthResponse) {
    token.value = response.token
    user.value = response.user
    writeStoredAuth({ token: response.token, user: response.user }, persistenceMode.value)
    ready.value = true
  }

  function setPersistence(mode: MessengerAuthPersistenceMode) {
    persistenceMode.value = mode

    if (token.value) {
      writeStoredAuth({ token: token.value, user: user.value }, mode)
    }
  }

  async function login(payload: { login: string; password: string }) {
    const response = await authLogin(payload)
    acceptAuth(response)
    try {
      await useMessengerCrypto().ensureDeviceIdentity(response.user.id)
    } catch (err) {
      // Device-identity crypto requires a secure context (HTTPS or localhost).
      // On plain HTTP deployments window.crypto.subtle is undefined and this
      // throws "Cannot read properties of undefined". CLI-agent chats bypass
      // e2e encryption (per fix-ws-stream merge), so the user can still use
      // the messenger; only user-to-user encrypted chats will degrade.
      console.warn("[auth] device-identity setup failed, continuing without crypto:", err)
    }
  }

  async function register(payload: { login: string; password: string; displayName: string }) {
    const response = await authRegister(payload)
    acceptAuth(response)
    try {
      await useMessengerCrypto().ensureDeviceIdentity(response.user.id)
    } catch (err) {
      console.warn("[auth] device-identity setup failed, continuing without crypto:", err)
    }
  }

  function logout() {
    token.value = null
    user.value = null
    writeStoredAuth({ token: null, user: null }, persistenceMode.value)
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
