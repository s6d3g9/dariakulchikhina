import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { buildProjectCommunicationBootstrap } from '~/server/utils/communications'
import { ProjectCallInsightIngestSchema } from '~/shared/types/project'
import { buildHybridControlSummary, ensureHybridControl, ingestHybridControlCallInsight } from '~/shared/utils/project-control'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const body = await readValidatedBody(event, ProjectCallInsightIngestSchema.parse)
  const bootstrap = await buildProjectCommunicationBootstrap(event, slug)

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
  const result = ingestHybridControlCallInsight(hybridControl, {
    ...body,
    actorRole: body.actorRole || bootstrap.actor.role,
    actorName: body.actorName || bootstrap.actor.displayName,
    roomExternalRef: body.roomExternalRef || bootstrap.roomExternalRef,
  })

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
    insight: result.insight,
    hybridControl: result.control,
    summary: buildHybridControlSummary(result.control),
    meta: {
      blockerCountAdded: result.blockerCountAdded,
      checkpointCreated: result.checkpointCreated,
      actor: bootstrap.actor,
    },
  }
})