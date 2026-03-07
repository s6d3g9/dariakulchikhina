import { useDb } from '~/server/db/index'
import { sellers, sellerProjects, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = parseInt(event.context.params?.id ?? '')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })

  const db = useDb()
  const [row] = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Seller not found' })

  const linkedProjects = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
    .from(sellerProjects)
    .innerJoin(projects, eq(projects.id, sellerProjects.projectId))
    .where(eq(sellerProjects.sellerId, id))

  return { ...row, linkedProjects }
})
