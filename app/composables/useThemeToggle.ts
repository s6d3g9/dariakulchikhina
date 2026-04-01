/**
 * Theme toggle composable.
 * Uses @nuxt/color-mode (from @nuxt/ui) as the single source of truth.
 * Syncs body.dark-theme class for our custom CSS variables.
 */
export function useThemeToggle() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const isThemeReady = useState<boolean>('theme-toggle-ready', () => false)

  const themeToggleLabel = computed(() => {
    if (!isThemeReady.value) return 'тема'
    return isDark.value ? 'светло' : 'темно'
  })

  const themeToggleAriaLabel = computed(() => {
    if (!isThemeReady.value) return 'Переключить тему'
    return isDark.value ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'
  })

  function applyBodyClass(dark: boolean) {
    if (!import.meta.client) return
    document.body.classList.toggle('dark-theme', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }

  function setTheme(mode: 'light' | 'dark') {
    colorMode.preference = mode
    applyBodyClass(mode === 'dark')
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function initTheme() {
    if (!import.meta.client) return
    isThemeReady.value = true
    applyBodyClass(colorMode.value === 'dark')
  }

  if (import.meta.client) {
    watch(() => colorMode.value, (val) => {
      applyBodyClass(val === 'dark')
    })
  }

  return {
    isDark,
    isThemeReady,
    initTheme,
    setTheme,
    themeToggleAriaLabel,
    themeToggleLabel,
    toggleTheme,
  }
}
