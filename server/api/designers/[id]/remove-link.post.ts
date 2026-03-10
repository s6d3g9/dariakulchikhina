import { useDb } from '~/server/db/index'
import { designerProjectClients, designerProjectContractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const RemoveLinkSchema = z.object({
  type: z.enum(['client', 'contractor']),
  linkId: z.number(),
})

export default defineEventHandler(async (event) => {
  const designerIdParam = Number(getRouterParam(event, 'id'))
  requireAdminOrDesignerSelf(event, designerIdParam)
  const body = await readValidatedNodeBody(event, RemoveLinkSchema)
  const db = useDb()

  if (body.type === 'client') {
    await db.delete(designerProjectClients).where(eq(designerProjectClients.id, body.linkId))
  } else {
    await db.delete(designerProjectContractors).where(eq(designerProjectContractors.id, body.linkId))
  }

  return { ok: true }
})
