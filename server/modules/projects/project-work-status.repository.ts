import { and, eq, inArray } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import { workStatusItems } from '~/server/db/schema'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Run a callback inside a DB transaction. Keeps the `useDb()` import
 * localized to this repository file — services should not import the
 * DB directly (see docs/architecture-v5/18-repository-layer.md).
 */
export async function runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = useDb()
  return db.transaction(fn)
}

export async function listWorkItemIdsByProject(projectId: number) {
  const db = useDb()
  return db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, projectId))
}

export async function deleteWorkItemsByIds(tx: any, ids: number[]) {
  if (!ids.length) return
  await tx.delete(workStatusItems).where(inArray(workStatusItems.id, ids))
}

export async function insertWorkItem(tx: any, values: Record<string, unknown>) {
  await tx.insert(workStatusItems).values(values)
}

export async function updateWorkItem(tx: any, id: number, projectId: number, values: Record<string, unknown>) {
  await tx
    .update(workStatusItems)
    .set(values)
    .where(and(eq(workStatusItems.id, id), eq(workStatusItems.projectId, projectId)))
}

export async function listWorkItemsByProject(projectId: number) {
  const db = useDb()
  return db
    .select()
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, projectId))
    .orderBy(workStatusItems.sortOrder)
}
