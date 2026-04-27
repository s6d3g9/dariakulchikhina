/**
 * GET /api/secrets/value?key=<key>[&scope=connector&scopeRefId=<uuid>]
 *
 * Service-internal endpoint for plaintext secret resolution.
 * Used by `services/tenders-ingest` SecretsResolver to fetch e.g.
 * `tenders.zakupki.individualPersonToken` at runtime.
 *
 * Auth: same `TENDERS_INGEST_SERVICE_TOKEN` Bearer as `POST /api/tenders/ingest`.
 * This endpoint is NOT accessible via admin session — it is strictly
 * service-to-service; the admin UI never calls it.
 *
 * Per docs/architecture-v5/25-tenders-platform.md §3.7.4.
 */

import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveSecretValue } from '~/server/modules/secrets'
import { requireServiceToken } from '~/server/utils/service-token-auth'

export default defineEventHandler(async (event) => {
  requireServiceToken(event, {
    envVarName: 'TENDERS_INGEST_SERVICE_TOKEN',
    disabledStatusMessage: 'TENDERS_INGEST_DISABLED',
    disabledCode: 'TENDERS_INGEST_DISABLED',
  })

  const q = getQuery(event)
  const key = q.key as string | undefined
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'MISSING_KEY',
      data: { code: 'MISSING_KEY' },
    })
  }

  // scope defaults to 'global' for the ingest service's global secrets
  // (e.g. tenders.zakupki.individualPersonToken). scope=connector +
  // scopeRefId allows future per-connector secrets.
  const scope = (q.scope as string | undefined) ?? 'global'
  const scopeRefId = (q.scopeRefId as string | undefined) ?? null

  const result = await resolveSecretValue(
    scope as 'global' | 'project' | 'connector',
    scopeRefId,
    key,
  )
  if (result === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SECRET_NOT_FOUND',
      data: { code: 'SECRET_NOT_FOUND' },
    })
  }

  return result
})
