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
</script>

<template>
  <section class="section-block settings-shell settings-shell--material" aria-label="Settings section">
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Settings</p>
        <h2>Настройки аккаунта и устройства</h2>
      </div>
      <div class="setting-pill-row">
        <span class="setting-pill" :class="{ 'setting-pill--ok': realtime.connected.value }">
          {{ realtime.connected.value ? 'Live sync online' : realtime.connecting.value ? 'Соединяемся' : 'Offline sync' }}
        </span>
        <span class="setting-pill" :class="{ 'setting-pill--ok': calls.supported.value }">
          {{ calls.supported.value ? 'Calls ready' : 'Calls limited' }}
        </span>
      </div>
    </header>

    <div class="settings-layout settings-layout--compact-head">
      <article class="setting-card setting-card--glass setting-card--summary">
        <div class="setting-pill-row setting-pill-row--summary">
          <span class="setting-pill setting-pill--material">Material settings</span>
        </div>
        <p class="setting-card__title">Аккаунт</p>
        <p class="setting-card__text">{{ auth.user.value?.displayName || 'Гость' }} · @{{ auth.user.value?.login || 'anonymous' }}</p>
        <p class="setting-card__meta">Экран настроек собран как отдельный Material-слой: плотные панели, rail-навигация и более строгая иерархия без лишнего стекла.</p>
      </article>

      <aside class="settings-nav" aria-label="Меню настроек">
        <button
          v-for="section in settingsModel.sections"
          :key="section.key"
          type="button"
          class="settings-nav__item"
          :class="{ 'settings-nav__item--active': settingsModel.activeSection.value === section.key }"
          @click="settingsModel.openSection(section.key)"
        >
          <span class="settings-nav__title">{{ section.title }}</span>
          <span class="settings-nav__hint">{{ section.hint }}</span>
        </button>
      </aside>

      <div class="settings-panel">
        <section v-if="settingsModel.activeSection.value === 'profile'" class="settings-grid">
          <article class="setting-card setting-card--glass setting-card--stacked">
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
            <p class="setting-card__meta">Базовый профиль сейчас приходит с auth backend. Ниже редактируются локальные preferences именно этого клиента.</p>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <label class="setting-field">
              <span class="setting-field__label">Подпись</span>
              <input v-model="settingsModel.settings.value.profile.statusLine" type="text" class="inline-input" maxlength="80">
            </label>
            <label class="setting-field">
              <span class="setting-field__label">О себе</span>
              <textarea v-model="settingsModel.settings.value.profile.bio" rows="4" class="setting-textarea" maxlength="240" />
            </label>
            <label class="setting-field">
              <span class="setting-field__label">Предпочитаемый режим звонка</span>
              <select v-model="settingsModel.settings.value.profile.preferredCallMode" class="setting-select">
                <option value="audio">Сначала аудио</option>
                <option value="video">Сразу видео</option>
              </select>
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Автовоспроизведение голосовых</span>
                <span class="setting-card__meta">Полезно для быстрых диалогов в web-клиенте.</span>
              </span>
              <input v-model="settingsModel.settings.value.profile.autoplayVoice" type="checkbox">
            </label>
          </article>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'notifications'" class="settings-grid">
          <article class="setting-card setting-card--glass setting-card--stacked">
            <p class="setting-card__title">Системный статус</p>
            <p class="setting-card__text">{{ notificationPermissionLabel }}</p>
            <p class="setting-card__meta">Разрешение браузера управляется отдельно, но эти switches определяют поведение самого messenger.</p>
            <div class="setting-facts">
              <div class="setting-fact-row">
                <span class="setting-fact-label">Notifications API</span>
                <strong>{{ settingsModel.browserCapabilities.value.notifications ? 'Доступен' : 'Недоступен' }}</strong>
              </div>
              <div class="setting-fact-row">
                <span class="setting-fact-label">Permission status</span>
                <strong>{{ notificationPermissionStateLabel }}</strong>
              </div>
            </div>
            <div class="settings-actions-row">
              <button type="button" class="action-btn action-btn--ghost" @click="requestNotificationsPermission()">Запросить доступ к уведомлениям</button>
              <button type="button" class="action-btn action-btn--ghost" @click="settingsModel.refreshPermissionStates()">Обновить статусы</button>
            </div>
            <p v-if="permissionActionMessage" class="setting-inline-note">{{ permissionActionMessage }}</p>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Входящие звонки</span>
                <span class="setting-card__meta">Показывать banner входящего вызова поверх текущего экрана.</span>
              </span>
              <input v-model="settingsModel.settings.value.notifications.incomingCalls" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Предпросмотр сообщений</span>
                <span class="setting-card__meta">Показывать фрагмент текста в локальных уведомлениях.</span>
              </span>
              <input v-model="settingsModel.settings.value.notifications.messagePreview" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Звуковые сигналы</span>
                <span class="setting-card__meta">Сигнал отправки, входящих сообщений и вызовов.</span>
              </span>
              <input v-model="settingsModel.settings.value.notifications.soundEffects" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Вибрация</span>
                <span class="setting-card__meta">Только для совместимых мобильных браузеров.</span>
              </span>
              <input v-model="settingsModel.settings.value.notifications.vibration" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Desktop notifications</span>
                <span class="setting-card__meta">Использовать нативные системные уведомления браузера.</span>
              </span>
              <input v-model="settingsModel.settings.value.notifications.desktopNotifications" type="checkbox">
            </label>
          </article>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'privacy'" class="settings-grid">
          <article class="setting-card setting-card--glass setting-card--stacked">
            <label class="setting-field">
              <span class="setting-field__label">Кто видит last seen</span>
              <select v-model="settingsModel.settings.value.privacy.lastSeenVisibility" class="setting-select">
                <option value="everyone">Все пользователи</option>
                <option value="contacts">Только контакты</option>
                <option value="nobody">Никто</option>
              </select>
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Read receipts</span>
                <span class="setting-card__meta">Показывать подтверждение прочтения для direct-чатов.</span>
              </span>
              <input v-model="settingsModel.settings.value.privacy.readReceipts" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Link previews</span>
                <span class="setting-card__meta">Показывать развёрнутые карточки ссылок в дальнейшем media pipeline.</span>
              </span>
              <input v-model="settingsModel.settings.value.privacy.linkPreviews" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Поиск по логину</span>
                <span class="setting-card__meta">Разрешать находить аккаунт через user discovery.</span>
              </span>
              <input v-model="settingsModel.settings.value.privacy.allowDiscoveryByLogin" type="checkbox">
            </label>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <p class="setting-card__title">Локальная модель приватности</p>
            <p class="setting-card__text">Этот экран уже хранит твои privacy preferences локально и готов к следующему шагу, когда появится backend sync профиля и устройств.</p>
            <p class="setting-card__meta">Сейчас настройки влияют на клиентский UX и служат базой для будущего server-side профиля.</p>
          </article>
        </section>

        <section v-else-if="settingsModel.activeSection.value === 'themes'" class="settings-grid">
          <article class="setting-card setting-card--glass setting-card--stacked">
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
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <p class="setting-card__title">Стиль дизайна</p>
            <p class="setting-card__text">Отдельно от палитры можно переключать характер интерфейса. Material 3 выделен как самостоятельный режим с плотными поверхностями и более собранной читаемостью.</p>
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
                  </span>
                  <span class="style-card__meta">{{ style.hint }}</span>
                </span>
                <span class="style-card__state">
                  {{ settingsModel.settings.value.themes.style === style.key ? 'Активен' : 'Выбрать' }}
                </span>
              </button>
            </div>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
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
            <p class="setting-card__meta">Тема управляет палитрой, а стиль управляет характером поверхностей. Можно, например, выбрать Void и включить минималистичный режим без liquid glass.</p>
          </article>
        </section>

        <section v-else class="settings-grid">
          <article class="setting-card setting-card--glass setting-card--stacked">
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
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <p class="setting-card__title">Готовность устройства</p>
            <div class="device-status-grid">
              <div class="device-status-item">
                <span class="setting-fact-label">Realtime</span>
                <strong>{{ realtime.connected.value ? 'Онлайн' : realtime.connecting.value ? 'Соединяемся' : 'Оффлайн' }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Calls</span>
                <strong>{{ mediaSupportLabel }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Persistence</span>
                <strong>{{ sessionPersistenceLabel }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Permissions API</span>
                <strong>{{ settingsModel.browserCapabilities.value.permissionsApi ? 'Доступен' : 'Ограничен' }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Vibration API</span>
                <strong>{{ settingsModel.browserCapabilities.value.vibration ? 'Поддерживается' : 'Недоступна' }}</strong>
              </div>
            </div>
            <div class="device-status-grid">
              <div class="device-status-item">
                <span class="setting-fact-label">Audio readiness</span>
                <strong>{{ calls.audioReadiness.value }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Video readiness</span>
                <strong>{{ calls.videoReadiness.value }}</strong>
              </div>
            </div>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Доверять этому устройству</span>
                <span class="setting-card__meta">Сохранять локальные preferences и историю этой web-сессии.</span>
              </span>
              <input v-model="settingsModel.settings.value.devices.trustThisDevice" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Оставаться в системе</span>
                <span class="setting-card__meta">Переключает хранение токена между localStorage и sessionStorage.</span>
              </span>
              <input v-model="settingsModel.settings.value.devices.keepSignedIn" type="checkbox">
            </label>
            <label class="setting-toggle">
              <span class="setting-toggle__copy">
                <span class="setting-field__label">Reduce motion</span>
                <span class="setting-card__meta">Уменьшить анимации и смягчить переходы интерфейса.</span>
              </span>
              <input v-model="settingsModel.settings.value.devices.reduceMotion" type="checkbox">
            </label>
            <div class="settings-actions-row">
              <button type="button" class="action-btn action-btn--ghost" @click="probeMedia('microphone')">Проверить микрофон</button>
              <button type="button" class="action-btn action-btn--ghost" @click="probeMedia('camera')">Проверить камеру</button>
              <button type="button" class="action-btn action-btn--ghost" @click="settingsModel.resetLocalSettings()">Сбросить локальные настройки</button>
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
                <span class="setting-fact-label">Permission mic</span>
                <strong>{{ microphonePermissionStateLabel }}</strong>
              </div>
              <div class="device-status-item">
                <span class="setting-fact-label">Permission camera</span>
                <strong>{{ cameraPermissionStateLabel }}</strong>
              </div>
            </div>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
            <p class="setting-card__title">Call readiness</p>
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
              <button type="button" class="action-btn action-btn--accept" @click="requestCallPermission('microphone')">Разрешить микрофон для звонков</button>
              <button type="button" class="action-btn action-btn--ghost" @click="requestCallPermission('camera')">Разрешить камеру для видеозвонков</button>
            </div>
            <div class="settings-actions-row">
              <button
                v-if="calls.mediaPermissionState.value.microphone === 'denied'"
                type="button"
                class="action-btn action-btn--ghost"
                @click="openCallSitePermissions('microphone')"
              >
                Открыть site permissions для микрофона
              </button>
              <button
                v-if="calls.mediaPermissionState.value.camera === 'denied' || calls.mediaPermissionState.value.microphone === 'denied'"
                type="button"
                class="action-btn action-btn--ghost"
                @click="openCallSitePermissions('camera')"
              >
                Открыть site permissions для видеозвонков
              </button>
            </div>
            <p v-if="calls.permissionHelp.value || calls.callError.value || permissionActionMessage" class="setting-inline-note">
              {{ permissionActionMessage || calls.permissionHelp.value || calls.callError.value }}
            </p>
          </article>

          <article class="setting-card setting-card--glass setting-card--stacked">
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
              <button
                type="button"
                class="action-btn action-btn--accept"
                :disabled="install.installPending.value || install.isStandalone.value"
                @click="installMessengerApp()"
              >
                {{ install.installPending.value ? 'Устанавливаем…' : install.isStandalone.value ? 'Приложение уже установлено' : 'Установить приложение' }}
              </button>
              <button type="button" class="action-btn action-btn--ghost" @click="showManualInstallHelp()">Как установить вручную</button>
            </div>
            <p v-if="install.installMessage.value" class="setting-inline-note">{{ install.installMessage.value }}</p>
            <p class="setting-inline-note">Для полноценной установки на проде браузеру обычно нужен HTTPS. На localhost standalone-режим и установка доступны лучше всего.</p>
          </article>
        </section>
      </div>
    </div>
  </section>
</template>