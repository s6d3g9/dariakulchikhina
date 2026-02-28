import { useDb } from '~/server/db/index'
import { workStatusItems, projects, roadmapStages, contractors, workStatusItemPhotos, workStatusItemComments } from '~/server/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()

  // Загружаем мастеров компании (если это подрядчик-компания)
  const staff = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(eq(contractors.parentId, id))

  const staffMap = Object.fromEntries(staff.map((s: any) => [s.id, s.name]))
  const allIds = [id, ...staff.map((s: any) => s.id)]

  const items = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      workType: workStatusItems.workType,
      roadmapStageId: workStatusItems.roadmapStageId,
      roadmapStageTitle: roadmapStages.title,
      status: workStatusItems.status,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      budget: workStatusItems.budget,
      notes: workStatusItems.notes,
      sortOrder: workStatusItems.sortOrder,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      contractorId: workStatusItems.contractorId,
    })
    .from(workStatusItems)
    .innerJoin(projects, eq(workStatusItems.projectId, projects.id))
    .leftJoin(roadmapStages, eq(workStatusItems.roadmapStageId, roadmapStages.id))
    .where(inArray(workStatusItems.contractorId, allIds))
    .orderBy(workStatusItems.sortOrder)

  if (!items.length) return []

  const itemIds = items.map((i: any) => i.id)

  // Счётчики фото и комментариев одним запросом
  const photoCounts = await db
    .select({
      itemId: workStatusItemPhotos.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemPhotos)
    .where(inArray(workStatusItemPhotos.itemId, itemIds))
    .groupBy(workStatusItemPhotos.itemId)

  const commentCounts = await db
    .select({
      itemId: workStatusItemComments.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemComments)
    .where(inArray(workStatusItemComments.itemId, itemIds))
    .groupBy(workStatusItemComments.itemId)

  const photoCountMap = Object.fromEntries(photoCounts.map((r: any) => [r.itemId, r.count]))
  const commentCountMap = Object.fromEntries(commentCounts.map((r: any) => [r.itemId, r.count]))

  return items.map((item: any) => ({
    ...item,
    assignedToName: item.contractorId !== id ? (staffMap[item.contractorId] ?? null) : null,
    photoCount: photoCountMap[item.id] ?? 0,
    commentCount: commentCountMap[item.id] ?? 0,
  }))
})
