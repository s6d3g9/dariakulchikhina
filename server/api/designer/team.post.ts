import { useDb } from '~/server/db/index'
import { designerProjectClients, designerProjectContractors, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const AddSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add-client'), designerProjectId: z.number(), clientId: z.number() }),
  z.object({ action: z.literal('add-contractor'), designerProjectId: z.number(), contractorId: z.number(), role: z.string().optional().nullable() }),
  z.object({ action: z.literal('remove-client'), linkId: z.number() }),
  z.object({ action: z.literal('remove-contractor'), linkId: z.number() }),
])

async function verifyOwnership(db: any, designerId: number, dpId: number) {
  const [dp] = await db
    .select({ id: designerProjects.id })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 403, statusMessage: 'Нет доступа' })
}

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const body = await readValidatedNodeBody(event, AddSchema)
  const db = useDb()

  if (body.action === 'add-client') {
    await verifyOwnership(db, designerId, body.designerProjectId)
    try {
      const [row] = await db.insert(designerProjectClients).values({
        designerProjectId: body.designerProjectId,
        clientId: body.clientId,
      }).returning()
      return row
    } catch (e: any) {
      if ((e?.cause?.code ?? e?.code) === '23505') return { ok: true, exists: true }
      throw e
    }
  }

  if (body.action === 'add-contractor') {
    await verifyOwnership(db, designerId, body.designerProjectId)
    try {
      const [row] = await db.insert(designerProjectContractors).values({
        designerProjectId: body.designerProjectId,
        contractorId: body.contractorId,
        role: body.role || null,
      }).returning()
      return row
    } catch (e: any) {
      if ((e?.cause?.code ?? e?.code) === '23505') return { ok: true, exists: true }
      throw e
    }
  }

  if (body.action === 'remove-client') {
    await db.delete(designerProjectClients).where(eq(designerProjectClients.id, body.linkId))
    return { ok: true }
  }

  if (body.action === 'remove-contractor') {
    await db.delete(designerProjectContractors).where(eq(designerProjectContractors.id, body.linkId))
    return { ok: true }
  }
})
