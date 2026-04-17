import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { managers, managerProjects, projects } from '~/server/db/schema'

export const CreateManagerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  role: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  city: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
export type CreateManagerInput = z.infer<typeof CreateManagerSchema>

export const UpdateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})
export type UpdateManagerInput = z.infer<typeof UpdateManagerSchema>

export interface ListManagersOptions {
  projectSlug?: string
}

/**
 * Admin list of managers. With `projectSlug` returns only managers
 * linked to that project via `manager_projects`.
 */
export async function listManagers(opts: ListManagersOptions = {}) {
  const db = useDb()

  if (opts.projectSlug) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, opts.projectSlug))
      .limit(1)
    if (!project) return []
    const rows = await db
      .select({ manager: managers })
      .from(managerProjects)
      .innerJoin(managers, eq(managerProjects.managerId, managers.id))
      .where(eq(managerProjects.projectId, project.id))
      .orderBy(asc(managers.name))
    return rows.map((r) => r.manager)
  }

  return db.select().from(managers).orderBy(asc(managers.createdAt))
}

export async function getManager(id: number) {
  const db = useDb()
  const [manager] = await db.select().from(managers).where(eq(managers.id, id)).limit(1)
  return manager ?? null
}

/**
 * Create a manager. When `slug` is not provided, derives it from `name`
 * by lowercasing and replacing non-alphanumerics with dashes (preserving
 * Cyrillic so slugs remain readable).
 */
export async function createManager(body: CreateManagerInput) {
  const db = useDb()
  const slug =
    body.slug ||
    body.name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/-+$/, '')

  const [manager] = await db
    .insert(managers)
    .values({
      name: body.name,
      slug,
      role: body.role || null,
      phone: body.phone || null,
      email: body.email || null,
      telegram: body.telegram || null,
      city: body.city || null,
      notes: body.notes || null,
    })
    .returning()
  return manager
}

export async function updateManager(id: number, body: UpdateManagerInput) {
  const db = useDb()
  const [updated] = await db
    .update(managers)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(managers.id, id))
    .returning()
  return updated ?? null
}

export async function deleteManager(id: number) {
  const db = useDb()
  await db.delete(managers).where(eq(managers.id, id))
}

/**
 * Projects the manager is linked to via `manager_projects`, annotated
 * with the assignment role and timestamp.
 */
export async function listManagerProjects(managerId: number) {
  const db = useDb()
  return db
    .select({
      id: managerProjects.id,
      role: managerProjects.role,
      assignedAt: managerProjects.assignedAt,
      projectId: projects.id,
      projectName: projects.title,
      projectSlug: projects.slug,
    })
    .from(managerProjects)
    .innerJoin(projects, eq(managerProjects.projectId, projects.id))
    .where(eq(managerProjects.managerId, managerId))
}
