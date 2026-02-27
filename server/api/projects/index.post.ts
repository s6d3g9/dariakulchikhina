import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { CreateProjectSchema } from '~/shared/types/project'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateProjectSchema)
  const db = useDb()
  const [project] = await db.insert(projects).values({
    slug: body.slug,
    title: body.title,
    clientPin: body.clientPin,
    pages: [],
    profile: {},
  }).returning()
  return project
})
