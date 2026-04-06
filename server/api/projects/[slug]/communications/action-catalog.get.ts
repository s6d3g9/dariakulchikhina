import { desc, eq, isNull, or } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, documents, projectExtraServices, projects, workStatusItems } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { getProjectRelationsSnapshot } from '~/server/utils/project-relations'
import { buildProjectGovernanceCatalogSubjects, buildProjectGovernanceSummary } from '~/server/utils/project-governance'
import { buildHybridCoordinationBrief, buildHybridControlSummary, ensureHybridControl } from '~/shared/utils/project-control'

function formatPeriod(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || ''
}

function buildSubjectSecondary(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ')
}

export default defineEventHandler(async (event) => {
  applyMessengerCors(event)
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const profile = project.profile && typeof project.profile === 'object'
    ? project.profile as Record<string, unknown>
    : {}

  const control = ensureHybridControl(profile.hybridControl, project)
  const summary = buildHybridControlSummary(control)
  const coordination = buildHybridCoordinationBrief(control, { projectSlug: project.slug })
  const relations = await getProjectRelationsSnapshot(project.slug)
  const governanceSummary = await buildProjectGovernanceSummary(project, { control, relations })

  const [workItems, projectDocuments, extraServices] = await Promise.all([
    db
      .select({
        id: workStatusItems.id,
        title: workStatusItems.title,
        status: workStatusItems.status,
        workType: workStatusItems.workType,
        contractorId: workStatusItems.contractorId,
        contractorName: contractors.name,
        dateStart: workStatusItems.dateStart,
        dateEnd: workStatusItems.dateEnd,
        notes: workStatusItems.notes,
      })
      .from(workStatusItems)
      .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
      .where(eq(workStatusItems.projectId, project.id))
      .orderBy(workStatusItems.sortOrder),
    db
      .select({
        id: documents.id,
        projectId: documents.projectId,
        category: documents.category,
        title: documents.title,
        filename: documents.filename,
        url: documents.url,
        notes: documents.notes,
        templateKey: documents.templateKey,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(or(eq(documents.projectId, project.id), isNull(documents.projectId)))
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        id: projectExtraServices.id,
        title: projectExtraServices.title,
        status: projectExtraServices.status,
        requestedBy: projectExtraServices.requestedBy,
        totalPrice: projectExtraServices.totalPrice,
        description: projectExtraServices.description,
      })
      .from(projectExtraServices)
      .where(eq(projectExtraServices.projectId, project.id))
      .orderBy(desc(projectExtraServices.createdAt)),
  ])

  const phases = control.phases.map((phase) => ({
    id: phase.id,
    phaseKey: phase.phaseKey,
    title: phase.title,
    status: phase.status,
    percent: phase.percent,
    startDate: phase.startDate || '',
    endDate: phase.endDate || '',
    deliverable: phase.deliverable || '',
    secondary: buildSubjectSecondary([
      phase.status,
      phase.percent ? `${phase.percent}%` : '',
      formatPeriod(phase.startDate, phase.endDate),
    ]),
  }))

  const sprints = control.sprints.map((sprint) => {
    const linkedPhase = control.phases.find((phase) => phase.phaseKey === sprint.linkedPhaseKey)
    return {
      id: sprint.id,
      name: sprint.name,
      linkedPhaseKey: sprint.linkedPhaseKey || '',
      linkedPhaseTitle: linkedPhase?.title || '',
      status: sprint.status,
      startDate: sprint.startDate || '',
      endDate: sprint.endDate || '',
      goal: sprint.goal || '',
      taskCount: sprint.tasks.length,
      secondary: buildSubjectSecondary([
        linkedPhase?.title,
        sprint.status,
        formatPeriod(sprint.startDate, sprint.endDate),
      ]),
    }
  })

  const sprintTasks = control.sprints.flatMap((sprint) => {
    const linkedPhase = control.phases.find((phase) => phase.phaseKey === sprint.linkedPhaseKey)
    return sprint.tasks.map((task) => ({
      id: `hybrid:${task.id}`,
      source: 'hybrid',
      sourceLabel: 'Контроль проекта',
      title: task.title,
      status: task.status,
      assignee: task.assignee || '',
      phaseKey: sprint.linkedPhaseKey || '',
      phaseTitle: linkedPhase?.title || '',
      sprintId: sprint.id,
      sprintName: sprint.name,
      rangeStart: sprint.startDate || '',
      rangeEnd: sprint.endDate || '',
      notes: task.notes || '',
      secondary: buildSubjectSecondary([
        linkedPhase?.title,
        sprint.name,
        task.status,
        formatPeriod(sprint.startDate, sprint.endDate),
      ]),
    }))
  })

  const platformTasks = workItems.map((item) => ({
    id: `work:${item.id}`,
    source: 'work-status',
    sourceLabel: 'Статус работ',
    title: item.title,
    status: item.status,
    assignee: item.contractorName || '',
    phaseKey: '',
    phaseTitle: '',
    sprintId: '',
    sprintName: '',
    rangeStart: item.dateStart || '',
    rangeEnd: item.dateEnd || '',
    notes: item.notes || '',
    workType: item.workType || '',
    secondary: buildSubjectSecondary([
      item.contractorName,
      item.status,
      formatPeriod(item.dateStart, item.dateEnd),
    ]),
  }))

  const subjects = buildProjectGovernanceCatalogSubjects(governanceSummary)

  const documentsLibrary = projectDocuments.map((document) => ({
    id: `document:${document.id}`,
    kind: 'document',
    scope: document.projectId ? 'project' : 'library',
    title: document.title,
    category: document.category,
    url: document.url || '',
    filename: document.filename || '',
    templateKey: document.templateKey || '',
    secondary: buildSubjectSecondary([
      document.projectId ? 'Документ проекта' : 'Библиотека документов',
      document.category,
      document.filename,
    ]),
  }))

  const objects = [
    ...phases.map((phase) => ({
      id: `phase:${phase.phaseKey}`,
      kind: 'phase',
      label: phase.title,
      secondary: phase.secondary,
    })),
    ...sprints.map((sprint) => ({
      id: `sprint:${sprint.id}`,
      kind: 'sprint',
      label: sprint.name,
      secondary: sprint.secondary,
    })),
    ...platformTasks.map((task) => ({
      id: `object:${task.id}`,
      kind: 'task',
      label: task.title,
      secondary: task.secondary,
    })),
    ...sprintTasks.map((task) => ({
      id: `object:${task.id}`,
      kind: 'task',
      label: task.title,
      secondary: task.secondary,
    })),
    ...documentsLibrary.map((document) => ({
      id: `object:${document.id}`,
      kind: 'document',
      label: document.title,
      secondary: document.secondary,
    })),
    ...extraServices.map((service) => ({
      id: `service:${service.id}`,
      kind: 'service',
      label: service.title,
      secondary: buildSubjectSecondary([
        'Доп. услуга',
        service.status,
        service.totalPrice ? `${service.totalPrice} ₽` : '',
      ]),
    })),
  ]

  return {
    project: {
      slug: project.slug,
      title: project.title,
      status: project.status,
      projectType: project.projectType || '',
      revision: governanceSummary.revision,
      pages: project.pages || [],
      activePhaseKey: summary.activePhase?.phaseKey || '',
      activePhaseTitle: summary.activePhase?.title || '',
      activeSprintId: summary.activeSprint?.id || '',
      activeSprintName: summary.activeSprint?.name || '',
      taskTotal: platformTasks.length + sprintTasks.length,
      documentCount: documentsLibrary.length,
      subjectCount: subjects.length,
    },
    coordination,
    phases,
    sprints,
    tasks: [...platformTasks, ...sprintTasks],
    subjects,
    objects,
    documents: documentsLibrary,
    extraServices: extraServices.map((service) => ({
      id: `service:${service.id}`,
      title: service.title,
      status: service.status,
      requestedBy: service.requestedBy,
      totalPrice: service.totalPrice || 0,
      description: service.description || '',
    })),
  }
})