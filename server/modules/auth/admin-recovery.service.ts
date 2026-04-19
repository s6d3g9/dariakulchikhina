import { hashPassword, verifyPassword } from '~/server/modules/auth/password.service'
import type { RecoverInput } from '~/shared/types/auth'
import * as repo from './auth.repository'

/**
 * Reset an admin password given a recovery phrase. The phrase is compared
 * against the stored hash — the raw phrase is never persisted.
 */
export async function adminRecover(body: RecoverInput) {
  const user = await repo.findUserForRecovery(body.login)

  if (!user || !user.recoveryPhraseHash) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Пользователь не найден или recovery phrase не настроена',
    })
  }

  const ok = await verifyPassword(body.recoveryPhrase, user.recoveryPhraseHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная recovery phrase' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await repo.updateUserPassword(user.id, passwordHash)

  return { ok: true as const }
}
