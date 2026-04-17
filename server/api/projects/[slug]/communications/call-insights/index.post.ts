import {
  ingestCallInsight,
  ProjectCallInsightIngestSchema,
} from '~/server/modules/projects/project-communications-api.service'

/**
 * POST /api/projects/[slug]/communications/call-insights — ingest a
 * new call insight and merge it into the project's hybrid control.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }
  const body = await readValidatedBody(event, ProjectCallInsightIngestSchema.parse)
  return await ingestCallInsight(event, slug, body)
})
