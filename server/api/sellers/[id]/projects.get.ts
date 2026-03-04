import { useDb } from '~/server/db/index'
import { sellerProjects, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })

  const db = useDb()
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(sellerProjects)
    .innerJoin(projects, eq(sellerProjects.projectId, projects.id))
    .where(eq(sellerProjects.sellerId, id))

  return rows
})
