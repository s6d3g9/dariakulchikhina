export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const runtimeConfig = useRuntimeConfig()
  const serviceWorkerUrl = `${runtimeConfig.app.baseURL}sw.js`

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: runtimeConfig.app.baseURL }).catch(() => {
      // installation remains optional in alpha stage
    })
  })
})