import { useDb } from '~/server/db/index'
import { projects, sellerProjects, sellers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  const rows = await db
    .select({ seller: sellers })
    .from(sellerProjects)
    .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
    .where(eq(sellerProjects.projectId, project.id))
    .orderBy(sellers.name)

  return rows.map(r => r.seller)
})
