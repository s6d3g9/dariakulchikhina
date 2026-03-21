interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
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

  const isStandalone = computed(() => {
    if (!import.meta.client) {
      return false
    }

    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches
  })

  function setInstalledState() {
    installed.value = isStandalone.value
  }

  async function installApp() {
    if (!deferredPrompt.value) {
      installMessage.value = 'Установка из браузера недоступна. Откройте меню браузера и выберите установку приложения вручную.'
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
    installMessage.value = isAndroidChrome()
      ? 'В Chrome на Android откройте меню браузера ⋮ и выберите Установить приложение. Если этого пункта нет, выберите Добавить на главный экран.'
      : 'Если кнопка установки недоступна, откройте меню браузера и выберите установку приложения или добавление на главный экран.'
  }

  if (import.meta.client) {
    setInstalledState()

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
  }

  return {
    installSupported,
    installPending,
    installMessage,
    installed,
    isStandalone,
    installApp,
    noteManualInstall,
  }
}