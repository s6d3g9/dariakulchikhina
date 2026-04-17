import { getPageAnswers } from '~/server/modules/projects/project-pages.service'

/**
 * GET /api/projects/[slug]/page-answers?page=<slug>
 * Answers live in page_content table under the `__answers__:<slug>`
 * namespaced row.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  const q = safeGetQuery(event)
  return await getPageAnswers(slug, (q.page as string) || undefined)
})
