function normalizeMessengerFeatureFlag(value: unknown) {
  return value !== false && String(value) !== 'false'
}

function getFetchErrorStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  const fetchError = error as {
    statusCode?: number
    status?: number
    response?: {
      status?: number
    }
  }

  return fetchError.statusCode ?? fetchError.status ?? fetchError.response?.status ?? null
}

function getFetchErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const fetchError = error as {
    data?: {
      error?: unknown
    }
    response?: {
      _data?: {
        error?: unknown
      }
    }
  }

  const errorCode = fetchError.data?.error ?? fetchError.response?._data?.error
  return typeof errorCode === 'string' ? errorCode : ''
}

export function isMessengerAgentsApiDisabledError(error: unknown) {
  const statusCode = getFetchErrorStatusCode(error)
  const errorCode = getFetchErrorCode(error)

  return statusCode === 404 && (!errorCode || errorCode === 'NOT_FOUND')
}

export function useMessengerFeatures() {
  const config = useRuntimeConfig()

  const agentsEnabled = useState<boolean>('messenger-feature-agents-enabled', () => normalizeMessengerFeatureFlag(config.public.messengerAgentsEnabled))

  function disableAgents() {
    agentsEnabled.value = false
  }

  return {
    agentsEnabled: readonly(agentsEnabled),
    disableAgents,
  }
}