import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const db = useDb()
  const [designer] = await db.select().from(designers).where(eq(designers.id, designerId)).limit(1)
  if (!designer) throw createError({ statusCode: 404, statusMessage: 'Дизайнер не найден' })
  return designer
})
