import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.union([
  z.object({
    id: z.number().int().positive(),
    slug: z.string().min(1).max(200),
  }),
  z.object({
    login: z.string().min(3).max(100).trim().toLowerCase(),
    password: z.string().min(1),
  }),
])

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  if ('id' in body) {
    const [contractor] = await db.select().from(contractors).where(eq(contractors.id, body.id)).limit(1)
    if (!contractor) throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден' })
    if (contractor.slug !== body.slug) {
      throw createError({ statusCode: 401, statusMessage: 'Неверные данные' })
    }
    setContractorSession(event, contractor.id)
    return { ok: true, id: contractor.id, name: contractor.name }
  }

  const [contractor] = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      passwordHash: contractors.passwordHash,
    })
    .from(contractors)
    .where(eq(contractors.login, body.login))
    .limit(1)

  if (!contractor || !contractor.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  const ok = await verifyPassword(body.password, contractor.passwordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
})
