import { useDb } from '~/server/db/index'
import { designerProjects, designers, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { CORE_PAGES } from '~/shared/constants/pages'
import { getAvailableDesignerPackageKeySet, getNormalizedDesignerServiceKeySet, normalizeDesignerServices } from '~/shared/utils/designer-catalogs'

const CreateDesignerProjectSchema = z.object({
  designerId: z.number(),
  title: z.string().min(1),
  slug: z.string().min(1),
  packageKey: z.string().optional(),
  pricePerSqm: z.number().optional(),
  area: z.number().optional(),
  totalPrice: z.number().optional(),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const routeDesignerId = Number(getRouterParam(event, 'id'))
  if (!routeDesignerId || !Number.isFinite(routeDesignerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

  const body = await readValidatedNodeBody(event, CreateDesignerProjectSchema)
  if (body.designerId !== routeDesignerId) {
    throw createError({ statusCode: 400, statusMessage: 'Designer id mismatch' })
  }

  const db = useDb()
  const [designer] = await db.select().from(designers).where(eq(designers.id, routeDesignerId)).limit(1)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizeDesignerServices(designer.services))
  const validPackageKeys = getAvailableDesignerPackageKeySet(designer.packages, { validServiceKeys })
  const normalizedPackageKey = validPackageKeys.has(String(body.packageKey || '').trim()) ? String(body.packageKey).trim() : null

  // 1. Create the project in projects table
  let project: any
  try {
    ;[project] = await db.insert(projects).values({
      slug: body.slug,
      title: body.title,
      pages: [...CORE_PAGES],
      profile: {},
    }).returning()
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      // Project slug already exists — find it
      const [existing] = await db.select().from(projects).where(eq(projects.slug, body.slug)).limit(1)
      if (existing) {
        project = existing
        // Backfill pages if project was created with empty pages
        if (!existing.pages || existing.pages.length === 0) {
          await db.update(projects).set({ pages: [...CORE_PAGES] }).where(eq(projects.id, existing.id))
          project = { ...existing, pages: [...CORE_PAGES] }
        }
      } else {
        throw createError({ statusCode: 400, statusMessage: `Slug «${body.slug}» уже занят` })
      }
    } else throw e
  }

  // 2. Create designer ↔ project link
  const totalPrice = body.totalPrice || ((body.pricePerSqm || 0) * (body.area || 0)) || null
  let dp: any
  try {
    ;[dp] = await db.insert(designerProjects).values({
      designerId: body.designerId,
      projectId: project.id,
      packageKey: normalizedPackageKey,
      pricePerSqm: body.pricePerSqm || null,
      area: body.area || null,
      totalPrice: totalPrice,
      status: 'draft',
      notes: body.notes || null,
    }).returning()
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      throw createError({ statusCode: 400, statusMessage: 'Этот проект уже привязан к дизайнеру' })
    }
    throw e
  }

  return {
    designerProject: dp,
    project,
  }
})
