import { useDb } from '~/server/db/index'
import { projects, roadmapStages } from '~/server/db/schema'
import { CreateProjectSchema } from '~/shared/types/project'
import { readCustomRoadmapTemplates } from '~/server/utils/roadmap-templates'
import { ROADMAP_TEMPLATES } from '~/shared/types/roadmap-templates'
import { CORE_PAGES } from '~/shared/constants/pages'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateProjectSchema)
  const db = useDb()

  let project: any
  try {
    ;[project] = await db.insert(projects).values({
      slug: body.slug,
      title: body.title,
      pages: CORE_PAGES,
      profile: {},
    }).returning()
  } catch (e: any) {
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') {
      throw createError({
        statusCode: 400,
        statusMessage: `Slug «${body.slug}» уже занят — выберите другой`,
        data: { message: `Slug «${body.slug}» уже занят — выберите другой` },
      })
    }
    throw e
  }

  // Create roadmap stages from selected template
  if (body.roadmapTemplateKey) {
    const customTemplates = await readCustomRoadmapTemplates()
    const allTemplates = [...ROADMAP_TEMPLATES, ...customTemplates]
    const template = allTemplates.find(t => t.key === body.roadmapTemplateKey)
    if (template && template.stages.length > 0) {
      await db.insert(roadmapStages).values(
        template.stages.map((stage, idx) => ({
          projectId: project.id,
          stageKey: stage.stageKey,
          title: stage.title,
          description: stage.description ?? null,
          notes: stage.notes ?? null,
          status: 'pending',
          sortOrder: idx,
        }))
      )
    }
  }

  return project
})
