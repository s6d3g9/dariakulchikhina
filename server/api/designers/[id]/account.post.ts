/**
 * POST /api/designers/:id/account
 * Admin only — create or update designer login credentials.
 * Body: { email: string; password: string }
 */
import { useDb } from '~/server/db/index'
import { designerAccounts, designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId) throw createError({ statusCode: 400, message: 'Неверный ID дизайнера' })

  const body = await readBody(event) as { email?: string; password?: string }
  const email = (body?.email || '').trim().toLowerCase()
  const password = (body?.password || '').trim()

  if (!email) {
    throw createError({ statusCode: 400, message: 'Необходим email' })
  }
  if (password && password.length < 6) {
    throw createError({ statusCode: 400, message: 'Пароль должен быть не менее 6 символов' })
  }

  const db = useDb()

  // Проверить что дизайнер существует
  const [designer] = await db.select({ id: designers.id }).from(designers).where(eq(designers.id, designerId)).limit(1)
  if (!designer) throw createError({ statusCode: 404, message: 'Дизайнер не найден' })

  const [existing] = await db.select({ id: designerAccounts.id })
    .from(designerAccounts)
    .where(eq(designerAccounts.designerId, designerId))
    .limit(1)

  if (existing) {
    // Update: обновить email (и пароль — если передан)
    const updateData: Record<string, any> = { email, updatedAt: new Date() }
    if (password) updateData.passwordHash = await hashPassword(password)
    await db.update(designerAccounts).set(updateData).where(eq(designerAccounts.designerId, designerId))
  } else {
    // Create: пароль обязателен для нового аккаунта
    if (!password) throw createError({ statusCode: 400, message: 'Для нового аккаунта необходим пароль' })
    const passwordHash = await hashPassword(password)
    await db.insert(designerAccounts).values({ designerId, email, passwordHash })
  }

  return { ok: true, message: existing ? 'Аккаунт обновлён' : 'Аккаунт создан' }
})
