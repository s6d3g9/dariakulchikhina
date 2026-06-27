import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { RecoverSchema } from '~/shared/types/auth/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, RecoverSchema)
  const db = useDb()

  const [user] = await db
    .select({ id: users.id, recoveryPhraseHash: users.recoveryPhraseHash })
    .from(users)
    .where(eq(users.login, body.login))
    .limit(1)

  // Timing-safe: always run bcrypt to prevent user enumeration
  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.recoveryPhrase, user?.recoveryPhraseHash || DUMMY_HASH)
  if (!user || !user.recoveryPhraseHash || !ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или recovery phrase' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

  return { ok: true }
})