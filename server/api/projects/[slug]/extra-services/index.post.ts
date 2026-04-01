import { useDb } from '~/server/db/index'
import { projectExtraServices, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

/**
 * POST /api/projects/[slug]/extra-services
 * Создаёт запрос на дополнительную услугу.
 *   - Клиент создаёт: status = 'requested', requestedBy = 'client'
 *   - Дизайнер (admin) создаёт: status = 'quoted', requestedBy = 'admin'
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const auth = requireAdminOrClient(event, slug)

  const body = await readValidatedNodeBody(event, z.object({
    serviceKey: z.string().max(200).optional(),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    quantity: z.string().max(100).optional(),
    unit: z.string().max(100).optional(),
    unitPrice: z.number().optional(),
    totalPrice: z.number().optional(),
    clientNotes: z.string().max(5000).optional(),
    adminNotes: z.string().max(5000).optional(),
  }))

  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  const isAdmin = auth.role === 'admin'

  const [created] = await db
    .insert(projectExtraServices)
    .values({
      projectId:   project.id,
      requestedBy: isAdmin ? 'admin' : 'client',
      serviceKey:  body.serviceKey?.trim() || null,
      title:       body.title.trim(),
      description: body.description?.trim() || null,
      quantity:    body.quantity?.trim() || '1',
      unit:        body.unit?.trim() || 'услуга',
      unitPrice:   body.unitPrice ?? null,
      totalPrice:  body.totalPrice ?? null,
      status:      isAdmin ? 'quoted' : 'requested',
      clientNotes: body.clientNotes?.trim() || null,
      adminNotes:  isAdmin ? (body.adminNotes?.trim() || null) : null,
    })
    .returning()

  return created
})
