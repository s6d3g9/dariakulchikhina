import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { CreateProjectSchema } from '~/shared/types/project'
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

  return project
})
