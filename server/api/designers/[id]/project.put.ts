import { useDb } from '~/server/db/index'
import { designerProjects, designers, projects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getAvailableDesignerPackageKeySet, getNormalizedDesignerServiceKeySet, normalizeDesignerServices } from '~/shared/utils/designer-catalogs'

const BodySchema = z.object({
  designerProjectId: z.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  packageKey: z.string().trim().optional().nullable(),
  pricePerSqm: z.number().int().nonnegative().optional().nullable(),
  area: z.number().int().nonnegative().optional().nullable(),
  totalPrice: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId || !Number.isFinite(designerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

  const body = await readValidatedNodeBody(event, BodySchema)
  const db = useDb()

  const [designer] = await db.select().from(designers).where(eq(designers.id, designerId)).limit(1)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizeDesignerServices(designer.services))
  const validPackageKeys = getAvailableDesignerPackageKeySet(designer.packages, { validServiceKeys })

  const [dp] = await db
    .select()
    .from(designerProjects)
    .where(and(
      eq(designerProjects.id, body.designerProjectId),
      eq(designerProjects.designerId, designerId),
    ))
    .limit(1)

  if (!dp) {
    throw createError({ statusCode: 404, statusMessage: 'Проект дизайнера не найден' })
  }

  const nextPrice = body.pricePerSqm ?? dp.pricePerSqm
  const nextArea = body.area ?? dp.area
  const computedTotal = (nextPrice && nextArea) ? nextPrice * nextArea : null
  const normalizedPackageKey = body.packageKey !== undefined
    ? (validPackageKeys.has(String(body.packageKey || '').trim()) ? String(body.packageKey).trim() : null)
    : dp.packageKey

  await db.update(designerProjects)
    .set({
      packageKey: normalizedPackageKey,
      pricePerSqm: body.pricePerSqm !== undefined ? body.pricePerSqm : dp.pricePerSqm,
      area: body.area !== undefined ? body.area : dp.area,
      totalPrice: body.totalPrice !== undefined ? body.totalPrice : computedTotal,
      status: body.status ?? dp.status,
      notes: body.notes !== undefined ? (body.notes || null) : dp.notes,
    })
    .where(eq(designerProjects.id, dp.id))

  if (body.title !== undefined) {
    await db.update(projects)
      .set({ title: body.title })
      .where(eq(projects.id, dp.projectId))
  }

  return { ok: true }
})
