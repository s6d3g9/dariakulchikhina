import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { PinLoginSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, PinLoginSchema)
  if (!body.projectSlug) throw createError({ statusCode: 400, statusMessage: 'projectSlug required' })
  const db = useDb()
  const [project] = await db.select().from(projects).where(eq(projects.slug, body.projectSlug)).limit(1)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!project.clientPin || project.clientPin !== body.pin)
    throw createError({ statusCode: 401, statusMessage: 'Wrong PIN' })
  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
})
