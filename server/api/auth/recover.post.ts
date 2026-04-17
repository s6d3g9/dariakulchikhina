import { RecoverSchema } from '~/shared/types/auth'
import { adminRecover } from '~/server/modules/auth/admin-recovery.service'

/**
 * POST /api/auth/recover — reset admin password via recovery phrase.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, RecoverSchema)
  return await adminRecover(body)
})
