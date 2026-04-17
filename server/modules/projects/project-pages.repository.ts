import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'

export async function findProjectIdBySlug(slug: string): Promise<number | null> {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project?.id ?? null
}

export async function listPageContent(projectId: number) {
  const db = useDb()
  return db.select().from(pageContent).where(eq(pageContent.projectId, projectId))
}

export async function findPageContent(projectId: number, pageSlug: string) {
  const db = useDb()
  const [row] = await db
    .select()
    .from(pageContent)
    .where(and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, pageSlug)))
    .limit(1)
  return row ?? null
}

export async function findPageContentId(projectId: number, pageSlug: string) {
  const db = useDb()
  const [row] = await db
    .select({ id: pageContent.id })
    .from(pageContent)
    .where(and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, pageSlug)))
    .limit(1)
  return row ?? null
}

export async function insertPageContent(values: { projectId: number; pageSlug: string; content: Record<string, unknown> }) {
  const db = useDb()
  const [inserted] = await db
    .insert(pageContent)
    .values(values)
    .returning()
  return inserted
}

export async function updatePageContent(projectId: number, pageSlug: string, content: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(pageContent)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, pageSlug)))
    .returning()
  return updated
}
