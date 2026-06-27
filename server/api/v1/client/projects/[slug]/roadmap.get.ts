import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectRoadmapDto } from '~/server/utils/api-v1-client-roadmap'
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

  const data = createApiV1ClientProjectRoadmapDto({
    ...project,
    profile: (project.profile || {}) as Record<string, unknown>,
  })
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      project: data.project,
      summary: data.summary,
      phases: data.phases.map(phase => [phase.id, phase.status, phase.percent, phase.gatesDone]),
      sprints: data.sprints.map(sprint => [sprint.id, sprint.status, sprint.progressPercent, sprint.overdue]),
      checkpoints: data.checkpoints.map(checkpoint => [checkpoint.id, checkpoint.status]),
      reports: data.reports.map(report => [report.id, report.occurredAt, report.tone]),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-roadmap:${revisionHash}`,
  })
})
