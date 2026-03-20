type MessengerSettingsSectionKey = 'profile' | 'notifications' | 'privacy' | 'themes' | 'devices'
type MessengerPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
type MessengerThemeKey = 'beige' | 'gray' | 'black' | 'void'
type MessengerStyleKey = 'crystal' | 'mist' | 'contrast' | 'minimal'

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
  themes: {
    active: MessengerThemeKey
    style: MessengerStyleKey
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
    themes: {
      active: 'black',
      style: 'crystal',
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

function applyMessengerThemePreference(theme: MessengerThemeKey) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerTheme = theme
}

function applyMessengerStylePreference(style: MessengerStyleKey) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerStyle = style
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
    themes: {
      ...defaults.themes,
      ...(source?.themes || {}),
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
      key: 'themes' as const,
      title: 'Темы',
      hint: 'Палитры интерфейса и общий тон messenger',
    },
    {
      key: 'devices' as const,
      title: 'Устройства',
      hint: 'Текущая сессия и этот браузер',
    },
  ]

  const themeOptions = [
    {
      key: 'beige' as const,
      title: 'Бежевая',
      hint: 'Почти белая, мягкая и тёплая glass-палитра.',
    },
    {
      key: 'gray' as const,
      title: 'Серая',
      hint: 'Нейтральная холодная палитра без сильного контраста.',
    },
    {
      key: 'black' as const,
      title: 'Чёрная',
      hint: 'Глубокая тёмная тема с максимальной контрастностью.',
    },
    {
      key: 'void' as const,
      title: 'Void',
      hint: 'Сверхминималистичная почти монохромная чёрная тема без лишнего свечения.',
    },
  ]

  const styleOptions = [
    {
      key: 'crystal' as const,
      title: 'Кристалл',
      hint: 'Чистый liquid glass с яркими бликами и более воздушными поверхностями.',
    },
    {
      key: 'mist' as const,
      title: 'Туман',
      hint: 'Мягкий матовый режим с приглушённым стеклом и спокойной глубиной.',
    },
    {
      key: 'contrast' as const,
      title: 'Контраст',
      hint: 'Более собранный режим с жёстче очерченными границами и плотными панелями.',
    },
    {
      key: 'minimal' as const,
      title: 'Минимал',
      hint: 'Строгий плоский режим без liquid glass, с чёткими границами и тихой монохромной подачей.',
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
    applyMessengerThemePreference(settings.value.themes.active)
    applyMessengerStylePreference(settings.value.themes.style)
    ready.value = true
    void refreshPermissionStates()
  }

  function openSection(section: MessengerSettingsSectionKey) {
    activeSection.value = section
  }

  function setTheme(theme: MessengerThemeKey) {
    settings.value.themes.active = theme
    applyMessengerThemePreference(theme)

    if (ready.value) {
      persist()
    }
  }

  function setStyle(style: MessengerStyleKey) {
    settings.value.themes.style = style
    applyMessengerStylePreference(style)

    if (ready.value) {
      persist()
    }
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
    applyMessengerThemePreference(settings.value.themes.active)
    applyMessengerStylePreference(settings.value.themes.style)
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
    themeOptions,
    styleOptions,
    activeSection,
    sessionStartedAt,
    currentDevice,
    permissionState,
    browserCapabilities,
    ready,
    hydrate,
    openSection,
    setTheme,
    setStyle,
    resetLocalSettings,
    refreshPermissionStates,
  }
}