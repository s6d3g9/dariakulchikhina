import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = parseInt(event.context.params?.id ?? '')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })

  const body = await readBody(event)
  const db = useDb()

  const fields: Partial<typeof sellers.$inferInsert> = {}
  const ALLOWED = ['name','companyName','contactPerson','phone','email','telegram',
    'whatsapp','website','city','messenger','messengerNick','categories',
    'requisites','conditions','notes','status','type','publicSlug','logo']
  for (const k of ALLOWED) {
    if (k in body) (fields as any)[k] = body[k] ?? null
  }
  fields.updatedAt = new Date()

  const [updated] = await db.update(sellers).set(fields).where(eq(sellers.id, id)).returning()
  if (!updated) throw createError({ statusCode: 404, message: 'Seller not found' })
  return updated
})
