import { useDb } from '~/server/db/index'
import { workStatusItems, projects, roadmapStages, contractors } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'

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

  return items.map((item: any) => ({
    ...item,
    assignedToName: item.contractorId !== id ? (staffMap[item.contractorId] ?? null) : null,
  }))
})
