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
} from '../../../../theme/messengerColorSchemes'
import { getAiSettings, putAiSettings } from '../../../core/api/settings'

type MessengerSettingsSectionKey = 'profile' | 'notifications' | 'privacy' | 'themes' | 'ai' | 'devices' | 'account' | 'subscription'
type MessengerPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
type MessengerStyleKey = 'liquid' | 'material'
type MessengerInterpretationProvider = 'algorithm' | 'api'
type MessengerTranscriptionProvider = 'server-default' | 'api'

interface MessengerAiSettingsSnapshot {
  analysisEnabled: boolean
  interpretationProvider: MessengerInterpretationProvider
  transcriptionProvider: MessengerTranscriptionProvider
  interpretationModel: string
  summaryModel: string
  transcriptionModel: string
}

interface MessengerAiModelOptions {
  interpretation: string[]
  summary: string[]
  transcription: string[]
}

interface MessengerAiConfiguredState {
  analysis: boolean
  transcription: boolean
  interpretationApi: boolean
  transcriptionApi: boolean
}

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

function createDefaultMessengerAiSettings(): MessengerAiSettingsSnapshot {
  return {
    analysisEnabled: false,
    interpretationProvider: 'algorithm',
    transcriptionProvider: 'server-default',
    interpretationModel: '',
    summaryModel: '',
    transcriptionModel: '',
  }
}

function normalizeInterpretationProvider(value: string | undefined, legacyAnalysisEnabled = false): MessengerInterpretationProvider {
  if (value === 'api') {
    return 'api'
  }

  return legacyAnalysisEnabled ? 'api' : 'algorithm'
}

function normalizeTranscriptionProvider(value: string | undefined): MessengerTranscriptionProvider {
  return value === 'api' ? 'api' : 'server-default'
}

function createDefaultMessengerAiModelOptions(): MessengerAiModelOptions {
  return {
    interpretation: ['gemma3:27b', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4o-mini'],
    summary: ['gemma3:27b', 'gpt-5.4', 'gpt-4.1-mini', 'gpt-4o-mini'],
    transcription: ['whisper-large-v3-turbo', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe'],
  }
}

function normalizeAiModelValue(value: string | undefined) {
  return typeof value === 'string' ? value.trim().slice(0, 160) : ''
}

function mergeMessengerAiSettings(source?: Partial<MessengerAiSettingsSnapshot> | null): MessengerAiSettingsSnapshot {
  const defaults = createDefaultMessengerAiSettings()
  const interpretationProvider = normalizeInterpretationProvider(source?.interpretationProvider, source?.analysisEnabled === true)

  return {
    analysisEnabled: interpretationProvider === 'api',
    interpretationProvider,
    transcriptionProvider: normalizeTranscriptionProvider(source?.transcriptionProvider),
    interpretationModel: normalizeAiModelValue(source?.interpretationModel) || defaults.interpretationModel,
    summaryModel: normalizeAiModelValue(source?.summaryModel) || defaults.summaryModel,
    transcriptionModel: normalizeAiModelValue(source?.transcriptionModel) || defaults.transcriptionModel,
  }
}

function mergeMessengerAiModelOptions(source?: Partial<MessengerAiModelOptions> | null): MessengerAiModelOptions {
  const defaults = createDefaultMessengerAiModelOptions()

  return {
    interpretation: Array.from(new Set((Array.isArray(source?.interpretation) ? source!.interpretation! : defaults.interpretation)
      .map(item => normalizeAiModelValue(item))
      .filter(Boolean))),
    summary: Array.from(new Set((Array.isArray(source?.summary) ? source!.summary! : defaults.summary)
      .map(item => normalizeAiModelValue(item))
      .filter(Boolean))),
    transcription: Array.from(new Set((Array.isArray(source?.transcription) ? source!.transcription! : defaults.transcription)
      .map(item => normalizeAiModelValue(item))
      .filter(Boolean))),
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
  const aiSettings = useState<MessengerAiSettingsSnapshot>('messenger-ai-settings-state', () => createDefaultMessengerAiSettings())
  const aiModelOptions = useState<MessengerAiModelOptions>('messenger-ai-model-options', () => createDefaultMessengerAiModelOptions())
  const aiConfigured = useState<MessengerAiConfiguredState>('messenger-ai-configured-state', () => ({
    analysis: false,
    transcription: false,
    interpretationApi: false,
    transcriptionApi: false,
  }))
  const aiSettingsReady = useState<boolean>('messenger-ai-settings-ready', () => false)
  const aiSettingsPending = useState<boolean>('messenger-ai-settings-pending', () => false)
  const aiSettingsError = useState<string>('messenger-ai-settings-error', () => '')
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
      key: 'ai' as const,
      title: 'Транскриб',
      hint: 'Серверный транскриб и опциональный API-разбор',
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
    {
      key: 'subscription' as const,
      title: 'Подписка',
      hint: 'Claude Code CLI — активная подписка и план',
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

  function normalizeAiProviderSelections() {
    if (!aiConfigured.value.interpretationApi && aiSettings.value.interpretationProvider === 'api') {
      aiSettings.value.interpretationProvider = 'algorithm'
    }

    if (!aiConfigured.value.transcriptionApi && aiSettings.value.transcriptionProvider === 'api') {
      aiSettings.value.transcriptionProvider = 'server-default'
    }

    aiSettings.value.analysisEnabled = aiSettings.value.interpretationProvider === 'api'
  }

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
  const interpretationProviderOptions = computed(() => {
    const options: { title: string; value: 'algorithm' | 'api' }[] = [
      {
        title: 'Алгоритм словаря',
        value: 'algorithm',
      },
    ]

    if (aiConfigured.value.interpretationApi) {
      options.push({
        title: 'API backend',
        value: 'api' as const,
      })
    }

    return options
  })
  const transcriptionProviderOptions = computed(() => {
    const options: Array<{ title: string, value: MessengerTranscriptionProvider }> = []

    if (aiConfigured.value.transcription) {
      options.push({
        title: 'Сервер по умолчанию',
        value: 'server-default',
      })
    }

    if (aiConfigured.value.transcriptionApi) {
      options.push({
        title: 'HTTP API backend',
        value: 'api',
      })
    }

    return options
  })
  const runtimeInterpretationProvider = computed<MessengerInterpretationProvider>(() => (
    aiSettings.value.interpretationProvider === 'api' && aiConfigured.value.interpretationApi
      ? 'api'
      : 'algorithm'
  ))
  const runtimeTranscriptionProvider = computed<MessengerTranscriptionProvider>(() => (
    aiSettings.value.transcriptionProvider === 'api' && aiConfigured.value.transcriptionApi
      ? 'api'
      : 'server-default'
  ))

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

  async function hydrateAiSettings() {
    if (aiSettingsPending.value) {
      return
    }

    aiSettingsPending.value = true
    aiSettingsError.value = ''

    try {
      const response = await getAiSettings()

      aiSettings.value = mergeMessengerAiSettings(response.settings)
      aiModelOptions.value = mergeMessengerAiModelOptions(response.modelOptions)
      aiConfigured.value = {
        analysis: Boolean(response.configured?.analysis),
        transcription: Boolean(response.configured?.transcription),
        interpretationApi: Boolean(response.configured?.interpretationApi ?? response.configured?.analysis),
        transcriptionApi: Boolean(response.configured?.transcriptionApi),
      }
      normalizeAiProviderSelections()
      aiSettingsReady.value = true
    } catch {
      aiSettingsError.value = 'Не удалось загрузить настройки транскрибации и API-разбора.'
    } finally {
      aiSettingsPending.value = false
    }
  }

  async function persistAiSettings() {
    if (aiSettingsPending.value) {
      return
    }

    aiSettingsPending.value = true
    aiSettingsError.value = ''

    try {
      const response = await putAiSettings(mergeMessengerAiSettings(aiSettings.value))

      aiSettings.value = mergeMessengerAiSettings(response.settings)
      aiModelOptions.value = mergeMessengerAiModelOptions(response.modelOptions)
      aiConfigured.value = {
        analysis: Boolean(response.configured?.analysis),
        transcription: Boolean(response.configured?.transcription),
        interpretationApi: Boolean(response.configured?.interpretationApi ?? response.configured?.analysis),
        transcriptionApi: Boolean(response.configured?.transcriptionApi),
      }
      normalizeAiProviderSelections()
      aiSettingsReady.value = true
    } catch {
      aiSettingsError.value = 'Не удалось сохранить настройки транскрибации и API-разбора.'
    } finally {
      aiSettingsPending.value = false
    }
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

      const perm = Notification.permission
      return (perm === 'default' ? 'prompt' : perm) as MessengerPermissionState
    }

    if (!navigator.permissions?.query) {
      return 'unknown' as const
    }

    try {
      const status = await navigator.permissions.query({ name: name as PermissionName })
      return status.state as MessengerPermissionState
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
    aiSettings,
    aiModelOptions,
    aiConfigured,
    aiSettingsReady,
    aiSettingsPending,
    aiSettingsError,
    interpretationProviderOptions,
    transcriptionProviderOptions,
    runtimeInterpretationProvider,
    runtimeTranscriptionProvider,
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
    hydrateAiSettings,
    openSection,
    persistAiSettings,
    setTheme,
    setThemeMode,
    setThemeContrast,
    setStyle,
    resetLocalSettings,
    refreshPermissionStates,
  }
}