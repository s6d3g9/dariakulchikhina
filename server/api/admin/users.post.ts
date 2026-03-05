import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ email: string; name?: string; password: string }>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'email и password обязательны' })
  }
  if (body.password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Пароль не менее 6 символов' })
  }

  const db = useDb()

  // Check for duplicate email
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.trim())).limit(1)
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Пользователь с таким email уже существует' })

  const passwordHash = await hashPassword(body.password)
  const [created] = await db.insert(users).values({
    email: body.email.trim().toLowerCase(),
    login: body.email.trim().toLowerCase(),
    name: body.name?.trim() || null,
    passwordHash,
  }).returning({ id: users.id, email: users.email, name: users.name })

  return created
})
