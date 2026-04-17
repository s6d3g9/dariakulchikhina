import { and, desc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import { documents, projectExtraServices, projects } from '~/server/db/schema'

export async function findProjectIdBySlug(slug: string): Promise<number | null> {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project?.id ?? null
}

export async function listExtraServices(projectId: number) {
  const db = useDb()
  return db
    .select()
    .from(projectExtraServices)
    .where(eq(projectExtraServices.projectId, projectId))
    .orderBy(desc(projectExtraServices.createdAt))
}

export async function findExtraService(id: number, projectId: number) {
  const db = useDb()
  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(eq(projectExtraServices.id, id), eq(projectExtraServices.projectId, projectId)))
    .limit(1)
  return service ?? null
}

export async function insertExtraService(values: Record<string, unknown>) {
  const db = useDb()
  const [service] = await db
    .insert(projectExtraServices)
    .values(values as typeof projectExtraServices.$inferInsert)
    .returning()
  return service
}

export async function updateExtraService(id: number, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(projectExtraServices)
    .set(updates as Record<string, unknown>)
    .where(eq(projectExtraServices.id, id))
    .returning()
  return updated
}

export async function deleteExtraService(id: number) {
  const db = useDb()
  await db.delete(projectExtraServices).where(eq(projectExtraServices.id, id))
}

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function findExtraServiceByIdAndProject(id: number, projectId: number) {
  return findExtraService(id, projectId)
}

export async function insertDocument(values: Record<string, unknown>) {
  const db = useDb()
  const [doc] = await db
    .insert(documents)
    .values(values as typeof documents.$inferInsert)
    .returning()
  return doc
}

export async function updateExtraServiceDocIds(id: number, contractDocId: number, invoiceDocId: number) {
  const db = useDb()
  const [updated] = await db
    .update(projectExtraServices)
    .set({
      contractDocId,
      invoiceDocId,
      status: 'contract_sent',
      updatedAt: new Date(),
    })
    .where(eq(projectExtraServices.id, id))
    .returning()
  return updated
}
