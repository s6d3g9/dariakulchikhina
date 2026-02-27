import { useDb } from '~/server/db/index'
import { pageContent, projects, roadmapStages } from '~/server/db/schema'
import { CreateProjectSchema } from '~/shared/types/project'
import { listRoadmapTemplates } from '~/server/utils/roadmap-templates'

const CORE_PAGES = [
  'materials',
  'tz',
  'profile_customer',
  'profile_contractors',
  'work_status',
  'project_roadmap',
] as const

function defaultPageContent(pageSlug: string) {
  if (pageSlug === 'materials') {
    return {
      tabs: [
        { id: 'materials_main', title: 'основное', heading: 'Материалы проекта', materialType: '', groups: [] },
      ],
    }
  }
  if (pageSlug === 'profile_customer') {
    return {
      tabs: [
        { id: 'client_main', title: 'клиент', heading: 'Профиль клиента', groups: [] },
      ],
    }
  }
  if (pageSlug === 'profile_contractors') {
    return {
      tabs: [
        { id: 'contractors_main', title: 'подрядчики', heading: 'Профиль подрядчиков', groups: [] },
      ],
    }
  }
  if (pageSlug === 'tz') {
    return {
      sections: [
        { id: 's1', title: 'Общие требования', heading: 'Техническое задание', questions: [] },
      ],
    }
  }
  return {}
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateProjectSchema)
  const db = useDb()

  const [project] = await db.insert(projects).values({
    slug: body.slug,
    title: body.title,
    clientPin: body.clientPin,
    pages: [...CORE_PAGES],
    profile: {},
  }).returning()

  const contentPages = CORE_PAGES.filter(page => page !== 'work_status' && page !== 'project_roadmap')
  if (contentPages.length) {
    await db.insert(pageContent).values(
      contentPages.map((pageSlug) => ({
        projectId: project.id,
        pageSlug,
        content: defaultPageContent(pageSlug),
      }))
    )
  }

  const templates = await listRoadmapTemplates()
  const fallbackTemplate = templates[0]
  const selectedTemplate = templates.find(t => t.key === body.roadmapTemplateKey) || fallbackTemplate
  if (selectedTemplate?.stages?.length) {
    await db.insert(roadmapStages).values(
      selectedTemplate.stages.map((stage, idx) => ({
        projectId: project.id,
        stageKey: stage.stageKey,
        title: stage.title,
        description: stage.description || null,
        status: 'pending',
        notes: stage.notes || null,
        sortOrder: idx,
      }))
    )
  }

  return project
})
