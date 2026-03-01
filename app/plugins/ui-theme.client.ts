// Applies saved UI theme from localStorage before first paint to avoid flash
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const saved = localStorage.getItem('ui-theme') || 'cloud'
  document.documentElement.setAttribute('data-theme', saved)
})
