import { computed, nextTick, ref, watch, type ComputedRef } from 'vue'
import { formatHybridTimelineDateRange } from '~~/shared/utils/project/project-control-timeline'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~~/shared/types/project/project'

export interface UseClientProjectControlExecutionOptions {
  control: ComputedRef<HybridControl>
  summary: ComputedRef<any>
  taskStatusLabels: Record<HybridControlTask['status'], string>
}

export interface ClientProjectControlExecutionStat {
  label: string
  value: string
}

export interface ClientProjectControlSprintColumn {
  status: HybridControlTask['status']
  label: string
  tasks: HybridControlTask[]
}

export function useClientProjectControlExecution(options: UseClientProjectControlExecutionOptions) {
  const {
    control,
    summary,
    taskStatusLabels,
  } = options

  const route = useRoute()
  const router = useRouter()

  const CONTROL_QUERY_SPRINT_KEY = 'controlSprint'
  const CONTROL_QUERY_TASK_KEY = 'controlTask'

  const taskStatuses: HybridControlTask['status'][] = ['todo', 'doing', 'review', 'done']
  const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  })

  const selectedSprintId = ref('')
  const selectedTaskId = ref('')
  const sprintDetailRef = ref<HTMLElement | null>(null)

  let syncingControlStateFromRoute = false

  function parseControlSprintQuery(value: unknown) {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw : ''
  }

  function parseControlTaskQuery(value: unknown) {
    const raw = Array.isArray(value) ? value[0] : value
    return typeof raw === 'string' ? raw : ''
  }

  function readControlStateFromRoute() {
    syncingControlStateFromRoute = true
    selectedSprintId.value = parseControlSprintQuery(route.query[CONTROL_QUERY_SPRINT_KEY])
    selectedTaskId.value = parseControlTaskQuery(route.query[CONTROL_QUERY_TASK_KEY])
    syncingControlStateFromRoute = false
  }

  async function syncControlStateToRoute() {
    if (syncingControlStateFromRoute) return

    const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>

    if (selectedSprintId.value) nextQuery[CONTROL_QUERY_SPRINT_KEY] = selectedSprintId.value
    else delete nextQuery[CONTROL_QUERY_SPRINT_KEY]

    if (selectedTaskId.value) nextQuery[CONTROL_QUERY_TASK_KEY] = selectedTaskId.value
    else delete nextQuery[CONTROL_QUERY_TASK_KEY]

    const currentSprint = Array.isArray(route.query[CONTROL_QUERY_SPRINT_KEY]) ? route.query[CONTROL_QUERY_SPRINT_KEY][0] : route.query[CONTROL_QUERY_SPRINT_KEY]
    const currentTask = Array.isArray(route.query[CONTROL_QUERY_TASK_KEY]) ? route.query[CONTROL_QUERY_TASK_KEY][0] : route.query[CONTROL_QUERY_TASK_KEY]
    const nextSprint = typeof nextQuery[CONTROL_QUERY_SPRINT_KEY] === 'string' ? nextQuery[CONTROL_QUERY_SPRINT_KEY] : undefined
    const nextTask = typeof nextQuery[CONTROL_QUERY_TASK_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TASK_KEY] : undefined

    if (currentSprint === nextSprint && currentTask === nextTask) return
    await router.replace({ query: nextQuery })
  }

  const phaseGateStats = computed(() => control.value.phases.reduce((acc, phase) => {
    acc.total += phase.gates.length
    acc.done += phase.gates.filter(gate => gate.done).length
    return acc
  }, { done: 0, total: 0 }))

  const sprintTaskStats = computed(() => control.value.sprints.reduce((acc, sprint) => {
    acc.total += sprint.tasks.length
    acc.done += sprint.tasks.filter(task => task.status === 'done').length
    acc.active += sprint.tasks.filter(task => task.status === 'doing' || task.status === 'review').length
    return acc
  }, { done: 0, total: 0, active: 0 }))

  const phaseStats = computed(() => ([
    { label: 'Фаз', value: `${control.value.phases.length}` },
    { label: 'Активных', value: `${control.value.phases.filter(phase => phase.status === 'active').length}` },
    { label: 'Гейтов', value: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total}` : '0' },
    { label: 'Завершено', value: `${control.value.phases.filter(phase => phase.status === 'done').length}` },
  ]))

  const sprintStats = computed(() => ([
    { label: 'Спринтов', value: `${control.value.sprints.length}` },
    { label: 'Активных', value: `${control.value.sprints.filter(sprint => sprint.status === 'active').length}` },
    { label: 'Задач', value: `${sprintTaskStats.value.total}` },
    { label: 'Готово', value: sprintTaskStats.value.total ? `${sprintTaskStats.value.done}/${sprintTaskStats.value.total}` : '0' },
  ]))

  const selectedTask = computed<HybridControlTask | null>(() => {
    const taskId = selectedTaskId.value
    if (!taskId) return null
    return control.value.sprints.flatMap(sprint => sprint.tasks).find(task => task.id === taskId) || null
  })

  const selectedSprint = computed<HybridControlSprint | null>(() => control.value.sprints.find(sprint => sprint.id === selectedSprintId.value)
    || (summary.value.activeSprint as HybridControlSprint | null)
    || control.value.sprints[0]
    || null)

  watch(() => route.query[CONTROL_QUERY_SPRINT_KEY], () => {
    readControlStateFromRoute()
  }, { immediate: true })

  watch(() => route.query[CONTROL_QUERY_TASK_KEY], () => {
    readControlStateFromRoute()
  }, { immediate: true })

  watch(selectedTaskId, (taskId) => {
    if (taskId) {
      const taskContext = getTaskContext(taskId)
      if (taskContext?.sprint.id && selectedSprintId.value !== taskContext.sprint.id) {
        selectedSprintId.value = taskContext.sprint.id
      }
    }
  }, { immediate: true })

  watch([selectedSprintId, selectedTaskId], async ([sprintId, taskId]) => {
    await syncControlStateToRoute()

    if (taskId) {
      await scrollClientControlTargetIntoView({ sprintId, taskId })
      return
    }

    if (sprintId) {
      await scrollClientControlTargetIntoView({ sprintId })
    }
  }, { immediate: true })

  watch(() => control.value.sprints.map(sprint => sprint.id), (sprintIds) => {
    if (selectedSprintId.value && !sprintIds.includes(selectedSprintId.value)) {
      selectedSprintId.value = ''
    }
  }, { immediate: true })

  watch(() => control.value.sprints.flatMap(sprint => sprint.tasks.map(task => task.id)), (taskIds) => {
    if (selectedTaskId.value && !taskIds.includes(selectedTaskId.value)) {
      selectedTaskId.value = ''
    }

    if (selectedTaskId.value) {
      const taskContext = getTaskContext(selectedTaskId.value)
      if (taskContext?.sprint.id && selectedSprintId.value !== taskContext.sprint.id) {
        selectedSprintId.value = taskContext.sprint.id
      }
    }
  }, { immediate: true })

  const selectedSprintPhaseTitle = computed(() => {
    if (!selectedSprint.value?.linkedPhaseKey) return 'Без фазы'
    return getPhaseTitleByKey(selectedSprint.value.linkedPhaseKey)
  })

  const selectedSprintStats = computed(() => {
    const sprint = selectedSprint.value
    if (!sprint) return []

    const total = sprint.tasks.length
    const done = sprint.tasks.filter(task => task.status === 'done').length
    const active = sprint.tasks.filter(task => task.status === 'doing' || task.status === 'review').length

    return [
      { label: 'Фаза', value: selectedSprintPhaseTitle.value },
      { label: 'Период', value: formatDateRange(sprint.startDate, sprint.endDate) },
      { label: 'Готово', value: total ? `${done}/${total}` : '0' },
      { label: 'В работе', value: `${active}` },
    ]
  })

  const selectedSprintColumns = computed(() => taskStatuses.map(status => ({
    status,
    label: taskStatusLabels[status],
    tasks: (selectedSprint.value?.tasks ?? []).filter(task => task.status === status),
  })))

  const selectedTaskStats = computed(() => {
    const task = selectedTask.value
    if (!task) return []

    return [
      { label: 'Статус', value: taskStatusLabels[task.status] },
      { label: 'Исполнитель', value: task.assignee || 'не назначен' },
      { label: 'Дедлайн', value: formatTaskDueDate(task.dueDate) },
      { label: 'Фаза', value: selectedSprintPhaseTitle.value },
    ]
  })

  function formatDateRange(startDate?: string, endDate?: string) {
    return formatHybridTimelineDateRange(startDate, endDate)
  }

  function formatTaskDueDate(value?: string) {
    if (!value) return 'без дедлайна'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return taskDateFormatter.format(parsed)
  }

  function getPhaseById(phaseId?: string) {
    if (!phaseId) return null
    return control.value.phases.find(phase => phase.id === phaseId) || null
  }

  function getSprintById(sprintId?: string) {
    if (!sprintId) return null
    return control.value.sprints.find(sprint => sprint.id === sprintId) || null
  }

  function getPhaseGateProgress(phase: HybridControlPhase) {
    if (!phase.gates.length) return '0'
    return `${phase.gates.filter(gate => gate.done).length}/${phase.gates.length}`
  }

  function getSprintCompletionLabel(sprint: HybridControlSprint) {
    if (!sprint.tasks.length) return '0/0'
    return `${sprint.tasks.filter(task => task.status === 'done').length}/${sprint.tasks.length}`
  }

  function getTaskContext(taskId?: string) {
    if (!taskId) return null

    for (const sprint of control.value.sprints) {
      const task = sprint.tasks.find(item => item.id === taskId)
      if (task) {
        return { sprint, task }
      }
    }

    return null
  }

  async function scrollClientControlTargetIntoView(target: { sprintId?: string; taskId?: string }) {
    if (!import.meta.client || typeof document === 'undefined') return

    await nextTick()

    if (target.taskId) {
      document.querySelector<HTMLElement>(`[data-client-task-id="${target.taskId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (target.sprintId) {
      const sprintTarget = sprintDetailRef.value
        || document.querySelector<HTMLElement>(`[data-client-sprint-detail-id="${target.sprintId}"]`)
        || document.querySelector<HTMLElement>(`[data-sprint-id="${target.sprintId}"]`)

      sprintTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function scrollClientPhaseIntoView(phaseId?: string) {
    if (!phaseId || !import.meta.client || typeof document === 'undefined') return

    await nextTick()
    document.querySelector<HTMLElement>(`[data-client-phase-id="${phaseId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function focusSprint(sprintId?: string) {
    if (!sprintId) return

    selectedSprintId.value = sprintId
    selectedTaskId.value = ''
  }

  function isSelectedSprint(sprint: HybridControlSprint) {
    return selectedSprint.value?.id === sprint.id
  }

  function selectTask(taskId?: string, sprintId?: string) {
    if (!taskId) return

    const taskContext = getTaskContext(taskId)
    selectedTaskId.value = taskId
    selectedSprintId.value = sprintId || taskContext?.sprint.id || selectedSprintId.value
  }

  function isSelectedTask(task: HybridControlTask) {
    return selectedTask.value?.id === task.id
  }

  function clearTaskFocus() {
    selectedTaskId.value = ''
  }

  function openCallInsightTasks(insight: HybridControlCallInsight) {
    const taskIds = insight.appliedTaskIds || []
    const relatedSprint = control.value.sprints.find(sprint => sprint.id === insight.appliedSprintId)
      || control.value.sprints.find(sprint => sprint.tasks.some(task => taskIds.includes(task.id)))

    if (taskIds.length === 1) {
      selectTask(taskIds[0], relatedSprint?.id)
      return
    }

    if (relatedSprint) {
      focusSprint(relatedSprint.id)
    }
  }

  function getPhaseTitleByKey(phaseKey?: string) {
    if (!phaseKey) return 'Без привязки'
    return control.value.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
  }

  return {
    sprintDetailRef,
    phaseStats,
    sprintStats,
    selectedTask,
    selectedSprint,
    selectedSprintPhaseTitle,
    selectedSprintStats,
    selectedSprintColumns,
    selectedTaskStats,
    formatDateRange,
    formatTaskDueDate,
    getPhaseById,
    getSprintById,
    getPhaseGateProgress,
    getSprintCompletionLabel,
    getTaskContext,
    scrollClientPhaseIntoView,
    focusSprint,
    isSelectedSprint,
    selectTask,
    isSelectedTask,
    clearTaskFocus,
    openCallInsightTasks,
    getPhaseTitleByKey,
  }
}
