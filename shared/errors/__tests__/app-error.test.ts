import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  UpstreamError,
  OccConflictError,
} from '../app-error.ts'

describe('AppError', () => {
  it('sets code, statusCode, and message', () => {
    const err = new AppError('SOME_CODE', 500, 'some message')
    assert.equal(err.code, 'SOME_CODE')
    assert.equal(err.statusCode, 500)
    assert.equal(err.message, 'some message')
    assert.equal(err.cause, undefined)
  })

  it('sets cause when provided', () => {
    const cause = new Error('root')
    const err = new AppError('CODE', 500, 'msg', cause)
    assert.equal(err.cause, cause)
  })

  it('is instanceof Error and AppError', () => {
    const err = new AppError('CODE', 500, 'msg')
    assert.ok(err instanceof Error)
    assert.ok(err instanceof AppError)
  })
})

describe('NotFoundError', () => {
  it('has code with _NOT_FOUND suffix', () => {
    const err = new NotFoundError('client')
    assert.equal(err.code, 'CLIENT_NOT_FOUND')
    assert.equal(err.statusCode, 404)
    assert.ok(err.message.includes('client not found'))
  })

  it('includes id in message when provided', () => {
    const err = new NotFoundError('project', '42')
    assert.ok(err.message.includes('42'))
  })

  it('is instanceof AppError and NotFoundError', () => {
    const err = new NotFoundError('item')
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof NotFoundError)
  })
})

describe('ForbiddenError', () => {
  it('defaults to FORBIDDEN code and 403', () => {
    const err = new ForbiddenError()
    assert.equal(err.code, 'FORBIDDEN')
    assert.equal(err.statusCode, 403)
  })

  it('accepts custom reason', () => {
    const err = new ForbiddenError('NO_ROLE')
    assert.equal(err.code, 'NO_ROLE')
  })

  it('is instanceof AppError and ForbiddenError', () => {
    const err = new ForbiddenError()
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof ForbiddenError)
  })
})

describe('ValidationError', () => {
  it('has VALIDATION_FAILED code and 400', () => {
    const issues = [{ path: ['name'], message: 'required' }]
    const err = new ValidationError(issues)
    assert.equal(err.code, 'VALIDATION_FAILED')
    assert.equal(err.statusCode, 400)
    assert.deepEqual(err.cause, issues)
  })

  it('is instanceof AppError and ValidationError', () => {
    const err = new ValidationError([])
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof ValidationError)
  })
})

describe('ConflictError', () => {
  it('defaults to CONFLICT code and 409', () => {
    const err = new ConflictError()
    assert.equal(err.code, 'CONFLICT')
    assert.equal(err.statusCode, 409)
  })

  it('accepts custom reason', () => {
    const err = new ConflictError('EMAIL_TAKEN')
    assert.equal(err.code, 'EMAIL_TAKEN')
  })

  it('is instanceof AppError and ConflictError', () => {
    const err = new ConflictError()
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof ConflictError)
  })
})

describe('UpstreamError', () => {
  it('has UPSTREAM_FAILED code and 502', () => {
    const err = new UpstreamError('payment-gateway')
    assert.equal(err.code, 'UPSTREAM_FAILED')
    assert.equal(err.statusCode, 502)
    assert.ok(err.message.includes('payment-gateway'))
  })

  it('stores cause', () => {
    const cause = new Error('timeout')
    const err = new UpstreamError('svc', cause)
    assert.equal(err.cause, cause)
  })

  it('is instanceof AppError and UpstreamError', () => {
    const err = new UpstreamError('svc')
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof UpstreamError)
  })
})

describe('OccConflictError', () => {
  it('has OCC_CONFLICT code and 409', () => {
    const err = new OccConflictError('project')
    assert.equal(err.code, 'OCC_CONFLICT')
    assert.equal(err.statusCode, 409)
    assert.ok(err.message.includes('project'))
  })

  it('includes id in message when provided', () => {
    const err = new OccConflictError('project', '99')
    assert.ok(err.message.includes('99'))
  })

  it('is instanceof AppError and OccConflictError', () => {
    const err = new OccConflictError('item')
    assert.ok(err instanceof AppError)
    assert.ok(err instanceof OccConflictError)
  })
})
