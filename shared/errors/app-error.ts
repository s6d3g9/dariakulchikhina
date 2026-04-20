export class AppError extends Error {
  code: string
  statusCode: number
  cause?: unknown

  constructor(code: string, statusCode: number, message: string, cause?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.cause = cause
    // Restore prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      404,
      `${resource} not found${id ? `: ${id}` : ''}`,
    )
  }
}

export class ForbiddenError extends AppError {
  constructor(reason = 'FORBIDDEN') {
    super(reason, 403, reason)
  }
}

export class ValidationError extends AppError {
  constructor(issues: unknown) {
    super('VALIDATION_FAILED', 400, 'validation failed')
    this.cause = issues
  }
}

export class ConflictError extends AppError {
  constructor(reason = 'CONFLICT') {
    super(reason, 409, reason)
  }
}

export class UpstreamError extends AppError {
  constructor(service: string, cause?: unknown) {
    super('UPSTREAM_FAILED', 502, `${service} failed`, cause)
  }
}

export class OccConflictError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'OCC_CONFLICT',
      409,
      `Optimistic concurrency conflict on ${resource}${id ? `: ${id}` : ''}`,
    )
  }
}
