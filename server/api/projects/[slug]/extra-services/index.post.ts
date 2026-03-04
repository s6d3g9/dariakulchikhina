import { useDb } from '~/server/db/index'
import { projectExtraServices, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/projects/[slug]/extra-services
 * Создаёт запрос на дополнительную услугу.
 *   - Клиент создаёт: status = 'requested', requestedBy = 'client'
 *   - Дизайнер (admin) создаёт: status = 'quoted', requestedBy = 'admin'
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const auth = requireAdminOrClient(event, slug)

  const body = await readBody<{
    serviceKey?: string
    title: string
    description?: string
    quantity?: string
    unit?: string
    unitPrice?: number
    totalPrice?: number
    clientNotes?: string
    adminNotes?: string
  }>(event)

  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, message: 'title is required' })
  }

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
