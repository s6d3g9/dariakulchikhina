import { createHash } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projectContractors, projects, workStatusItems } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1TasksSubjectsDto,
  type ApiV1TaskContractorRow,
  type ApiV1TaskLegacyWorkItemRow,
  type ApiV1TaskProjectContractorRow,
} from '~/server/utils/api-v1-tasks'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = safeGetQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const projectSlug = typeof query.projectSlug === 'string' ? query.projectSlug : ''
  const subjectKind = typeof query.subjectKind === 'string' ? query.subjectKind : ''
  const limit = Number(query.limit || 100)
  const offset = Number(query.offset || 0)

  const db = useDb()
  const [contractorRows, projectContractorRows, workItemRows] = await Promise.all([
    db
      .select({
        id: contractors.id,
        name: contractors.name,
        companyName: contractors.companyName,
        contactPerson: contractors.contactPerson,
        phone: contractors.phone,
        email: contractors.email,
        messenger: contractors.messenger,
        messengerNick: contractors.messengerNick,
        workTypes: contractors.workTypes,
        roleTypes: contractors.roleTypes,
        contractorType: contractors.contractorType,
        parentId: contractors.parentId,
        createdAt: contractors.createdAt,
      })
      .from(contractors)
      .orderBy(asc(contractors.name))
      .limit(1000),
    db
      .select({
        id: projectContractors.id,
        contractorId: projectContractors.contractorId,
        project: {
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          status: projects.status,
          projectType: projects.projectType,
          updatedAt: projects.updatedAt,
        },
      })
      .from(projectContractors)
      .innerJoin(projects, eq(projects.id, projectContractors.projectId))
      .orderBy(asc(projects.title))
      .limit(3000),
    db
      .select({
        id: workStatusItems.id,
        project: {
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          status: projects.status,
          projectType: projects.projectType,
          updatedAt: projects.updatedAt,
        },
        contractorId: workStatusItems.contractorId,
        title: workStatusItems.title,
        workType: workStatusItems.workType,
        status: workStatusItems.status,
        dateStart: workStatusItems.dateStart,
        dateEnd: workStatusItems.dateEnd,
        sortOrder: workStatusItems.sortOrder,
      })
      .from(workStatusItems)
      .innerJoin(projects, eq(projects.id, workStatusItems.projectId))
      .orderBy(asc(projects.title), asc(workStatusItems.sortOrder))
      .limit(5000),
  ])

  const data = createApiV1TasksSubjectsDto({
    contractors: contractorRows as ApiV1TaskContractorRow[],
    projectContractors: projectContractorRows as ApiV1TaskProjectContractorRow[],
    workItems: workItemRows as ApiV1TaskLegacyWorkItemRow[],
    filters: {
      q,
      projectSlug,
      subjectKind,
      limit,
      offset,
    },
  })

  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      summary: data.summary,
      filters: data.filters,
      items: data.items.map(item => ({
        id: item.id,
        source: item.source,
        projects: item.projectRefs.map(project => project.id),
        tasks: item.taskSummary,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `tasks-subjects:${revisionHash}`,
  })
})
