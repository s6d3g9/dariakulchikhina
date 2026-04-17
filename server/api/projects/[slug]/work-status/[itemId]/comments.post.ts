import {
  addWorkStatusItemComment,
  CommentSchema,
} from '~/server/modules/projects/project-work-status-items.service'

/**
 * POST /api/projects/[slug]/work-status/[itemId]/comments — add admin
 * comment. Author name resolved from the admin's user row.
 */
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const itemId = Number(getRouterParam(event, 'itemId'))
  const body = await readValidatedNodeBody(event, CommentSchema)
  return await addWorkStatusItemComment(slug, itemId, session.userId, body)
})
