import { z } from 'zod'
import { desc, eq, isNull, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db/index'
import {
  contractors,
  documents,
  projectExtraServices,
  projects,
  workStatusItems,
} from '~/server/db/schema'
import { getProjectRelationsSnapshot } from '~/server/modules/projects/project-relations.service'
import {
  buildProjectGovernanceCatalogSubjects,
  buildProjectGovernanceSummary,
} from '~/server/modules/projects/project-governance.service'
import { buildProjectCommunicationBootstrap } from '~/server/modules/communications/communications-bootstrap.service'
import {
  buildHybridCoordinationBrief,
  buildHybridControlSummary,
  ensureHybridControl,
  ingestHybridControlCallInsight,
  applyHybridCallInsightToSprint,
} from '~/shared/utils/project-control'
import { ProjectCallInsightIngestSchema } from '~/shared/types/project'

// ── Schemas ────────────────────────────────────────────────────────────

export const DispatchSchema = z.object({
  memberId: z.string().min(1),
  message: z.string().min(1),
})
export type DispatchInput = z.infer<typeof DispatchSchema>

export { ProjectCallInsightIngestSchema }
export type CallInsightIngestInput = z.infer<typeof ProjectCallInsightIngestSchema>

export const ApplyCallInsightSchema = z.object({
  targetSprintId: z.string().trim().min(1).optional(),
})
export type ApplyCallInsightInput = z.infer<typeof ApplyCallInsightSchema>

// ── Helpers ───────────────────────────────────────────────────────────

function formatPeriod(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) return `${startDate} - ${endDate}`
  return startDate || endDate || ''
}

function buildSubjectSecondary(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ')
}

// ── Action catalog ────────────────────────────────────────────────────

/**
 * Builds the full action catalog payload for the communications panel:
 * phases, sprints, unified tasks (hybrid + work-status), subjects,
 * linked objects (tasks/documents/services), and the flattened
 * documents library. All in one payload so the frontend can populate
 * every action selector without extra round-trips.
 */
export async function buildProjectActionCatalog(slug: string) {
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
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const profile =
    project.profile && typeof project.profile === 'object'
      ? (project.profile as Record<string, unknown>)
      : {}

  const control = ensureHybridControl(profile.hybridControl, project)
  const summary = buildHybridControlSummary(control)
  const coordination = buildHybridCoordinationBrief(control, { projectSlug: project.slug })
  const relations = await getProjectRelationsSnapshot(project.slug)
  const governanceSummary = await buildProjectGovernanceSummary(project, {
    control,
    relations,
  })

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
    const linkedPhase = control.phases.find(
      (phase) => phase.phaseKey === sprint.linkedPhaseKey,
    )
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
    const linkedPhase = control.phases.find(
      (phase) => phase.phaseKey === sprint.linkedPhaseKey,
    )
    return sprint.tasks.map((task) => ({
      id: `hybrid:${task.id}`,
      source: 'hybrid' as const,
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
    source: 'work-status' as const,
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

  const documentsLibrary = projectDocuments.map((doc) => ({
    id: `document:${doc.id}`,
    kind: 'document' as const,
    scope: doc.projectId ? 'project' : 'library',
    title: doc.title,
    category: doc.category,
    url: doc.url || '',
    filename: doc.filename || '',
    templateKey: doc.templateKey || '',
    secondary: buildSubjectSecondary([
      doc.projectId ? 'Документ проекта' : 'Библиотека документов',
      doc.category,
      doc.filename,
    ]),
  }))

  const objects = [
    ...phases.map((phase) => ({
      id: `phase:${phase.phaseKey}`,
      kind: 'phase' as const,
      label: phase.title,
      secondary: phase.secondary,
    })),
    ...sprints.map((sprint) => ({
      id: `sprint:${sprint.id}`,
      kind: 'sprint' as const,
      label: sprint.name,
      secondary: sprint.secondary,
    })),
    ...platformTasks.map((task) => ({
      id: `object:${task.id}`,
      kind: 'task' as const,
      label: task.title,
      secondary: task.secondary,
    })),
    ...sprintTasks.map((task) => ({
      id: `object:${task.id}`,
      kind: 'task' as const,
      label: task.title,
      secondary: task.secondary,
    })),
    ...documentsLibrary.map((doc) => ({
      id: `object:${doc.id}`,
      kind: 'document' as const,
      label: doc.title,
      secondary: doc.secondary,
    })),
    ...extraServices.map((service) => ({
      id: `service:${service.id}`,
      kind: 'service' as const,
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
}

// ── Dispatch ──────────────────────────────────────────────────────────

/**
 * Dispatch a manual message to a team member. Currently logs-only:
 * integration gateways (LiveKit/Telegram/SMTP) are a future concern.
 * Appends the log entry to `profile.hybridControl.communicationLog`.
 */
export async function dispatchProjectMessage(slug: string, body: DispatchInput) {
  const db = useDb()
  const [row] = await db
    .select({ profile: projects.profile })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!row) throw createError({ statusCode: 404, message: 'Project not found' })

  const profile = (row.profile as Record<string, unknown>) ?? {}
  const hybridControl = (profile.hybridControl as Record<string, unknown> | undefined) ?? {}
  const team = (hybridControl.team as Array<Record<string, unknown>>) || []

  const member = team.find((m) => m.id === body.memberId)
  if (!member) {
    throw createError({
      statusCode: 404,
      message: 'Team member not found in project',
    })
  }

  const notifyBy = (member.notifyBy as string) || 'manual'

  // TODO: Actual integration gateway calls go here (LiveKit / Telegram / SMTP)
  console.log(
    `[DISPATCH] Sending message to ${member.name} (${member.contact}) via ${notifyBy}: ${body.message}`,
  )

  const logEntry = {
    id: crypto.randomUUID(),
    memberId: member.id,
    channel: notifyBy,
    message: body.message,
    status: 'delivered',
    dispatchedAt: new Date().toISOString(),
  }

  const nextHybridControl = {
    ...hybridControl,
    communicationLog: [
      ...((hybridControl.communicationLog as unknown[]) || []),
      logEntry,
    ],
  }
  const nextProfile = { ...profile, hybridControl: nextHybridControl }

  await db
    .update(projects)
    .set({ profile: nextProfile as unknown as Record<string, string> })
    .where(eq(projects.slug, slug))

  return {
    success: true as const,
    channel: notifyBy,
    dispatchedTo: member.name,
    messageSent: body.message,
  }
}

// ── Call insights ─────────────────────────────────────────────────────

/**
 * Ingest a new call insight into the project's hybrid control.
 * `event` is needed to build the communication bootstrap (actor + room
 * defaults) before merging the insight.
 */
export async function ingestCallInsight(
  event: H3Event,
  slug: string,
  body: CallInsightIngestInput,
) {
  const bootstrap = await buildProjectCommunicationBootstrap(event, slug)
  const db = useDb()

  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      pages: projects.pages,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const profile =
    project.profile && typeof project.profile === 'object'
      ? (project.profile as Record<string, unknown>)
      : {}
  const hybridControl = ensureHybridControl(profile.hybridControl, project)
  const result = ingestHybridControlCallInsight(hybridControl, {
    ...body,
    actorRole: body.actorRole || bootstrap.actor.role,
    actorName: body.actorName || bootstrap.actor.displayName,
    roomExternalRef: body.roomExternalRef || bootstrap.roomExternalRef,
  })

  await db
    .update(projects)
    .set({
      profile: {
        ...profile,
        hybridControl: result.control,
      } as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))

  return {
    insight: result.insight,
    hybridControl: result.control,
    summary: buildHybridControlSummary(result.control),
    meta: {
      blockerCountAdded: result.blockerCountAdded,
      checkpointCreated: result.checkpointCreated,
      actor: bootstrap.actor,
    },
  }
}

/**
 * Apply an existing call insight to a sprint. Delegates the state
 * transition to the shared utility and catches the domain-specific
 * `CALL_INSIGHT_NOT_FOUND` signal to map to 404.
 */
export async function applyCallInsight(
  slug: string,
  insightId: string,
  body: ApplyCallInsightInput,
) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      pages: projects.pages,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const profile =
    project.profile && typeof project.profile === 'object'
      ? (project.profile as Record<string, unknown>)
      : {}
  const hybridControl = ensureHybridControl(profile.hybridControl, project)

  let result: ReturnType<typeof applyHybridCallInsightToSprint>
  try {
    result = applyHybridCallInsightToSprint(hybridControl, insightId, body)
  } catch (error) {
    if (error instanceof Error && error.message === 'CALL_INSIGHT_NOT_FOUND') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Инсайт звонка не найден',
      })
    }
    throw error
  }

  await db
    .update(projects)
    .set({
      profile: {
        ...profile,
        hybridControl: result.control,
      } as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))

  return {
    hybridControl: result.control,
    insight: result.insight,
    sprint: result.sprint,
    summary: buildHybridControlSummary(result.control),
    meta: {
      createdTaskCount: result.createdTaskCount,
      createdSprint: result.createdSprint,
    },
  }
}
