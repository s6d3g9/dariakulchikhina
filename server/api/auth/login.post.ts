import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq, or } from 'drizzle-orm'
import { LoginSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, LoginSchema)
  const db = useDb()

  const preferredEmail = (process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com').trim()
  const preferredLogin = (process.env.DESIGNER_INITIAL_LOGIN || preferredEmail.split('@')[0] || 'admin').trim().toLowerCase()
  const initialPassword = (process.env.DESIGNER_INITIAL_PASSWORD || '').trim()
  let user: any | undefined

  ;[user] = await db
    .select({
      id: users.id,
      email: users.email,
      login: users.login,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(or(eq(users.login, body.login), eq(users.email, body.login)))
    .limit(1)

  if (!user) {
    const matchesBootstrapIdentity = body.login === preferredLogin || body.login === preferredEmail.toLowerCase()
    if (matchesBootstrapIdentity && initialPassword && body.password === initialPassword) {
      ;[user] = await db
        .select({
          id: users.id,
          email: users.email,
          login: users.login,
          name: users.name,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(or(eq(users.login, preferredLogin), eq(users.email, preferredEmail)))
        .limit(1)

      if (!user) {
        const passwordHash = await hashPassword(initialPassword)
        ;[user] = await db.insert(users).values({
          email: preferredEmail,
          login: preferredLogin,
          passwordHash,
          name: 'Designer',
        }).returning()
      }
    }
  }

  if (!user) throw createError({ statusCode: 401, statusMessage: 'Пользователь не найден' })

  const ok = await verifyPassword(body.password, user.passwordHash)

  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Неверный пароль' })
  setAdminSession(event, user.id)
  return { ok: true, name: user.name, email: user.email, login: user.login }
})
