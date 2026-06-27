/**
 * Body size limit middleware.
 * Prevents oversized payloads from consuming server resources (anti-DDoS).
 * - JSON: 1 MB
 * - Multipart (file uploads): 25 MB
 */
import { eventHandler } from 'h3'

import { markEventHandler } from '~/server/utils/mark-event-handler'

export default markEventHandler(eventHandler({
  handler(event) {
    const req = (event as any).node?.req ?? (event as any).req
    if (!req) return

    const contentType = req.headers?.['content-type'] || ''
    const contentLength = parseInt(req.headers?.['content-length'] || '0', 10)
    const isMultipart = contentType.includes('multipart/')
    const maxBytes = isMultipart ? 25 * 1024 * 1024 : 1 * 1024 * 1024

    if (contentLength > maxBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: `Payload Too Large — лимит ${Math.round(maxBytes / 1024 / 1024)} MB`,
      })
    }

    let received = 0
    const originalOnData = req.on?.bind(req)
    if (typeof originalOnData === 'function') {
      req.listeners?.('data') || []

      const url = req.url || ''
      if (url.startsWith('/api/') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const onData = (chunk: Buffer | string) => {
          received += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk))
          if (received > maxBytes) {
            req.destroy()
            const res = event.node?.res ?? (event as any).res
            if (res && !res.headersSent) {
              res.writeHead(413, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ statusCode: 413, statusMessage: `Payload Too Large — лимит ${Math.round(maxBytes / 1024 / 1024)} MB` }))
            }
          }
        }
        req.prependListener?.('data', onData)
      }
    }
  },
}))
