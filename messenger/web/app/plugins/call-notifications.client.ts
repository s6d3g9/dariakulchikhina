import { buildMessengerUrl } from '../utils/messenger-url'

type MessengerCallNotificationAction = 'accept' | 'reject' | 'hangup' | 'toggle-microphone' | 'toggle-speaker' | 'toggle-video' | 'open'

interface MessengerCallNotificationDescriptor {
  tag: string
  title: string
  body: string
  requireInteraction: boolean
  renotify: boolean
  silent: boolean
  vibrate?: number[]
  actions: NotificationAction[]
  data: {
    callId: string
    conversationId: string
  }
}

function buildCallNotificationTag(callId: string) {
  return `messenger-call-${callId}`
}

function resolveNotificationActionLimit() {
  if (typeof Notification === 'undefined' || typeof Notification.maxActions !== 'number') {
    return 3
  }

  return Notification.maxActions > 0 ? Notification.maxActions : 0
}

export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator) || typeof Notification === 'undefined') {
    return
  }

  const runtimeConfig = useRuntimeConfig()
  const calls = useMessengerCalls()
  const conversations = useMessengerConversations()
  const settingsModel = useMessengerSettings()
  const actionLimit = resolveNotificationActionLimit()
  const serviceWorkerScopeUrl = buildMessengerUrl(runtimeConfig.app.baseURL, '/')

  settingsModel.hydrate()
  void settingsModel.refreshPermissionStates()

  let syncVersion = 0
  let activeNotificationTag = ''

  async function resolveServiceWorkerRegistration() {
    const existing = await navigator.serviceWorker.getRegistration(serviceWorkerScopeUrl).catch(() => null)
    if (existing) {
      return existing
    }

    const ready = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2000)),
    ])

    return ready
  }

  async function closeCallNotifications(tag: string) {
    if (!tag) {
      return
    }

    const registration = await resolveServiceWorkerRegistration()
    if (!registration) {
      return
    }

    const notifications = await registration.getNotifications({ tag }).catch(() => [])
    for (const notification of notifications) {
      notification.close()
    }
  }

  async function openConversationForNotification(conversationId: string) {
    if (!conversationId) {
      return
    }

    try {
      await conversations.refresh(conversations.query.value)
      await conversations.selectConversation(conversationId)
    } catch {
      // Keep notification actions resilient even if the thread refresh fails.
    }
  }

  async function handleNotificationAction(action: MessengerCallNotificationAction, callId: string, conversationId: string) {
    if (!callId) {
      return
    }

    if (action === 'open') {
      await openConversationForNotification(conversationId)
      return
    }

    if (action !== 'reject') {
      await openConversationForNotification(conversationId)
    }

    if (action === 'accept') {
      if (calls.incomingCall.value?.callId === callId) {
        await calls.acceptIncomingCall()
      }
      return
    }

    if (action === 'reject') {
      if (calls.incomingCall.value?.callId === callId) {
        await calls.rejectIncomingCall()
      }
      return
    }

    if (calls.activeCall.value?.callId !== callId) {
      return
    }

    if (action === 'hangup') {
      await calls.hangupCall()
      return
    }

    if (action === 'toggle-microphone') {
      calls.toggleMicrophone()
      return
    }

    if (action === 'toggle-speaker') {
      calls.toggleSpeaker()
      return
    }

    if (action === 'toggle-video') {
      await calls.toggleVideo()
    }
  }

  const notificationDescriptor = computed<MessengerCallNotificationDescriptor | null>(() => {
    if (!settingsModel.ready.value) {
      return null
    }

    const notificationSettings = settingsModel.settings.value.notifications

    if (
      !notificationSettings.desktopNotifications
      || settingsModel.permissionState.value.notifications !== 'granted'
    ) {
      return null
    }

    if (calls.activeCall.value) {
      const activeCall = calls.activeCall.value
      const secondaryLabel = activeCall.mode === 'audio'
        ? (calls.controls.value.speakerEnabled ? 'Громкая связь' : 'Обычный режим')
        : (calls.controls.value.videoEnabled ? 'Камера включена' : 'Камера выключена')
      const actions: NotificationAction[] = [
        {
          action: 'toggle-microphone',
          title: calls.controls.value.microphoneEnabled ? 'Микрофон выкл' : 'Микрофон вкл',
        },
        {
          action: 'hangup',
          title: 'Завершить',
        },
        {
          action: activeCall.mode === 'audio' ? 'toggle-speaker' : 'toggle-video',
          title: activeCall.mode === 'audio'
            ? (calls.controls.value.speakerEnabled ? 'Обычный режим' : 'Громкая связь')
            : (calls.controls.value.videoEnabled ? 'Камеру выкл' : 'Камеру вкл'),
        },
      ]

      return {
        tag: buildCallNotificationTag(activeCall.callId),
        title: `Звонок: ${activeCall.peerDisplayName}`,
        body: `${calls.callStatusText.value || (activeCall.mode === 'video' ? 'Видеозвонок активен.' : 'Аудиозвонок активен.')} ${secondaryLabel}.`,
        requireInteraction: false,
        renotify: false,
        silent: !notificationSettings.soundEffects,
        actions: actions.slice(0, actionLimit),
        data: {
          callId: activeCall.callId,
          conversationId: activeCall.conversationId,
        },
      }
    }

    if (!calls.incomingCall.value || !notificationSettings.incomingCalls) {
      return null
    }

    const incomingCall = calls.incomingCall.value

    return {
      tag: buildCallNotificationTag(incomingCall.callId),
      title: 'Входящий звонок',
      body: `${incomingCall.fromDisplayName} приглашает в ${incomingCall.mode === 'video' ? 'видеозвонок' : 'аудиозвонок'}.`,
      requireInteraction: true,
      renotify: true,
      silent: !notificationSettings.soundEffects,
      vibrate: notificationSettings.vibration ? [220, 120, 220] : undefined,
      actions: [
        {
          action: 'accept',
          title: 'Принять',
        },
        {
          action: 'reject',
          title: 'Отклонить',
        },
      ].slice(0, actionLimit),
      data: {
        callId: incomingCall.callId,
        conversationId: incomingCall.conversationId,
      },
    }
  })

  watch(notificationDescriptor, async (nextDescriptor) => {
    const currentVersion = ++syncVersion
    const nextTag = nextDescriptor?.tag || ''

    if (activeNotificationTag && activeNotificationTag !== nextTag) {
      await closeCallNotifications(activeNotificationTag)
      if (currentVersion !== syncVersion) {
        return
      }
    }

    activeNotificationTag = nextTag

    if (!nextDescriptor) {
      return
    }

    const registration = await resolveServiceWorkerRegistration()
    if (!registration || currentVersion !== syncVersion) {
      return
    }

    await registration.showNotification(nextDescriptor.title, {
      body: nextDescriptor.body,
      tag: nextDescriptor.tag,
      requireInteraction: nextDescriptor.requireInteraction,
      renotify: nextDescriptor.renotify,
      silent: nextDescriptor.silent,
      vibrate: nextDescriptor.vibrate,
      badge: `${runtimeConfig.app.baseURL}icons/messenger-app-192.png`,
      icon: `${runtimeConfig.app.baseURL}icons/messenger-app-192.png`,
      actions: nextDescriptor.actions,
      data: nextDescriptor.data,
      lang: 'ru',
      timestamp: Date.now(),
    }).catch(() => {})
  }, { deep: true, immediate: true })

  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data as {
      type?: string
      action?: MessengerCallNotificationAction
      callId?: string
      conversationId?: string
    } | undefined

    if (payload?.type !== 'messenger-call-notification-action' || !payload.action || !payload.callId) {
      return
    }

    void handleNotificationAction(payload.action, payload.callId, payload.conversationId || '')
  })
})