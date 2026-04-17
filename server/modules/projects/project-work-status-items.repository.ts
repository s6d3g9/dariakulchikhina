import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import {
  projects,
  users,
  workStatusItemComments,
  workStatusItemPhotos,
  workStatusItems,
} from '~/server/db/schema'

export async function findProjectId(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function findWorkItemInProject(itemId: number, projectId: number) {
  const db = useDb()
  const [item] = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, itemId), eq(workStatusItems.projectId, projectId)))
    .limit(1)
  return item ?? null
}

export async function listItemComments(itemId: number) {
  const db = useDb()
  return db
    .select()
    .from(workStatusItemComments)
    .where(eq(workStatusItemComments.itemId, itemId))
    .orderBy(workStatusItemComments.createdAt)
}

export async function findUserName(userId: number): Promise<string | null> {
  const db = useDb()
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return user?.name ?? null
}

export async function insertItemComment(values: { itemId: number; authorType: string; authorName: string; text: string }) {
  const db = useDb()
  const [comment] = await db
    .insert(workStatusItemComments)
    .values(values)
    .returning()
  return comment
}

export async function listItemPhotos(itemId: number) {
  const db = useDb()
  return db
    .select()
    .from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
}
