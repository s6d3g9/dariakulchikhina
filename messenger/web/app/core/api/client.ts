import { buildMessengerUrl } from '../../utils/messenger-url'

export interface MessengerApiError {
  statusCode: number
  message: string
}

type AuthTokenProvider = () => string | null

let _authTokenProvider: AuthTokenProvider = () => null

export function setAuthTokenProvider(fn: AuthTokenProvider): void {
  _authTokenProvider = fn
}

export function messengerApi<T>(
  path: string,
  init: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
  const config = useRuntimeConfig()
  const url = buildMessengerUrl(config.public.messengerCoreBaseUrl, path)

  const headers = new Headers(init?.headers as HeadersInit | undefined)
  const token = _authTokenProvider()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return $fetch<T>(url, { ...init, headers })
}
