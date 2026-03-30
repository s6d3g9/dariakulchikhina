<script setup lang="ts">
const auth = useMessengerAuth()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
const install = useMessengerInstall()
const settingsModel = useMessengerSettings()
const permissionActionMessage = ref('')
const mediaStatus = ref({ microphone: 'Не проверялось', camera: 'Не проверялось' })

onMounted(() => {
  settingsModel.hydrate()
  settingsModel.settings.value.devices.keepSignedIn = auth.persistenceMode.value === 'local'
  if (auth.token.value) {
    void settingsModel.hydrateAiSettings(auth.request)
  }
})

watch(() => settingsModel.settings.value.devices.keepSignedIn, (enabled) => {
  auth.setPersistence(enabled ? 'local' : 'session')
})

watch(() => auth.token.value, (nextToken) => {
  if (nextToken) {
    void settingsModel.hydrateAiSettings(auth.request)
  }
})

const activeThemeMeta = computed(() => settingsModel.themeOptions.find(theme => theme.key === settingsModel.settings.value.themes.active) ?? settingsModel.themeOptions[0])
const activeThemeModeMeta = computed(() => settingsModel.themeModeOptions.find(mode => mode.key === settingsModel.settings.value.themes.mode) ?? settingsModel.themeModeOptions[0])
const activeThemeContrastMeta = computed(() => settingsModel.themeContrastOptions.find(contrast => contrast.key === settingsModel.settings.value.themes.contrast) ?? settingsModel.themeContrastOptions[0])
const activeStyleMeta = computed(() => settingsModel.styleOptions.find(style => style.key === settingsModel.settings.value.themes.style) ?? settingsModel.styleOptions[0])
const resolvedThemeModeLabel = computed(() => settingsModel.resolvedMode.value === 'dark'
  ? 'Сейчас применяется тёмная tonal-схема.'
  : 'Сейчас применяется светлая tonal-схема.')
const resolvedThemeContrastLabel = computed(() => settingsModel.settings.value.themes.contrast === 'high'
  ? 'Сейчас усилены контуры, текст и различие между surface-слоями.'
  : 'Сейчас используется стандартный M3 баланс контраста.')
const preferredCallModeOptions = [
  { title: 'Сначала аудио', value: 'audio' },
  { title: 'Сразу видео', value: 'video' },
]
const lastSeenOptions = [
  { title: 'Все пользователи', value: 'everyone' },
  { title: 'Только контакты', value: 'contacts' },
  { title: 'Никто', value: 'nobody' },
]
const permissionLabelMap = {
  granted: 'Разрешено',
  denied: 'Запрещено',
  prompt: 'Будет запрошено',
  unsupported: 'Не поддерживается',
  unknown: 'Неизвестно'
} as const
const notificationPermissionLabel = computed(() => {
  if (!import.meta.client || typeof Notification === 'undefined') {
    return 'Браузер не поддерживает системные уведомления'
  }

  return Notification.permission === 'granted'
    ? 'Системные уведомления разрешены'
    : Notification.permission === 'denied'
      ? 'Системные уведомления запрещены'
      : 'Системные уведомления пока не запрошены'
})
const mediaSupportLabel = computed(() => calls.supported.value ? 'Микрофон и WebRTC доступны' : 'WebRTC или доступ к медиа недоступен')
const sessionStartedLabel = computed(() => new Date(settingsModel.sessionStartedAt.value).toLocaleString('ru-RU'))
const sessionPersistenceLabel = computed(() => auth.persistenceMode.value === 'local' ? 'Сессия сохраняется между перезапусками браузера' : 'Сессия живёт только в текущей вкладке')
const notificationPermissionStateLabel = computed(() => permissionLabelMap[settingsModel.permissionState.value.notifications])
const microphonePermissionStateLabel = computed(() => permissionLabelMap[settingsModel.permissionState.value.microphone])
const cameraPermissionStateLabel = computed(() => permissionLabelMap[settingsModel.permissionState.value.camera])
const installActionLabel = computed(() => install.installPending.value ? 'Запрашиваем установку...' : 'Установить как приложение')
function settingsTabIcon(key: 'profile' | 'notifications' | 'privacy' | 'themes' | 'ai' | 'devices' | 'account') {
  switch (key) {
    case 'profile':
      return 'mdi-account-outline'
    case 'notifications':
      return 'mdi-bell-outline'
    case 'privacy':
      return 'mdi-shield-lock-outline'
    case 'themes':
      return 'mdi-palette-outline'
    case 'ai':
      return 'mdi-brain'
    case 'devices':
      return 'mdi-cellphone-cog'
    default:
      return 'mdi-card-account-details-outline'
  }
}
const callPermissionLabelMap = {
  granted: 'Разрешено',
  denied: 'Заблокировано',
  prompt: 'Нужно подтвердить',
  unsupported: 'Не поддерживается',
  unknown: 'Неизвестно',
} as const
const audioCallPermissionLabel = computed(() => callPermissionLabelMap[calls.mediaPermissionState.value.microphone])
const videoCallPermissionLabel = computed(() => {
  if (calls.mediaPermissionState.value.microphone === 'granted' && calls.mediaPermissionState.value.camera === 'granted') {
    return 'Микрофон и камера разрешены'
  }

  if (calls.mediaPermissionState.value.microphone === 'denied' || calls.mediaPermissionState.value.camera === 'denied') {
    return 'Микрофон или камера заблокированы'
  }

  return 'Нужно подтвердить микрофон и камеру'
})

function formatUserId(value: string | undefined) {
  if (!value) {
    return 'Неизвестно'
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

async function requestNotificationsPermission() {
  permissionActionMessage.value = ''

  if (!import.meta.client || typeof Notification === 'undefined') {
    permissionActionMessage.value = 'Этот браузер не поддерживает системные уведомления.'
    return
  }

  const permission = await Notification.requestPermission()
  await settingsModel.refreshPermissionStates()
  permissionActionMessage.value = permission === 'granted'
    ? 'Системные уведомления разрешены.'
    : permission === 'denied'
      ? 'Системные уведомления запрещены в браузере.'
      : 'Запрос уведомлений закрыт без явного разрешения.'
}

async function probeMedia(kind: 'microphone' | 'camera') {
  permissionActionMessage.value = ''

  if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) {
    mediaStatus.value[kind] = 'Браузер не поддерживает доступ к медиа.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: kind === 'microphone',
      video: kind === 'camera',
    })

    for (const track of stream.getTracks()) {
      track.stop()
    }

    mediaStatus.value = {
      ...mediaStatus.value,
      [kind]: kind === 'microphone' ? 'Микрофон доступен.' : 'Камера доступна.',
    }
  } catch {
    mediaStatus.value = {
      ...mediaStatus.value,
      [kind]: kind === 'microphone' ? 'Не удалось получить доступ к микрофону.' : 'Не удалось получить доступ к камере.',
    }
  }

  await settingsModel.refreshPermissionStates()
}

async function requestCallPermission(kind: 'microphone' | 'camera') {
  permissionActionMessage.value = ''
  calls.clearError()
  calls.clearPermissionHelp()

  const granted = kind === 'microphone'
    ? await calls.ensureMicrophoneAccess()
    : await calls.ensureCameraAccess()

  await calls.refreshMediaPermissions()
  await settingsModel.refreshPermissionStates()

  if (granted) {
    permissionActionMessage.value = kind === 'microphone'
      ? 'Микрофон готов для аудиозвонков.'
      : 'Микрофон и камера готовы для видеозвонков.'
    return
  }

  permissionActionMessage.value = calls.permissionHelp.value || calls.callError.value || 'Не удалось получить доступ к медиа.'
}

function openCallSitePermissions(kind: 'microphone' | 'camera') {
  const opened = calls.openSitePermissions(kind)
  permissionActionMessage.value = opened
    ? 'Открываем настройки сайта в браузере.'
    : calls.permissionHelp.value || 'Не удалось автоматически открыть настройки сайта.'
}

async function installMessengerApp() {
  await install.installApp()
}

function showManualInstallHelp() {
  install.noteManualInstall()
}

const settingsSearch = ref('')
const settingsSearchOpen = ref(false)
const settingsSearchMatches = computed(() => {
  const q = settingsSearch.value.trim().toLowerCase()
  if (!q) return []
  return settingsModel.sections.filter(s =>
    s.title.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q)
  )
})

function openSettingsSearch() {
  settingsSearchOpen.value = true
}
function closeSettingsSearch() {
  setTimeout(() => { settingsSearchOpen.value = false }, 150)
}
function selectSettingsSection(key: string) {
  settingsModel.openSection(key as 'profile' | 'notifications' | 'privacy' | 'themes' | 'ai' | 'devices' | 'account')
  settingsSearch.value = ''
  settingsSearchOpen.value = false
}

let aiSettingsPersistTimer: ReturnType<typeof setTimeout> | null = null

function queueAiSettingsPersist() {
  if (!settingsModel.aiSettingsReady.value || settingsModel.aiSettingsPending.value || !auth.token.value) {
    return
  }

  if (aiSettingsPersistTimer) {
    clearTimeout(aiSettingsPersistTimer)
  }

  aiSettingsPersistTimer = setTimeout(() => {
    aiSettingsPersistTimer = null
    void settingsModel.persistAiSettings(auth.request)
  }, 450)
}

watch(() => [
  settingsModel.aiSettings.value.analysisEnabled,
  settingsModel.aiSettings.value.interpretationModel,
  settingsModel.aiSettings.value.summaryModel,
  settingsModel.aiSettings.value.transcriptionModel,
], () => {
  queueAiSettingsPersist()
})

onBeforeUnmount(() => {
  if (aiSettingsPersistTimer) {
    clearTimeout(aiSettingsPersistTimer)
    aiSettingsPersistTimer = null
  }
})

function themeCardStyle(theme: { preview: [string, string, string] }) {
  return {
    '--theme-swatch-1': theme.preview[0],
    '--theme-swatch-2': theme.preview[1],
    '--theme-swatch-3': theme.preview[2],
  }
}
</script>

<template>
  <section class="section-block section-block--settings" aria-label="Раздел настроек">

    <!-- Tab Windows (content first, TabBar at bottom) -->
    <VWindow :model-value="settingsModel.activeSection.value" class="section-list">

      <!-- Profile -->
      <VWindowItem value="profile">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <p class="setting-card__title">Аккаунт в messenger</p>
            <div class="setting-facts">
              <div class="setting-fact-row">
                <span class="setting-fact-label">Имя</span>
                <strong>{{ auth.user.value?.displayName || 'Неизвестно' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Логин</span>
                <strong>@{{ auth.user.value?.login || 'anonymous' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">ID</span>
                <strong>{{ formatUserId(auth.user.value?.id) }}</strong>
              </div>
            </div>
            <VTextField v-model="settingsModel.settings.value.profile.statusLine" variant="outlined" label="Подпись" maxlength="80" class="mt-4" />
            <VTextarea v-model="settingsModel.settings.value.profile.bio" variant="outlined" label="О себе" rows="4" maxlength="240" class="mt-2" />
            <VSelect
              v-model="settingsModel.settings.value.profile.preferredCallMode"
              variant="outlined"
              label="Предпочитаемый режим звонка"
              :items="preferredCallModeOptions"
              item-title="title"
              item-value="value"
              class="mt-2"
            />
            <div class="setting-toggle setting-toggle--vuetify mt-2">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Автовоспроизведение голосовых</span>
              </span>
              <VSwitch v-model="settingsModel.settings.value.profile.autoplayVoice" color="primary" hide-details inset />
            </div>
          </section>
        </div>
      </VWindowItem>

      <!-- Privacy -->
      <VWindowItem value="privacy">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <VSelect
              v-model="settingsModel.settings.value.privacy.lastSeenVisibility"
              variant="outlined"
              label="Кто видит время последнего входа"
              :items="lastSeenOptions"
              item-title="title"
              item-value="value"
            />
            <div class="setting-toggle setting-toggle--vuetify mt-2">
              <span class="setting-toggle__copy"><span class="setting-field__label">Подтверждения прочтения</span></span>
              <VSwitch v-model="settingsModel.settings.value.privacy.readReceipts" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Превью ссылок</span></span>
              <VSwitch v-model="settingsModel.settings.value.privacy.linkPreviews" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Поиск по логину</span></span>
              <VSwitch v-model="settingsModel.settings.value.privacy.allowDiscoveryByLogin" color="primary" hide-details inset />
            </div>
          </section>
        </div>
      </VWindowItem>

      <!-- Notifications -->
      <VWindowItem value="notifications">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <div class="setting-facts mb-4">
              <div class="setting-fact-row">
                <span class="setting-fact-label">Статус разрешения</span>
                <strong>{{ notificationPermissionStateLabel }}</strong>
              </div>
            </div>
            <div class="settings-actions-row mb-4">
              <VBtn type="button" color="secondary" variant="tonal" @click="requestNotificationsPermission()">Запросить доступ</VBtn>
            </div>
            <VAlert v-if="permissionActionMessage" type="info" class="mb-4">{{ permissionActionMessage }}</VAlert>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Входящие звонки</span></span>
              <VSwitch v-model="settingsModel.settings.value.notifications.incomingCalls" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Предпросмотр сообщений</span></span>
              <VSwitch v-model="settingsModel.settings.value.notifications.messagePreview" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Звуковые сигналы</span></span>
              <VSwitch v-model="settingsModel.settings.value.notifications.soundEffects" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Системные уведомления</span></span>
              <VSwitch v-model="settingsModel.settings.value.notifications.desktopNotifications" color="primary" hide-details inset />
            </div>
          </section>
        </div>
      </VWindowItem>

      <!-- Themes -->
      <VWindowItem value="themes">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <div class="settings-theme-current-grid">
              <div class="settings-theme-current-card settings-theme-current-card--theme">
                <span class="settings-theme-current-card__eyebrow">Активная схема</span>
                <strong class="settings-theme-current-card__title">{{ activeThemeMeta.title }}</strong>
                <span class="settings-theme-current-card__meta">{{ activeThemeMeta.hint }}</span>
              </div>
              <div class="settings-theme-current-card settings-theme-current-card--mode">
                <span class="settings-theme-current-card__eyebrow">Режим тональности</span>
                <strong class="settings-theme-current-card__title">{{ activeThemeModeMeta.title }}</strong>
                <span class="settings-theme-current-card__meta">{{ resolvedThemeModeLabel }}</span>
              </div>
              <div class="settings-theme-current-card settings-theme-current-card--contrast">
                <span class="settings-theme-current-card__eyebrow">Контраст</span>
                <strong class="settings-theme-current-card__title">{{ activeThemeContrastMeta.title }}</strong>
                <span class="settings-theme-current-card__meta">{{ resolvedThemeContrastLabel }}</span>
              </div>
              <div class="settings-theme-current-card settings-theme-current-card--style">
                <span class="settings-theme-current-card__eyebrow">Активный стиль</span>
                <strong class="settings-theme-current-card__title">{{ activeStyleMeta.title }}</strong>
                <span class="settings-theme-current-card__meta">{{ activeStyleMeta.hint }}</span>
              </div>
            </div>
            <p class="setting-card__title">Наборы цветового оформления</p>
            <div class="settings-choice-grid theme-grid">
              <button
                v-for="theme in settingsModel.themeOptions"
                :key="theme.key"
                type="button"
                class="settings-choice-card theme-card"
                :class="{ 'theme-card--active': settingsModel.settings.value.themes.active === theme.key }"
                :style="themeCardStyle(theme)"
                :aria-pressed="settingsModel.settings.value.themes.active === theme.key"
                @click="settingsModel.setTheme(theme.key)"
              >
                <span class="settings-choice-card__preview theme-card__preview" aria-hidden="true">
                  <span class="settings-choice-card__swatch"></span>
                  <span class="settings-choice-card__swatch"></span>
                  <span class="settings-choice-card__swatch"></span>
                </span>
                <span class="settings-choice-card__copy theme-card__copy">
                  <span class="settings-choice-card__title theme-card__title">{{ theme.title }}</span>
                  <span class="settings-choice-card__meta theme-card__meta">{{ theme.hint }}</span>
                </span>
                <span class="settings-choice-card__state theme-card__state">{{ settingsModel.settings.value.themes.active === theme.key ? 'Активна' : 'Выбрать' }}</span>
              </button>
            </div>
            <p class="setting-card__title mt-4">Светлая и тёмная tonal-подача</p>
            <div class="settings-choice-grid mode-grid">
              <button
                v-for="mode in settingsModel.themeModeOptions"
                :key="mode.key"
                type="button"
                class="settings-choice-card mode-card"
                :class="{ 'mode-card--active': settingsModel.settings.value.themes.mode === mode.key }"
                :aria-pressed="settingsModel.settings.value.themes.mode === mode.key"
                @click="settingsModel.setThemeMode(mode.key)"
              >
                <span class="settings-choice-card__preview mode-card__preview" aria-hidden="true">
                  <VIcon>{{ mode.icon }}</VIcon>
                </span>
                <span class="settings-choice-card__copy mode-card__copy">
                  <span class="settings-choice-card__title mode-card__title">{{ mode.title }}</span>
                  <span class="settings-choice-card__meta mode-card__meta">{{ mode.hint }}</span>
                </span>
                <span class="settings-choice-card__state mode-card__state">{{ settingsModel.settings.value.themes.mode === mode.key ? 'Активен' : 'Выбрать' }}</span>
              </button>
            </div>
            <p class="setting-card__title mt-4">Контраст интерфейса</p>
            <div class="settings-choice-grid contrast-grid">
              <button
                v-for="contrast in settingsModel.themeContrastOptions"
                :key="contrast.key"
                type="button"
                class="settings-choice-card contrast-card"
                :class="{ 'contrast-card--active': settingsModel.settings.value.themes.contrast === contrast.key }"
                :aria-pressed="settingsModel.settings.value.themes.contrast === contrast.key"
                @click="settingsModel.setThemeContrast(contrast.key)"
              >
                <span class="settings-choice-card__preview contrast-card__preview" aria-hidden="true">
                  <VIcon>{{ contrast.icon }}</VIcon>
                </span>
                <span class="settings-choice-card__copy contrast-card__copy">
                  <span class="settings-choice-card__title contrast-card__title">{{ contrast.title }}</span>
                  <span class="settings-choice-card__meta contrast-card__meta">{{ contrast.hint }}</span>
                </span>
                <span class="settings-choice-card__state contrast-card__state">{{ settingsModel.settings.value.themes.contrast === contrast.key ? 'Активен' : 'Выбрать' }}</span>
              </button>
            </div>
            <p class="setting-card__title mt-4">Стиль дизайна</p>
            <div class="settings-choice-grid style-grid">
              <button
                v-for="style in settingsModel.styleOptions"
                :key="style.key"
                type="button"
                class="settings-choice-card style-card"
                :class="[`style-card--${style.key}`, { 'style-card--active': settingsModel.settings.value.themes.style === style.key }]"
                :aria-pressed="settingsModel.settings.value.themes.style === style.key"
                @click="settingsModel.setStyle(style.key)"
              >
                <span class="settings-choice-card__preview style-card__preview" aria-hidden="true">
                  <span class="settings-choice-card__line"></span>
                  <span class="settings-choice-card__line"></span>
                  <span class="settings-choice-card__line settings-choice-card__line--short"></span>
                </span>
                <span class="settings-choice-card__copy style-card__copy">
                  <span class="settings-choice-card__title style-card__title">{{ style.title }}</span>
                  <span class="settings-choice-card__meta style-card__meta">{{ style.hint }}</span>
                </span>
                <span class="settings-choice-card__state style-card__state">{{ settingsModel.settings.value.themes.style === style.key ? 'Активен' : 'Выбрать' }}</span>
              </button>
            </div>
          </section>
        </div>
      </VWindowItem>

      <!-- AI -->
      <VWindowItem value="ai">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <div class="setting-facts mb-4">
              <div class="setting-fact-row">
                <span class="setting-fact-label">ИИ-аналитика</span>
                <strong>{{ settingsModel.aiSettings.value.analysisEnabled ? 'Включена' : 'Выключена' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Интерпретация</span>
                <strong>{{ settingsModel.aiConfigured.value.analysis ? 'Сервер готов' : 'Нужен API key' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Транскрибация</span>
                <strong>{{ settingsModel.aiConfigured.value.transcription ? 'Сервер готов' : 'Нужен STT key' }}</strong>
              </div>
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Включить ИИ-аналитику</span></span>
              <VSwitch v-model="settingsModel.aiSettings.value.analysisEnabled" color="primary" hide-details inset :loading="settingsModel.aiSettingsPending.value" />
            </div>
            <VAlert v-if="settingsModel.aiSettingsError.value" type="info" class="mt-4">
              {{ settingsModel.aiSettingsError.value }}
            </VAlert>
          </section>
        </div>
      </VWindowItem>

      <!-- Devices -->
      <VWindowItem value="devices">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <p class="setting-card__title">Текущая сессия</p>
            <div class="setting-facts mb-4">
              <div class="setting-fact-row">
                <span class="setting-fact-label">Браузер</span>
                <strong>{{ settingsModel.currentDevice.value.browser }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">ОС</span>
                <strong>{{ settingsModel.currentDevice.value.os }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Сессия</span>
                <strong>{{ sessionStartedLabel }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Режим запуска</span>
                <strong>{{ install.launchModeLabel.value }}</strong>
              </div>
            </div>
            <div class="settings-install-card mb-4">
              <p class="setting-card__title">Приложение</p>
              <p class="setting-card__meta">{{ install.installStatusLabel.value }}</p>
              <div class="settings-actions-row mt-3 settings-actions-row--wrap">
                <VBtn
                  v-if="!install.installed.value"
                  type="button"
                  color="primary"
                  variant="flat"
                  :loading="install.installPending.value"
                  :disabled="install.installPending.value"
                  @click="installMessengerApp()"
                >
                  {{ installActionLabel }}
                </VBtn>
                <VBtn
                  type="button"
                  color="secondary"
                  variant="tonal"
                  @click="showManualInstallHelp()"
                >
                  {{ install.installed.value ? 'Проверить режим приложения' : 'Как установить вручную' }}
                </VBtn>
              </div>
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Доверять этому устройству</span></span>
              <VSwitch v-model="settingsModel.settings.value.devices.trustThisDevice" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Оставаться в системе</span></span>
              <VSwitch v-model="settingsModel.settings.value.devices.keepSignedIn" color="primary" hide-details inset />
            </div>
            <div class="setting-toggle setting-toggle--vuetify">
              <span class="setting-toggle__copy"><span class="setting-field__label">Уменьшить анимации</span></span>
              <VSwitch v-model="settingsModel.settings.value.devices.reduceMotion" color="primary" hide-details inset />
            </div>
            <div class="settings-actions-row mt-4">
              <VBtn type="button" color="secondary" variant="tonal" @click="probeMedia('microphone')">Проверить микрофон</VBtn>
              <VBtn type="button" color="secondary" variant="tonal" @click="probeMedia('camera')">Проверить камеру</VBtn>
              <VBtn type="button" color="error" variant="tonal" @click="settingsModel.resetLocalSettings()">Сбросить настройки</VBtn>
            </div>
            <VAlert v-if="install.installMessage.value" type="info" class="mt-4">
              {{ install.installMessage.value }}
            </VAlert>
            <VAlert v-if="permissionActionMessage || calls.permissionHelp.value" type="info" class="mt-4">
              {{ permissionActionMessage || calls.permissionHelp.value }}
            </VAlert>
          </section>
        </div>
      </VWindowItem>

      <!-- Account -->
      <VWindowItem value="account">
        <div class="settings-panel pa-4">
          <section class="settings-grid">
            <p class="setting-card__title">Аккаунт</p>
            <div class="setting-facts mb-4">
              <div class="setting-fact-row">
                <span class="setting-fact-label">Логин</span>
                <strong>@{{ auth.user.value?.login || 'anonymous' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">ID</span>
                <strong>{{ formatUserId(auth.user.value?.id) }}</strong>
              </div>
            </div>
            <div class="settings-actions-row">
              <VBtn type="button" color="error" variant="tonal" @click="auth.logout()">
                <VIcon start>mdi-logout</VIcon>
                Выйти из аккаунта
              </VBtn>
            </div>
          </section>
        </div>
      </VWindowItem>
    </VWindow>

    <!-- Horizontal Tab Bar (bottom, above search dock) -->
    <div class="section-tabs-row">
      <VTabs
        :model-value="settingsModel.activeSection.value"
        class="section-tabs"
        bg-color="surface-container"
        color="primary"
        density="compact"
        grow
        @update:model-value="settingsModel.openSection($event as 'profile' | 'notifications' | 'privacy' | 'themes' | 'ai' | 'devices' | 'account')"
      >
        <VTab v-for="section in settingsModel.sections" :key="section.key" :value="section.key" :aria-label="section.title" :title="section.title">
          <VIcon>{{ settingsTabIcon(section.key) }}</VIcon>
        </VTab>
      </VTabs>
    </div>

    <!-- Search Dock -->
    <div class="search-dock">
      <div class="search-dock__field">
        <MessengerDockField>
          <input
            v-model="settingsSearch"
            type="text"
            class="composer-input composer-input--dock"
            placeholder=""
            autocomplete="off"
            @focus="openSettingsSearch"
            @blur="closeSettingsSearch"
          />
        </MessengerDockField>
        <Transition name="chrome-reveal">
          <div v-if="settingsSearchOpen && settingsSearchMatches.length" class="search-dropdown" @mousedown.prevent>
            <VList bg-color="transparent" density="comfortable">
              <VListItem
                v-for="section in settingsSearchMatches"
                :key="section.key"
                @click="selectSettingsSection(section.key)"
              >
                <template #title>{{ section.title }}</template>
                <template #subtitle>{{ section.hint }}</template>
              </VListItem>
            </VList>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>
