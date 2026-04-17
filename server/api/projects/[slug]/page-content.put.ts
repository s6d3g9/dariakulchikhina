import {
  upsertPageContent,
  UpsertPageContentSchema,
} from '~/server/modules/projects/project-pages.service'

/**
 * PUT /api/projects/[slug]/page-content — upsert. Content is sanitized
 * against prototype-pollution keys in the service.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, UpsertPageContentSchema)
  return await upsertPageContent(slug, body)
})
