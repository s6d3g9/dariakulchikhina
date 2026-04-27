/**
 * Structured JSON logger for tenders-ingest.
 *
 * One-line JSON per record so PM2/Docker log shippers can index by
 * `level`, `source`, `event` without regex pain. No external deps —
 * this service is intentionally minimal-dep (no pino, no winston).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface LoggerOptions {
  level: LogLevel
  /** Static fields merged into every record (e.g. service name, instance id). */
  base?: Record<string, unknown>
}

export interface Logger {
  debug(event: string, fields?: Record<string, unknown>): void
  info(event: string, fields?: Record<string, unknown>): void
  warn(event: string, fields?: Record<string, unknown>): void
  error(event: string, fields?: Record<string, unknown>): void
  child(extra: Record<string, unknown>): Logger
}

function emit(
  options: LoggerOptions,
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> | undefined,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[options.level]) return
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(options.base ?? {}),
    ...(fields ?? {}),
  }
  // stderr for warn+, stdout otherwise — keeps PM2 error log clean.
  const line = JSON.stringify(record)
  if (level === 'warn' || level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const make = (opts: LoggerOptions): Logger => ({
    debug: (event, fields) => emit(opts, 'debug', event, fields),
    info: (event, fields) => emit(opts, 'info', event, fields),
    warn: (event, fields) => emit(opts, 'warn', event, fields),
    error: (event, fields) => emit(opts, 'error', event, fields),
    child: (extra) =>
      make({
        ...opts,
        base: { ...(opts.base ?? {}), ...extra },
      }),
  })
  return make(options)
}
