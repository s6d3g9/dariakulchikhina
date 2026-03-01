import { useDb } from '~/server/db/index'
import { workStatusItems, projects, contractors, workStatusItemPhotos, workStatusItemComments } from '~/server/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  const items = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
      workType: workStatusItems.workType,
      roadmapStageId: workStatusItems.roadmapStageId,
      contractorId: workStatusItems.contractorId,
      contractorName: contractors.name,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      budget: workStatusItems.budget,
      notes: workStatusItems.notes,
      sortOrder: workStatusItems.sortOrder,
    })
    .from(workStatusItems)
    .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
    .where(eq(workStatusItems.projectId, project.id))
    .orderBy(workStatusItems.sortOrder)

  if (!items.length) return []

  const itemIds = items.map((i: any) => i.id)

  const photoCounts = await db
    .select({ itemId: workStatusItemPhotos.itemId, count: sql<number>`cast(count(*) as int)` })
    .from(workStatusItemPhotos)
    .where(inArray(workStatusItemPhotos.itemId, itemIds))
    .groupBy(workStatusItemPhotos.itemId)

  const commentCounts = await db
    .select({ itemId: workStatusItemComments.itemId, count: sql<number>`cast(count(*) as int)` })
    .from(workStatusItemComments)
    .where(inArray(workStatusItemComments.itemId, itemIds))
    .groupBy(workStatusItemComments.itemId)

  const photoMap = Object.fromEntries(photoCounts.map((r: any) => [r.itemId, r.count]))
  const commentMap = Object.fromEntries(commentCounts.map((r: any) => [r.itemId, r.count]))

  return items.map((i: any) => ({
    ...i,
    photoCount: photoMap[i.id] ?? 0,
    commentCount: commentMap[i.id] ?? 0,
  }))
})
