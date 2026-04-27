/**
 * Tenders module domain errors. Subclassed from the shared
 * DomainError taxonomy so the global error-handler maps them to HTTP
 * status codes uniformly.
 */

import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '~/server/utils/errors'

export class TenderNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Tender', id)
  }
}

/**
 * 401 — service-token auth on /api/tenders/ingest. Distinct class so
 * the handler can log the rejection without leaking which token shape
 * was wrong.
 */
export class TenderIngestUnauthorizedError extends UnauthorizedError {
  constructor() {
    super('Invalid or missing tenders ingest service token')
  }
}

/** 409 — OCC version mismatch on PATCH /:id/status. */
export class TenderVersionConflictError extends ConflictError {
  constructor(expected: number, got: number) {
    super('TENDER_VERSION_CONFLICT', { expected, got })
  }
}
