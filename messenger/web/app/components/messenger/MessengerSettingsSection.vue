<script setup lang="ts">
const auth = useMessengerAuth()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
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

const activeSectionMeta = computed(() => settingsModel.sections.find(section => section.key === settingsModel.activeSection.value) ?? settingsModel.sections[0])
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
</script>

<template>
  <section class="section-block settings-shell" aria-label="Settings section">
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Settings</p>
        <h2>Настройки аккаунта и устройства</h2>
      </div>
      <p class="setting-section-intro">
        Здесь живут локальные preferences этого клиента: профиль устройства, уведомления, приватность и текущая сессия.
      </p>
    </header>

    <div class="settings-overview-grid">
      <article class="setting-card setting-card--glass setting-card--summary">
        <p class="setting-card__title">Аккаунт</p>
        <p class="setting-card__text">{{ auth.user.value?.displayName || 'Гость' }} · @{{ auth.user.value?.login || 'anonymous' }}</p>
        <div class="setting-pill-row">
          <span class="setting-pill" :class="{ 'setting-pill--ok': realtime.connected.value }">
            {{ realtime.connected.value ? 'Live sync online' : realtime.connecting.value ? 'Соединяемся' : 'Offline sync' }}
          </span>
          <span class="setting-pill" :class="{ 'setting-pill--ok': calls.supported.value }">
            {{ calls.supported.value ? 'Calls ready' : 'Calls limited' }}
          </span>
        </div>
      </article>

      <article class="setting-card setting-card--glass setting-card--summary">
        <p class="setting-card__title">Текущий раздел</p>
        <p class="setting-card__text">{{ activeSectionMeta.title }}</p>
        <p class="setting-card__meta">{{ activeSectionMeta.hint }}</p>
      </article>
    </div>

    <div class="settings-layout">
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
        </section>
      </div>
    </div>
  </section>
</template>