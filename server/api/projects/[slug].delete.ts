import { deleteProjectBySlug } from '~/server/modules/projects/project-mutations.service'

/**
 * DELETE /api/projects/[slug] — deletes the project and walks related
 * upload/photo tables to unlink files on disk before the FK cascade
 * removes the rows.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const ok = await deleteProjectBySlug(slug)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return { ok: true }
})
