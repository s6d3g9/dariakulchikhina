export function useCsrfHeaders() {
  function getCsrfToken(): string {
    if (import.meta.server) {
      return ''
    }

    const raw = document.cookie
      .split('; ')
      .find(cookie => cookie.startsWith('csrf_token='))
      ?.split('=')[1]

    return raw ? decodeURIComponent(raw) : ''
  }

  function csrfHeaders(): Record<string, string> {
    const token = getCsrfToken()
    return token ? { 'x-csrf-token': token } : {}
  }

  async function ensureCsrfCookie() {
    if (import.meta.server || getCsrfToken()) {
      return
    }

    await $fetch('/api/auth/csrf')
  }

  return {
    getCsrfToken,
    csrfHeaders,
    ensureCsrfCookie,
  }
}