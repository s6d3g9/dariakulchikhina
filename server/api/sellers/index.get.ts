import { useDb } from '~/server/db/index'
import { sellers, sellerProjects, projects } from '~/server/db/schema'
import { eq, ilike, or, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const q = safeGetQuery(event)
  const search   = (q.search   as string | undefined)?.trim() ?? ''
  const category = (q.category as string | undefined)?.trim() ?? ''
  const status   = (q.status   as string | undefined)?.trim() ?? ''

  const rows = await db
    .select({
      seller: sellers,
      projectCount: sql<number>`count(distinct ${sellerProjects.projectId})::int`,
    })
    .from(sellers)
    .leftJoin(sellerProjects, eq(sellerProjects.sellerId, sellers.id))
    .groupBy(sellers.id)
    .orderBy(sellers.name)

  let result = rows.map((r: any) => ({ ...r.seller, projectCount: r.projectCount }))

  if (search) {
    const q2 = search.toLowerCase()
    result = result.filter((s: any) =>
      s.name?.toLowerCase().includes(q2) ||
      s.companyName?.toLowerCase().includes(q2) ||
      s.city?.toLowerCase().includes(q2)
    )
  }
  if (category) result = result.filter((s: any) => (s.categories ?? []).includes(category))
  if (status)   result = result.filter((s: any) => s.status === status)

  return result
})
