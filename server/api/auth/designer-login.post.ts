import { useDb } from '~/server/db/index'
import { designerAccounts, designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { email?: string; password?: string }
  const email = (body?.email || '').trim().toLowerCase()
  const password = (body?.password || '').trim()

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Введите email и пароль' })
  }

  const db = useDb()

  // Найти аккаунт по email
  const [account] = await db
    .select({
      id: designerAccounts.id,
      designerId: designerAccounts.designerId,
      passwordHash: designerAccounts.passwordHash,
    })
    .from(designerAccounts)
    .where(eq(designerAccounts.email, email))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Неверный email или пароль' })
  }

  const valid = await verifyPassword(password, account.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Неверный email или пароль' })
  }

  // Получить имя дизайнера для ответа
  const [designer] = await db
    .select({ id: designers.id, name: designers.name })
    .from(designers)
    .where(eq(designers.id, account.designerId))
    .limit(1)

  setDesignerSession(event, account.designerId)

  return { ok: true, designerId: account.designerId, name: designer?.name ?? '' }
})
