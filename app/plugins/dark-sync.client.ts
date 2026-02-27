/**
 * Client plugin: syncs @nuxt/color-mode (html.dark) with body.dark-theme.
 * MutationObserver keeps them in sync at all times.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const syncClasses = () => {
    const htmlHasDark = document.documentElement.classList.contains('dark')
    document.body.classList.toggle('dark-theme', htmlHasDark)
    document.documentElement.style.colorScheme = htmlHasDark ? 'dark' : 'light'
  }

  syncClasses()

  const observer = new MutationObserver(() => syncClasses())
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})
