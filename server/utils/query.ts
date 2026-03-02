import type { H3Event } from 'h3'

/**
 * Safe replacement for h3's getQuery() which crashes with "Invalid URL"
 * in Nitro v2 RC when event.url is not populated and event.req.url is relative.
 *
 * See: https://github.com/unjs/h3/issues — getQuery does new URL(event.req.url)
 * without a base, causing ERR_INVALID_URL for paths like "/api/clients".
 */
export function safeGetQuery(event: H3Event): Record<string, string> {
  try {
    return getQuery(event) as Record<string, string>
  } catch {
    // Fallback: parse query string from event.path or raw request url
    const raw = event.path || event.node?.req?.url || ''
    const qIdx = raw.indexOf('?')
    if (qIdx === -1) return {}
    const search = raw.slice(qIdx + 1)
    const result: Record<string, string> = {}
    for (const part of search.split('&')) {
      const eqIdx = part.indexOf('=')
      if (eqIdx === -1) {
        if (part) result[decodeURIComponent(part)] = ''
      } else {
        const key = decodeURIComponent(part.slice(0, eqIdx))
        const val = decodeURIComponent(part.slice(eqIdx + 1))
        result[key] = val
      }
    }
    return result
  }
}
