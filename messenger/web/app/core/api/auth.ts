import { messengerApi } from './client'

export interface MessengerAuthUser {
  id: string
  login: string
  displayName: string
}

export interface MessengerAuthResponse {
  token: string
  user: MessengerAuthUser
}

export function login(payload: { login: string; password: string }): Promise<MessengerAuthResponse> {
  return messengerApi<MessengerAuthResponse>('/auth/login', { method: 'POST', body: payload })
}

export function register(payload: { login: string; password: string; displayName: string }): Promise<MessengerAuthResponse> {
  return messengerApi<MessengerAuthResponse>('/auth/register', { method: 'POST', body: payload })
}

export function getMe(): Promise<{ user: MessengerAuthUser }> {
  return messengerApi<{ user: MessengerAuthUser }>('/auth/me')
}
