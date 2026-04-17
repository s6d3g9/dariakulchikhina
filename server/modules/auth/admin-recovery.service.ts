import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { hashPassword, verifyPassword } from '~/server/utils/auth'
import type { RecoverInput } from '~/shared/types/auth'

/**
 * Reset an admin password given a recovery phrase. The phrase is compared
 * against the stored hash — the raw phrase is never persisted.
 */
export async function adminRecover(body: RecoverInput) {
  const db = useDb()

  const [user] = await db
    .select({ id: users.id, recoveryPhraseHash: users.recoveryPhraseHash })
    .from(users)
    .where(eq(users.login, body.login))
    .limit(1)

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
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

  return { ok: true as const }
}
