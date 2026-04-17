/**
 * Per-request async-context (AsyncLocalStorage).
 *
 * Lets any code in a request's call graph read the current requestId,
 * userId, and request start-time without threading them through every
 * function call. Primary consumer: the logger wrapper in
 * `server/utils/logger.ts` which auto-decorates log entries with
 * the current requestId.
 *
 * Activation path: the Nitro plugin at
 * `server/plugins/request-context.ts` calls `enterRequestContext()` at
 * the start of every request — that propagates through promise chains
 * until the request finishes.
 *
 * See docs/architecture-v5/20-config-and-logging.md §5.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContext {
  requestId: string
  startedAt: number
  userId?: number
  role?: 'admin' | 'client' | 'contractor' | 'anonymous'
}

const storage = new AsyncLocalStorage<RequestContext>()

/**
 * Activate `ctx` as the current request context for the current async
 * chain. Uses `enterWith` (no callback wrapper) so subsequent Nitro
 * middleware/handlers automatically inherit it.
 *
 * Do NOT call this outside a request boundary — it taints the global
 * async scope. It's safe inside the Nitro `request` hook because Node
 * creates a fresh async context per incoming request.
 */
export function enterRequestContext(ctx: RequestContext): void {
  storage.enterWith(ctx)
}

/**
 * Run a synchronous or async callback inside a temporary context.
 * Useful for background jobs, scheduled tasks, and tests — anywhere
 * that isn't an HTTP request.
 */
export function runInRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn)
}

/**
 * Current request context, or `null` when called outside any request
 * (startup code, background workers without explicit context, tests).
 */
export function getRequestContext(): RequestContext | null {
  return storage.getStore() ?? null
}

/**
 * Mutate the current context in place. Intended for auth middleware to
 * decorate the request with `userId`/`role` after the token is resolved.
 * No-op when called outside a context.
 */
export function updateRequestContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore()
  if (!ctx) return
  Object.assign(ctx, patch)
}
