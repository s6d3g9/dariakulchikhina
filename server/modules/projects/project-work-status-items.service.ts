import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  workStatusItemComments,
  workStatusItemPhotos,
  workStatusItems,
  projects,
  users,
} from '~/server/db/schema'

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
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404 })

  const [item] = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(
      and(eq(workStatusItems.id, itemId), eq(workStatusItems.projectId, project.id)),
    )
    .limit(1)
  if (!item) throw createError({ statusCode: 404 })

  return item.id
}

export async function listWorkStatusItemComments(slug: string, itemId: number) {
  await assertItemInProject(slug, itemId)
  const db = useDb()
  return db
    .select()
    .from(workStatusItemComments)
    .where(eq(workStatusItemComments.itemId, itemId))
    .orderBy(workStatusItemComments.createdAt)
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
  const db = useDb()

  let authorName = 'Дизайнер'
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1)
  if (user?.name) authorName = user.name

  const [comment] = await db
    .insert(workStatusItemComments)
    .values({
      itemId,
      authorType: 'admin',
      authorName,
      text: body.text,
    })
    .returning()
  return comment
}

export async function listWorkStatusItemPhotos(slug: string, itemId: number) {
  await assertItemInProject(slug, itemId)
  const db = useDb()
  return db
    .select()
    .from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
}
