/**
 * Theme toggle composable.
 * Uses @nuxt/color-mode (from @nuxt/ui) as the single source of truth.
 * Syncs body.dark-theme class for our custom CSS variables.
 */
export function useThemeToggle() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

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
    applyBodyClass(colorMode.value === 'dark')
  }

  if (import.meta.client) {
    watch(() => colorMode.value, (val) => {
      applyBodyClass(val === 'dark')
    })
  }

  return {
    isDark,
    initTheme,
    setTheme,
    toggleTheme,
  }
}
