/**
 * Client plugin: syncs @nuxt/color-mode (html.dark) with body.dark-theme.
 * MutationObserver keeps them in sync at all times.
 * Also re-applies UI theme vars (light/dark) and design-system tokens.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const syncClasses = () => {
    const htmlHasDark = document.documentElement.classList.contains('dark')
    document.body.classList.toggle('dark-theme', htmlHasDark)
    document.documentElement.style.colorScheme = htmlHasDark ? 'dark' : 'light'

    // Re-apply theme CSS vars for the correct light/dark set
    try {
      const { refreshThemeVars } = useUITheme()
      refreshThemeVars()
    } catch { /* composable not yet ready */ }

    // Re-apply design tokens
    try {
      const { applyToDOM } = useDesignSystem()
      applyToDOM()
    } catch { /* composable not yet ready */ }
  }

  syncClasses()

  const observer = new MutationObserver(() => syncClasses())
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})
