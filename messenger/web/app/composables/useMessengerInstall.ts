interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let installLifecycleBound = false

function isIosSafari() {
  if (!import.meta.client) {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(userAgent)
  const isWebKit = userAgent.includes('webkit')
  const isCriOS = userAgent.includes('crios')
  const isFxiOS = userAgent.includes('fxios')

  return isIos && isWebKit && !isCriOS && !isFxiOS
}

function detectStandaloneMode() {
  if (!import.meta.client) {
    return false
  }

  const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches
  const mediaFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
  const navigatorStandalone = 'standalone' in window.navigator
    ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    : false

  return mediaStandalone || mediaFullscreen || navigatorStandalone
}

function isAndroidChrome() {
  if (!import.meta.client) {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes('android') && userAgent.includes('chrome') && !userAgent.includes('edg')
}

export function useMessengerInstall() {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('messenger-install-prompt', () => null)
  const installSupported = useState<boolean>('messenger-install-supported', () => false)
  const installPending = useState<boolean>('messenger-install-pending', () => false)
  const installMessage = useState<string>('messenger-install-message', () => '')
  const installed = useState<boolean>('messenger-install-installed', () => false)

  const isStandalone = computed(() => installed.value)
  const installAvailable = computed(() => !installed.value && installSupported.value)
  const manualInstallOnly = computed(() => !installed.value && !installSupported.value)
  const launchModeLabel = computed(() => installed.value ? 'Открывается как отдельное приложение' : 'Открывается во вкладке браузера')
  const installStatusLabel = computed(() => {
    if (installed.value) {
      return 'Messenger уже установлен и может запускаться отдельно от браузера.'
    }

    if (installSupported.value) {
      return 'Браузер готов отправить системный запрос на установку приложения.'
    }

    if (isIosSafari()) {
      return 'На iPhone и iPad установка идёт через системное меню Поделиться и пункт На экран Домой.'
    }

    return 'Автоматический install prompt недоступен, поэтому понадобится ручная установка через меню браузера.'
  })

  function setInstalledState() {
    installed.value = detectStandaloneMode()

    if (installed.value) {
      installSupported.value = false
      deferredPrompt.value = null
    }
  }

  async function installApp() {
    if (installed.value) {
      installMessage.value = 'Messenger уже установлен и может открываться как отдельное приложение.'
      return true
    }

    if (!deferredPrompt.value) {
      noteManualInstall()
      return false
    }

    installPending.value = true
    installMessage.value = ''

    try {
      await deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      installMessage.value = choice.outcome === 'accepted'
        ? 'Приложение устанавливается.'
        : 'Установка приложения была отменена.'
      if (choice.outcome === 'accepted') {
        deferredPrompt.value = null
        installSupported.value = false
      }
      return choice.outcome === 'accepted'
    } finally {
      installPending.value = false
    }
  }

  function noteManualInstall() {
    if (installed.value) {
      installMessage.value = 'Messenger уже запущен как отдельное приложение.'
      return
    }

    installMessage.value = isAndroidChrome()
      ? 'В Chrome на Android откройте меню браузера ⋮ и выберите Установить приложение. Если этого пункта нет, выберите Добавить на главный экран.'
      : isIosSafari()
        ? 'На iPhone или iPad нажмите Поделиться в Safari и выберите На экран Домой, чтобы открыть messenger как приложение.'
      : 'Если кнопка установки недоступна, откройте меню браузера и выберите установку приложения или добавление на главный экран.'
  }

  if (import.meta.client) {
    setInstalledState()

    if (!installLifecycleBound) {
      const standaloneQueries = [
        window.matchMedia('(display-mode: standalone)'),
        window.matchMedia('(display-mode: fullscreen)'),
      ]

      const refreshStandalone = () => {
        setInstalledState()
      }

      for (const query of standaloneQueries) {
        if (typeof query.addEventListener === 'function') {
          query.addEventListener('change', refreshStandalone)
        } else {
          query.addListener(refreshStandalone)
        }
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          setInstalledState()
        }
      })

      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault()
        deferredPrompt.value = event as BeforeInstallPromptEvent
        installSupported.value = true
        installMessage.value = ''
      })

      window.addEventListener('appinstalled', () => {
        deferredPrompt.value = null
        installSupported.value = false
        installMessage.value = 'Приложение установлено и будет открываться отдельно от браузерной вкладки.'
        setInstalledState()
      })

      installLifecycleBound = true
    }
  }

  return {
    installSupported,
    installAvailable,
    installPending,
    installMessage,
    installed,
    isStandalone,
    manualInstallOnly,
    launchModeLabel,
    installStatusLabel,
    installApp,
    noteManualInstall,
  }
}