import { computed, nextTick, reactive, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  toIsoLocalDate,
  type HybridTimelineRow,
  type HybridTimelineScale,
} from '~~/shared/utils/project/project-control-timeline'
import type {
  HybridControl,
  HybridControlCheckpoint,
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~~/shared/types/project/project'
import type {
  ApiV1ClientProjectScopeDetail,
  ApiV1ClientProjectScopeSettingsUpdate,
  ApiV1Envelope,
} from '~~/shared/types/api-v1'
import type { ProjectScopeType } from '~~/shared/types/project/project-governance'
import { getProjectScopeEditableSettingKeys } from '~~/shared/utils/project/project-governance'

export type TimelineDetailItem = {
  key: string
  label: string
  value: string
}

export type TimelineRuleSummary = {
  id: string
  title: string
  channel: string
  trigger: string
  audience: string
}

export type SelectedTimelineScopeState = {
  id: string
  scopeType: ProjectScopeType
  scopeId: string
  type: ProjectScopeType
  typeLabel: string
  title: string
  meta: string
  startDate?: string
  endDate?: string
  progressLabel?: string
  statusLabel?: string
  phaseKey?: string
  linkedPhaseKey?: string
  sprintId?: string
  taskId?: string
}

export type TimelineDetailTaskItem = {
  id: string
  scopeId: string
  title: string
  meta: string
  sprintId: string
}

export type ClientScopeSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

export type ClientScopeSettingField = {
  key: string
  label: string
  kind: ClientScopeSettingFieldKind
  value: string | number | boolean | null
  items?: Array<{ label: string; value: string }>
}

export interface UseClientProjectControlTimelineOptions {
  slug: Ref<string> | ComputedRef<string>
  project: Ref<any>
  control: ComputedRef<HybridControl>
  summary: ComputedRef<any>
  coordinationBrief: ComputedRef<any>
  selectedSprint: ComputedRef<HybridControlSprint | null>
  selectedSprintPhaseTitle: ComputedRef<string>
  taskStatusLabels: Record<HybridControlTask['status'], string>
  checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string>
  getPhaseById: (phaseId?: string) => HybridControlPhase | null
  getSprintById: (sprintId?: string) => HybridControlSprint | null
  getTaskContext: (taskId?: string) => { sprint: HybridControlSprint; task: HybridControlTask } | null
  getPhaseTitleByKey: (phaseKey?: string) => string
  navigateToPhase: (phaseId?: string) => Promise<void> | void
  navigateToSprint: (sprintId?: string) => Promise<void> | void
  navigateToTask: (taskId?: string, sprintId?: string) => Promise<void> | void
}

export function useClientProjectControlTimeline(options: UseClientProjectControlTimelineOptions) {
  const {
    slug,
    project,
    control,
    summary,
    coordinationBrief,
    selectedSprint,
    selectedSprintPhaseTitle,
    taskStatusLabels,
    checkpointStatusLabels,
    getPhaseById,
    getSprintById,
    getTaskContext,
    getPhaseTitleByKey,
    navigateToPhase,
    navigateToSprint,
    navigateToTask,
  } = options

  const timelineScaleOptions: HybridTimelineScale[] = ['months', 'weeks', 'days', 'hours']
  const timelineScale = ref<HybridTimelineScale>('weeks')
  const selectedTimelineScopeState = ref<SelectedTimelineScopeState | null>(null)
  const timelineScopeDetail = ref<ApiV1ClientProjectScopeDetail | null>(null)
  const timelineScopeDetailPending = ref(false)
  const timelineScopeDetailError = ref('')
  const timelineScopeDetailRequestId = ref(0)
  const timelineScopeSettingsDraft = ref<Record<string, unknown>>({})
  const timelineScopeMutationPending = ref(false)
  const timelineScopeMutationError = ref('')
  const timelineScopeMutationNotice = ref('')

  const clientScopeSelectItems: Record<string, Array<{ label: string; value: string }>> = {
    approvalMode: [
      { label: 'Через лида проекта', value: 'project-lead' },
      { label: 'Через владельца фазы', value: 'phase-owner' },
      { label: 'Через ревью спринта', value: 'sprint-review' },
      { label: 'Через ревью задачи', value: 'task-review' },
      { label: 'Через согласование документа', value: 'document-approval' },
      { label: 'Через согласование услуги', value: 'service-request' },
    ],
    visibility: [
      { label: 'Команда проекта', value: 'team' },
      { label: 'Только участники контура', value: 'assigned-only' },
    ],
    acceptanceMode: [
      { label: 'Явное подтверждение', value: 'explicit' },
      { label: 'Без отдельного подтверждения', value: 'implicit' },
    ],
  }

  const timelineRows = computed(() => buildHybridTimelineRows(control.value))
  const timelineCollapsedPhases = reactive<Record<string, boolean>>({})

  watch(() => control.value.phases.map(phase => phase.phaseKey), (phaseKeys) => {
    const activeKeys = new Set(phaseKeys)

    phaseKeys.forEach((phaseKey) => {
      if (!(phaseKey in timelineCollapsedPhases)) {
        timelineCollapsedPhases[phaseKey] = false
      }
    })

    Object.keys(timelineCollapsedPhases).forEach((phaseKey) => {
      if (!activeKeys.has(phaseKey)) {
        delete timelineCollapsedPhases[phaseKey]
      }
    })
  }, { immediate: true })

  const timelineSprintCountByPhase = computed(() => control.value.sprints.reduce<Record<string, number>>((acc, sprint) => {
    if (!sprint.linkedPhaseKey) return acc
    acc[sprint.linkedPhaseKey] = (acc[sprint.linkedPhaseKey] || 0) + 1
    return acc
  }, {}))

  const collapsibleTimelinePhaseKeys = computed(() => Object.entries(timelineSprintCountByPhase.value)
    .filter(([, count]) => count > 0)
    .map(([phaseKey]) => phaseKey))

  const hasCollapsibleTimelinePhases = computed(() => collapsibleTimelinePhaseKeys.value.length > 0)

  const allTimelinePhasesCollapsed = computed(() => hasCollapsibleTimelinePhases.value
    && collapsibleTimelinePhaseKeys.value.every(phaseKey => timelineCollapsedPhases[phaseKey]))

  const visibleTimelineRows = computed(() => timelineRows.value.filter((row) => {
    if (row.type === 'phase') return true
    if (!row.linkedPhaseKey) return true
    return !timelineCollapsedPhases[row.linkedPhaseKey]
  }))

  const timelineBounds = computed(() => buildHybridTimelineBounds(timelineRows.value, timelineScale.value))
  const timelineColumns = computed(() => buildHybridTimelineColumns(timelineBounds.value, timelineScale.value))
  const timelineGroups = computed(() => buildHybridTimelineGroups(timelineColumns.value, timelineScale.value))

  const timelineGridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${Math.max(timelineColumns.value.length, 1)}, minmax(0, 1fr))`,
  }))

  const timelineBoardStyle = computed(() => ({
    '--cpc-entity-column-width': '240px',
    '--cpc-period-column-width': '170px',
    minWidth: `${410 + (timelineColumns.value.length * getHybridTimelineColumnWidth(timelineScale.value))}px`,
  }))

  const timelineWindowLabel = computed(() => `${toIsoLocalDate(timelineBounds.value.start)} - ${toIsoLocalDate(timelineBounds.value.end)}`)

  const timelineStats = computed(() => ([
    { label: 'Период', value: timelineWindowLabel.value },
    { label: 'Строк в таблице', value: `${visibleTimelineRows.value.length}` },
    { label: 'Фаз', value: `${control.value.phases.length}` },
    { label: 'Спринтов', value: `${control.value.sprints.length}` },
  ]))

  const selectedTimelineRowDetails = computed<SelectedTimelineScopeState | null>(() => selectedTimelineScopeState.value)

  const selectedTimelinePhase = computed(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected || selected.scopeType !== 'phase') return null
    return getPhaseById(selected.id) || control.value.phases.find(phase => phase.phaseKey === selected.phaseKey) || null
  })

  const selectedTimelineSprint = computed(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected || selected.scopeType !== 'sprint') return null
    return getSprintById(selected.id)
  })

  const selectedTimelineTaskSprintId = computed(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected || selected.scopeType !== 'task') return ''
    return selected.sprintId || ''
  })

  const selectedTimelineDetailCards = computed(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return [] as Array<{ label: string; value: string }>

    const cards: Array<{ label: string; value: string }> = []

    if (selected.startDate || selected.endDate) {
      cards.push({
        label: 'Период',
        value: formatHybridTimelineDateRange(selected.startDate, selected.endDate),
      })
    }

    if (selected.progressLabel) {
      cards.push({
        label: 'Прогресс',
        value: selected.progressLabel,
      })
    }

    const resolvedStatusLabel = timelineScopeDetail.value?.scope.statusLabel || selected.statusLabel
    if (resolvedStatusLabel) {
      cards.push({
        label: 'Статус',
        value: resolvedStatusLabel,
      })
    }

    return cards
  })

  const timelineScopeTypeLabels = {
    project: 'Проект',
    phase: 'Фаза',
    sprint: 'Спринт',
    task: 'Задача',
    document: 'Документ',
    service: 'Услуга',
  } as const

  function mapTimelineDetailItems(items: Array<{ key: string; label: string; value: string }>): TimelineDetailItem[] {
    return items.map(item => ({
      key: item.key,
      label: item.label,
      value: item.value,
    }))
  }

  const timelineDetailRules = computed<TimelineRuleSummary[]>(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return []

    if (timelineScopeDetail.value) {
      return timelineScopeDetail.value.ruleItems.map(rule => ({
        id: rule.id,
        title: rule.title,
        channel: rule.channel,
        trigger: rule.trigger,
        audience: rule.audience,
      }))
    }

    const selectedPhaseKey = selected.type === 'phase'
      ? selected.phaseKey
      : selected.linkedPhaseKey

    return coordinationBrief.value.playbook.slice(0, 4).map((rule: any) => ({
      id: rule.id,
      title: rule.title,
      channel: rule.linkedChannelLabel,
      trigger: rule.trigger,
      audience: rule.audienceLabels.length
        ? rule.audienceLabels.join(' · ')
        : (selectedPhaseKey ? `Контур ${getPhaseTitleByKey(selectedPhaseKey)}` : 'Общий контур'),
    }))
  })

  const timelineDetailSubjects = computed<TimelineDetailItem[]>(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return []

    if (timelineScopeDetail.value) {
      return [
        ...timelineScopeDetail.value.participants.map(participant => ({
          key: participant.assignmentId,
          label: participant.roleLabel,
          value: [participant.displayName, participant.responsibilityLabel, participant.secondary].filter(Boolean).join(' · '),
        })),
        ...timelineScopeDetail.value.subjectItems.map(item => ({
          key: `subject-${item.key}`,
          label: item.label,
          value: item.value,
        })),
      ]
    }

    const audienceLabels = Array.from(new Set(
      coordinationBrief.value.playbook.flatMap((rule: any) => rule.audienceLabels),
    ))

    if (selected.type === 'phase') {
      const phase = selectedTimelinePhase.value
      const linkedSprints = control.value.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
      const assignees = Array.from(new Set(
        linkedSprints.flatMap(sprint => sprint.tasks.map(task => (task.assignee || '').trim())).filter(Boolean),
      ))

      return [
        {
          key: `phase-owner-${phase?.id || selected.id}`,
          label: 'Куратор',
          value: phase?.owner || 'не назначен',
        },
        {
          key: `phase-assignees-${selected.id}`,
          label: 'Исполнители',
          value: assignees.length ? assignees.join(', ') : 'пока не назначены',
        },
        {
          key: `phase-audience-${selected.id}`,
          label: 'Аудитория',
          value: audienceLabels.length ? audienceLabels.join(' · ') : 'общий проектный контур',
        },
      ]
    }

    if (selected.scopeType !== 'sprint') {
      return []
    }

    const sprint = selectedTimelineSprint.value
    const assignees = Array.from(new Set(
      (sprint?.tasks || []).map(task => (task.assignee || '').trim()).filter(Boolean),
    ))

    return [
      {
        key: `sprint-phase-${selected.id}`,
        label: 'Фаза',
        value: getPhaseTitleByKey(sprint?.linkedPhaseKey),
      },
      {
        key: `sprint-assignees-${selected.id}`,
        label: 'Исполнители',
        value: assignees.length ? assignees.join(', ') : 'команда не назначена',
      },
      {
        key: `sprint-audience-${selected.id}`,
        label: 'Аудитория',
        value: audienceLabels.length ? audienceLabels.join(' · ') : 'без закрепленной аудитории',
      },
    ]
  })

  const timelineDetailObjects = computed<TimelineDetailItem[]>(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return []

    if (timelineScopeDetail.value) {
      return mapTimelineDetailItems(timelineScopeDetail.value.objectItems)
    }

    if (selected.type === 'phase') {
      const phase = selectedTimelinePhase.value
      const linkedSprints = control.value.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
      const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks)

      return [
        {
          key: `phase-deliverable-${selected.id}`,
          label: 'Результат',
          value: phase?.deliverable || 'результат не зафиксирован',
        },
        {
          key: `phase-sprints-${selected.id}`,
          label: 'Связанные спринты',
          value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты еще не привязаны',
        },
        {
          key: `phase-tasks-${selected.id}`,
          label: 'Задачи контура',
          value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи еще не заведены',
        },
      ]
    }

    if (selected.scopeType !== 'sprint') {
      return []
    }

    const sprint = selectedTimelineSprint.value
    return [
      {
        key: `sprint-goal-${selected.id}`,
        label: 'Цель',
        value: sprint?.goal || 'цель не описана',
      },
      {
        key: `sprint-focus-${selected.id}`,
        label: 'Фокус',
        value: sprint?.focus || 'фокус команды не задан',
      },
      {
        key: `sprint-retro-${selected.id}`,
        label: 'Ретроспектива',
        value: sprint?.retrospective || 'пока без ретроспективы',
      },
    ]
  })

  const timelineDetailActions = computed<TimelineDetailItem[]>(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return []

    if (timelineScopeDetail.value) {
      return mapTimelineDetailItems(timelineScopeDetail.value.actionItems)
    }

    if (selected.type === 'phase') {
      const phase = selectedTimelinePhase.value
      const gateActions = (phase?.gates || []).map(gate => ({
        key: `gate-${gate.id}`,
        label: gate.label,
        value: gate.done ? 'готово' : 'ожидает закрытия',
      }))

      const checkpointActions = control.value.checkpoints.slice(0, 2).map(checkpoint => ({
        key: `checkpoint-${checkpoint.id}`,
        label: checkpoint.title,
        value: checkpoint.note || checkpointStatusLabels[checkpoint.status],
      }))

      return [...gateActions, ...checkpointActions].slice(0, 6)
    }

    if (selected.scopeType !== 'sprint') {
      return []
    }

    const sprint = selectedTimelineSprint.value
    const taskActions = (sprint?.tasks || []).map(task => ({
      key: `task-${task.id}`,
      label: task.title,
      value: `${taskStatusLabels[task.status]}${task.assignee ? ` · ${task.assignee}` : ''}`,
    }))

    const projectBlockers = control.value.blockers.slice(0, 2).map((blocker, index) => ({
      key: `blocker-${selected.id}-${index}`,
      label: `Блокер ${index + 1}`,
      value: blocker,
    }))

    return [...taskActions, ...projectBlockers].slice(0, 6)
  })

  const timelineDetailSettings = computed<TimelineDetailItem[]>(() => {
    if (!timelineScopeDetail.value) return []
    return mapTimelineDetailItems(timelineScopeDetail.value.settingItems)
  })

  const clientEditableScopeSettings = computed(() => {
    const detail = timelineScopeDetail.value
    if (!detail) {
      return [] as ClientScopeSettingField[]
    }

    const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
    const allowedKeys = getProjectScopeEditableSettingKeys(detail.scope.scopeType, 'client')

    return allowedKeys
      .filter(key => key in timelineScopeSettingsDraft.value)
      .map((key) => {
        const rawValue = timelineScopeSettingsDraft.value[key]

        if (key in clientScopeSelectItems) {
          return {
            key,
            label: labelMap.get(key) || key,
            kind: 'select' as const,
            value: typeof rawValue === 'string' ? rawValue : '',
            items: clientScopeSelectItems[key],
          }
        }

        if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
          return {
            key,
            label: labelMap.get(key) || key,
            kind: 'number' as const,
            value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
          }
        }

        if (key === 'escalateOnBlocked') {
          return {
            key,
            label: labelMap.get(key) || key,
            kind: 'boolean' as const,
            value: Boolean(rawValue),
          }
        }

        if (key === 'requiredResponsibilities') {
          return {
            key,
            label: labelMap.get(key) || key,
            kind: 'list' as const,
            value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
          }
        }

        return {
          key,
          label: labelMap.get(key) || key,
          kind: 'text' as const,
          value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
        }
      })
  })

  const timelineDetailLinkedScopes = computed<TimelineDetailItem[]>(() => {
    if (!timelineScopeDetail.value) return []

    return timelineScopeDetail.value.linkedScopes.map(linkedScope => ({
      key: `${linkedScope.scopeType}-${linkedScope.scopeId}`,
      label: timelineScopeTypeLabels[linkedScope.scopeType],
      value: [linkedScope.title, linkedScope.statusLabel || linkedScope.status].filter(Boolean).join(' · '),
    }))
  })

  const timelineDetailTasks = computed<TimelineDetailTaskItem[]>(() => {
    if (timelineScopeDetail.value) {
      return timelineScopeDetail.value.tasks.map(task => {
        const normalizedTaskId = normalizeTaskScopeId(task.id)
        const taskContext = getTaskContext(normalizedTaskId)

        return {
          id: normalizedTaskId,
          scopeId: task.id,
          title: task.title,
          meta: [
            task.assigneeLabels.length ? task.assigneeLabels.join(', ') : 'Исполнитель не назначен',
            task.statusLabel,
            task.secondary,
          ].filter(Boolean).join(' · '),
          sprintId: taskContext?.sprint.id || (selectedTimelineRowDetails.value?.type === 'sprint' ? selectedTimelineRowDetails.value.id : ''),
        }
      })
    }

    if (selectedTimelineRowDetails.value?.scopeType !== 'sprint') {
      return []
    }

    return (selectedTimelineSprint.value?.tasks || []).map(task => ({
      id: task.id,
      scopeId: task.id,
      title: task.title,
      meta: `${task.assignee || 'Исполнитель не назначен'} · ${taskStatusLabels[task.status]}`,
      sprintId: selectedTimelineRowDetails.value?.id || '',
    }))
  })

  function getTimelineBarStyle(row: HybridTimelineRow) {
    return getHybridTimelineBarStyle(row, timelineBounds.value)
  }

  function getTimelineScaleLabel(scale: HybridTimelineScale) {
    return getHybridTimelineScaleLabel(scale)
  }

  function getTimelinePhaseSprintCount(phaseKey?: string) {
    if (!phaseKey) return 0
    return timelineSprintCountByPhase.value[phaseKey] || 0
  }

  function isTimelinePhaseCollapsed(phaseKey?: string) {
    if (!phaseKey) return false
    return !!timelineCollapsedPhases[phaseKey]
  }

  function toggleTimelinePhase(phaseKey?: string) {
    if (!phaseKey || !getTimelinePhaseSprintCount(phaseKey)) return
    timelineCollapsedPhases[phaseKey] = !timelineCollapsedPhases[phaseKey]
  }

  function collapseAllTimelinePhases() {
    collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
      timelineCollapsedPhases[phaseKey] = true
    })
  }

  function expandAllTimelinePhases() {
    collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
      timelineCollapsedPhases[phaseKey] = false
    })
  }

  function toggleAllTimelinePhases() {
    if (allTimelinePhasesCollapsed.value) {
      expandAllTimelinePhases()
      return
    }

    collapseAllTimelinePhases()
  }

  function isTimelineRowSelected(row: HybridTimelineRow) {
    return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
  }

  function cloneTimelineScopeSettings(settings: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
  }

  function normalizeTimelineScopeMutationError(error: unknown, fallback: string) {
    if (!error || typeof error !== 'object') {
      return fallback
    }

    const record = error as {
      statusMessage?: string
      message?: string
      data?: { statusMessage?: string; message?: string }
    }

    return String(record.data?.statusMessage || record.statusMessage || record.data?.message || record.message || fallback).trim() || fallback
  }

  function normalizeClientScopeSettingValue(kind: ClientScopeSettingFieldKind, value: unknown) {
    if (kind === 'boolean') {
      return Boolean(value)
    }

    if (kind === 'number') {
      const normalized = typeof value === 'number' ? value : Number(String(value || '').trim())
      return Number.isFinite(normalized) ? normalized : null
    }

    if (kind === 'list') {
      return String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }

    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
  }

  function updateClientScopeSettingDraft(key: string, kind: ClientScopeSettingFieldKind, value: unknown) {
    timelineScopeSettingsDraft.value = {
      ...timelineScopeSettingsDraft.value,
      [key]: normalizeClientScopeSettingValue(kind, value),
    }
  }

  function normalizeTaskScopeId(taskId: string) {
    return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
  }

  function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineScopeState {
    return {
      id: row.id,
      scopeType: row.type,
      scopeId: row.id,
      type: row.type,
      typeLabel: row.typeLabel,
      title: row.title,
      meta: row.meta,
      startDate: row.startDate,
      endDate: row.endDate,
      progressLabel: row.progressLabel,
      statusLabel: row.statusLabel,
      phaseKey: row.phaseKey,
      linkedPhaseKey: row.linkedPhaseKey,
    }
  }

  function buildProjectScopeState(): SelectedTimelineScopeState {
    return {
      id: slug.value,
      scopeType: 'project',
      scopeId: slug.value,
      type: 'project',
      typeLabel: 'Проект',
      title: project.value?.title || 'Проект',
      meta: [project.value?.status, summary.value.activePhase?.title, summary.value.activeSprint?.name].filter(Boolean).join(' · '),
      statusLabel: project.value?.status || 'Проект',
    }
  }

  function buildTaskScopeState(taskId: string, sprintId?: string): SelectedTimelineScopeState | null {
    const normalizedTaskId = normalizeTaskScopeId(taskId)
    const taskContext = getTaskContext(normalizedTaskId)
    const resolvedSprintId = sprintId || taskContext?.sprint.id || ''
    const resolvedSprintName = taskContext?.sprint.name || selectedSprint.value?.name || 'Спринт'
    const resolvedPhaseTitle = taskContext?.sprint.linkedPhaseKey ? getPhaseTitleByKey(taskContext.sprint.linkedPhaseKey) : selectedSprintPhaseTitle.value

    if (!taskContext && !normalizedTaskId) {
      return null
    }

    return {
      id: normalizedTaskId,
      taskId: normalizedTaskId,
      sprintId: resolvedSprintId,
      scopeType: 'task',
      scopeId: taskId,
      type: 'task',
      typeLabel: 'Задача',
      title: taskContext?.task.title || 'Задача',
      meta: [resolvedSprintName, resolvedPhaseTitle].filter(Boolean).join(' · '),
      progressLabel: taskContext?.task.points ? `${taskContext.task.points} pt` : '',
      statusLabel: taskContext?.task ? taskStatusLabels[taskContext.task.status] : 'Задача',
      linkedPhaseKey: taskContext?.sprint.linkedPhaseKey || '',
    }
  }

  async function scrollTimelineDetailsIntoView() {
    if (!import.meta.client || typeof document === 'undefined') return

    await nextTick()
    document.querySelector<HTMLElement>('.cpc-timeline-details-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function resetTimelineScopeDetailState() {
    timelineScopeDetail.value = null
    timelineScopeDetailPending.value = false
    timelineScopeDetailError.value = ''
    timelineScopeSettingsDraft.value = {}
    timelineScopeMutationPending.value = false
    timelineScopeMutationError.value = ''
    timelineScopeMutationNotice.value = ''
  }

  async function fetchTimelineScopeDetail(scope: SelectedTimelineScopeState | null) {
    if (!scope?.scopeType || !scope.scopeId) {
      resetTimelineScopeDetailState()
      return
    }

    const preserveCurrentDetail = Boolean(
      timelineScopeDetail.value
      && timelineScopeDetail.value.scope.scopeType === scope.scopeType
      && timelineScopeDetail.value.scope.scopeId === scope.scopeId,
    )

    const requestId = timelineScopeDetailRequestId.value + 1
    timelineScopeDetailRequestId.value = requestId
    timelineScopeDetailPending.value = true
    timelineScopeDetailError.value = ''

    if (!preserveCurrentDetail) {
      timelineScopeDetail.value = null
      timelineScopeSettingsDraft.value = {}
      timelineScopeMutationError.value = ''
      timelineScopeMutationNotice.value = ''
    }

    try {
      const detailEnvelope = await $fetch<ApiV1Envelope<ApiV1ClientProjectScopeDetail>>(`/api/v1/client/projects/${slug.value}/coordination/scopes/${scope.scopeType}/${encodeURIComponent(scope.scopeId)}`)

      if (timelineScopeDetailRequestId.value !== requestId) {
        return
      }

      timelineScopeDetail.value = detailEnvelope.data
    } catch {
      if (timelineScopeDetailRequestId.value !== requestId) {
        return
      }

      if (!preserveCurrentDetail) {
        timelineScopeDetail.value = null
      }
      timelineScopeDetailError.value = 'Не удалось загрузить детали контура проекта.'
    } finally {
      if (timelineScopeDetailRequestId.value === requestId) {
        timelineScopeDetailPending.value = false
      }
    }
  }

  async function openTimelineRowDetails(row: HybridTimelineRow) {
    const nextScope = buildSelectedTimelineScopeState(row)
    selectedTimelineScopeState.value = nextScope
    void fetchTimelineScopeDetail(nextScope)

    if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
    await scrollTimelineDetailsIntoView()
  }

  async function openProjectScopeDetails() {
    const nextScope = buildProjectScopeState()
    selectedTimelineScopeState.value = nextScope
    void fetchTimelineScopeDetail(nextScope)
    await scrollTimelineDetailsIntoView()
  }

  async function openTaskScopeDetails(taskId?: string, sprintId?: string) {
    if (!taskId) return

    const nextScope = buildTaskScopeState(taskId, sprintId)
    if (!nextScope) return

    selectedTimelineScopeState.value = nextScope
    void fetchTimelineScopeDetail(nextScope)
    await scrollTimelineDetailsIntoView()
  }

  function closeTimelineRowDetails() {
    timelineScopeDetailRequestId.value += 1
    resetTimelineScopeDetailState()
    selectedTimelineScopeState.value = null
  }

  watch(() => timelineScopeDetail.value?.revision, () => {
    timelineScopeSettingsDraft.value = cloneTimelineScopeSettings(timelineScopeDetail.value?.settings || {})
    timelineScopeMutationError.value = ''
    timelineScopeMutationNotice.value = ''
  }, { immediate: true })

  async function commitClientScopeSettings() {
    const detail = timelineScopeDetail.value
    if (!detail) {
      return
    }

    timelineScopeMutationPending.value = true
    timelineScopeMutationError.value = ''
    timelineScopeMutationNotice.value = ''

    try {
      await $fetch<ApiV1Envelope<ApiV1ClientProjectScopeSettingsUpdate>>(`/api/v1/client/projects/${slug.value}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
        method: 'PATCH',
        body: {
          settings: cloneTimelineScopeSettings(timelineScopeSettingsDraft.value),
        },
      })

      await fetchTimelineScopeDetail(selectedTimelineRowDetails.value)
      timelineScopeMutationNotice.value = 'Настройки контура обновлены.'
    } catch (error) {
      timelineScopeMutationError.value = normalizeTimelineScopeMutationError(error, 'Не удалось обновить настройки контура.')
    } finally {
      timelineScopeMutationPending.value = false
    }
  }

  function handleClientScopeSelectSettingChange(key: string, event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value || ''
    updateClientScopeSettingDraft(key, 'select', value)
    void commitClientScopeSettings()
  }

  function handleClientScopeBooleanSettingChange(key: string, event: Event) {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked)
    updateClientScopeSettingDraft(key, 'boolean', checked)
    void commitClientScopeSettings()
  }

  function handleClientScopeTextSettingInput(key: string, kind: ClientScopeSettingFieldKind, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
    updateClientScopeSettingDraft(key, kind, value)
  }

  async function openTimelinePhase(phaseId?: string) {
    closeTimelineRowDetails()
    await navigateToPhase(phaseId)
  }

  async function openTimelineSprint(sprintId?: string) {
    closeTimelineRowDetails()
    await navigateToSprint(sprintId)
  }

  async function openTimelineTask(taskId?: string, sprintId?: string) {
    if (!taskId) return
    const normalizedTaskId = normalizeTaskScopeId(taskId)
    closeTimelineRowDetails()
    await navigateToTask(normalizedTaskId, sprintId)
  }

  return {
    timelineScaleOptions,
    timelineScale,
    timelineStats,
    hasCollapsibleTimelinePhases,
    allTimelinePhasesCollapsed,
    visibleTimelineRows,
    timelineColumns,
    timelineGroups,
    timelineGridStyle,
    timelineBoardStyle,
    selectedTimelineRowDetails,
    selectedTimelineTaskSprintId,
    selectedTimelineDetailCards,
    timelineScopeDetailPending,
    timelineScopeDetailError,
    timelineDetailSubjects,
    timelineDetailObjects,
    timelineDetailActions,
    timelineDetailSettings,
    clientEditableScopeSettings,
    timelineScopeMutationPending,
    timelineScopeMutationError,
    timelineScopeMutationNotice,
    timelineDetailLinkedScopes,
    timelineDetailRules,
    timelineDetailTasks,
    getTimelineBarStyle,
    getTimelineScaleLabel,
    getTimelinePhaseSprintCount,
    isTimelinePhaseCollapsed,
    toggleTimelinePhase,
    toggleAllTimelinePhases,
    isTimelineRowSelected,
    openTimelineRowDetails,
    openProjectScopeDetails,
    openTaskScopeDetails,
    closeTimelineRowDetails,
    handleClientScopeSelectSettingChange,
    handleClientScopeBooleanSettingChange,
    handleClientScopeTextSettingInput,
    commitClientScopeSettings,
    openTimelinePhase,
    openTimelineSprint,
    openTimelineTask,
  }
}
