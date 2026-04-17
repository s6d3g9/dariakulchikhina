import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { projectExtraServices, projects } from '~/server/db/schema'

// Renamed from `project-extra-services.service.ts` (which already exists
// as a legacy utils bridge) — this file owns the new API-facing logic
// for the extra-services sub-resource of projects.

export interface ExtraServicesCaller {
  role: 'admin' | 'client'
}

export const CreateExtraServiceSchema = z.object({
  serviceKey: z.string().max(200).optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  quantity: z.string().max(100).optional(),
  unit: z.string().max(100).optional(),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional(),
  clientNotes: z.string().max(5000).optional(),
  adminNotes: z.string().max(5000).optional(),
})
export type CreateExtraServiceInput = z.infer<typeof CreateExtraServiceSchema>

export const UpdateExtraServiceSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  quantity: z.string().max(100).optional(),
  unit: z.string().max(100).optional(),
  unitPrice: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  status: z.string().max(50).optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
  clientNotes: z.string().max(5000).nullable().optional(),
})
export type UpdateExtraServiceInput = z.infer<typeof UpdateExtraServiceSchema>

const CLIENT_ALLOWED_STATUSES = ['approved', 'cancelled']

async function resolveProjectId(slug: string): Promise<number> {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })
  return project.id
}

/**
 * List all extra-services for a project. Clients see the same rows as
 * admin but `adminNotes` is blanked out.
 */
export async function listProjectExtraServices(slug: string, caller: ExtraServicesCaller) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const services = await db
    .select()
    .from(projectExtraServices)
    .where(eq(projectExtraServices.projectId, projectId))
    .orderBy(desc(projectExtraServices.createdAt))

  if (caller.role === 'client') {
    return services.map((s) => ({ ...s, adminNotes: undefined }))
  }
  return services
}

/**
 * Create an extra-service request. The initial `status` and
 * `requestedBy` depend on whether the caller is admin (quoted/admin) or
 * client (requested/client). Admin-only `adminNotes` is nulled for
 * client-originated rows.
 */
export async function createProjectExtraService(
  slug: string,
  caller: ExtraServicesCaller,
  body: CreateExtraServiceInput,
) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const isAdmin = caller.role === 'admin'

  const [created] = await db
    .insert(projectExtraServices)
    .values({
      projectId,
      requestedBy: isAdmin ? 'admin' : 'client',
      serviceKey: body.serviceKey?.trim() || null,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      quantity: body.quantity?.trim() || '1',
      unit: body.unit?.trim() || 'услуга',
      unitPrice: body.unitPrice ?? null,
      totalPrice: body.totalPrice ?? null,
      status: isAdmin ? 'quoted' : 'requested',
      clientNotes: body.clientNotes?.trim() || null,
      adminNotes: isAdmin ? body.adminNotes?.trim() || null : null,
    })
    .returning()
  return created
}

/**
 * Update an extra-service row with role-based field whitelist:
 * admin can update almost everything; client can only set status to
 * `approved` or `cancelled` and edit `clientNotes`.
 */
export async function updateProjectExtraService(
  slug: string,
  serviceId: number,
  caller: ExtraServicesCaller,
  body: UpdateExtraServiceInput,
) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(
      and(
        eq(projectExtraServices.id, serviceId),
        eq(projectExtraServices.projectId, projectId),
      ),
    )
    .limit(1)
  if (!service) throw createError({ statusCode: 404, message: 'Service not found' })

  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (caller.role === 'admin') {
    if (body.title !== undefined) update.title = body.title.trim()
    if (body.description !== undefined)
      update.description = body.description ? body.description.trim() : null
    if (body.quantity !== undefined) update.quantity = body.quantity.trim()
    if (body.unit !== undefined) update.unit = body.unit.trim()
    if (body.unitPrice !== undefined) update.unitPrice = body.unitPrice
    if (body.totalPrice !== undefined) update.totalPrice = body.totalPrice
    if (body.adminNotes !== undefined)
      update.adminNotes = body.adminNotes ? body.adminNotes.trim() : null
    if (body.clientNotes !== undefined)
      update.clientNotes = body.clientNotes ? body.clientNotes.trim() : null
    if (body.status !== undefined) update.status = body.status
  } else {
    if (body.status !== undefined) {
      if (!CLIENT_ALLOWED_STATUSES.includes(body.status)) {
        throw createError({
          statusCode: 403,
          message: `Client can only set status to: ${CLIENT_ALLOWED_STATUSES.join(', ')}`,
        })
      }
      update.status = body.status
    }
    if (body.clientNotes !== undefined) {
      update.clientNotes = body.clientNotes ? body.clientNotes.trim() : null
    }
  }

  const [updated] = await db
    .update(projectExtraServices)
    .set(update as Record<string, unknown>)
    .where(eq(projectExtraServices.id, serviceId))
    .returning()
  return updated
}

/**
 * Delete an extra-service row. Clients can only delete their own
 * `requested` or `cancelled` rows; admin can delete any row.
 */
export async function deleteProjectExtraService(
  slug: string,
  serviceId: number,
  caller: ExtraServicesCaller,
) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(
      and(
        eq(projectExtraServices.id, serviceId),
        eq(projectExtraServices.projectId, projectId),
      ),
    )
    .limit(1)
  if (!service) throw createError({ statusCode: 404, message: 'Service not found' })

  if (caller.role === 'client') {
    if (service.requestedBy !== 'client') {
      throw createError({
        statusCode: 403,
        message: 'Cannot delete admin-initiated service',
      })
    }
    if (!['requested', 'cancelled'].includes(service.status)) {
      throw createError({
        statusCode: 403,
        message: 'Can only delete services in requested or cancelled status',
      })
    }
  }

  await db.delete(projectExtraServices).where(eq(projectExtraServices.id, serviceId))
  return { ok: true as const }
}
