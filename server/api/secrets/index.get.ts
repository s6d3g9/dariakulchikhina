/**
 * GET /api/secrets?scope=...&scopeRefId=...
 *
 * Lists masked secret entries for the given scope. The plaintext value
 * is NEVER returned — only `mask` (e.g. `••••••1234`) and metadata.
 *
 * Per docs/architecture-v5/25-tenders-platform.md §3.7.2.
 */

import { createError, defineEventHandler, getQuery } from 'h3'
import { listSecrets, SecretScopeSchema } from '~/server/modules/secrets'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const scopeParse = SecretScopeSchema.safeParse(q.scope)
  if (!scopeParse.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_FAILED',
      data: { code: 'INVALID_SCOPE' },
    })
  }
  const scopeRefId = (q.scopeRefId as string | undefined) || null
  return await listSecrets(scopeParse.data, scopeRefId)
})
