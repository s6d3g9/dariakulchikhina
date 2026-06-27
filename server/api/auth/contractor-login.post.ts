import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { enforceLoginThrottle, recordLoginFailure, recordLoginSuccess, getClientIp } from '~/server/utils/login-throttle'

const Schema = z.union([
  z.object({
    id: z.number().int().positive(),
    slug: z.string().min(1).max(200),
    token: z.string().min(1).max(500),
  }),
  z.object({
    login: z.string().min(3).max(100).trim().toLowerCase(),
    password: z.string().min(1).max(200),
  }),
])

export default defineEventHandler(async (event) => {
  await enforceLoginThrottle(event)
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  if ('id' in body) {
    // Verify HMAC-signed access token (prevents brute-force on id+slug)
    const tokenData = verifyContractorAccessToken(body.token)
    if (!tokenData || tokenData.cid !== body.id || tokenData.slug !== body.slug) {
      throw createError({ statusCode: 401, statusMessage: 'Неверные данные' })
    }

    const [contractor] = await db.select().from(contractors).where(eq(contractors.id, body.id)).limit(1)
    if (!contractor || contractor.slug !== body.slug) {
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

  const DUMMY_HASH = '$2a$12$000000000000000000000uGBPRnpKe7P6TBGgKOjHR0INdZOhHIi'
  const ok = await verifyPassword(body.password, contractor?.passwordHash || DUMMY_HASH)

  if (!contractor || !contractor.passwordHash || !ok) {
    recordLoginFailure(getClientIp(event))
    throw createError({ statusCode: 401, statusMessage: 'Неверный логин или пароль' })
  }

  recordLoginSuccess(getClientIp(event))
  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
})
