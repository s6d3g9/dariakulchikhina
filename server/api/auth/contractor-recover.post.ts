import { useDb } from '~/server/db'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { ContractorRecoverSchema } from '~/shared/types/auth/auth'

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

  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.recoveryPhrase, contractor?.recoveryPhraseHash || DUMMY_HASH)

  if (!contractor || !contractor.recoveryPhraseHash || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или recovery phrase' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await db.update(contractors).set({ passwordHash }).where(eq(contractors.id, contractor.id))

  return { ok: true }
})