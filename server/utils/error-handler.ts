import type { NitroErrorHandler } from 'nitropack'

/**
 * Global Nitro error handler.
 * In production, strips internal error details (SQL errors, stack traces)
 * to prevent information leakage.
 */
const handler: NitroErrorHandler = (error, event) => {
  const isDev = process.env.NODE_ENV === 'development'
  const statusCode = (error as any).statusCode || 500
  const statusMessage = statusCode < 500
    ? ((error as any).statusMessage || error.message || 'Bad Request')
    : (isDev ? error.message : 'Internal Server Error')

  const res = (event as any).node?.res ?? (event as any).res
  if (!res || res.writableEnded) return

  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')

  const body: Record<string, unknown> = {
    statusCode,
    statusMessage,
  }

  // Only expose stack trace and error details in development
  if (isDev) {
    body.stack = error.stack
    body.data = (error as any).data
  }

  res.end(JSON.stringify(body))
}

export default handler
