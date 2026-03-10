import { useDb } from '~/server/db/index'
import { designerProjectClients } from '~/server/db/schema'
import { z } from 'zod'

const AddClientSchema = z.object({
  designerProjectId: z.number(),
  clientId: z.number(),
})

export default defineEventHandler(async (event) => {
  const designerIdParam = Number(getRouterParam(event, 'id'))
  requireAdminOrDesignerSelf(event, designerIdParam)
  const body = await readValidatedNodeBody(event, AddClientSchema)
  const db = useDb()

  try {
    const [row] = await db.insert(designerProjectClients).values({
      designerProjectId: body.designerProjectId,
      clientId: body.clientId,
    }).returning()
    return row
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'Клиент уже привязан к проекту' })
    }
    throw e
  }
})
