/**
 * Nitro plugin: error sanitizer.
 * In production, strips internal details (SQL errors, stack traces)
 * from 5xx errors to prevent information leakage.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any) => {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) return // Show full errors in dev

    const statusCode = error?.statusCode || 500
    if (statusCode >= 500) {
      // Log full error server-side for debugging
      console.error('[ERROR]', error?.message, error?.stack)
      // Strip sensitive info from what gets sent to client
      error.message = 'Internal Server Error'
      error.stack = undefined
      if (error.data) error.data = undefined
    }
  })
})
