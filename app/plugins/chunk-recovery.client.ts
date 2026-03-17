const CHUNK_RELOAD_KEY = 'nuxt:chunk-recovery'
const CHUNK_RELOAD_TTL_MS = 20_000

function getReasonText(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return `${reason.name} ${reason.message}`.trim()
  if (reason && typeof reason === 'object') {
    const record = reason as Record<string, unknown>
    const message = typeof record.message === 'string' ? record.message : ''
    const stack = typeof record.stack === 'string' ? record.stack : ''
    return `${message} ${stack}`.trim()
  }
  return ''
}

function isNuxtChunkPath(value: string) {
  return value.includes('/_nuxt/')
}

function isChunkLoadFailure(reason: unknown): boolean {
  const text = getReasonText(reason).toLowerCase()
  if (!text) return false

  return [
    'chunkloaderror',
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'dynamically imported module',
    '/_nuxt/',
  ].some((marker) => text.includes(marker))
}

function shouldReloadForChunkError() {
  const now = Date.now()
  const currentPath = `${window.location.pathname}${window.location.search}`
  const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY)

  if (raw) {
    try {
      const saved = JSON.parse(raw) as { path?: string; ts?: number }
      if (saved.path === currentPath && now - Number(saved.ts || 0) < CHUNK_RELOAD_TTL_MS) {
        return false
      }
    } catch {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    }
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ path: currentPath, ts: now }))
  return true
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = nuxtApp.$router as { onError?: (handler: (error: unknown) => void) => void }

  const reloadPage = () => {
    if (!shouldReloadForChunkError()) return
    window.location.reload()
  }

  const handleResourceError = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) return

    const url = target instanceof HTMLScriptElement ? target.src : target.href
    if (!url || !isNuxtChunkPath(url)) return

    reloadPage()
  }

  const handleWindowError = (event: ErrorEvent) => {
    if (isChunkLoadFailure(event.error || event.message || event.filename)) {
      reloadPage()
    }
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isChunkLoadFailure(event.reason)) {
      event.preventDefault()
      reloadPage()
    }
  }

  window.addEventListener('error', handleResourceError, true)
  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  router.onError?.((error: unknown) => {
    if (isChunkLoadFailure(error)) {
      reloadPage()
    }
  })

  setTimeout(() => {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw) as { path?: string; ts?: number }
      const currentPath = `${window.location.pathname}${window.location.search}`
      if (saved.path === currentPath && Date.now() - Number(saved.ts || 0) >= CHUNK_RELOAD_TTL_MS) {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      }
    } catch {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    }
  }, CHUNK_RELOAD_TTL_MS)
})