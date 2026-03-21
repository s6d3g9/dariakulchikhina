const CACHE_VERSION = 'messenger-shell-v2'

function getScopePath() {
  const scopeUrl = new URL(self.registration.scope)
  return scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`
}

function getAppShellUrls() {
  const scopePath = getScopePath()

  return [
    scopePath,
    `${scopePath}manifest.webmanifest`,
    `${scopePath}icons/messenger-app.svg`,
    `${scopePath}icons/messenger-app-192.svg`,
    `${scopePath}icons/messenger-app-512.svg`,
  ]
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION)
    await cache.addAll(getAppShellUrls())
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()

    await Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key)),
    )

    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)
  const scopeUrl = new URL(self.registration.scope)
  const scopePath = getScopePath()

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        const cache = await caches.open(CACHE_VERSION)
        await cache.put(`${scopePath}__app_shell__`, response.clone())
        return response
      } catch {
        return (await caches.match(request))
          || (await caches.match(`${scopePath}__app_shell__`))
          || (await caches.match(scopePath))
      }
    })())
    return
  }

  if (requestUrl.origin !== scopeUrl.origin) {
    return
  }

  const isStaticAsset = request.destination === 'script'
    || request.destination === 'style'
    || request.destination === 'image'
    || request.destination === 'font'
    || requestUrl.pathname.startsWith(`${scopePath}_nuxt/`)
    || requestUrl.pathname === `${scopePath}manifest.webmanifest`

  if (!isStaticAsset) {
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)

    if (cached) {
      return cached
    }

    const response = await fetch(request)
    const cache = await caches.open(CACHE_VERSION)
    await cache.put(request, response.clone())
    return response
  })())
})