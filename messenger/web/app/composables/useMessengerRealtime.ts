import type { MessengerAgentTraceEvent } from './useMessengerAgentRuntime'

type MessengerRealtimeEvent = {
  type: 'hello' | 'contacts.updated' | 'conversations.updated' | 'messages.updated' | 'call.signal' | 'error'
  conversationId?: string
  error?: string
  signal?: {
    kind: 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'
    callId: string
    payload?: Record<string, unknown>
  }
  sender?: {
    userId: string
    displayName: string
    login: string
  }
} | MessengerAgentTraceEvent

import { buildMessengerWsUrl } from '../utils/messenger-url'

let messengerSocket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function useMessengerRealtime() {
  const config = useRuntimeConfig()
  const auth = useMessengerAuth()
  const contacts = useMessengerContacts()
  const conversations = useMessengerConversations()
  const calls = useMessengerCalls()
  const runtime = useMessengerAgentRuntime()
  const connected = useState<boolean>('messenger-realtime-connected', () => false)
  const connecting = useState<boolean>('messenger-realtime-connecting', () => false)

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect() {
    if (!import.meta.client || reconnectTimer || !auth.token.value) {
      return
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, 1500)
  }

  async function handleEvent(event: MessengerRealtimeEvent) {
    if (event.type === 'call.signal') {
      await calls.handleSignal(event)
      return
    }

    if (event.type === 'contacts.updated') {
      await contacts.refresh(contacts.query.value)
      return
    }

    if (event.type === 'conversations.updated') {
      await conversations.refresh(conversations.query.value)
      if (conversations.activeConversationId.value) {
        await conversations.loadMessages()
      }
      return
    }

    if (event.type === 'messages.updated') {
      if (event.conversationId && event.conversationId === conversations.activeConversationId.value) {
        await conversations.loadMessages(event.conversationId)
      }
      await conversations.refresh(conversations.query.value)
      return
    }

    if (event.type === 'agent.trace') {
      runtime.handleTraceEvent(event)
    }
  }

  async function connect() {
    if (!import.meta.client || !auth.token.value || messengerSocket || connecting.value) {
      return
    }

    clearReconnect()
    connecting.value = true

    const wsUrl = buildMessengerWsUrl(config.public.messengerCoreBaseUrl, '/ws')
    wsUrl.searchParams.set('token', auth.token.value)

    const socket = new WebSocket(wsUrl.toString())
    messengerSocket = socket

    socket.addEventListener('open', () => {
      connecting.value = false
      connected.value = true
    })

    socket.addEventListener('message', (message) => {
      try {
        const event = JSON.parse(String(message.data)) as MessengerRealtimeEvent
        void handleEvent(event).catch(() => {
          // ignore transport-side handler failures in alpha stage
        })
      } catch {
        // ignore malformed events in alpha stage
      }
    })

    socket.addEventListener('close', () => {
      connected.value = false
      connecting.value = false
      messengerSocket = null
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      connected.value = false
      connecting.value = false
      messengerSocket = null
      scheduleReconnect()
    })
  }

  function disconnect() {
    clearReconnect()
    connected.value = false
    connecting.value = false
    runtime.reset()

    if (messengerSocket) {
      messengerSocket.close()
      messengerSocket = null
    }
  }

  return {
    connected,
    connecting,
    connect,
    disconnect,
  }
}