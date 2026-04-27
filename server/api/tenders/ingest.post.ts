/**
 * POST /api/tenders/ingest
 *
 * Bulk-upsert endpoint for the `services/tenders-ingest/` runtime.
 * Service-token auth — the ingest service holds a shared bearer secret
 * in env `TENDERS_INGEST_SERVICE_TOKEN`; the main app validates it
 * here. Idempotent on (sourceId, externalGuid) — repeated batches with
 * unchanged content are no-ops at the DB level.
 *
 * Per docs/architecture-v5/25-tenders-platform.md §4.2 + §3.5.
 */

import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { ZodError } from 'zod'
import {
  ingestBatch,
  TenderIngestRequestSchema,
} from '~/server/modules/tenders'

export default defineEventHandler(async (event) => {
  // Service-token auth. Read directly from env — this endpoint is
  // service-to-service and the token must be available at boot time.
  // eslint-disable-next-line no-restricted-syntax -- service-token bootstrap
  const expected = process.env.TENDERS_INGEST_SERVICE_TOKEN
  if (!expected) {
    // Treat missing token as a misconfigured deployment, not an auth
    // success. Refuses to accept ingest until ops sets the env.
    throw createError({
      statusCode: 503,
      statusMessage: 'TENDERS_INGEST_DISABLED',
      data: { code: 'TENDERS_INGEST_DISABLED' },
    })
  }

  const provided =
    getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ??
    getHeader(event, 'x-service-token')

  if (provided !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED',
      data: { code: 'INVALID_SERVICE_TOKEN' },
    })
  }

  let request
  try {
    const body = await readBody(event)
    request = TenderIngestRequestSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_FAILED',
        data: { code: 'VALIDATION_FAILED', issues: e.issues },
      })
    }
    throw e
  }

  return await ingestBatch(request)
})
