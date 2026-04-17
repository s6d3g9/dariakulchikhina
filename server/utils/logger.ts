/**
 * Structured logger.
 *
 * Thin wrapper over pino that auto-decorates entries with the current
 * request context (requestId, userId, role) from AsyncLocalStorage.
 *
 * Use `log` for module-level logging. In hot paths where you already
 * need the raw pino instance, import `rootLogger` — but most callers
 * don't.
 *
 * See docs/architecture-v5/20-config-and-logging.md §3.
 */

import pino from 'pino'
import { config } from '~/server/config'
import { getRequestContext } from '~/server/utils/request-context'

const isDev = config.NODE_ENV === 'development'

export const rootLogger = pino({
  level: isDev ? 'debug' : 'info',
  // Pretty-print in dev; structured JSON in prod for log aggregators.
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Strip known secret-bearing keys if anything ever tries to log them.
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.passphrase',
      '*.recoveryPhrase',
      '*.recoveryPhraseHash',
      '*.token',
      '*.secret',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  base: { app: 'daria-nuxt' },
})

type LogArgs = [message: string] | [obj: Record<string, unknown>, message?: string]

function enrichArgs(args: LogArgs): LogArgs {
  const ctx = getRequestContext()
  if (!ctx) return args
  const ctxFields = {
    requestId: ctx.requestId,
    ...(ctx.userId !== undefined && { userId: ctx.userId }),
    ...(ctx.role !== undefined && { role: ctx.role }),
  }
  if (typeof args[0] === 'string') {
    return [ctxFields, args[0]] as LogArgs
  }
  return [{ ...ctxFields, ...args[0] }, args[1]] as LogArgs
}

/**
 * Primary logger — auto-enriches every call with the current request
 * context. Use string-first (`log.info('message')`) or object-first
 * (`log.info({ userId, action }, 'description')`).
 */
export const log = {
  trace: (...args: LogArgs) => rootLogger.trace(...enrichArgs(args)),
  debug: (...args: LogArgs) => rootLogger.debug(...enrichArgs(args)),
  info: (...args: LogArgs) => rootLogger.info(...enrichArgs(args)),
  warn: (...args: LogArgs) => rootLogger.warn(...enrichArgs(args)),
  error: (...args: LogArgs) => rootLogger.error(...enrichArgs(args)),
  fatal: (...args: LogArgs) => rootLogger.fatal(...enrichArgs(args)),
  /**
   * Scoped child logger — mostly for long-lived components (Redis
   * clients, background workers) where every log line carries the same
   * fixed context. Does NOT auto-inject request context.
   */
  child: (bindings: Record<string, unknown>) => rootLogger.child(bindings),
}
