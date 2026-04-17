/**
 * Domain error hierarchy.
 *
 * Services throw these; the Nitro plugin at `server/plugins/error-handler.ts`
 * maps them to HTTP status codes + a stable JSON wire-format. This keeps
 * services H3-free and testable.
 *
 * See docs/architecture-v5/19-error-handling.md for policy.
 *
 * Migration: `createError({ statusCode })` from h3 still works side-by-side;
 * new code should throw `DomainError`-subclasses instead.
 */

export interface DomainErrorJSON {
  code: string
  message: string
  [key: string]: unknown
}

export class DomainError extends Error {
  /**
   * @param code    Machine-readable error code, e.g. `NOT_FOUND`. The
   *                frontend keys off this, not `message`.
   * @param message Human-readable (Russian) short description.
   * @param context Extra structured data to include in the JSON response
   *                (e.g. `{ entity: 'Project', id: 'slug' }`). Do NOT
   *                include secrets — the whole object gets serialized.
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toJSON(): DomainErrorJSON {
    return {
      code: this.code,
      message: this.message,
      ...(this.context || {}),
    }
  }
}

/** 404 — requested resource does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: unknown) {
    super('NOT_FOUND', `${entity} не найден`, { entity, id })
  }
}

/** 409 — conflict (unique violation, stale version, etc). */
export class ConflictError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('CONFLICT', reason, context)
  }
}

/** 400 — validation failed. `issues` is the Zod-style path+message list. */
export class ValidationError extends DomainError {
  constructor(
    issues: Array<{ path: string[]; message: string }>,
    message: string = 'Неверные данные',
  ) {
    super('VALIDATION_FAILED', message, { issues })
  }
}

/** 403 — caller authenticated but not allowed to do this. */
export class ForbiddenError extends DomainError {
  constructor(reason: string = 'Доступ запрещён', context?: Record<string, unknown>) {
    super('FORBIDDEN', reason, context)
  }
}

/** 401 — caller is not authenticated. */
export class UnauthorizedError extends DomainError {
  constructor(reason: string = 'Не авторизован') {
    super('UNAUTHORIZED', reason)
  }
}

/** 429 — rate limit exceeded. `retryAfterSeconds` hints the client. */
export class RateLimitError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', 'Слишком много запросов', { retryAfterSeconds })
  }
}

/** 502 — an upstream dependency (DB, Redis, external API) failed. */
export class UpstreamError extends DomainError {
  constructor(service: string, detail?: string) {
    super('UPSTREAM_FAILED', `Внешний сервис недоступен: ${service}`, {
      service,
      detail,
    })
  }
}

/**
 * Status code mapping for the error-handler plugin. Kept close to the
 * class declarations so additions require editing one place.
 */
export const DOMAIN_ERROR_STATUS: Array<[new (...args: never[]) => DomainError, number]> = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [RateLimitError, 429],
  [UpstreamError, 502],
]

export function resolveDomainErrorStatus(error: DomainError): number {
  const match = DOMAIN_ERROR_STATUS.find(([cls]) => error instanceof cls)
  return match?.[1] ?? 500
}
