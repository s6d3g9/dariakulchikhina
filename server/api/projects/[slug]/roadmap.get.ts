import { useDb } from '~/server/db/index'
import { roadmapStages, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

const DEFAULT_ROADMAP = [
  { stageKey: 'brief', title: 'Бриф и замеры' },
  { stageKey: 'concept', title: 'Концепция и планировка' },
  { stageKey: 'design', title: 'Дизайн-проект' },
  { stageKey: 'estimate', title: 'Смета и закупки' },
  { stageKey: 'implementation', title: 'Реализация' },
  { stageKey: 'handover', title: 'Сдача объекта' },
]

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const adminS = getAdminSession(event)
  const clientS = getClientSession(event)
  if (!adminS && clientS !== slug)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  let rows = await db
    .select()
    .from(roadmapStages)
    .where(eq(roadmapStages.projectId, project.id))
    .orderBy(roadmapStages.sortOrder)

  if (rows.length === 0) {
    await db.insert(roadmapStages).values(
      DEFAULT_ROADMAP.map((stage, index) => ({
        projectId: project.id,
        stageKey: stage.stageKey,
        title: stage.title,
        description: null,
        status: 'pending',
        dateStart: null,
        dateEnd: null,
        notes: null,
        sortOrder: index,
      }))
    )

    rows = await db
      .select()
      .from(roadmapStages)
      .where(eq(roadmapStages.projectId, project.id))
      .orderBy(roadmapStages.sortOrder)
  }

  return rows
})
