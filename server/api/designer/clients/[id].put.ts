import { useDb } from '~/server/db/index'
import { clients, designerProjectClients, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const clientId = Number(getRouterParam(event, 'id'))
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Verify this client is linked to one of this designer's projects
  const [link] = await db
    .select({ id: designerProjectClients.id })
    .from(designerProjectClients)
    .innerJoin(designerProjects, eq(designerProjects.id, designerProjectClients.designerProjectId))
    .where(and(
      eq(designerProjectClients.clientId, clientId),
      eq(designerProjects.designerId, designerId),
    ))
    .limit(1)

  if (!link) throw createError({ statusCode: 403, statusMessage: 'Нет доступа к этому клиенту' })

  const body = await readNodeBody(event) as Record<string, unknown>
  const ALLOWED = ['name','phone','email','messenger','messengerNick','address','notes','brief']
  const updates: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) updates[k] = body[k] ?? null

  const [updated] = await db.update(clients).set(updates).where(eq(clients.id, clientId)).returning()
  return updated
})
