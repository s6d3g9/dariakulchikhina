/**
 * Nitro plugin: activate the per-request AsyncLocalStorage context on
 * every incoming request.
 *
 * Uses `enterRequestContext` (which calls `AsyncLocalStorage.enterWith`)
 * so the store propagates through the rest of the request chain without
 * requiring every handler to opt in. Also echoes the resolved requestId
 * back to the client in the `x-request-id` header for trace correlation.
 *
 * See docs/architecture-v5/20-config-and-logging.md §5.
 */

import { randomUUID } from 'node:crypto'
import type { NitroApp } from 'nitropack'
import { enterRequestContext } from '~/server/utils/request-context'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const incoming = getHeader(event, 'x-request-id')
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID()
    event.node.res.setHeader('x-request-id', requestId)
    enterRequestContext({
      requestId,
      startedAt: Date.now(),
    })
  })
})
