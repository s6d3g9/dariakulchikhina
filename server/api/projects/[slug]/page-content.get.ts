import { getPageContent } from '~/server/modules/projects/project-pages.service'

/**
 * GET /api/projects/[slug]/page-content?page=<slug>
 * Without `page` returns all page-content rows for the project.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  const q = safeGetQuery(event)
  return await getPageContent(slug, (q.page as string) || undefined)
})
