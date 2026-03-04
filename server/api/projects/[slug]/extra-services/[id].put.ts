import { useDb } from '~/server/db/index'
import { projectExtraServices, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * PUT /api/projects/[slug]/extra-services/[id]
 * Обновляет услугу. Правила разграничения по роли:
 *   ADMIN — может менять: unitPrice, totalPrice, status, adminNotes, quantity, unit, title, description
 *   CLIENT — может только: одобрить (approved) | отменить (cancelled) | написать clientNotes
 */

const ADMIN_EDITABLE = ['unitPrice', 'totalPrice', 'status', 'adminNotes', 'quantity', 'unit', 'title', 'description', 'clientNotes']
const CLIENT_ALLOWED_STATUSES = ['approved', 'cancelled']

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const serviceId = Number(getRouterParam(event, 'id'))
  const auth = requireAdminOrClient(event, slug)

  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid service id' })
  }

  const db = useDb()

  // Verify project ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  // Verify service belongs to project
  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)
  if (!service) throw createError({ statusCode: 404, message: 'Service not found' })

  const body = await readBody<Record<string, unknown>>(event)
  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (auth.role === 'admin') {
    // Admin can update almost everything
    if (body.title      !== undefined) update.title       = String(body.title).trim()
    if (body.description !== undefined) update.description = body.description ? String(body.description).trim() : null
    if (body.quantity   !== undefined) update.quantity    = String(body.quantity).trim()
    if (body.unit       !== undefined) update.unit        = String(body.unit).trim()
    if (body.unitPrice  !== undefined) update.unitPrice   = body.unitPrice != null ? Number(body.unitPrice) : null
    if (body.totalPrice !== undefined) update.totalPrice  = body.totalPrice != null ? Number(body.totalPrice) : null
    if (body.adminNotes !== undefined) update.adminNotes  = body.adminNotes ? String(body.adminNotes).trim() : null
    if (body.clientNotes !== undefined) update.clientNotes = body.clientNotes ? String(body.clientNotes).trim() : null
    if (body.status !== undefined)     update.status      = String(body.status)
  } else {
    // Client can ONLY set status to approved/cancelled + update clientNotes
    if (body.status !== undefined) {
      if (!CLIENT_ALLOWED_STATUSES.includes(String(body.status))) {
        throw createError({ statusCode: 403, message: `Client can only set status to: ${CLIENT_ALLOWED_STATUSES.join(', ')}` })
      }
      update.status = String(body.status)
    }
    if (body.clientNotes !== undefined) {
      update.clientNotes = body.clientNotes ? String(body.clientNotes).trim() : null
    }
  }

  const [updated] = await db
    .update(projectExtraServices)
    .set(update as any)
    .where(eq(projectExtraServices.id, serviceId))
    .returning()

  return updated
})
