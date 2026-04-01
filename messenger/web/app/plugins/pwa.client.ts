export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const runtimeConfig = useRuntimeConfig()
  const serviceWorkerUrl = `${runtimeConfig.app.baseURL}sw.js`

  const registerServiceWorker = () => {
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: runtimeConfig.app.baseURL }).catch(() => {
      // installation remains optional in alpha stage
    })
  }

  if (document.readyState !== 'loading') {
    registerServiceWorker()
    return
  }

  document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true })
})