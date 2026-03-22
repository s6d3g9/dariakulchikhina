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
})

watch(() => settingsModel.settings.value.devices.keepSignedIn, (enabled) => {
  auth.setPersistence(enabled ? 'local' : 'session')
})

const activeThemeMeta = computed(() => settingsModel.themeOptions.find(theme => theme.key === settingsModel.settings.value.themes.active) ?? settingsModel.themeOptions[0])
const activeStyleMeta = computed(() => settingsModel.styleOptions.find(style => style.key === settingsModel.settings.value.themes.style) ?? settingsModel.styleOptions[0])
const activeStyleBadge = computed(() => {
  if (settingsModel.settings.value.themes.style === 'material') {
    return 'Material 3'
  }

  return 'Liquid'
})
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

const submenus = computed(() => {
  if (settingsModel.activeSection.value === 'privacy') {
    return [
      { key: 'visibility', title: 'Видимость' },
      { key: 'security', title: 'Безопасность' },
      { key: 'data', title: 'Данные' }
    ]
  }
  if (settingsModel.activeSection.value === 'notifications') {
    return [
      { key: 'system', title: 'Системные' },
      { key: 'chats', title: 'В чатах' },
      { key: 'calls', title: 'Звонки' }
    ]
  }
  return null
})

const activeSubmenu = ref('visibility')
watch(() => settingsModel.activeSection.value, (newVal) => {
  if (newVal === 'privacy') activeSubmenu.value = 'visibility'
  else if (newVal === 'notifications') activeSubmenu.value = 'system'
  else activeSubmenu.value = ''
})


const submenus = computed(() => {
  if (settingsModel.activeSection.value === 'privacy') {
    return [
      { key: 'visibility', title: 'Видимость' },
      { key: 'security', title: 'Безопасность' },
      { key: 'data', title: 'Данные' }
    ]
  }
  if (settingsModel.activeSection.value === 'notifications') {
    return [
      { key: 'system', title: 'Системные' },
      { key: 'chats', title: 'В чатах' },
      { key: 'calls', title: 'Звонки' }
    ]
  }
  return null
})

const activeSubmenu = ref('visibility')
watch(() => settingsModel.activeSection.value, (newVal) => {
  if (newVal === 'privacy') activeSubmenu.value = 'visibility'
  else if (newVal === 'notifications') activeSubmenu.value = 'system'
  else activeSubmenu.value = ''
})

</script>

<template>
  <section
    class="section-block settings-shell"
    :class="{ 'settings-shell--material': settingsModel.settings.value.themes.style === 'material' }"
    aria-label="Раздел настроек"
  >
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Настройки</p>
        <h2>Настройки аккаунта и устройства</h2>
      </div>
      <div class="setting-pill-row">
        <VChip class="setting-pill" :color="realtime.connected.value ? 'success' : 'secondary'" size="small" variant="tonal">
          {{ realtime.connected.value ? 'Синхронизация онлайн' : realtime.connecting.value ? 'Соединяемся' : 'Локальный режим' }}
        </VChip>
        <VChip class="setting-pill" :color="calls.supported.value ? 'success' : 'warning'" size="small" variant="tonal">
          {{ calls.supported.value ? 'Звонки готовы' : 'Звонки ограничены' }}
        </VChip>
      </div>
    </header>

    <div class="settings-layout settings-layout--compact-head">
      <VCard class="setting-card setting-card--glass setting-card--summary setting-card--vuetify" color="surface" variant="tonal">
        <VCardText class="setting-card__body">
          <div class="setting-pill-row setting-pill-row--summary">
            <VChip
              class="setting-pill"
              :color="settingsModel.settings.value.themes.style === 'material' ? 'info' : 'success'"
              size="small"
              variant="tonal"
            >
              {{ activeStyleBadge }}
            </VChip>
          </div>
          <p class="setting-card__title">Аккаунт</p>
          <p class="setting-card__text">{{ auth.user.value?.displayName || 'Гость' }} · @{{ auth.user.value?.login || 'anonymous' }}</p>
          <p class="setting-card__meta">Текущий режим: {{ activeStyleMeta.title }}. Material 3 держит плотные tonal-поверхности, спокойную иерархию и ровный системный ритм по всему messenger.</p>
        </VCardText>
      </VCard>

      <aside v-if="settingsModel.settings.value.themes.style === 'material'" class="settings-nav" aria-label="Меню настроек">
        
        <Transition name="m3-submenu-rise">
          <div v-if="submenus" class="settings-nav__m3-track settings-nav__m3-track--sub">
            <button
              v-for="sub in submenus"
              :key="sub.key"
              type="button"
              class="settings-nav__m3-chip settings-nav__m3-chip--sub"
              :class="{ 'settings-nav__m3-chip--active': activeSubmenu === sub.key }"
              @click="activeSubmenu = sub.key"
            >
              {{ sub.title }}
            </button>
          </div>
        </Transition>
        
        <Transition name="m3-submenu-rise">
          <div v-if="submenus" class="settings-nav__m3-track settings-nav__m3-track--sub">
            <button
              v-for="sub in submenus"
              :key="sub.key"
              type="button"
              class="settings-nav__m3-chip settings-nav__m3-chip--sub"
              :class="{ 'settings-nav__m3-chip--active': activeSubmenu === sub.key }"
              @click="activeSubmenu = sub.key"
            >
              {{ sub.title }}
            </button>
          </div>
        </Transition>
        <div class="settings-nav__m3-track">
          <button
            v-for="section in settingsModel.sections"
            :key="section.key"
            type="button"
            class="settings-nav__m3-chip"
            :class="{ 'settings-nav__m3-chip--active': settingsModel.activeSection.value === section.key }"
            @click="settingsModel.openSection(section.key)"
          >
            {{ section.title }}
          </button>
        </div>
      </aside>

      <aside v-else class="settings-nav settings-nav--vuetify" aria-label="Меню настроек">
        <VList class="settings-nav__list" bg-color="transparent" density="comfortable" nav>
          <VListItem
            v-for="section in settingsModel.sections"
            :key="section.key"
            class="settings-nav__item settings-nav__item--vuetify"
            :active="settingsModel.activeSection.value === section.key"
            @click="settingsModel.openSection(section.key)"
          >
            <template #title>
              <span class="settings-nav__title">{{ section.title }}</span>
            </template>
            <template #subtitle>
              <span class="settings-nav__hint">{{ section.hint }}</span>
            </template>
          </VListItem>
        </VList>
      </aside>

      <div class="settings-panel settings-panel--vuetify">
        <section v-if="settingsModel.activeSection.value === 'profile'" class="settings-grid">
          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
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
              <p class="setting-card__meta">Базовый профиль приходит из auth backend. Ниже меняются локальные настройки именно этого клиента.</p>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <VTextField v-model="settingsModel.settings.value.profile.statusLine" label="Подпись" maxlength="80" />
              <VTextarea v-model="settingsModel.settings.value.profile.bio" label="О себе" rows="4" maxlength="240" />
              <VSelect
                v-model="settingsModel.settings.value.profile.preferredCallMode"
                label="Предпочитаемый режим звонка"
                :items="preferredCallModeOptions"
                item-title="title"
                item-value="value"
              />
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Автовоспроизведение голосовых</span>
                  <span class="setting-card__meta">Полезно для быстрых диалогов в web-клиенте.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.profile.autoplayVoice" color="primary" hide-details inset />
              </div>
            </VCardText>
          </VCard>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'notifications'" class="settings-grid">
          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Системный статус</p>
              <p class="setting-card__text">{{ notificationPermissionLabel }}</p>
              <p class="setting-card__meta">Разрешение браузера управляется отдельно, а эти переключатели задают поведение самого messenger.</p>
              <div class="setting-facts">
                <div class="setting-fact-row">
                  <span class="setting-fact-label">API уведомлений</span>
                  <strong>{{ settingsModel.browserCapabilities.value.notifications ? 'Доступен' : 'Недоступен' }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Статус разрешения</span>
                  <strong>{{ notificationPermissionStateLabel }}</strong>
                </div>
              </div>
              <div class="settings-actions-row">
                <VBtn type="button" color="secondary" variant="tonal" @click="requestNotificationsPermission()">Запросить доступ к уведомлениям</VBtn>
                <VBtn type="button" color="secondary" variant="tonal" @click="settingsModel.refreshPermissionStates()">Обновить статусы</VBtn>
              </div>
              <VAlert v-if="permissionActionMessage" type="info">{{ permissionActionMessage }}</VAlert>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Входящие звонки</span>
                  <span class="setting-card__meta">Показывать баннер входящего вызова поверх текущего экрана.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.notifications.incomingCalls" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Предпросмотр сообщений</span>
                  <span class="setting-card__meta">Показывать фрагмент текста в локальных уведомлениях.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.notifications.messagePreview" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Звуковые сигналы</span>
                  <span class="setting-card__meta">Сигнал отправки, входящих сообщений и вызовов.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.notifications.soundEffects" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Вибрация</span>
                  <span class="setting-card__meta">Только для совместимых мобильных браузеров.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.notifications.vibration" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Системные уведомления</span>
                  <span class="setting-card__meta">Использовать нативные системные уведомления браузера.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.notifications.desktopNotifications" color="primary" hide-details inset />
              </div>
            </VCardText>
          </VCard>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'privacy'" class="settings-grid">
          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <VSelect
                v-model="settingsModel.settings.value.privacy.lastSeenVisibility"
                label="Кто видит время последнего входа"
                :items="lastSeenOptions"
                item-title="title"
                item-value="value"
              />
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Подтверждения прочтения</span>
                  <span class="setting-card__meta">Показывать подтверждение прочтения для direct-чатов.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.privacy.readReceipts" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Превью ссылок</span>
                  <span class="setting-card__meta">Показывать развёрнутые карточки ссылок в дальнейшем media pipeline.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.privacy.linkPreviews" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Поиск по логину</span>
                  <span class="setting-card__meta">Разрешать находить аккаунт через user discovery.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.privacy.allowDiscoveryByLogin" color="primary" hide-details inset />
              </div>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Локальная модель приватности</p>
              <p class="setting-card__text">Этот экран уже хранит локальные настройки приватности и готов к следующему шагу, когда появится серверная синхронизация профиля и устройств.</p>
              <p class="setting-card__meta">Сейчас параметры влияют на клиентский UX и служат основой для будущего серверного профиля.</p>
            </VCardText>
          </VCard>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'themes'" class="settings-grid">
          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
            <p class="setting-card__title">Темы интерфейса</p>
            <p class="setting-card__text">Выберите общую палитру messenger. Переключение применяется сразу ко всему интерфейсу и сохраняется локально на этом устройстве.</p>
            <div class="theme-grid">
              <button
                v-for="theme in settingsModel.themeOptions"
                :key="theme.key"
                type="button"
                class="theme-card"
                :class="[
                  `theme-card--${theme.key}`,
                  { 'theme-card--active': settingsModel.settings.value.themes.active === theme.key }
                ]"
                :aria-pressed="settingsModel.settings.value.themes.active === theme.key"
                @click="settingsModel.setTheme(theme.key)"
              >
                <span class="theme-card__preview" aria-hidden="true">
                  <span class="theme-card__preview-topbar" />
                  <span class="theme-card__preview-bubbles">
                    <span class="theme-card__bubble theme-card__bubble--peer" />
                    <span class="theme-card__bubble theme-card__bubble--own" />
                    <span class="theme-card__bubble theme-card__bubble--peer theme-card__bubble--short" />
                  </span>
                </span>
                <span class="theme-card__copy">
                  <span class="theme-card__title">{{ theme.title }}</span>
                  <span class="theme-card__meta">{{ theme.hint }}</span>
                </span>
                <span class="theme-card__state">
                  {{ settingsModel.settings.value.themes.active === theme.key ? 'Активна' : 'Выбрать' }}
                </span>
              </button>
            </div>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
            <p class="setting-card__title">Стиль дизайна</p>
            <p class="setting-card__text">Есть только два режима: Liquid и Material 3. Они должны читаться как две разные системы. В Material 3 все поверхности, состояния и навигация собраны вокруг плотных tonal-слоёв без стеклянных эффектов.</p>
            <div class="style-grid">
              <button
                v-for="style in settingsModel.styleOptions"
                :key="style.key"
                type="button"
                class="style-card"
                :class="[
                  `style-card--${style.key}`,
                  { 'style-card--active': settingsModel.settings.value.themes.style === style.key }
                ]"
                :aria-pressed="settingsModel.settings.value.themes.style === style.key"
                @click="settingsModel.setStyle(style.key)"
              >
                <span class="style-card__preview" aria-hidden="true">
                  <span class="style-card__preview-topbar" />
                  <span class="style-card__preview-panel" />
                  <span class="style-card__preview-row">
                    <span class="style-card__preview-dot" />
                    <span class="style-card__preview-button" />
                  </span>
                </span>
                <span class="style-card__copy">
                  <span class="style-card__title-row">
                    <span class="style-card__title">{{ style.title }}</span>
                    <span v-if="style.key === 'material'" class="style-card__chip">M3</span>
                    <span v-else class="style-card__chip style-card__chip--liquid">Liquid</span>
                  </span>
                  <span class="style-card__meta">{{ style.hint }}</span>
                </span>
                <span class="style-card__state">
                  {{ settingsModel.settings.value.themes.style === style.key ? 'Активен' : 'Выбрать' }}
                </span>
              </button>
            </div>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Как это работает</p>
              <div class="setting-facts">
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Текущая тема</span>
                  <strong>{{ activeThemeMeta.title }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Текущий стиль</span>
                  <strong>{{ activeStyleMeta.title }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Хранение</span>
                  <strong>{{ settingsModel.settings.value.devices.trustThisDevice ? 'localStorage' : 'sessionStorage' }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Применение</span>
                  <strong>Мгновенно ко всему messenger</strong>
                </div>
              </div>
              <p class="setting-card__meta">Тема управляет палитрой, а стиль управляет пластикой интерфейса. Например, Void может работать и как холодный Liquid, и как плотный Material без стеклянных эффектов.</p>
            </VCardText>
          </VCard>
        </section>

        <section v-else class="settings-grid">
          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Текущая сессия</p>
              <div class="setting-facts">
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Браузер</span>
                  <strong>{{ settingsModel.currentDevice.value.browser }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">ОС</span>
                  <strong>{{ settingsModel.currentDevice.value.os }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Язык</span>
                  <strong>{{ settingsModel.currentDevice.value.language }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Сессия запущена</span>
                  <strong>{{ sessionStartedLabel }}</strong>
                </div>
              </div>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Готовность устройства</p>
              <div class="device-status-grid">
                <div class="device-status-item">
                  <span class="setting-fact-label">Синхронизация</span>
                  <strong>{{ realtime.connected.value ? 'Онлайн' : realtime.connecting.value ? 'Соединяемся' : 'Оффлайн' }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Звонки</span>
                  <strong>{{ mediaSupportLabel }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Хранение сессии</span>
                  <strong>{{ sessionPersistenceLabel }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">API разрешений</span>
                  <strong>{{ settingsModel.browserCapabilities.value.permissionsApi ? 'Доступен' : 'Ограничен' }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">API вибрации</span>
                  <strong>{{ settingsModel.browserCapabilities.value.vibration ? 'Поддерживается' : 'Недоступна' }}</strong>
                </div>
              </div>
              <div class="device-status-grid">
                <div class="device-status-item">
                  <span class="setting-fact-label">Готовность аудио</span>
                  <strong>{{ calls.audioReadiness.value }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Готовность видео</span>
                  <strong>{{ calls.videoReadiness.value }}</strong>
                </div>
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Доверять этому устройству</span>
                  <span class="setting-card__meta">Сохранять локальные настройки и историю этой web-сессии.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.devices.trustThisDevice" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Оставаться в системе</span>
                  <span class="setting-card__meta">Переключает хранение токена между localStorage и sessionStorage.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.devices.keepSignedIn" color="primary" hide-details inset />
              </div>
              <div class="setting-toggle setting-toggle--vuetify">
                <span class="setting-toggle__copy">
                  <span class="setting-field__label">Уменьшить анимации</span>
                  <span class="setting-card__meta">Уменьшить анимации и смягчить переходы интерфейса.</span>
                </span>
                <VSwitch v-model="settingsModel.settings.value.devices.reduceMotion" color="primary" hide-details inset />
              </div>
              <div class="settings-actions-row">
                <VBtn type="button" color="secondary" variant="tonal" @click="probeMedia('microphone')">Проверить микрофон</VBtn>
                <VBtn type="button" color="secondary" variant="tonal" @click="probeMedia('camera')">Проверить камеру</VBtn>
                <VBtn type="button" color="secondary" variant="tonal" @click="settingsModel.resetLocalSettings()">Сбросить локальные настройки</VBtn>
              </div>
              <div class="device-status-grid">
                <div class="device-status-item">
                  <span class="setting-fact-label">Микрофон</span>
                  <strong>{{ mediaStatus.microphone }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Камера</span>
                  <strong>{{ mediaStatus.camera }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Разрешение на микрофон</span>
                  <strong>{{ microphonePermissionStateLabel }}</strong>
                </div>
                <div class="device-status-item">
                  <span class="setting-fact-label">Разрешение на камеру</span>
                  <strong>{{ cameraPermissionStateLabel }}</strong>
                </div>
              </div>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">Готовность звонков</p>
              <p class="setting-card__text">Отдельный быстрый сценарий для звонков: сначала микрофон для аудио, затем камера для видео.</p>
              <div class="setting-facts">
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Аудиозвонки</span>
                  <strong>{{ audioCallPermissionLabel }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Видеозвонки</span>
                  <strong>{{ videoCallPermissionLabel }}</strong>
                </div>
              </div>
              <div class="settings-actions-row">
                <VBtn type="button" color="success" variant="flat" @click="requestCallPermission('microphone')">Разрешить микрофон для звонков</VBtn>
                <VBtn type="button" color="secondary" variant="tonal" @click="requestCallPermission('camera')">Разрешить камеру для видеозвонков</VBtn>
              </div>
              <div class="settings-actions-row">
                <VBtn
                  v-if="calls.mediaPermissionState.value.microphone === 'denied'"
                  type="button"
                  color="secondary"
                  variant="tonal"
                  @click="openCallSitePermissions('microphone')"
                >
                  Открыть site permissions для микрофона
                </VBtn>
                <VBtn
                  v-if="calls.mediaPermissionState.value.camera === 'denied' || calls.mediaPermissionState.value.microphone === 'denied'"
                  type="button"
                  color="secondary"
                  variant="tonal"
                  @click="openCallSitePermissions('camera')"
                >
                  Открыть site permissions для видеозвонков
                </VBtn>
              </div>
              <VAlert v-if="calls.permissionHelp.value || calls.callError.value || permissionActionMessage" type="info">
                {{ permissionActionMessage || calls.permissionHelp.value || calls.callError.value }}
              </VAlert>
            </VCardText>
          </VCard>

          <VCard class="setting-card setting-card--glass setting-card--stacked setting-card--vuetify" color="surface" variant="tonal">
            <VCardText class="setting-card__body">
              <p class="setting-card__title">App mode</p>
              <p class="setting-card__text">Установите messenger как отдельное приложение, чтобы он открывался без адресной строки браузера.</p>
              <div class="setting-facts">
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Standalone mode</span>
                  <strong>{{ install.isStandalone.value ? 'Уже открыт как приложение' : 'Открыт во вкладке браузера' }}</strong>
                </div>
                <div class="setting-fact-row">
                  <span class="setting-fact-label">Install prompt</span>
                  <strong>{{ install.installSupported.value ? 'Готов к установке' : 'Нужен ручной запуск из меню браузера' }}</strong>
                </div>
              </div>
              <div class="settings-actions-row">
                <VBtn
                  type="button"
                  color="success"
                  variant="flat"
                  :disabled="install.installPending.value || install.isStandalone.value"
                  @click="installMessengerApp()"
                >
                  {{ install.installPending.value ? 'Устанавливаем…' : install.isStandalone.value ? 'Приложение уже установлено' : 'Установить приложение' }}
                </VBtn>
                <VBtn type="button" color="secondary" variant="tonal" @click="showManualInstallHelp()">Как установить вручную</VBtn>
              </div>
              <VAlert v-if="install.installMessage.value" type="info">{{ install.installMessage.value }}</VAlert>
              <p class="setting-inline-note">Для полноценной установки на проде браузеру обычно нужен HTTPS. На localhost standalone-режим и установка доступны лучше всего.</p>
            </VCardText>
          </VCard>
        </section>
      </div>
    </div>
  </section>
</template>