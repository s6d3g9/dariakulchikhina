import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq, or } from 'drizzle-orm'
import { LoginSchema } from '~/shared/types/auth/auth'
import { timingSafeEqual } from 'crypto'
import { enforceLoginThrottle, recordLoginFailure, recordLoginSuccess, getClientIp } from '~/server/utils/login-throttle'

export default defineEventHandler(async (event) => {
  await enforceLoginThrottle(event)
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

  // Bootstrap auto-create: only when user not in DB and env password is set
  if (!user && initialPassword) {
    const matchesBootstrapIdentity = body.login === preferredLogin || body.login === preferredEmail.toLowerCase()
    // Timing-safe comparison of bootstrap password
    const inputBuf = Buffer.from(body.password)
    const expectedBuf = Buffer.from(initialPassword)
    const bootstrapMatch = inputBuf.length === expectedBuf.length &&
      timingSafeEqual(inputBuf, expectedBuf)

    if (matchesBootstrapIdentity && bootstrapMatch) {
      // User may exist under the canonical identity but login was typed differently
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

  // Timing-safe: always run bcrypt to prevent user enumeration
  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.password, user?.passwordHash || DUMMY_HASH)

  if (!user || !ok) {
    recordLoginFailure(getClientIp(event))
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }
  recordLoginSuccess(getClientIp(event))
  setAdminSession(event, user.id)
  return { ok: true, name: user.name, email: user.email, login: user.login }
})
