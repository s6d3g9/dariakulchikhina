/**
 * GET /api/tenders — search with cursor pagination.
 *
 * Minimal W1.A surface: returns the latest tenders ordered by
 * `published_at DESC`, supports filters by sourceId/status/regions/okpd2
 * and an opaque base64 cursor. Full-search ranking + project scoring
 * land in W3.
 */

import { createError, defineEventHandler, getQuery } from 'h3'
import { ZodError } from 'zod'
import {
  searchTenders,
  TenderSearchQuerySchema,
} from '~/server/modules/tenders'

export default defineEventHandler(async (event) => {
  const raw = getQuery(event)
  // Normalize array-style query params: ?okpd2=42.11&okpd2=42.13 vs
  // ?okpd2=42.11,42.13 — accept both.
  const normalized: Record<string, unknown> = { ...raw }
  for (const key of ['okpd2', 'regions'] as const) {
    const v = normalized[key]
    if (typeof v === 'string') normalized[key] = v.split(',').filter(Boolean)
  }

  let query
  try {
    query = TenderSearchQuerySchema.parse(normalized)
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

  return await searchTenders(query)
})
