/**
 * Nitro plugin: maps thrown DomainError instances to HTTP responses
 * with a stable JSON shape.
 *
 * Coexists with legacy `createError` from h3 — only intercepts errors
 * that are `DomainError` instances. See docs/architecture-v5/19-error-handling.md.
 *
 * Wire format:
 *   { error: { code, message, ...context } }
 * Frontend keys off `code`, not `message`.
 */

import type { NitroApp } from 'nitropack'
import { DomainError, resolveDomainErrorStatus } from '~/server/utils/errors'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  nitroApp.hooks.hook('error', (error, handler) => {
    if (!(error instanceof DomainError)) return
    const event = handler?.event
    if (!event) return

    const statusCode = resolveDomainErrorStatus(error)
    event.node.res.statusCode = statusCode
    event.node.res.setHeader('content-type', 'application/json; charset=utf-8')
    event.node.res.end(
      JSON.stringify({
        error: error.toJSON(),
      }),
    )
  })
})
