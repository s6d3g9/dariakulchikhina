/**
 * POST /api/secrets
 *
 * Create or upsert (by scope + scopeRefId + key). Plaintext is read
 * from the body, encrypted server-side, and never persisted in clear.
 * The response is the masked SecretView — caller must remember the
 * original value if they need it again.
 *
 * Per docs/architecture-v5/25-tenders-platform.md §3.7.2.
 */

import { createError, defineEventHandler, readBody } from 'h3'
import { ZodError } from 'zod'
import { writeSecret, SecretWriteSchema } from '~/server/modules/secrets'
import { requireAdmin } from '~/server/modules/auth/session.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  let input
  try {
    const body = await readBody(event)
    input = SecretWriteSchema.parse(body)
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
  return await writeSecret(input)
})
