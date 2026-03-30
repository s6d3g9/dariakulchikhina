import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { ensureHybridControl, applyHybridCallInsightToSprint, buildHybridControlSummary } from '~/shared/utils/project-control'

const BodySchema = z.object({
  targetSprintId: z.string().trim().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  const insightId = getRouterParam(event, 'insightId')
  if (!slug || !insightId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and insightId are required' })
  }

  const body = await readValidatedBody(event, BodySchema.parse)
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      pages: projects.pages,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const profile = project.profile && typeof project.profile === 'object' ? project.profile : {}
  const hybridControl = ensureHybridControl(profile.hybridControl, project)

  let result: ReturnType<typeof applyHybridCallInsightToSprint>
  try {
    result = applyHybridCallInsightToSprint(hybridControl, insightId, body)
  } catch (error) {
    if (error instanceof Error && error.message === 'CALL_INSIGHT_NOT_FOUND') {
      throw createError({ statusCode: 404, statusMessage: 'Инсайт звонка не найден' })
    }
    throw error
  }

  await db.update(projects)
    .set({
      profile: {
        ...profile,
        hybridControl: result.control,
      } as any,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))

  return {
    hybridControl: result.control,
    insight: result.insight,
    sprint: result.sprint,
    summary: buildHybridControlSummary(result.control),
    meta: {
      createdTaskCount: result.createdTaskCount,
      createdSprint: result.createdSprint,
    },
  }
})