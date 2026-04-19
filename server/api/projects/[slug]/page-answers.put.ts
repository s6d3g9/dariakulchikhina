import {
  upsertPageAnswers,
  PageAnswersSchema,
} from '~/server/modules/projects/page-answers.service'

/**
 * PUT /api/projects/[slug]/page-answers — upsert selections, text,
 * and number answers. numberAnswers are normalized to non-negative.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  const body = await readValidatedNodeBody(event, PageAnswersSchema)
  return await upsertPageAnswers(slug, body)
})
