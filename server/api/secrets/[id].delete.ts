/**
 * DELETE /api/secrets/:id — soft-delete the row. Hard delete is never
 * exposed — secrets are auditable resources.
 */

import { createError, defineEventHandler, getRouterParam } from 'h3'
import { deleteSecret } from '~/server/modules/secrets'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_ID' })
  }
  await deleteSecret(id)
  return { ok: true }
})
