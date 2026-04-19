import type { MessengerAgentTraceEvent } from '../../entities/agents/model/useMessengerAgentRuntime'
import { buildMessengerWsUrl } from '../../utils/messenger-url'

export type MessengerRealtimeStatus = 'disconnected' | 'connecting' | 'connected'

export type MessengerRealtimeEvent =
  | {
      type: 'hello' | 'contacts.updated' | 'conversations.updated' | 'error'
      error?: string
    }
  | {
      type: 'messages.updated'
      conversationId?: string
    }
  | {
      type: 'call.signal'
      signal: {
        kind: 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'
        callId: string
        payload?: Record<string, unknown>
      }
      sender?: {
        userId: string
        displayName: string
        login: string
      }
    }
  | MessengerAgentTraceEvent

type EventListener = (event: MessengerRealtimeEvent) => void
type StatusListener = (status: MessengerRealtimeStatus) => void

export interface MessengerRealtimeRuntime {
  connect(): Promise<void>
  disconnect(): void
  send(data: object): void
  onEvent(listener: EventListener): () => void
  onStatusChange(listener: StatusListener): () => void
}

export interface MessengerRealtimeOptions {
  wsBaseUrl: string
  getToken: () => string | null
  getClientId: () => string
  getPresencePayload: () => object
}

const RECONNECT_DELAY_MS = 1500

export function createMessengerRealtime(options: MessengerRealtimeOptions): MessengerRealtimeRuntime {
  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let presenceCleanup: (() => void) | null = null
  let currentStatus: MessengerRealtimeStatus = 'disconnected'

  const eventListeners = new Set<EventListener>()
  const statusListeners = new Set<StatusListener>()

  function setStatus(next: MessengerRealtimeStatus) {
    if (currentStatus === next) return
    currentStatus = next
    statusListeners.forEach(fn => fn(next))
  }

  function emitEvent(event: MessengerRealtimeEvent) {
    eventListeners.forEach(fn => fn(event))
  }

  function send(data: object) {
    if (socket?.readyState !== WebSocket.OPEN) return
    try {
      socket.send(JSON.stringify(data))
    } catch {
      // ignore transport-side send failures
    }
  }

  function sendPresence() {
    send(options.getPresencePayload())
  }

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || !options.getToken()) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, RECONNECT_DELAY_MS)
  }

  function ensurePresenceBridge() {
    if (typeof document === 'undefined' || presenceCleanup) return

    const syncPresence = () => {
      if (!options.getToken()) return
      if (!socket && currentStatus !== 'connecting') {
        void connect()
        return
      }
      sendPresence()
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncPresence()
      } else {
        sendPresence()
      }
    }

    const onFocus = () => syncPresence()
    const onBlur = () => sendPresence()
    const onPageShow = () => syncPresence()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pageshow', onPageShow)

    presenceCleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pageshow', onPageShow)
      presenceCleanup = null
    }
  }

  async function connect() {
    const token = options.getToken()
    if (!token || socket || currentStatus === 'connecting') return

    ensurePresenceBridge()
    clearReconnect()
    setStatus('connecting')

    const wsUrl = buildMessengerWsUrl(options.wsBaseUrl, '/ws')
    wsUrl.searchParams.set('token', token)
    wsUrl.searchParams.set('clientId', options.getClientId())

    const ws = new WebSocket(wsUrl.toString())
    socket = ws

    ws.addEventListener('open', () => {
      setStatus('connected')
      sendPresence()
    })

    ws.addEventListener('message', ({ data }) => {
      try {
        const event = JSON.parse(String(data)) as MessengerRealtimeEvent
        emitEvent(event)
      } catch {
        // ignore malformed events
      }
    })

    ws.addEventListener('close', () => {
      socket = null
      setStatus('disconnected')
      scheduleReconnect()
    })

    ws.addEventListener('error', () => {
      socket = null
      setStatus('disconnected')
      scheduleReconnect()
    })
  }

  function disconnect() {
    clearReconnect()

    if (presenceCleanup) {
      presenceCleanup()
    }

    if (socket) {
      socket.close()
      socket = null
    }

    setStatus('disconnected')
  }

  function onEvent(listener: EventListener) {
    eventListeners.add(listener)
    return () => eventListeners.delete(listener)
  }

  function onStatusChange(listener: StatusListener) {
    statusListeners.add(listener)
    return () => statusListeners.delete(listener)
  }

  return { connect, disconnect, send, onEvent, onStatusChange }
}
