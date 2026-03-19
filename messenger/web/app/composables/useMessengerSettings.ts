type MessengerSettingsSectionKey = 'profile' | 'notifications' | 'privacy' | 'devices'
type MessengerPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

interface MessengerSettingsSnapshot {
  profile: {
    statusLine: string
    bio: string
    preferredCallMode: 'audio' | 'video'
    autoplayVoice: boolean
  }
  notifications: {
    incomingCalls: boolean
    messagePreview: boolean
    soundEffects: boolean
    vibration: boolean
    desktopNotifications: boolean
  }
  privacy: {
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody'
    readReceipts: boolean
    linkPreviews: boolean
    allowDiscoveryByLogin: boolean
  }
  devices: {
    trustThisDevice: boolean
    keepSignedIn: boolean
    reduceMotion: boolean
  }
}

const MESSENGER_SETTINGS_STORAGE_KEY = 'daria-messenger-settings'
const MESSENGER_SETTINGS_SESSION_STORAGE_KEY = 'daria-messenger-settings-session'

function createDefaultMessengerSettings(): MessengerSettingsSnapshot {
  return {
    profile: {
      statusLine: 'На связи',
      bio: '',
      preferredCallMode: 'audio',
      autoplayVoice: true,
    },
    notifications: {
      incomingCalls: true,
      messagePreview: true,
      soundEffects: true,
      vibration: false,
      desktopNotifications: false,
    },
    privacy: {
      lastSeenVisibility: 'contacts',
      readReceipts: true,
      linkPreviews: true,
      allowDiscoveryByLogin: true,
    },
    devices: {
      trustThisDevice: true,
      keepSignedIn: true,
      reduceMotion: false,
    },
  }
}

function readStoredMessengerSettings() {
  if (!import.meta.client) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(MESSENGER_SETTINGS_STORAGE_KEY) || window.sessionStorage.getItem(MESSENGER_SETTINGS_SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as Partial<MessengerSettingsSnapshot>
  } catch {
    return null
  }
}

function applyReduceMotionPreference(enabled: boolean) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerMotion = enabled ? 'reduced' : 'default'
}

function mergeMessengerSettings(source: Partial<MessengerSettingsSnapshot> | null): MessengerSettingsSnapshot {
  const defaults = createDefaultMessengerSettings()

  return {
    profile: {
      ...defaults.profile,
      ...(source?.profile || {}),
    },
    notifications: {
      ...defaults.notifications,
      ...(source?.notifications || {}),
    },
    privacy: {
      ...defaults.privacy,
      ...(source?.privacy || {}),
    },
    devices: {
      ...defaults.devices,
      ...(source?.devices || {}),
    },
  }
}

export function useMessengerSettings() {
  const settings = useState<MessengerSettingsSnapshot>('messenger-settings-state', () => createDefaultMessengerSettings())
  const ready = useState<boolean>('messenger-settings-ready', () => false)
  const activeSection = useState<MessengerSettingsSectionKey>('messenger-settings-section', () => 'profile')
  const sessionStartedAt = useState<string>('messenger-settings-session-started-at', () => new Date().toISOString())
  const permissionState = useState<Record<'notifications' | 'microphone' | 'camera', MessengerPermissionState>>('messenger-settings-permissions', () => ({
    notifications: 'unknown',
    microphone: 'unknown',
    camera: 'unknown',
  }))

  const sections = [
    {
      key: 'profile' as const,
      title: 'Профиль',
      hint: 'Имя, подпись, голосовые сценарии',
    },
    {
      key: 'notifications' as const,
      title: 'Уведомления',
      hint: 'Звонки, предпросмотры и звуки',
    },
    {
      key: 'privacy' as const,
      title: 'Приватность',
      hint: 'Видимость и поведение переписки',
    },
    {
      key: 'devices' as const,
      title: 'Устройства',
      hint: 'Текущая сессия и этот браузер',
    },
  ]

  function persist() {
    if (!import.meta.client) {
      return
    }

    const payload = JSON.stringify(settings.value)
    if (settings.value.devices.trustThisDevice) {
      window.localStorage.setItem(MESSENGER_SETTINGS_STORAGE_KEY, payload)
      window.sessionStorage.removeItem(MESSENGER_SETTINGS_SESSION_STORAGE_KEY)
      return
    }

    window.sessionStorage.setItem(MESSENGER_SETTINGS_SESSION_STORAGE_KEY, payload)
    window.localStorage.removeItem(MESSENGER_SETTINGS_STORAGE_KEY)
  }

  function hydrate() {
    if (ready.value) {
      return
    }

    settings.value = mergeMessengerSettings(readStoredMessengerSettings())
    applyReduceMotionPreference(settings.value.devices.reduceMotion)
    ready.value = true
    void refreshPermissionStates()
  }

  function openSection(section: MessengerSettingsSectionKey) {
    activeSection.value = section
  }

  function resetLocalSettings() {
    settings.value = createDefaultMessengerSettings()
    persist()
  }

  async function resolvePermission(name: 'notifications' | 'microphone' | 'camera') {
    if (!import.meta.client) {
      return 'unknown' as const
    }

    if (name === 'notifications') {
      if (typeof Notification === 'undefined') {
        return 'unsupported' as const
      }

      return Notification.permission
    }

    if (!navigator.permissions?.query) {
      return 'unknown' as const
    }

    try {
      const status = await navigator.permissions.query({ name: name as PermissionName })
      return status.state
    } catch {
      return 'unknown' as const
    }
  }

  async function refreshPermissionStates() {
    permissionState.value = {
      notifications: await resolvePermission('notifications'),
      microphone: await resolvePermission('microphone'),
      camera: await resolvePermission('camera'),
    }
  }

  watch(settings, () => {
    if (!ready.value) {
      return
    }

    persist()
    applyReduceMotionPreference(settings.value.devices.reduceMotion)
  }, { deep: true })

  const currentDevice = computed(() => {
    if (!import.meta.client) {
      return {
        browser: 'Недоступно',
        os: 'Недоступно',
        language: 'ru',
      }
    }

    const ua = navigator.userAgent
    const browser = ua.includes('Firefox')
      ? 'Firefox'
      : ua.includes('Edg/')
        ? 'Edge'
        : ua.includes('Chrome')
          ? 'Chrome'
          : ua.includes('Safari')
            ? 'Safari'
            : 'Браузер'

    const os = ua.includes('Windows')
      ? 'Windows'
      : ua.includes('Mac OS')
        ? 'macOS'
        : ua.includes('Android')
          ? 'Android'
          : ua.includes('iPhone') || ua.includes('iPad')
            ? 'iOS'
            : ua.includes('Linux')
              ? 'Linux'
              : 'Система'

    return {
      browser,
      os,
      language: navigator.language || 'ru',
    }
  })

  const browserCapabilities = computed(() => {
    if (!import.meta.client) {
      return {
        notifications: false,
        permissionsApi: false,
        mediaDevices: false,
        vibration: false,
      }
    }

    return {
      notifications: typeof Notification !== 'undefined',
      permissionsApi: typeof navigator.permissions?.query === 'function',
      mediaDevices: typeof navigator.mediaDevices?.getUserMedia === 'function',
      vibration: typeof navigator.vibrate === 'function',
    }
  })

  return {
    settings,
    sections,
    activeSection,
    sessionStartedAt,
    currentDevice,
    permissionState,
    browserCapabilities,
    ready,
    hydrate,
    openSection,
    resetLocalSettings,
    refreshPermissionStates,
  }
}