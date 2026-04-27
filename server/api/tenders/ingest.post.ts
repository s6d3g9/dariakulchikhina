/**
 * POST /api/tenders/ingest
 *
 * Bulk-upsert endpoint for the `services/tenders-ingest/` runtime.
 * Service-token auth — the ingest service holds a shared bearer secret
 * in env `TENDERS_INGEST_SERVICE_TOKEN`; the main app validates it
 * here via `requireServiceToken` (constant-time comparison). Idempotent
 * on (sourceId, externalGuid) — repeated batches with unchanged content
 * are no-ops at the DB level.
 *
 * Idempotency contract: callers MUST set `idempotencyKey` in the body
 * (validated by `TenderIngestRequestSchema`). For observability /
 * proxy logging the same value MAY be duplicated in the
 * `Idempotency-Key` HTTP header; if present, it must match the body
 * value or the request is rejected with 400.
 *
 * Per docs/architecture-v5/25-tenders-platform.md §4.2 + §3.5.
 */

import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { ZodError } from 'zod'
import {
  ingestBatch,
  TenderIngestRequestSchema,
} from '~/server/modules/tenders'
import { requireServiceToken } from '~/server/utils/service-token-auth'

export default defineEventHandler(async (event) => {
  requireServiceToken(event, {
    envVarName: 'TENDERS_INGEST_SERVICE_TOKEN',
    disabledStatusMessage: 'TENDERS_INGEST_DISABLED',
    disabledCode: 'TENDERS_INGEST_DISABLED',
  })

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

  // If a header copy is present (observability / proxy logging convention),
  // it MUST match the body value — otherwise we can't tell which one to
  // trust for dedup, so reject the ambiguous request.
  const headerKey = getHeader(event, 'idempotency-key')
  if (headerKey && headerKey !== request.idempotencyKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'IDEMPOTENCY_KEY_MISMATCH',
      data: {
        code: 'IDEMPOTENCY_KEY_MISMATCH',
        message:
          'Header `Idempotency-Key` must match `idempotencyKey` in body when both are sent.',
      },
    })
  }

  return await ingestBatch(request)
})
