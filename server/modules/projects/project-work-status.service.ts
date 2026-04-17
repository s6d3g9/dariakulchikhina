import { useDb } from '~/server/db'
import * as repo from '~/server/modules/projects/project-work-status.repository'
import * as projectsRepo from '~/server/modules/projects/projects.repository'

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
  const project = await projectsRepo.findProjectIdBySlug(slug)
  if (!project) {
    return null
  }

  const incomingIds = items
    .map(item => item.id)
    .filter((id): id is number => typeof id === 'number')

  await db.transaction(async (tx) => {
    const existing = await repo.listWorkItemIdsByProject(project.id)

    const toDelete = existing
      .map(row => row.id)
      .filter(id => !incomingIds.includes(id))

    await repo.deleteWorkItemsByIds(tx, toDelete)

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
        await repo.updateWorkItem(tx, item.id, project.id, values)
      } else {
        await repo.insertWorkItem(tx, values)
      }
    }
  })

  return repo.listWorkItemsByProject(project.id)
}
