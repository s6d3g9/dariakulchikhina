import { buildMessengerUrl } from '../../utils/messenger-url'

export interface MessengerAuthUser {
  id: string
  login: string
  displayName: string
}

export interface MessengerAuthResponse {
  token: string
  user: MessengerAuthUser
}

type TokenProvider = () => string | null

let _tokenProvider: TokenProvider = () => null

export function setAuthTokenProvider(fn: TokenProvider): void {
  _tokenProvider = fn
}

function messengerUrl(path: string): string {
  const config = useRuntimeConfig()
  return buildMessengerUrl(String(config.public.messengerCoreBaseUrl), path)
}

export function messengerAuthRequest<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}): Promise<T> {
  const headers = new Headers((options?.headers as HeadersInit) ?? undefined)
  const t = _tokenProvider()
  if (t) headers.set('Authorization', `Bearer ${t}`)
  return $fetch<T>(messengerUrl(path), { ...options, headers })
}

export function login(body: { login: string; password: string }): Promise<MessengerAuthResponse> {
  return $fetch<MessengerAuthResponse>(messengerUrl('/auth/login'), {
    method: 'POST',
    body,
  })
}

export function register(body: { login: string; password: string; displayName: string }): Promise<MessengerAuthResponse> {
  return $fetch<MessengerAuthResponse>(messengerUrl('/auth/register'), {
    method: 'POST',
    body,
  })
}

export function getMe(): Promise<{ user: MessengerAuthUser }> {
  return messengerAuthRequest<{ user: MessengerAuthUser }>('/auth/me')
}
