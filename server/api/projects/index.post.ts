import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { CreateProjectSchema } from '~/shared/types/project'
import { findPreset } from '~/shared/constants/presets'
import { CORE_PAGES } from '~/shared/constants/pages'

const projectReturning = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  status: projects.status,
  projectType: projects.projectType,
  userId: projects.userId,
  pages: projects.pages,
  profile: projects.profile,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateProjectSchema)
  const db = useDb()

  const preset = body.projectType ? findPreset(body.projectType) : undefined
  const pages = preset ? [...preset.pages] : [...CORE_PAGES]
  const initialProfile = preset ? { ...preset.defaultProfile } : {}

  let project: any
  try {
    ;[project] = await db.insert(projects).values({
      slug: body.slug,
      title: body.title,
      projectType: body.projectType ?? 'apartment',
      pages,
      profile: initialProfile,
    }).returning(projectReturning)
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

  return project
})
