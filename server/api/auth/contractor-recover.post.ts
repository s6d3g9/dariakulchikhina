import { useDb } from '~/server/db'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ContractorRecoverSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ContractorRecoverSchema)
  const db = useDb()

  const [contractor] = await db
    .select({
      id: contractors.id,
      recoveryPhraseHash: contractors.recoveryPhraseHash,
    })
    .from(contractors)
    .where(eq(contractors.login, body.login))
    .limit(1)

  if (!contractor || !contractor.recoveryPhraseHash) {
    throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден или recovery phrase не настроена' })
  }

  const ok = await verifyPassword(body.recoveryPhrase, contractor.recoveryPhraseHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверная recovery phrase' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await db.update(contractors).set({ passwordHash }).where(eq(contractors.id, contractor.id))

  return { ok: true }
})