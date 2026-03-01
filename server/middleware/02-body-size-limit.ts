/**
 * Body size limit middleware.
 * Prevents oversized payloads from consuming server resources (anti-DDoS).
 * - JSON: 1 MB
 * - Multipart (file uploads): 25 MB
 */
export default defineEventHandler((event) => {
  const req = (event as any).node?.req ?? (event as any).req
  if (!req) return

  const contentType = req.headers?.['content-type'] || ''
  const contentLength = parseInt(req.headers?.['content-length'] || '0', 10)

  // Determine limit based on content type
  const isMultipart = contentType.includes('multipart/')
  const maxBytes = isMultipart
    ? 25 * 1024 * 1024   // 25 MB for file uploads
    : 1 * 1024 * 1024    // 1 MB for JSON/form data

  // Early reject if Content-Length header exceeds limit
  if (contentLength > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: `Payload Too Large — лимит ${Math.round(maxBytes / 1024 / 1024)} MB`,
    })
  }

  // Stream-level check: count bytes as they arrive
  let received = 0
  const originalOnData = req.on?.bind(req)
  if (typeof originalOnData === 'function') {
    const origListeners = req.listeners?.('data') || []

    // Only add byte-counter if this is an API route with a body
    const url = req.url || ''
    if (url.startsWith('/api/') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const onData = (chunk: Buffer | string) => {
        received += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk))
        if (received > maxBytes) {
          req.destroy()
          throw createError({
            statusCode: 413,
            statusMessage: `Payload Too Large — лимит ${Math.round(maxBytes / 1024 / 1024)} MB`,
          })
        }
      }
      req.prependListener?.('data', onData)
    }
  }
})
