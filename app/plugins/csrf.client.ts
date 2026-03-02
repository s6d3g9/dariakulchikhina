/**
 * CSRF plugin — automatically attaches the CSRF token header
 * to all mutating $fetch() requests.
 *
 * Reads the `csrf_token` cookie set by the server middleware
 * and adds it as the `x-csrf-token` header.
 */
export default defineNuxtPlugin(() => {
  const csrfCookieName = 'csrf_token'

  function getCsrfToken(): string | null {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${csrfCookieName}=`))
    return match ? decodeURIComponent(match.split('=')[1]) : null
  }

  // Intercept all $fetch calls globally via ofetch interceptors
  globalThis.$fetch = globalThis.$fetch.create({
    onRequest({ options }) {
      const method = (options.method || 'GET').toUpperCase()
      if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
        const token = getCsrfToken()
        if (token) {
          options.headers = options.headers || {}
          if (options.headers instanceof Headers) {
            options.headers.set('x-csrf-token', token)
          } else if (Array.isArray(options.headers)) {
            options.headers.push(['x-csrf-token', token])
          } else {
            ;(options.headers as Record<string, string>)['x-csrf-token'] = token
          }
        }
      }
    },
  })
})
