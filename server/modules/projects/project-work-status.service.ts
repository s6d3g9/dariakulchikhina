import { and, eq, inArray } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { workStatusItems } from '~/server/db/schema'
import { getProjectBySlug } from '~/server/modules/projects/projects.service'

export type ProjectWorkStatusInputItem = {
  id?: number
  contractorId?: number | null
  title: string
  workType?: string | null
  status?: string
  dateStart?: string | null
  dateEnd?: string | null
  budget?: string | null
  notes?: string | null
  sortOrder?: number
}

export async function replaceProjectWorkStatusBySlug(slug: string, items: ProjectWorkStatusInputItem[]) {
  const db = useDb()
  const project = await getProjectBySlug(slug)
  if (!project) {
    return null
  }

  const incomingIds = items
    .map(item => item.id)
    .filter((id): id is number => typeof id === 'number')

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: workStatusItems.id })
      .from(workStatusItems)
      .where(eq(workStatusItems.projectId, project.id))

    const toDelete = existing
      .map(row => row.id)
      .filter(id => !incomingIds.includes(id))

    if (toDelete.length > 0) {
      await tx.delete(workStatusItems).where(inArray(workStatusItems.id, toDelete))
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const values = {
        projectId: project.id,
        contractorId: item.contractorId ?? null,
        title: item.title,
        workType: item.workType ?? null,
        status: item.status ?? 'pending',
        dateStart: item.dateStart ?? null,
        dateEnd: item.dateEnd ?? null,
        budget: item.budget ?? null,
        notes: item.notes ?? null,
        sortOrder: item.sortOrder ?? index,
      }

      if (typeof item.id === 'number') {
        await tx
          .update(workStatusItems)
          .set(values)
          .where(and(eq(workStatusItems.id, item.id), eq(workStatusItems.projectId, project.id)))
      } else {
        await tx.insert(workStatusItems).values(values)
      }
    }
  })

  return db
    .select()
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, project.id))
    .orderBy(workStatusItems.sortOrder)
}