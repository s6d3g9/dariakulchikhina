import { useDb } from '~/server/db/index'
import { sellers, sellerProjects, projects } from '~/server/db/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const q = safeGetQuery(event)
  const projectSlug = (q.projectSlug as string) || ''

  if (projectSlug) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, projectSlug)).limit(1)
    if (!project) return []
    const rows = await db
      .select({ seller: sellers })
      .from(sellerProjects)
      .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
      .where(eq(sellerProjects.projectId, project.id))
      .orderBy(asc(sellers.name))
    return rows.map(r => r.seller)
  }

  const rows = await db.select().from(sellers).orderBy(asc(sellers.createdAt))
  return rows
})
