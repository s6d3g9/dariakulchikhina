import { buildMessengerUrl } from '../../utils/messenger-url'

let _tokenProvider: (() => string | null) | null = null

export function setAuthTokenProvider(fn: () => string | null) {
  _tokenProvider = fn
}

export function messengerApi<T>(
  path: string,
  options: Parameters<typeof $fetch>[1] = {},
): Promise<T> {
  const config = useRuntimeConfig()
  const headers = new Headers(options.headers as HeadersInit | undefined)
  const token = _tokenProvider?.()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return $fetch<T>(buildMessengerUrl(config.public.messengerCoreBaseUrl as string, path), {
    ...options,
    headers,
  })
}
