import { z } from 'zod'
import * as repo from '~/server/modules/projects/project-work-status-items.repository'

// Admin-side comments and photos on a work-status item. Separate file
// from the legacy `project-work-status.service.ts` bridge which handles
// project-level work-status CRUD.

export const CommentSchema = z.object({
  text: z.string().min(1).max(2000),
})
export type CommentInput = z.infer<typeof CommentSchema>

/**
 * Asserts the work-status item belongs to the given project slug, then
 * returns the item id. Throws 404 either way. Shared guard for the
 * comments/photos sub-endpoints to avoid leaking items across projects.
 */
async function assertItemInProject(slug: string, itemId: number): Promise<number> {
  const project = await repo.findProjectId(slug)
  if (!project) throw createError({ statusCode: 404 })

  const item = await repo.findWorkItemInProject(itemId, project.id)
  if (!item) throw createError({ statusCode: 404 })

  return item.id
}

export async function listWorkStatusItemComments(slug: string, itemId: number) {
  await assertItemInProject(slug, itemId)
  return repo.listItemComments(itemId)
}

/**
 * Add an admin-authored comment to a work-status item. Resolves the
 * admin's display name from the users table; falls back to 'Дизайнер'
 * when the user row is missing a name.
 */
export async function addWorkStatusItemComment(
  slug: string,
  itemId: number,
  adminUserId: number,
  body: CommentInput,
) {
  await assertItemInProject(slug, itemId)

  let authorName = 'Дизайнер'
  const name = await repo.findUserName(adminUserId)
  if (name) authorName = name

  return repo.insertItemComment({
    itemId,
    authorType: 'admin',
    authorName,
    text: body.text,
  })
}

export async function listWorkStatusItemPhotos(slug: string, itemId: number) {
  await assertItemInProject(slug, itemId)
  return repo.listItemPhotos(itemId)
}
