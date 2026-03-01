import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { asc, eq } from 'drizzle-orm'
import { LoginSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, LoginSchema)
  const db = useDb()

  const preferredEmail = (process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com').trim()
  const initialPassword = (process.env.DESIGNER_INITIAL_PASSWORD || '').trim()
  let user: any | undefined

  if (preferredEmail) {
    ;[user] = await db.select().from(users).where(eq(users.email, preferredEmail)).limit(1)
  }

  if (!user) {
    ;[user] = await db.select().from(users).orderBy(asc(users.id)).limit(1)
  }

  if (!user) {
    if (initialPassword && body.password === initialPassword) {
      const passwordHash = await hashPassword(initialPassword)
      ;[user] = await db.insert(users).values({
        email: preferredEmail,
        login: preferredEmail,
        passwordHash,
        name: 'Designer',
      }).returning()
    }
  }

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Пользователь не найден' })

  let ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok && initialPassword && body.password === initialPassword) {
    const passwordHash = await hashPassword(initialPassword)
    ;[user] = await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id))
      .returning()
    ok = true
  }

  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Неверный пароль' })
  setAdminSession(event, user.id)
  return { ok: true, name: user.name, email: user.email }
})
