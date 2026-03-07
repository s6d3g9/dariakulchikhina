import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })

  const body = await readBody(event)
  const db = useDb()

  const ALLOWED_TEXT = ['name','companyName','phone','email','telegram','website','city','experience','about','availabilityStatus','availableFrom','messengerNick']
  const ALLOWED_JSON = ['specializations','services','packages','subscriptions','regalia','portfolio']
  const ALLOWED_BOOL = ['canTakeOrder']
  const ALLOWED_NUM  = ['completedProjectsCount']
  const ALLOWED_NUMERIC = ['rating']

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const k of ALLOWED_TEXT)    if (k in body) updates[k] = body[k] ?? null
  for (const k of ALLOWED_JSON)    if (k in body) updates[k] = body[k]
  for (const k of ALLOWED_BOOL)    if (k in body) updates[k] = Boolean(body[k])
  for (const k of ALLOWED_NUM)     if (k in body) updates[k] = Number(body[k]) || 0
  for (const k of ALLOWED_NUMERIC) if (k in body) updates[k] = body[k] != null && body[k] !== '' ? Number(body[k]) : null

  const [updated] = await db.update(designers).set(updates).where(eq(designers.id, id)).returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  return updated
})
