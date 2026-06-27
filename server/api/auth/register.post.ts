import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { eq, or } from 'drizzle-orm'
import { RegisterSchema } from '~/shared/types/auth/auth'
import { generateRecoveryPhrase } from '~/server/utils/recovery-phrase'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, RegisterSchema)
  const db = useDb()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.login, body.login), eq(users.email, `${body.login}@auth.local`)))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Регистрация невозможна. Попробуйте другой логин' })
  }

  const recoveryPhrase = generateRecoveryPhrase()
  const passwordHash = await hashPassword(body.password)
  const recoveryPhraseHash = await hashPassword(recoveryPhrase)

  const [created] = await db.insert(users).values({
    email: `${body.login}@auth.local`,
    login: body.login,
    passwordHash,
    recoveryPhraseHash,
    name: body.name || body.login,
  }).returning({
    id: users.id,
    login: users.login,
    email: users.email,
    name: users.name,
  })

  return {
    ok: true,
    user: created,
    recoveryPhrase,
  }
})