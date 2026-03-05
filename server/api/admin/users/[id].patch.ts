import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody<{ name?: string; password?: string }>(event)
  const db = useDb()
  const updates: Record<string, any> = {}

  if (body.name !== undefined) updates.name = body.name.trim() || null

  if (body.password) {
    if (body.password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: 'Пароль не менее 6 символов' })
    }
    updates.passwordHash = await hashPassword(body.password)
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Нечего обновлять' })
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
    id: users.id, email: users.email, login: users.login, name: users.name,
  })

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  return updated
})
