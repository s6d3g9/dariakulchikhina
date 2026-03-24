import {
  MESSENGER_COLOR_SCHEME_KEYS,
  MESSENGER_THEME_CONTRAST_KEYS,
  messengerColorSchemeOptions,
  normalizeMessengerColorSchemeKey,
  normalizeMessengerThemeContrast,
  normalizeMessengerThemeMode,
  resolveLegacyMessengerTheme,
  resolveMessengerColorSchemeSelection,
  type MessengerColorSchemeKey,
  type MessengerThemeContrast,
  type MessengerThemeMode,
  type ResolvedMessengerThemeMode,
} from '../../theme/messengerColorSchemes'

type MessengerSettingsSectionKey = 'profile' | 'notifications' | 'privacy' | 'themes' | 'devices' | 'account'
type MessengerPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
type MessengerStyleKey = 'liquid' | 'material'

const MESSENGER_STYLE_KEYS = ['liquid', 'material'] as const
const MESSENGER_THEME_MODE_KEYS = ['system', 'light', 'dark'] as const

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
    active: MessengerColorSchemeKey
    mode: MessengerThemeMode
    contrast: MessengerThemeContrast
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
const MESSENGER_THEME_STORAGE_KEY = 'daria-messenger-theme'
const MESSENGER_THEME_MODE_STORAGE_KEY = 'daria-messenger-theme-mode'
const MESSENGER_THEME_CONTRAST_STORAGE_KEY = 'daria-messenger-theme-contrast'
const MESSENGER_STYLE_STORAGE_KEY = 'daria-messenger-style'
const MESSENGER_STYLE_MIGRATION_KEY = 'daria-messenger-style-m3-migrated'

let systemThemeBindingInitialized = false

function normalizeMessengerStyle(style: string | null | undefined): MessengerStyleKey | null {
  if (!style) {
    return null
  }

  if (style === 'liquid' || style === 'material') {
    return style
  }

  if (style === 'crystal' || style === 'mist' || style === 'contrast') {
    return 'liquid'
  }

  if (style === 'minimal') {
    return 'material'
  }

  return null
}

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
      active: 'baseline',
      mode: 'system',
      contrast: 'standard',
      style: 'material',
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

function readStoredThemePreferences() {
  if (!import.meta.client) {
    return null
  }

  const storedTheme = window.localStorage.getItem(MESSENGER_THEME_STORAGE_KEY)
  const storedMode = window.localStorage.getItem(MESSENGER_THEME_MODE_STORAGE_KEY)
  const storedContrast = window.localStorage.getItem(MESSENGER_THEME_CONTRAST_STORAGE_KEY)
  const storedStyle = window.localStorage.getItem(MESSENGER_STYLE_STORAGE_KEY)
  const normalizedStyle = normalizeMessengerStyle(storedStyle)
  const normalizedTheme = normalizeMessengerColorSchemeKey(storedTheme)
  const normalizedMode = normalizeMessengerThemeMode(storedMode)
  const normalizedContrast = normalizeMessengerThemeContrast(storedContrast)
  const legacyTheme = resolveLegacyMessengerTheme(storedTheme)

  return {
    active: normalizedTheme || legacyTheme?.scheme || null,
    mode: normalizedMode || legacyTheme?.mode || null,
    contrast: normalizedContrast,
    style: normalizedStyle && MESSENGER_STYLE_KEYS.includes(normalizedStyle)
      ? normalizedStyle
      : null,
  }
}

function shouldRunMaterialStyleMigration() {
  if (!import.meta.client) {
    return false
  }

  return window.localStorage.getItem(MESSENGER_STYLE_MIGRATION_KEY) !== '1'
}

function markMaterialStyleMigrationDone() {
  if (!import.meta.client) {
    return
  }

  window.localStorage.setItem(MESSENGER_STYLE_MIGRATION_KEY, '1')
}

function persistThemePreferences(theme: MessengerColorSchemeKey, mode: MessengerThemeMode, contrast: MessengerThemeContrast, style: MessengerStyleKey) {
  if (!import.meta.client) {
    return
  }

  window.localStorage.setItem(MESSENGER_THEME_STORAGE_KEY, theme)
  window.localStorage.setItem(MESSENGER_THEME_MODE_STORAGE_KEY, mode)
  window.localStorage.setItem(MESSENGER_THEME_CONTRAST_STORAGE_KEY, contrast)
  window.localStorage.setItem(MESSENGER_STYLE_STORAGE_KEY, style)
}

function applyReduceMotionPreference(enabled: boolean) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerMotion = enabled ? 'reduced' : 'default'
}

function applyMessengerThemePreference(theme: MessengerColorSchemeKey) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerTheme = theme
}

function applyMessengerThemeModePreference(mode: MessengerThemeMode, resolvedMode: ResolvedMessengerThemeMode) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerThemeMode = mode
  document.documentElement.dataset.messengerResolvedThemeMode = resolvedMode
}

function applyMessengerThemeContrastPreference(contrast: MessengerThemeContrast) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerThemeContrast = contrast
}

function applyMessengerStylePreference(style: MessengerStyleKey) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerStyle = style
}

function mergeMessengerSettings(source: Partial<MessengerSettingsSnapshot> | null): MessengerSettingsSnapshot {
  const defaults = createDefaultMessengerSettings()
  const rawTheme = source?.themes?.active as string | undefined
  const legacyTheme = resolveLegacyMessengerTheme(rawTheme)
  const normalizedTheme = normalizeMessengerColorSchemeKey(rawTheme)
  const rawThemeMode = source?.themes?.mode as string | undefined
  const normalizedThemeMode = normalizeMessengerThemeMode(rawThemeMode)
  const rawThemeContrast = source?.themes?.contrast as string | undefined
  const normalizedThemeContrast = normalizeMessengerThemeContrast(rawThemeContrast)

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
      active: normalizedTheme || legacyTheme?.scheme || defaults.themes.active,
      mode: normalizedThemeMode || legacyTheme?.mode || defaults.themes.mode,
      contrast: normalizedThemeContrast || defaults.themes.contrast,
      style: normalizeMessengerStyle(source?.themes?.style || defaults.themes.style) || defaults.themes.style,
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
  const systemPrefersDark = useState<boolean>('messenger-settings-system-prefers-dark', () => false)
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
    {
      key: 'account' as const,
      title: 'Аккаунт',
      hint: 'Email, удаление аккаунта, выход',
    },
  ]

  const themeOptions = messengerColorSchemeOptions

  const themeModeOptions = [
    {
      key: 'system' as const,
      title: 'Как в системе',
      hint: 'Messenger сам подхватывает светлую или тёмную tonal-схему по настройкам устройства.',
      icon: 'mdi-theme-light-dark',
    },
    {
      key: 'light' as const,
      title: 'Светлая тональность',
      hint: 'Фиксирует светлые поверхности и дневной уровень контраста независимо от ОС.',
      icon: 'mdi-white-balance-sunny',
    },
    {
      key: 'dark' as const,
      title: 'Тёмная tonальность',
      hint: 'Фиксирует тёмные surface-container слои и вечернюю контрастную подачу.',
      icon: 'mdi-weather-night',
    },
  ]

  const themeContrastOptions = [
    {
      key: 'standard' as const,
      title: 'Стандартный контраст',
      hint: 'Балансированный Material 3 режим для повседневной переписки и мягких tonal-переходов.',
      icon: 'mdi-contrast-box',
    },
    {
      key: 'high' as const,
      title: 'Повышенный контраст',
      hint: 'Усиливает разделение surface-слоёв, контуров и текста для более читаемого интерфейса.',
      icon: 'mdi-circle-opacity',
    },
  ]

  const styleOptions = [
    {
      key: 'liquid' as const,
      title: 'Liquid',
      hint: 'Полупрозрачные поверхности, живой blur и более световой слой управления.',
    },
    {
      key: 'material' as const,
      title: 'Material 3',
      hint: 'Плотные tonal-поверхности, чёткая иерархия, мягкие индикаторы и системный ритм без стеклянных эффектов.',
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

  function bindSystemThemePreference() {
    if (!import.meta.client || systemThemeBindingInitialized) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyPreference = () => {
      systemPrefersDark.value = mediaQuery.matches
    }

    applyPreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applyPreference)
    } else {
      mediaQuery.addListener(applyPreference)
    }

    systemThemeBindingInitialized = true
  }

  const resolvedTheme = computed(() => resolveMessengerColorSchemeSelection(
    settings.value.themes.active,
    settings.value.themes.mode,
    settings.value.themes.contrast,
    systemPrefersDark.value,
  ))
  const resolvedMode = computed(() => resolvedTheme.value.resolvedMode)
  const vuetifyThemeName = computed(() => resolvedTheme.value.themeName)

  function hydrate() {
    if (ready.value) {
      return
    }

    bindSystemThemePreference()
    settings.value = mergeMessengerSettings(readStoredMessengerSettings())
    const storedThemePreferences = readStoredThemePreferences()
    if (storedThemePreferences?.active) {
      settings.value.themes.active = storedThemePreferences.active
    }
    if (storedThemePreferences?.mode) {
      settings.value.themes.mode = storedThemePreferences.mode
    }
    if (storedThemePreferences?.contrast) {
      settings.value.themes.contrast = storedThemePreferences.contrast
    }
    if (storedThemePreferences?.style) {
      settings.value.themes.style = storedThemePreferences.style
    }
    if (shouldRunMaterialStyleMigration()) {
      settings.value.themes.style = 'material'
      markMaterialStyleMigrationDone()
    }
    applyReduceMotionPreference(settings.value.devices.reduceMotion)
    applyMessengerThemePreference(settings.value.themes.active)
    applyMessengerThemeModePreference(settings.value.themes.mode, resolvedMode.value)
    applyMessengerThemeContrastPreference(settings.value.themes.contrast)
    applyMessengerStylePreference(settings.value.themes.style)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)
    ready.value = true
    void refreshPermissionStates()
  }

  function openSection(section: MessengerSettingsSectionKey) {
    activeSection.value = section
  }

  function setTheme(theme: MessengerColorSchemeKey) {
    settings.value.themes.active = theme
    applyMessengerThemePreference(theme)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)

    if (ready.value) {
      persist()
    }
  }

  function setThemeMode(mode: MessengerThemeMode) {
    settings.value.themes.mode = mode
    applyMessengerThemeModePreference(mode, resolvedMode.value)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)

    if (ready.value) {
      persist()
    }
  }

  function setThemeContrast(contrast: MessengerThemeContrast) {
    settings.value.themes.contrast = contrast
    applyMessengerThemeContrastPreference(contrast)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)

    if (ready.value) {
      persist()
    }
  }

  function setStyle(style: MessengerStyleKey) {
    settings.value.themes.style = style
    applyMessengerStylePreference(style)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)

    if (ready.value) {
      persist()
    }
  }

  function resetLocalSettings() {
    settings.value = createDefaultMessengerSettings()
    bindSystemThemePreference()
    applyReduceMotionPreference(settings.value.devices.reduceMotion)
    applyMessengerThemePreference(settings.value.themes.active)
    applyMessengerThemeModePreference(settings.value.themes.mode, resolvedMode.value)
    applyMessengerThemeContrastPreference(settings.value.themes.contrast)
    applyMessengerStylePreference(settings.value.themes.style)
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
    applyMessengerThemeModePreference(settings.value.themes.mode, resolvedMode.value)
    applyMessengerThemeContrastPreference(settings.value.themes.contrast)
    applyMessengerStylePreference(settings.value.themes.style)
    persistThemePreferences(settings.value.themes.active, settings.value.themes.mode, settings.value.themes.contrast, settings.value.themes.style)
  }, { deep: true })

  watch(resolvedMode, (nextMode) => {
    if (!ready.value) {
      return
    }

    applyMessengerThemeModePreference(settings.value.themes.mode, nextMode)
  })

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

  const theme = computed(() => settings.value.themes)
  const style = computed(() => settings.value.themes.style)

  return {
    settings,
    theme,
    style,
    sections,
    themeOptions,
    themeModeOptions,
    themeContrastOptions,
    styleOptions,
    activeSection,
    sessionStartedAt,
    currentDevice,
    permissionState,
    browserCapabilities,
    resolvedTheme,
    resolvedMode,
    vuetifyThemeName,
    ready,
    hydrate,
    openSection,
    setTheme,
    setThemeMode,
    setThemeContrast,
    setStyle,
    resetLocalSettings,
    refreshPermissionStates,
  }
}