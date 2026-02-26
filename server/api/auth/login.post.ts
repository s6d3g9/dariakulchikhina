import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { LoginSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, LoginSchema)
  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.login, body.login)).limit(1)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  setAdminSession(event, user.id)
  return { ok: true, name: user.name, email: user.email }
})
