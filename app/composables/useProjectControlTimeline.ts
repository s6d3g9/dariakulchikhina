import { nextTick, ref, reactive, computed, watch, type Ref, type ComputedRef } from 'vue'
import {
  addTimelineDays,
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  endOfHybridTimelineScale,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  resolveHybridTimelineRowRange,
  type HybridTimelineScale,
  toIsoLocalDate,
  type HybridTimelineRow,
} from '~~/shared/utils/project/project-control-timeline'
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_RESPONSIBILITY_KEYS,
  type ProjectParticipantRoleKey,
  type ProjectResponsibilityKey,
  type ProjectScopeType,
} from '~~/shared/types/project/project-governance'
import {
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~~/shared/utils/project/project-governance'
import {
  getHybridCommunicationChannelLabel,
  getHybridStakeholderRoleLabel,
} from '~~/shared/utils/project/project-control'
import type {
  HybridControl,
  HybridControlCommunicationChannel,
  HybridControlSprint,
  HybridControlStakeholderRole,
  HybridControlTask,
} from '~~/shared/types/project/project'
import type { ProjectScopeDetailBundle } from '~~/shared/types/project/project-governance'

// --- Types ---

type TimelineDetailItem = {
  key: string
  label: string
  value: string
}

type TimelineRuleSummary = {
  id: string
  title: string
  channel: string
  trigger: string
  audience: string
}

type SelectedTimelineRowState = {
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

type TimelineDetailTaskItem = {
  id: string
  scopeId: string
  title: string
  meta: string
  sprintId: string
}

type TimelineGovernanceParticipantDraft = {
  displayName: string
  roleKey: ProjectParticipantRoleKey
  responsibility: ProjectResponsibilityKey
}

type TimelineGovernanceSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

type TimelineGovernanceMutationResponse = {
  participant: {
    persistedId: number
  }
}

type TimelineDragKind = 'idle' | 'reorder' | 'schedule' | 'resize-start' | 'resize-end'

// --- Options interface ---

export interface UseProjectControlTimelineOptions {
  slug: Ref<string> | ComputedRef<string>
  control: HybridControl
  project: Ref<any>
  activeModule: Ref<string>
  activeSprintId: Ref<string>
  activeTaskId: Ref<string>
  save: (options?: { refreshAfter?: boolean }) => Promise<void> | void
  refresh: () => Promise<void> | void
  markSaved: () => void
  getPhaseById: (id: string) => HybridControl['phases'][number] | null
  getSprintById: (id: string) => HybridControlSprint | null
  getTaskContext: (taskId?: string) => { sprint: HybridControlSprint; task: HybridControlTask } | null
  getPhaseTitleByKey: (phaseKey?: string) => string
  selectedSprint: ComputedRef<HybridControlSprint | null>
  selectedSprintPhaseTitle: ComputedRef<string>
  summary: ComputedRef<{ activePhase?: any; activeSprint?: any; blockerCount?: number; phasePercent?: number }>
  taskStatusLabels: Record<HybridControlTask['status'], string>
  checkpointStatusLabels: Record<string, string>
  focusTask: (taskId?: string, sprintId?: string, targetModule?: string) => Promise<void> | void
  selectModule: (moduleId: string) => void
}

// --- Composable ---

export function useProjectControlTimeline(options: UseProjectControlTimelineOptions) {
  const {
    slug,
    control,
    project,
    activeModule,
    activeSprintId,
    activeTaskId,
    save,
    refresh,
    markSaved,
    getPhaseById,
    getSprintById,
    getTaskContext,
    getPhaseTitleByKey,
    selectedSprint,
    selectedSprintPhaseTitle,
    summary,
    taskStatusLabels,
    checkpointStatusLabels,
    focusTask,
    selectModule,
  } = options

  // === Reactive State ===

  const timelineScale = ref<HybridTimelineScale>('weeks')

  const timelineScaleOptions = (
    ['months', 'weeks', 'days', 'hours'] as const satisfies readonly HybridTimelineScale[]
  ).map(value => ({ value, label: getHybridTimelineScaleLabel(value) }))

  const timelineDrag = reactive<{
    kind: TimelineDragKind
    rowId: string
    rowType: HybridTimelineRow['type'] | null
    overRowId: string
    overColumnKey: string
  }>({
    kind: 'idle',
    rowId: '',
    rowType: null,
    overRowId: '',
    overColumnKey: '',
  })

  const selectedTimelineRowState = ref<SelectedTimelineRowState | null>(null)
  const timelineScopeDetail = ref<ProjectScopeDetailBundle | null>(null)
  const timelineScopeDetailPending = ref(false)
  const timelineScopeDetailError = ref('')
  const timelineScopeDetailRequestId = ref(0)
  const timelineGovernancePending = ref(false)
  const timelineGovernanceError = ref('')
  const timelineGovernanceNotice = ref('')
  const timelineGovernanceSettingsDraft = ref<Record<string, unknown>>({})
  const timelineGovernanceParticipantDraft = reactive<TimelineGovernanceParticipantDraft>({
    displayName: '',
    roleKey: 'manager',
    responsibility: 'owner',
  })

  // === Computed: rows, bounds, columns ===

  const timelineRows = computed(() => buildHybridTimelineRows(control))
  const timelineCollapsedPhases = reactive<Record<string, boolean>>({})

  watch(() => control.phases.map(phase => phase.phaseKey), (phaseKeys) => {
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

  const timelineSprintCountByPhase = computed(() => control.sprints.reduce<Record<string, number>>((acc, sprint) => {
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

  const timelineEditingEnabled = computed(() => timelineScale.value !== 'hours')

  const timelineBoardStyle = computed(() => ({
    '--hpc-entity-column-width': '220px',
    '--hpc-period-column-width': '148px',
    minWidth: `${368 + Math.max(timelineColumns.value.length, 1) * getHybridTimelineColumnWidth(timelineScale.value)}px`,
  }))

  const timelineWindowLabel = computed(() => `${toIsoLocalDate(timelineBounds.value.start)} - ${toIsoLocalDate(timelineBounds.value.end)}`)

  const timelineStats = computed(() => ([
    { label: 'Период', value: timelineWindowLabel.value },
    { label: 'Строк', value: `${visibleTimelineRows.value.length}` },
    { label: 'Фаз', value: `${control.phases.length}` },
    { label: 'Спринтов', value: `${control.sprints.length}` },
  ]))

  // === Computed: selected row details ===

  const selectedTimelineRowDetails = computed<SelectedTimelineRowState | null>(() => selectedTimelineRowState.value)

  const selectedTimelinePhase = computed(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected || selected.scopeType !== 'phase') return null
    return getPhaseById(selected.id) || control.phases.find(phase => phase.phaseKey === selected.phaseKey) || null
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
      cards.push({ label: 'Период', value: formatDateRange(selected.startDate, selected.endDate) })
    }
    if (selected.progressLabel) {
      cards.push({ label: 'Прогресс', value: selected.progressLabel })
    }
    const resolvedStatusLabel = timelineScopeDetail.value?.scope.statusLabel || selected.statusLabel
    if (resolvedStatusLabel) {
      cards.push({ label: 'Статус', value: resolvedStatusLabel })
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

  // === Helper functions ===

  function formatDateRange(startDate?: string, endDate?: string) {
    return formatHybridTimelineDateRange(startDate, endDate)
  }

  function getTimelineBarStyle(row: HybridTimelineRow) {
    return getHybridTimelineBarStyle(row, timelineBounds.value)
  }

  function getCommunicationChannelLabel(channel: HybridControlCommunicationChannel) {
    return getHybridCommunicationChannelLabel(channel)
  }

  function getStakeholderRoleLabel(role: HybridControlStakeholderRole) {
    return getHybridStakeholderRoleLabel(role)
  }

  function normalizeTaskScopeId(taskId: string) {
    return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
  }

  function mapTimelineDetailItems(items: Array<{ key: string; label: string; value: string }>): TimelineDetailItem[] {
    return items.map(item => ({ key: item.key, label: item.label, value: item.value }))
  }

  // === Detail computed ===

  const timelineDetailRules = computed<TimelineRuleSummary[]>(() => {
    const selected = selectedTimelineRowDetails.value
    if (!selected) return []

    if (timelineScopeDetail.value) {
      return timelineScopeDetail.value.ruleItems.map(rule => ({
        id: rule.id, title: rule.title, channel: rule.channel, trigger: rule.trigger, audience: rule.audience,
      }))
    }

    const selectedPhaseKey = selected.type === 'phase' ? selected.phaseKey : selected.linkedPhaseKey

    return control.communicationPlaybook.slice(0, 4).map(rule => ({
      id: rule.id,
      title: rule.title,
      channel: getCommunicationChannelLabel(rule.linkedChannel),
      trigger: rule.trigger,
      audience: rule.audience.length
        ? rule.audience.map(getStakeholderRoleLabel).join(' · ')
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
          key: `subject-${item.key}`, label: item.label, value: item.value,
        })),
      ]
    }

    const audienceLabels = Array.from(new Set(
      control.communicationPlaybook.flatMap(rule => rule.audience.map(getStakeholderRoleLabel)),
    ))

    if (selected.type === 'phase') {
      const phase = selectedTimelinePhase.value
      const linkedSprints = control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
      const assignees = Array.from(new Set(
        linkedSprints.flatMap(sprint => sprint.tasks.map(task => (task.assignee || '').trim())).filter(Boolean),
      ))
      return [
        { key: `phase-owner-${phase?.id || selected.id}`, label: 'Куратор', value: phase?.owner || 'не назначен' },
        { key: `phase-assignees-${selected.id}`, label: 'Исполнители', value: assignees.length ? assignees.join(', ') : 'пока не назначены' },
        { key: `phase-audience-${selected.id}`, label: 'Аудитория', value: audienceLabels.length ? audienceLabels.join(' · ') : 'общий проектный контур' },
      ]
    }

    if (selected.scopeType !== 'sprint') return []

    const sprint = selectedTimelineSprint.value
    const assignees = Array.from(new Set(
      (sprint?.tasks || []).map(task => (task.assignee || '').trim()).filter(Boolean),
    ))
    return [
      { key: `sprint-phase-${selected.id}`, label: 'Фаза', value: getPhaseTitleByKey(sprint?.linkedPhaseKey) },
      { key: `sprint-assignees-${selected.id}`, label: 'Исполнители', value: assignees.length ? assignees.join(', ') : 'команда не назначена' },
      { key: `sprint-audience-${selected.id}`, label: 'Аудитория', value: audienceLabels.length ? audienceLabels.join(' · ') : 'без закрепленной аудитории' },
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
      const linkedSprints = control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
      const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks)
      return [
        { key: `phase-deliverable-${selected.id}`, label: 'Результат', value: phase?.deliverable || 'результат не зафиксирован' },
        { key: `phase-sprints-${selected.id}`, label: 'Связанные спринты', value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты еще не привязаны' },
        { key: `phase-tasks-${selected.id}`, label: 'Задачи контура', value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи еще не заведены' },
      ]
    }

    if (selected.scopeType !== 'sprint') return []

    const sprint = selectedTimelineSprint.value
    return [
      { key: `sprint-goal-${selected.id}`, label: 'Цель', value: sprint?.goal || 'цель не описана' },
      { key: `sprint-focus-${selected.id}`, label: 'Фокус', value: sprint?.focus || 'фокус команды не задан' },
      { key: `sprint-retro-${selected.id}`, label: 'Ретроспектива', value: sprint?.retrospective || 'пока без ретроспективы' },
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
        key: `gate-${gate.id}`, label: gate.label, value: gate.done ? 'готово' : 'ожидает закрытия',
      }))
      const checkpointActions = control.checkpoints.slice(0, 2).map(checkpoint => ({
        key: `checkpoint-${checkpoint.id}`, label: checkpoint.title, value: checkpoint.note || checkpointStatusLabels[checkpoint.status],
      }))
      return [...gateActions, ...checkpointActions].slice(0, 6)
    }

    if (selected.scopeType !== 'sprint') return []

    const sprint = selectedTimelineSprint.value
    const taskActions = (sprint?.tasks || []).map(task => ({
      key: `task-${task.id}`, label: task.title,
      value: `${taskStatusLabels[task.status]}${task.assignee ? ` · ${task.assignee}` : ''}`,
    }))
    const projectBlockers = control.blockers.slice(0, 2).map((blocker, index) => ({
      key: `blocker-${selected.id}-${index}`, label: `Блокер ${index + 1}`, value: blocker,
    }))
    return [...taskActions, ...projectBlockers].slice(0, 6)
  })

  const timelineDetailSettings = computed<TimelineDetailItem[]>(() => {
    if (!timelineScopeDetail.value) return []
    return mapTimelineDetailItems(timelineScopeDetail.value.settingItems)
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
            task.statusLabel, task.secondary,
          ].filter(Boolean).join(' · '),
          sprintId: taskContext?.sprint.id || (selectedTimelineRowDetails.value?.type === 'sprint' ? selectedTimelineRowDetails.value.id : ''),
        }
      })
    }

    if (selectedTimelineRowDetails.value?.scopeType !== 'sprint') return []

    return (selectedTimelineSprint.value?.tasks || []).map(task => ({
      id: task.id, scopeId: task.id, title: task.title,
      meta: `${task.assignee || 'Исполнитель не назначен'} · ${taskStatusLabels[task.status]}`,
      sprintId: selectedTimelineRowDetails.value?.id || '',
    }))
  })

  // === Collapse/Expand functions ===

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

  // === Tooltip ===

  const timelineTooltip = ref({
    visible: false, content: '', left: 0, top: 0, maxWidth: 280,
  })

  let timelineTooltipTimer: number | null = null

  function getTimelineRowTooltip(row: HybridTimelineRow) {
    return [
      row.title, row.typeLabel,
      `Статус: ${row.statusLabel}`,
      `Период: ${formatDateRange(row.startDate, row.endDate)}`,
      `Прогресс: ${row.progressLabel}`,
      row.meta,
    ].filter(Boolean).join('\n')
  }

  const timelineTooltipStyle = computed(() => ({
    left: `${timelineTooltip.value.left}px`,
    top: `${timelineTooltip.value.top}px`,
    maxWidth: `${timelineTooltip.value.maxWidth}px`,
  }))

  function clearTimelineTooltipTimer() {
    if (!timelineTooltipTimer) return
    window.clearTimeout(timelineTooltipTimer)
    timelineTooltipTimer = null
  }

  function scheduleTimelineTooltip(event: Event, row: HybridTimelineRow) {
    if (!import.meta.client || typeof window === 'undefined') return
    if ('pointerType' in event && event.pointerType === 'touch') return

    const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
    if (!target) return

    clearTimelineTooltipTimer()
    timelineTooltip.value.visible = false

    timelineTooltipTimer = window.setTimeout(() => {
      const rect = target.getBoundingClientRect()
      const maxWidth = Math.min(320, Math.max(220, window.innerWidth - 24))
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, window.innerWidth - maxWidth - 12),
      )
      timelineTooltip.value = {
        visible: true,
        content: getTimelineRowTooltip(row),
        left,
        top: Math.max(20, rect.top - 12),
        maxWidth,
      }
    }, 1000)
  }

  function hideTimelineTooltip() {
    clearTimelineTooltipTimer()
    timelineTooltip.value.visible = false
  }

  // === Drag & Drop ===

  function reorderItems<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
    const sourceIndex = items.findIndex(item => item.id === sourceId)
    const targetIndex = items.findIndex(item => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false
    const [moved] = items.splice(sourceIndex, 1)
    if (!moved) return false
    items.splice(targetIndex, 0, moved)
    return true
  }

  function onReorderDragStart(event: DragEvent, row: HybridTimelineRow) {
    if (!timelineEditingEnabled.value) return
    timelineDrag.kind = 'reorder'
    timelineDrag.rowId = row.id
    timelineDrag.rowType = row.type
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'reorder', rowId: row.id, rowType: row.type }))
    }
  }

  function onScheduleDragStart(event: DragEvent, row: HybridTimelineRow) {
    if (!timelineEditingEnabled.value) return
    timelineDrag.kind = 'schedule'
    timelineDrag.rowId = row.id
    timelineDrag.rowType = row.type
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'schedule', rowId: row.id, rowType: row.type }))
    }
  }

  function onResizeDragStart(event: DragEvent, row: HybridTimelineRow, edge: 'start' | 'end') {
    if (!timelineEditingEnabled.value) return
    timelineDrag.kind = edge === 'start' ? 'resize-start' : 'resize-end'
    timelineDrag.rowId = row.id
    timelineDrag.rowType = row.type
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ kind: timelineDrag.kind, rowId: row.id, rowType: row.type }))
    }
  }

  function onRowDragOver(rowId: string) {
    if (!timelineEditingEnabled.value) return
    if (timelineDrag.kind !== 'reorder') return
    timelineDrag.overRowId = rowId
  }

  function onTimelineWeekDragOver(rowId: string, columnKey: string) {
    if (!timelineEditingEnabled.value) return
    if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind)) return
    timelineDrag.overColumnKey = `${rowId}-${columnKey}`
  }

  function onDragEnd() {
    timelineDrag.kind = 'idle'
    timelineDrag.rowId = ''
    timelineDrag.rowType = null
    timelineDrag.overRowId = ''
    timelineDrag.overColumnKey = ''
  }

  async function persistTimelineRange(row: HybridTimelineRow, start: Date, end: Date) {
    if (row.type === 'phase') {
      const phase = getPhaseById(row.id)
      if (!phase) return
      phase.startDate = toIsoLocalDate(start)
      phase.endDate = toIsoLocalDate(end)
      await save({ refreshAfter: false })
      return
    }
    const sprint = getSprintById(row.id)
    if (!sprint) return
    sprint.startDate = toIsoLocalDate(start)
    sprint.endDate = toIsoLocalDate(end)
    await save({ refreshAfter: false })
  }

  async function onRowDrop(target: HybridTimelineRow) {
    if (timelineDrag.kind !== 'reorder' || !timelineDrag.rowId || timelineDrag.rowId === target.id) {
      onDragEnd()
      return
    }

    let changed = false

    if (timelineDrag.rowType === 'phase' && target.type === 'phase') {
      changed = reorderItems(control.phases, timelineDrag.rowId, target.id)
    }

    if (timelineDrag.rowType === 'sprint') {
      const sourceSprint = getSprintById(timelineDrag.rowId)
      if (sourceSprint) {
        if (target.type === 'phase' && target.phaseKey) {
          sourceSprint.linkedPhaseKey = target.phaseKey
          changed = true
        }
        if (target.type === 'sprint') {
          sourceSprint.linkedPhaseKey = target.linkedPhaseKey || sourceSprint.linkedPhaseKey
        }
        changed = reorderItems(control.sprints, timelineDrag.rowId, target.id) || changed
      }
    }

    onDragEnd()
    if (changed) await save({ refreshAfter: false })
  }

  async function onTimelineWeekDrop(row: HybridTimelineRow, columnIndex: number) {
    if (!timelineEditingEnabled.value) { onDragEnd(); return }
    if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind) || timelineDrag.rowId !== row.id || timelineDrag.rowType !== row.type) {
      onDragEnd(); return
    }

    const column = timelineColumns.value[columnIndex]
    if (!column) { onDragEnd(); return }

    const range = resolveHybridTimelineRowRange(row)
    const durationDays = Math.max(Math.round((range.end.getTime() - range.start.getTime()) / 86400000), 0)
    const nextStart = new Date(column.start)
    const nextEnd = addTimelineDays(nextStart, durationDays)

    if (timelineDrag.kind === 'resize-start') {
      const resizedEnd = new Date(range.end)
      const resizedStart = nextStart.getTime() > resizedEnd.getTime() ? resizedEnd : nextStart
      await persistTimelineRange(row, resizedStart, resizedEnd)
      onDragEnd(); return
    }

    if (timelineDrag.kind === 'resize-end') {
      const resizedStart = new Date(range.start)
      const droppedWeekEnd = endOfHybridTimelineScale(nextStart, timelineScale.value)
      const resizedEnd = droppedWeekEnd.getTime() < resizedStart.getTime() ? resizedStart : droppedWeekEnd
      await persistTimelineRange(row, resizedStart, resizedEnd)
      onDragEnd(); return
    }

    await persistTimelineRange(row, nextStart, nextEnd)
    onDragEnd()
  }

  // === Scope Detail ===

  function resetTimelineScopeDetailState() {
    timelineScopeDetail.value = null
    timelineScopeDetailPending.value = false
    timelineScopeDetailError.value = ''
    timelineGovernanceSettingsDraft.value = {}
    timelineGovernanceError.value = ''
    timelineGovernanceNotice.value = ''
  }

  async function fetchTimelineScopeDetail(scope: SelectedTimelineRowState | null) {
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
      timelineGovernanceSettingsDraft.value = {}
      timelineGovernanceError.value = ''
      timelineGovernanceNotice.value = ''
    }

    try {
      const detail = await $fetch<ProjectScopeDetailBundle>(`/api/projects/${slug.value}/coordination/scopes/${scope.scopeType}/${encodeURIComponent(scope.scopeId)}`)
      if (timelineScopeDetailRequestId.value !== requestId) return
      timelineScopeDetail.value = detail
    } catch {
      if (timelineScopeDetailRequestId.value !== requestId) return
      if (!preserveCurrentDetail) timelineScopeDetail.value = null
      timelineScopeDetailError.value = 'Не удалось загрузить детали контура проекта.'
    } finally {
      if (timelineScopeDetailRequestId.value === requestId) {
        timelineScopeDetailPending.value = false
      }
    }
  }

  function isTimelineRowSelected(row: HybridTimelineRow) {
    return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
  }

  function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineRowState {
    return {
      id: row.id, scopeType: row.type, scopeId: row.id, type: row.type,
      typeLabel: row.typeLabel, title: row.title, meta: row.meta,
      startDate: row.startDate, endDate: row.endDate,
      progressLabel: row.progressLabel, statusLabel: row.statusLabel,
      phaseKey: row.phaseKey, linkedPhaseKey: row.linkedPhaseKey,
    }
  }

  function buildProjectScopeState(): SelectedTimelineRowState {
    return {
      id: slug.value, scopeType: 'project', scopeId: slug.value, type: 'project',
      typeLabel: 'Проект', title: project.value?.title || 'Проект',
      meta: [project.value?.status, summary.value.activePhase?.title, summary.value.activeSprint?.name].filter(Boolean).join(' · '),
      statusLabel: project.value?.status || 'Проект',
    }
  }

  function buildTaskScopeState(taskId: string, sprintId?: string): SelectedTimelineRowState | null {
    const normalizedTaskId = normalizeTaskScopeId(taskId)
    const taskContext = getTaskContext(normalizedTaskId)
    const resolvedSprintId = sprintId || taskContext?.sprint.id || ''
    const resolvedSprintName = taskContext?.sprint.name || selectedSprint.value?.name || 'Спринт'
    const resolvedPhaseTitle = taskContext?.sprint.linkedPhaseKey ? getPhaseTitleByKey(taskContext.sprint.linkedPhaseKey) : selectedSprintPhaseTitle.value

    if (!taskContext && !normalizedTaskId) return null

    return {
      id: normalizedTaskId, taskId: normalizedTaskId, sprintId: resolvedSprintId,
      scopeType: 'task', scopeId: taskId, type: 'task', typeLabel: 'Задача',
      title: taskContext?.task.title || 'Задача',
      meta: [resolvedSprintName, resolvedPhaseTitle].filter(Boolean).join(' · '),
      progressLabel: taskContext?.task.points ? `${taskContext.task.points} pt` : '',
      statusLabel: taskContext?.task ? taskStatusLabels[taskContext.task.status] : 'Задача',
      linkedPhaseKey: taskContext?.sprint.linkedPhaseKey || '',
    }
  }

  async function scrollTimelineDetailModalIntoView() {
    if (!import.meta.client || typeof document === 'undefined') return
    await nextTick()
    document.querySelector<HTMLElement>('.hpc-timeline-details-modal')?.scrollIntoView({
      behavior: 'smooth', block: 'start',
    })
  }

  async function openSelectedTimelineScope(scope: SelectedTimelineRowState) {
    hideTimelineTooltip()
    if (activeModule.value !== 'timeline') activeModule.value = 'timeline'
    selectedTimelineRowState.value = scope
    void fetchTimelineScopeDetail(scope)
    if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
    await scrollTimelineDetailModalIntoView()
  }

  async function openTimelineRowDetails(row: HybridTimelineRow) {
    await openSelectedTimelineScope(buildSelectedTimelineScopeState(row))
  }

  async function openProjectScopeDetails() {
    await openSelectedTimelineScope(buildProjectScopeState())
  }

  async function openTaskScopeDetails(taskId?: string, sprintId?: string) {
    if (!taskId) return
    const scope = buildTaskScopeState(taskId, sprintId)
    if (!scope) return
    await openSelectedTimelineScope(scope)
  }

  function closeTimelineRowDetails() {
    hideTimelineTooltip()
    timelineScopeDetailRequestId.value += 1
    resetTimelineScopeDetailState()
    selectedTimelineRowState.value = null
  }

  async function openTimelineSprintInKanban(sprintId?: string) {
    closeTimelineRowDetails()
    if (!sprintId) {
      activeTaskId.value = ''
      selectModule('kanban')
      return
    }
    activeTaskId.value = ''
    activeSprintId.value = sprintId
    selectModule('kanban')
  }

  function openTimelineTask(taskId: string, sprintId?: string) {
    const normalizedTaskId = normalizeTaskScopeId(taskId)
    closeTimelineRowDetails()
    void focusTask(normalizedTaskId, sprintId, 'kanban')
  }

  function openTimelinePhaseEditor() {
    closeTimelineRowDetails()
    selectModule('phases')
  }

  // === Governance ===

  const timelineGovernanceSettingOrder = [
    'communicationChannel', 'approvalMode', 'visibility', 'requiredResponsibilities',
    'reviewCadenceDays', 'reminderCadenceDays', 'slaHours', 'escalateOnBlocked',
  ] as const

  const timelineGovernanceSettingLabels: Record<string, string> = {
    communicationChannel: 'Канал коммуникации', approvalMode: 'Режим согласования',
    visibility: 'Видимость', requiredResponsibilities: 'Обязательные роли',
    reviewCadenceDays: 'Ревью, дней', reminderCadenceDays: 'Напоминание, дней',
    slaHours: 'SLA, часов', escalateOnBlocked: 'Эскалация при блокере',
  }

  const timelineGovernanceOriginLabels: Record<ProjectScopeDetailBundle['participants'][number]['origin'], string> = {
    direct: 'контур', project: 'проект', derived: 'legacy',
  }

  const timelineGovernanceParticipants = computed(() => {
    return (timelineScopeDetail.value?.participants || []).map(participant => ({
      ...participant,
      editable: participant.origin === 'direct' && /^assignment:\d+$/.test(participant.assignmentId),
      originLabel: timelineGovernanceOriginLabels[participant.origin],
    }))
  })

  const canCreateTimelineGovernanceParticipant = computed(() => {
    return Boolean(
      timelineScopeDetail.value
      && timelineGovernanceParticipantDraft.displayName.trim()
      && !timelineGovernancePending.value,
    )
  })

  const timelineGovernanceEditableSettings = computed(() => {
    const detail = timelineScopeDetail.value
    if (!detail) {
      return [] as Array<{ key: string; label: string; kind: TimelineGovernanceSettingFieldKind; value: string | number | boolean | null }>
    }

    const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
    const knownKeys = timelineGovernanceSettingOrder.filter(key => key in timelineGovernanceSettingsDraft.value)
    const dynamicKeys = Object.keys(timelineGovernanceSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof timelineGovernanceSettingOrder[number]))
    const keys = [...knownKeys, ...dynamicKeys]

    return keys.map((key) => {
      const rawValue = timelineGovernanceSettingsDraft.value[key]

      if (key === 'communicationChannel') {
        return { key, label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key, kind: 'select' as const, value: typeof rawValue === 'string' ? rawValue : '' }
      }
      if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
        return { key, label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key, kind: 'number' as const, value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue) }
      }
      if (key === 'escalateOnBlocked') {
        return { key, label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key, kind: 'boolean' as const, value: Boolean(rawValue) }
      }
      if (key === 'requiredResponsibilities') {
        return { key, label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key, kind: 'list' as const, value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '' }
      }
      return { key, label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key, kind: 'text' as const, value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue) }
    })
  })

  watch(() => timelineScopeDetail.value?.revision, () => {
    timelineGovernanceSettingsDraft.value = cloneTimelineGovernanceSettings(timelineScopeDetail.value?.settings || {})
    timelineGovernanceError.value = ''
    timelineGovernanceNotice.value = ''
  }, { immediate: true })

  function cloneTimelineGovernanceSettings(settings: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
  }

  function normalizeTimelineGovernanceError(error: unknown, fallback: string) {
    if (!error || typeof error !== 'object') return fallback
    const record = error as { statusMessage?: string; message?: string; data?: { statusMessage?: string; message?: string } }
    return String(record.data?.statusMessage || record.statusMessage || record.data?.message || record.message || fallback).trim() || fallback
  }

  function extractTimelineGovernanceAssignmentId(assignmentId: string) {
    const match = assignmentId.match(/^assignment:(\d+)$/)
    return match ? Number(match[1]) : 0
  }

  function normalizeTimelineGovernanceSettingValue(kind: TimelineGovernanceSettingFieldKind, value: unknown) {
    if (kind === 'boolean') return Boolean(value)
    if (kind === 'number') {
      const normalized = typeof value === 'number' ? value : Number(String(value || '').trim())
      return Number.isFinite(normalized) ? normalized : null
    }
    if (kind === 'list') return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
  }

  function updateTimelineGovernanceSettingDraft(key: string, kind: TimelineGovernanceSettingFieldKind, value: unknown) {
    timelineGovernanceSettingsDraft.value = {
      ...timelineGovernanceSettingsDraft.value,
      [key]: normalizeTimelineGovernanceSettingValue(kind, value),
    }
  }

  async function refreshTimelineGovernanceView(refreshControl = false) {
    const selectedRow = selectedTimelineRowDetails.value
    const jobs: Array<Promise<unknown>> = []
    if (selectedRow) jobs.push(fetchTimelineScopeDetail(selectedRow))
    if (refreshControl) jobs.push(Promise.resolve(refresh()))
    if (!jobs.length) return
    await Promise.allSettled(jobs)
  }

  async function runTimelineGovernanceMutation(
    execute: () => Promise<void>,
    successMessage: string,
    refreshControl = false,
    fallbackMessage = 'Не удалось обновить контур проекта.',
  ) {
    timelineGovernancePending.value = true
    timelineGovernanceError.value = ''
    timelineGovernanceNotice.value = ''
    try {
      await execute()
      await refreshTimelineGovernanceView(refreshControl)
      timelineGovernanceNotice.value = successMessage
      return true
    } catch (error) {
      timelineGovernanceError.value = normalizeTimelineGovernanceError(error, fallbackMessage)
      return false
    } finally {
      timelineGovernancePending.value = false
    }
  }

  async function createTimelineGovernanceParticipant() {
    const detail = timelineScopeDetail.value
    const displayName = timelineGovernanceParticipantDraft.displayName.trim()
    if (!detail || !displayName) {
      timelineGovernanceError.value = 'Сначала откройте контур и заполните имя участника.'
      return
    }
    await runTimelineGovernanceMutation(async () => {
      const participantResponse = await $fetch<TimelineGovernanceMutationResponse>(`/api/projects/${slug.value}/coordination/participants`, {
        method: 'POST',
        body: { displayName, roleKey: timelineGovernanceParticipantDraft.roleKey, sourceKind: 'custom' },
      })
      await $fetch(`/api/projects/${slug.value}/coordination/assignments`, {
        method: 'POST',
        body: {
          participantId: participantResponse.participant.persistedId,
          scopeType: detail.scope.scopeType,
          scopeSource: detail.scope.scopeSource,
          scopeId: detail.scope.scopeId,
          responsibility: timelineGovernanceParticipantDraft.responsibility,
        },
      })
      timelineGovernanceParticipantDraft.displayName = ''
    }, 'Участник добавлен в контур.', true, 'Не удалось добавить участника в контур.')
  }

  async function updateTimelineGovernanceAssignment(assignmentId: string, responsibility: ProjectResponsibilityKey) {
    const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
    if (!persistedAssignmentId) {
      timelineGovernanceError.value = 'Не удалось определить назначение для обновления.'
      return
    }
    await runTimelineGovernanceMutation(async () => {
      await $fetch(`/api/projects/${slug.value}/coordination/assignments/${persistedAssignmentId}`, {
        method: 'PATCH', body: { responsibility },
      })
    }, 'Назначение обновлено.', true, 'Не удалось обновить назначение.')
  }

  async function deleteTimelineGovernanceAssignment(assignmentId: string) {
    const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
    if (!persistedAssignmentId) {
      timelineGovernanceError.value = 'Не удалось определить назначение для удаления.'
      return
    }
    await runTimelineGovernanceMutation(async () => {
      await $fetch(`/api/projects/${slug.value}/coordination/assignments/${persistedAssignmentId}`, { method: 'DELETE' })
    }, 'Назначение удалено.', true, 'Не удалось удалить назначение.')
  }

  async function commitTimelineGovernanceSettings() {
    const detail = timelineScopeDetail.value
    if (!detail) return
    await runTimelineGovernanceMutation(async () => {
      await $fetch(`/api/projects/${slug.value}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
        method: 'PATCH',
        body: { settings: cloneTimelineGovernanceSettings(timelineGovernanceSettingsDraft.value) },
      })
    }, 'Настройки контура обновлены.', false, 'Не удалось обновить настройки контура.')
  }

  function handleTimelineGovernanceResponsibilityChange(assignmentId: string, event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value as ProjectResponsibilityKey | undefined
    if (!value) return
    void updateTimelineGovernanceAssignment(assignmentId, value)
  }

  function handleTimelineGovernanceSelectSettingChange(key: string, event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value || ''
    updateTimelineGovernanceSettingDraft(key, 'select', value)
    void commitTimelineGovernanceSettings()
  }

  function handleTimelineGovernanceBooleanSettingChange(key: string, event: Event) {
    const checked = Boolean((event.target as HTMLInputElement | null)?.checked)
    updateTimelineGovernanceSettingDraft(key, 'boolean', checked)
    void commitTimelineGovernanceSettings()
  }

  function handleTimelineGovernanceTextSettingInput(key: string, kind: TimelineGovernanceSettingFieldKind, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
    updateTimelineGovernanceSettingDraft(key, kind, value)
  }

  const projectParticipantRoleOptions = PROJECT_PARTICIPANT_ROLE_KEYS.map(value => ({
    value, label: getProjectParticipantRoleLabel(value),
  }))

  const projectGovernanceResponsibilityOptions = PROJECT_RESPONSIBILITY_KEYS.map(value => ({
    value, label: getProjectResponsibilityLabel(value),
  }))

  // === Return ===

  return {
    // Scale
    timelineScale,
    timelineScaleOptions,
    // Drag
    timelineDrag,
    // Rows & layout
    timelineRows,
    visibleTimelineRows,
    timelineBounds,
    timelineColumns,
    timelineGroups,
    timelineGridStyle,
    timelineBoardStyle,
    timelineEditingEnabled,
    timelineWindowLabel,
    timelineStats,
    // Collapse
    timelineCollapsedPhases,
    timelineSprintCountByPhase,
    hasCollapsibleTimelinePhases,
    allTimelinePhasesCollapsed,
    getTimelinePhaseSprintCount,
    isTimelinePhaseCollapsed,
    toggleTimelinePhase,
    toggleAllTimelinePhases,
    // Selected row
    selectedTimelineRowDetails,
    selectedTimelinePhase,
    selectedTimelineSprint,
    selectedTimelineTaskSprintId,
    selectedTimelineDetailCards,
    // Detail panels
    timelineScopeDetail,
    timelineScopeDetailPending,
    timelineScopeDetailError,
    timelineScopeTypeLabels,
    timelineDetailRules,
    timelineDetailSubjects,
    timelineDetailObjects,
    timelineDetailActions,
    timelineDetailSettings,
    timelineDetailLinkedScopes,
    timelineDetailTasks,
    // Tooltip
    timelineTooltip,
    timelineTooltipStyle,
    clearTimelineTooltipTimer,
    scheduleTimelineTooltip,
    hideTimelineTooltip,
    // Bar style
    getTimelineBarStyle,
    formatDateRange,
    isTimelineRowSelected,
    // Drag functions
    onReorderDragStart,
    onScheduleDragStart,
    onResizeDragStart,
    onRowDragOver,
    onTimelineWeekDragOver,
    onDragEnd,
    onRowDrop,
    onTimelineWeekDrop,
    // Scope detail / navigation
    openTimelineRowDetails,
    openProjectScopeDetails,
    openTaskScopeDetails,
    closeTimelineRowDetails,
    openTimelineSprintInKanban,
    openTimelineTask,
    openTimelinePhaseEditor,
    // Governance
    timelineGovernancePending,
    timelineGovernanceError,
    timelineGovernanceNotice,
    timelineGovernanceParticipantDraft,
    timelineGovernanceSettingsDraft,
    timelineGovernanceParticipants,
    timelineGovernanceEditableSettings,
    canCreateTimelineGovernanceParticipant,
    timelineGovernanceOriginLabels,
    createTimelineGovernanceParticipant,
    deleteTimelineGovernanceAssignment,
    handleTimelineGovernanceResponsibilityChange,
    handleTimelineGovernanceSelectSettingChange,
    handleTimelineGovernanceBooleanSettingChange,
    handleTimelineGovernanceTextSettingInput,
    commitTimelineGovernanceSettings,
    projectParticipantRoleOptions,
    projectGovernanceResponsibilityOptions,
  }
}
