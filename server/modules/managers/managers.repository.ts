import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { managers, managerProjects, projects } from '~/server/db/schema'

export async function findManagerById(id: number) {
  const db = useDb()
  const [manager] = await db.select().from(managers).where(eq(managers.id, id)).limit(1)
  return manager ?? null
}

export async function listAllManagers() {
  const db = useDb()
  return db.select().from(managers).orderBy(asc(managers.createdAt))
}

export async function listManagersByProjectSlug(projectSlug: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)
  if (!project) return null
  const rows = await db
    .select({ manager: managers })
    .from(managerProjects)
    .innerJoin(managers, eq(managerProjects.managerId, managers.id))
    .where(eq(managerProjects.projectId, project.id))
    .orderBy(asc(managers.name))
  return rows.map((r) => r.manager)
}

export async function insertManager(values: {
  name: string
  slug: string
  role: string | null
  phone: string | null
  email: string | null
  telegram: string | null
  city: string | null
  notes: string | null
}) {
  const db = useDb()
  const [manager] = await db.insert(managers).values(values).returning()
  return manager
}

export async function updateManagerRow(id: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(managers)
    .set(updates)
    .where(eq(managers.id, id))
    .returning()
  return updated ?? null
}

export async function deleteManagerRow(id: number) {
  const db = useDb()
  await db.delete(managers).where(eq(managers.id, id))
}

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
