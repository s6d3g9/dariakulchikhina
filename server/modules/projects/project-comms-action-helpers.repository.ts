import { and, eq, sql } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import { contractors, projectExtraServices, projects, workStatusItems } from '~/server/db/schema'

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      pages: projects.pages,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function findContractorById(id: number) {
  const db = useDb()
  const [contractor] = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)
  return contractor ?? null
}

export async function findMaxWorkStatusSortOrder(projectId: number) {
  const db = useDb()
  const [row] = await db
    .select({ maxSort: sql<number>`coalesce(max(${workStatusItems.sortOrder}), -1)` })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, projectId))
  return Number(row?.maxSort ?? -1)
}

export async function insertWorkStatusItem(values: Record<string, unknown>) {
  const db = useDb()
  const [item] = await db
    .insert(workStatusItems)
    .values(values as typeof workStatusItems.$inferInsert)
    .returning({
      id: workStatusItems.id,
      title: workStatusItems.title,
    })
  return item
}

export async function findWorkStatusItem(id: number, projectId: number) {
  const db = useDb()
  const [item] = await db
    .select()
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, id), eq(workStatusItems.projectId, projectId)))
    .limit(1)
  return item ?? null
}

export async function updateWorkStatusItem(id: number, projectId: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(workStatusItems)
    .set(updates as Record<string, unknown>)
    .where(and(eq(workStatusItems.id, id), eq(workStatusItems.projectId, projectId)))
    .returning({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
    })
  return updated ?? null
}

export async function updateProjectControl(slug: string, profile: Record<string, unknown>) {
  const db = useDb()
  await db
    .update(projects)
    .set({
      profile: profile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
}

export async function updateProjectStatus(slug: string, status: string) {
  const db = useDb()
  await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
}

export async function insertExtraService(projectId: number, values: Record<string, unknown>) {
  const db = useDb()
  const [service] = await db
    .insert(projectExtraServices)
    .values({ projectId, ...values } as typeof projectExtraServices.$inferInsert)
    .returning({
      id: projectExtraServices.id,
      title: projectExtraServices.title,
    })
  return service
}
