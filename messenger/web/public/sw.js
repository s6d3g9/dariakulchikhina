const CACHE_VERSION = 'messenger-shell-v17'

function isMessengerScopeClient(client) {
  try {
    const clientUrl = new URL(client.url)
    const scopeUrl = new URL(self.registration.scope)
    const scopePath = getScopePath()

    return clientUrl.origin === scopeUrl.origin && clientUrl.pathname.startsWith(scopePath)
  } catch {
    return false
  }
}

async function getMessengerScopeClients() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return clients.filter(isMessengerScopeClient)
}

async function focusOrOpenMessengerClient() {
  const clients = await getMessengerScopeClients()

  if (clients.length > 0) {
    try {
      return await clients[0].focus()
    } catch {
      return clients[0]
    }
  }

  return await self.clients.openWindow(getScopePath())
}

function notifyMessengerClients(payload, clients) {
  for (const client of clients) {
    try {
      client.postMessage(payload)
    } catch {
      // Ignore messaging failures for stale windows.
    }
  }
}

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
    `${scopePath}icons/messenger-app-192.png`,
    `${scopePath}icons/messenger-app-512.png`,
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

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action || 'open'
  const data = notification?.data && typeof notification.data === 'object' ? notification.data : {}

  notification.close()

  event.waitUntil((async () => {
    let clients = await getMessengerScopeClients()

    if (action === 'open') {
      const focusedClient = await focusOrOpenMessengerClient()
      clients = await getMessengerScopeClients()

      if (focusedClient && !clients.some(client => client.id === focusedClient.id)) {
        clients = [...clients, focusedClient]
      }
    } else if (clients.length === 0) {
      const openedClient = await focusOrOpenMessengerClient()
      clients = await getMessengerScopeClients()

      if (openedClient && !clients.some(client => client.id === openedClient.id)) {
        clients = [...clients, openedClient]
      }
    }

    notifyMessengerClients({
      type: 'messenger-call-notification-action',
      action,
      callId: typeof data.callId === 'string' ? data.callId : '',
      conversationId: typeof data.conversationId === 'string' ? data.conversationId : '',
    }, clients)
  })())
})