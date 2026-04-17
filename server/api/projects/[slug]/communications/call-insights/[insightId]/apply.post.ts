import {
  applyCallInsight,
  ApplyCallInsightSchema,
} from '~/server/modules/projects/project-communications-api.service'

/**
 * POST /api/projects/[slug]/communications/call-insights/[insightId]/apply
 * Apply a persisted call insight to a sprint. Maps the domain-specific
 * CALL_INSIGHT_NOT_FOUND error to 404 inside the service.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  const insightId = getRouterParam(event, 'insightId')
  if (!slug || !insightId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project slug and insightId are required',
    })
  }
  const body = await readValidatedBody(event, ApplyCallInsightSchema.parse)
  return await applyCallInsight(slug, insightId, body)
})
