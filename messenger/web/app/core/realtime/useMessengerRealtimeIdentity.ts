function generateMessengerRealtimeClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `messenger-client-${Math.random().toString(36).slice(2, 12)}`
}

function resolveMessengerRealtimeMobileFlag() {
  if (!import.meta.client) {
    return false
  }

  return /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')
}

export function useMessengerRealtimeIdentity() {
  const clientId = useState<string>('messenger-realtime-client-id', () => {
    if (!import.meta.client) {
      return 'messenger-ssr-client'
    }

    try {
      const stored = window.sessionStorage.getItem('daria-messenger-realtime-client-id')
      if (stored) {
        return stored
      }
    } catch {
      // sessionStorage may be unavailable in private mode sandboxes.
    }

    const nextId = generateMessengerRealtimeClientId()

    try {
      window.sessionStorage.setItem('daria-messenger-realtime-client-id', nextId)
    } catch {
      // noop
    }

    return nextId
  })

  if (import.meta.client) {
    try {
      window.sessionStorage.setItem('daria-messenger-realtime-client-id', clientId.value)
    } catch {
      // noop
    }
  }

  function buildPresencePayload() {
    return {
      type: 'presence.update' as const,
      clientId: clientId.value,
      focused: import.meta.client ? document.hasFocus() : false,
      visible: import.meta.client ? !document.hidden : false,
      visibilityState: import.meta.client ? document.visibilityState : 'hidden',
      isMobile: resolveMessengerRealtimeMobileFlag(),
      timestamp: new Date().toISOString(),
    }
  }

  return {
    clientId,
    buildPresencePayload,
  }
}