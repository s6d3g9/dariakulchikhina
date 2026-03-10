import { useDb } from '~/server/db/index'
import { designerProjects, projects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  designerProjectId: z.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  packageKey: z.string().trim().optional().nullable(),
  pricePerSqm: z.number().int().nonnegative().optional().nullable(),
  area: z.number().int().nonnegative().optional().nullable(),
  totalPrice: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  stage: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  const [dp] = await db
    .select()
    .from(designerProjects)
    .where(and(eq(designerProjects.id, body.designerProjectId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const nextPrice = body.pricePerSqm ?? dp.pricePerSqm
  const nextArea = body.area ?? dp.area
  const computedTotal = (nextPrice && nextArea) ? nextPrice * nextArea : null

  await db.update(designerProjects).set({
    packageKey: body.packageKey !== undefined ? (body.packageKey || null) : dp.packageKey,
    pricePerSqm: body.pricePerSqm !== undefined ? body.pricePerSqm : dp.pricePerSqm,
    area: body.area !== undefined ? body.area : dp.area,
    totalPrice: body.totalPrice !== undefined ? body.totalPrice : computedTotal,
    status: body.status ?? dp.status,
    stage: body.stage ?? dp.stage,
    notes: body.notes !== undefined ? (body.notes || null) : dp.notes,
  }).where(eq(designerProjects.id, dp.id))

  if (body.title !== undefined) {
    await db.update(projects).set({ title: body.title }).where(eq(projects.id, dp.projectId))
  }

  return { ok: true }
})
