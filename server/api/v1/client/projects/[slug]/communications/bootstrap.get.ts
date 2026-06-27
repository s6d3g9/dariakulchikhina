import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { buildProjectCommunicationBootstrap } from '~/server/modules/communications/communications-bootstrap.service'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectCommunicationsBootstrapDto } from '~/server/utils/api-v1-client-communications'
import { createApiV1ClientSafeControl } from '~/server/utils/api-v1-client-control'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const projectProfile = (project.profile || {}) as Record<string, unknown>
  const bootstrap = await buildProjectCommunicationBootstrap(event, slug)
  const controlProject = {
    ...project,
    profile: projectProfile,
  }
  const control = createApiV1ClientSafeControl(projectProfile.hybridControl, controlProject)
  const data = createApiV1ClientProjectCommunicationsBootstrapDto(bootstrap, control)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      actor: data.actor.actorKey,
      room: data.roomExternalRef,
      participants: data.roomParticipants.map(participant => participant.actorKey),
      coordination: data.coordination.summary,
      callInsights: data.callInsights.map(insight => ({
        id: insight.id,
        appliedTaskIds: insight.appliedTaskIds,
        appliedAt: insight.appliedAt,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-communications-bootstrap:${revisionHash}`,
  })
})
