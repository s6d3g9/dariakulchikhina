import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const ClientLoginSchema = z.object({
  projectSlug: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientLoginSchema)
  const db = useDb()
  const [project] = await db.select().from(projects).where(eq(projects.slug, body.projectSlug)).limit(1)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  setClientSession(event, project.slug)
  return { ok: true, slug: project.slug, title: project.title }
})
