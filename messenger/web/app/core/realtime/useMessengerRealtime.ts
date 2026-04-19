import { createMessengerRealtime } from './messenger-realtime'
import type { MessengerRealtimeRuntime, MessengerRealtimeEvent } from './messenger-realtime'

let realtimeRuntime: MessengerRealtimeRuntime | null = null
let runtimeListenersAttached = false

function getRuntime(
  wsBaseUrl: string,
  getToken: () => string | null,
  getClientId: () => string,
  getPresencePayload: () => object,
): MessengerRealtimeRuntime {
  if (!realtimeRuntime) {
    realtimeRuntime = createMessengerRealtime({ wsBaseUrl, getToken, getClientId, getPresencePayload })
  }
  return realtimeRuntime
}

export function useMessengerRealtime() {
  const config = useRuntimeConfig()
  const auth = useMessengerAuth()
  const contacts = useMessengerContacts()
  const conversations = useMessengerConversations()
  const calls = useMessengerCalls()
  const agentRuntime = useMessengerAgentRuntime()
  const { clientId, buildPresencePayload } = useMessengerRealtimeIdentity()
  const connected = useState<boolean>('messenger-realtime-connected', () => false)
  const connecting = useState<boolean>('messenger-realtime-connecting', () => false)

  const realtime = getRuntime(
    config.public.messengerCoreBaseUrl,
    () => auth.token.value,
    () => clientId.value,
    buildPresencePayload,
  )

  if (!runtimeListenersAttached) {
    runtimeListenersAttached = true

    realtime.onStatusChange((status) => {
      connected.value = status === 'connected'
      connecting.value = status === 'connecting'
    })

    realtime.onEvent((event: MessengerRealtimeEvent) => {
      void handleEvent(event).catch(() => {
        // ignore handler failures in alpha stage
      })
    })
  }

  async function handleEvent(event: MessengerRealtimeEvent) {
    if (event.type === 'call.signal') {
      await calls.handleSignal(event as unknown as Parameters<typeof calls.handleSignal>[0])
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
      agentRuntime.handleTraceEvent(event)
    }
  }

  async function connect() {
    if (!import.meta.client || !auth.token.value) return
    await realtime.connect()
  }

  function disconnect() {
    agentRuntime.reset()
    realtime.disconnect()
  }

  return {
    connected,
    connecting,
    connect,
    disconnect,
  }
}
