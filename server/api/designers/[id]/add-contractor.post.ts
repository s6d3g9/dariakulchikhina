import { useDb } from '~/server/db/index'
import { designerProjectContractors } from '~/server/db/schema'
import { z } from 'zod'

const AddContractorSchema = z.object({
  designerProjectId: z.number(),
  contractorId: z.number(),
  role: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, AddContractorSchema)
  const db = useDb()

  try {
    const [row] = await db.insert(designerProjectContractors).values({
      designerProjectId: body.designerProjectId,
      contractorId: body.contractorId,
      role: body.role || null,
    }).returning()
    return row
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'Подрядчик уже привязан к проекту' })
    }
    throw e
  }
})
