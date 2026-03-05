import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  // Prevent deleting oneself
  const session = await getAdminSession(event)
  if (session?.userId === id) {
    throw createError({ statusCode: 400, statusMessage: 'Нельзя удалить свой аккаунт' })
  }

  const db = useDb()
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })

  return { ok: true }
})
