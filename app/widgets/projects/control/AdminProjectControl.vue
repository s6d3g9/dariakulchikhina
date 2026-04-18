<template>
  <div ref="controlShell" class="hpc-root">
    <div v-if="pending" class="ent-content-loading">
      <div v-for="i in 6" :key="i" class="ent-skeleton-line" />
    </div>

    <template v-else>

      <nav
        ref="moduleNavRef"
        class="hpc-module-nav"
        :class="{ 'hpc-module-nav--mobile-visible': isMobileModuleDockVisible }"
        aria-label="Разделы контроля проекта"
      >
        <button
          v-for="moduleCard in moduleCards"
          :key="moduleCard.id"
          type="button"
          class="hpc-module-nav__btn"
          :class="{ 'hpc-module-nav__btn--active': activeModule === moduleCard.id }"
          :aria-current="activeModule === moduleCard.id ? 'page' : undefined"
          :aria-label="`${moduleCard.label}: ${moduleCard.metric}`"
          :title="moduleCard.label"
          @click="selectModule(moduleCard.id)"
        >
          <span class="hpc-module-nav__icon-wrap" aria-hidden="true">
            <span class="hpc-module-nav__glyph">{{ moduleCard.glyph }}</span>
          </span>
          <span class="hpc-module-nav__label">{{ moduleCard.navLabel }}</span>
        </button>
      </nav>

      <div ref="moduleViewportStart" class="hpc-module-anchor" aria-hidden="true" />

      <section v-if="activeModule !== 'overview'" class="hpc-module-hero">
        <div>
          <p class="hpc-eyebrow">Контур контроля</p>
          <h2 class="hpc-title">{{ activeModuleCard.label }}</h2>
          <p class="hpc-module-hero__meta">{{ activeModuleCard.meta }}</p>
        </div>
        <div class="hpc-summary__meta">
          <span class="hpc-chip">{{ activeModuleCard.metric }}</span>
          <span v-if="saveMetaText" class="hpc-saved" :class="{ 'hpc-saved--error': saveState === 'error' }">{{ saveMetaText }}</span>
        </div>
      </section>

      <ControlOverviewSection
        v-show="activeModule === 'overview'"
        :control="control"
        :summary="summary"
        :save-meta-text="saveMetaText"
        :save-state="saveState"
        @save="save"
        @open-project-scope-details="openProjectScopeDetails"
      />


      <ControlCommunicationsSection
        v-show="activeModule === 'communications'"
        :control="control"
        :slug="props.slug"
        :project="project"
        @save="save"
        @focus-task="(taskId: string, sprintId?: string) => focusTask(taskId, sprintId, 'kanban')"
        @open-sprint-in-kanban="(sprintId?: string) => openTimelineSprintInKanban(sprintId)"
      />

      <ControlTimelineSection
        v-show="activeModule === 'timeline'"
        ref="timelineSectionRef"
        :control="control"
        :slug="props.slug"
        :project-title="project?.title || 'Проект'"
        :project-status="project?.status || ''"
        :summary="summary"
        @save="save"
        @open-timeline-sprint-in-kanban="openTimelineSprintInKanban"
        @open-timeline-phase-editor="openTimelinePhaseEditor"
        @focus-task="(taskId: string, sprintId?: string) => focusTask(taskId, sprintId, 'kanban')"
        @open-task-scope-details="(taskId?: string, sprintId?: string) => openTaskScopeDetailsFromTimeline(taskId, sprintId)"
      />


      <section class="hpc-section hpc-section--phases" v-show="activeModule === 'phases'">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Фазовый слой</p>
            <h3 class="hpc-section__title">Базовые этапы и привязка спринтов</h3>
          </div>
        </div>

        <div class="hpc-phase-shell">
          <div class="hpc-phase-overview">
            <article v-for="stat in phaseStats" :key="stat.label" class="hpc-phase-stat">
              <span class="hpc-phase-stat__label">{{ stat.label }}</span>
              <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div class="hpc-phase-board-card">
            <AdminProjectPhaseBoard :control="control" @save="save" />
          </div>

          <div class="hpc-phase-list">
            <article v-for="phase in control.phases" :key="phase.id" class="hpc-phase-card">
              <div class="hpc-phase-card__head">
                <div>
                  <p class="hpc-phase-card__kicker">{{ phase.phaseKey }}</p>
                  <h4 class="hpc-phase-card__title">{{ phase.title }}</h4>
                </div>
                <div class="hpc-phase-card__head-right">
                  <select v-model="phase.status" class="u-status-sel" @change="save">
                    <option v-for="option in phaseStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                  <span class="hpc-chip">{{ phase.percent || 0 }}%</span>
                </div>
              </div>

              <div class="hpc-phase-card__body">
                <div class="hpc-grid">
                  <div class="u-field">
                    <label class="u-field__label">Ответственный</label>
                    <GlassInput v-model="phase.owner" placeholder="Ответственный" @blur="save" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Прогресс, %</label>
                    <GlassInput v-model.number="phase.percent" type="number" min="0" max="100" @blur="save" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Плановый старт</label>
                    <AppDatePicker v-model="phase.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Плановый финиш</label>
                    <AppDatePicker v-model="phase.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
                  </div>
                  <div class="u-field u-field--full">
                    <label class="u-field__label">Ключевой результат</label>
                      <GlassTextarea v-model="phase.deliverable" :rows="2" @blur="save" />
                  </div>
                  <div class="u-field u-field--full">
                    <label class="u-field__label">Заметка менеджера</label>
                      <GlassTextarea v-model="phase.notes" :rows="2" @blur="save" />
                  </div>
                </div>
              </div>

              <div class="hpc-phase-card__footer">
                <p class="hpc-phase-card__subhead">Контрольные гейты</p>
                <div class="hpc-gates">
                  <label v-for="gate in phase.gates" :key="gate.id" class="hpc-gate-row">
                    <input v-model="gate.done" class="hpc-gate-row__check" type="checkbox" @change="save" />
                    <span class="hpc-gate-row__label">{{ gate.label }}</span>
                  </label>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="hpc-section" v-show="activeModule === 'kanban'">
        <AdminProjectKanban
          :control="control"
          :active-sprint-id="activeSprintId"
          :active-task-id="activeTaskId"
          @save="save"
          @update:active-task="setActiveTaskId"
        />
      </section>


      <ControlSprintsSection
        v-show="activeModule === 'phases'"
        :control="control"
        :active-sprint-id="activeSprintId"
        :active-task-id="activeTaskId"
        :summary="summary"
        @save="save"
        @update:active-sprint-id="id => { activeSprintId = id }"
        @update:active-task-id="id => { activeTaskId = id }"
        @open-task-scope-details="openTaskScopeDetailsFromTimeline"
      />

      <ControlHealthSection v-show="activeModule === 'health'" :control="control" @save="save" />


    </template>

  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import ControlTimelineSection from './sections/ControlTimelineSection.vue'
import {
  buildHybridControlSummary,
  buildHybridCoordinationBrief,
  ensureHybridControl,
  getHealthTone,
  getHybridCommunicationChannelLabel,
  getHybridControlManagerAgentRoleLabel,
  getHybridStakeholderRoleLabel,
} from '~~/shared/utils/project-control'
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
} from '~~/shared/utils/project-control-timeline'
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_RESPONSIBILITY_KEYS,
  type ProjectParticipantRoleKey,
  type ProjectResponsibilityKey,
  type ProjectScopeType,
} from '~~/shared/types/project-governance'
import {
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~~/shared/utils/project-governance'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlCommunicationChannel,
  HybridControlCommunicationRule,
  HybridControlManagerAgentRole,
  HybridControlSprint,
  HybridControlStakeholderRole,
  HybridControlTeamMember,
  HybridControlTask,
} from '~~/shared/types/project'
import type { ProjectScopeDetailBundle } from '~~/shared/types/project-governance'

const modules = [
  { id: 'overview', label: 'Обзор' },
  { id: 'timeline', label: 'Таймлайн / Таблица' },
  { id: 'phases', label: 'Этапы и Спринты' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'health', label: 'Контрольные точки' },
  { id: 'communications', label: 'Звонки и Агенты' }
] as const

type ControlModuleId = (typeof modules)[number]['id']
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

type SaveOptions = {
  refreshAfter?: boolean
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

const CONTROL_QUERY_TAB_KEY = 'controlTab'
const CONTROL_QUERY_SPRINT_KEY = 'controlSprint'
const CONTROL_QUERY_TASK_KEY = 'controlTask'
const controlModuleIds = new Set<ControlModuleId>(modules.map(module => module.id))

const activeModule = ref<ControlModuleId>('overview')

const props = defineProps<{ slug: string }>()
const route = useRoute()
const router = useRouter()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const control = reactive<HybridControl>(ensureHybridControl(undefined))
const saveState = ref<'idle' | 'saving' | 'error'>('idle')
const activeSprintId = ref('')
const activeTaskId = ref('')
const controlShell = ref<HTMLElement | null>(null)
const moduleNavRef = ref<HTMLElement | null>(null)
const moduleViewportStart = ref<HTMLElement | null>(null)
const timelineSectionRef = ref<InstanceType<typeof ControlTimelineSection> | null>(null)
const isMobileModuleDockVisible = ref(true)
let moduleDockSyncFrame = 0

import {
  checkpointStatusLabels,
  phaseStatusOptions,
  sprintStatusLabels,
  sprintStatusOptions,
  taskStatusLabels,
} from './model/control-options'

const taskStatuses: HybridControlTask['status'][] = ['todo', 'doing', 'review', 'done']
const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
})

const timelineScale = ref<HybridTimelineScale>('weeks')

const timelineScaleOptions = (
  ['months', 'weeks', 'days', 'hours'] as const satisfies readonly HybridTimelineScale[]
).map(value => ({ value, label: getHybridTimelineScaleLabel(value) }))

type TimelineDragKind = 'idle' | 'reorder' | 'schedule' | 'resize-start' | 'resize-end'

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

let syncingControlStateFromRoute = false

function parseControlModuleQuery(value: unknown): ControlModuleId {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && controlModuleIds.has(raw as ControlModuleId)
    ? raw as ControlModuleId
    : 'overview'
}

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
  activeModule.value = parseControlModuleQuery(route.query[CONTROL_QUERY_TAB_KEY])
  activeSprintId.value = parseControlSprintQuery(route.query[CONTROL_QUERY_SPRINT_KEY])
  activeTaskId.value = parseControlTaskQuery(route.query[CONTROL_QUERY_TASK_KEY])
  syncingControlStateFromRoute = false
}

async function syncControlStateToRoute() {
  if (syncingControlStateFromRoute) return

  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>

  if (activeModule.value !== 'overview') nextQuery[CONTROL_QUERY_TAB_KEY] = activeModule.value
  else delete nextQuery[CONTROL_QUERY_TAB_KEY]

  if (activeSprintId.value) nextQuery[CONTROL_QUERY_SPRINT_KEY] = activeSprintId.value
  else delete nextQuery[CONTROL_QUERY_SPRINT_KEY]

  if (activeTaskId.value) nextQuery[CONTROL_QUERY_TASK_KEY] = activeTaskId.value
  else delete nextQuery[CONTROL_QUERY_TASK_KEY]

  const currentTab = Array.isArray(route.query[CONTROL_QUERY_TAB_KEY]) ? route.query[CONTROL_QUERY_TAB_KEY][0] : route.query[CONTROL_QUERY_TAB_KEY]
  const currentSprint = Array.isArray(route.query[CONTROL_QUERY_SPRINT_KEY]) ? route.query[CONTROL_QUERY_SPRINT_KEY][0] : route.query[CONTROL_QUERY_SPRINT_KEY]
  const currentTask = Array.isArray(route.query[CONTROL_QUERY_TASK_KEY]) ? route.query[CONTROL_QUERY_TASK_KEY][0] : route.query[CONTROL_QUERY_TASK_KEY]
  const nextTab = typeof nextQuery[CONTROL_QUERY_TAB_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TAB_KEY] : undefined
  const nextSprint = typeof nextQuery[CONTROL_QUERY_SPRINT_KEY] === 'string' ? nextQuery[CONTROL_QUERY_SPRINT_KEY] : undefined
  const nextTask = typeof nextQuery[CONTROL_QUERY_TASK_KEY] === 'string' ? nextQuery[CONTROL_QUERY_TASK_KEY] : undefined

  if (currentTab === nextTab && currentSprint === nextSprint && currentTask === nextTask) return
  await router.replace({ query: nextQuery })
}

watch(project, (value) => {
  if (!value) return
  Object.assign(control, ensureHybridControl(value.profile?.hybridControl, value))
}, { immediate: true })

watch(() => [route.query[CONTROL_QUERY_TAB_KEY], route.query[CONTROL_QUERY_SPRINT_KEY], route.query[CONTROL_QUERY_TASK_KEY]], () => {
  readControlStateFromRoute()
}, { immediate: true })

watch(activeModule, async () => {
  await syncControlStateToRoute()
})

watch(activeSprintId, async () => {
  await syncControlStateToRoute()
})

watch(activeTaskId, async (taskId) => {
  if (taskId) {
    const taskContext = getTaskContext(taskId)
    if (taskContext?.sprint.id && activeSprintId.value !== taskContext.sprint.id) {
      activeSprintId.value = taskContext.sprint.id
    }
  }

  await syncControlStateToRoute()
})

watch(() => control.sprints.map(sprint => sprint.id), (sprintIds) => {
  if (activeSprintId.value && !sprintIds.includes(activeSprintId.value)) {
    activeSprintId.value = ''
  }
}, { immediate: true })

watch(() => control.sprints.flatMap(sprint => sprint.tasks.map(task => task.id)), (taskIds) => {
  if (activeTaskId.value && !taskIds.includes(activeTaskId.value)) {
    activeTaskId.value = ''
  }

  if (activeTaskId.value) {
    const taskContext = getTaskContext(activeTaskId.value)
    if (taskContext?.sprint.id && activeSprintId.value !== taskContext.sprint.id) {
      activeSprintId.value = taskContext.sprint.id
    }
  }
}, { immediate: true })

const summary = computed(() => buildHybridControlSummary(control))
const coordinationBrief = computed(() => buildHybridCoordinationBrief(control, { projectSlug: props.slug }))

import { communicationChannelOptions, stakeholderRoleOptions } from './model/control-options'

const projectParticipantRoleOptions = PROJECT_PARTICIPANT_ROLE_KEYS.map(value => ({
  value,
  label: getProjectParticipantRoleLabel(value),
}))

const projectGovernanceResponsibilityOptions = PROJECT_RESPONSIBILITY_KEYS.map(value => ({
  value,
  label: getProjectResponsibilityLabel(value),
}))

const timelineGovernanceSettingOrder = [
  'communicationChannel',
  'approvalMode',
  'visibility',
  'requiredResponsibilities',
  'reviewCadenceDays',
  'reminderCadenceDays',
  'slaHours',
  'escalateOnBlocked',
] as const

const timelineGovernanceSettingLabels: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  requiredResponsibilities: 'Обязательные роли',
  reviewCadenceDays: 'Ревью, дней',
  reminderCadenceDays: 'Напоминание, дней',
  slaHours: 'SLA, часов',
  escalateOnBlocked: 'Эскалация при блокере',
}

const timelineGovernanceOriginLabels: Record<ProjectScopeDetailBundle['participants'][number]['origin'], string> = {
  direct: 'контур',
  project: 'проект',
  derived: 'legacy',
}

const teamMemberRoleLabels: Record<HybridControlTeamMember['role'], string> = {
  architect: 'Архитектор',
  designer: 'Дизайнер',
  contractor: 'Подрядчик',
  client: 'Клиент',
  manager: 'Менеджер',
  other: 'Участник',
}

const teamMemberChannelLabels: Record<HybridControlTeamMember['notifyBy'], string> = {
  email: 'Email',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  manual: 'Вручную',
  'ai-agent': 'AI агент',
}

const teamMemberStakeholderMap: Record<HybridControlTeamMember['role'], HybridControlStakeholderRole[]> = {
  architect: ['designer'],
  designer: ['designer'],
  contractor: ['contractor'],
  client: ['client'],
  manager: ['manager'],
  other: ['service'],
}

const managerAgentOptions = computed(() => control.managerAgents.map(agent => ({
  value: agent.id,
  label: agent.title,
})))

const callInsightDraft = reactive({
  title: '',
  relatedPhaseKey: '',
  summary: '',
  transcript: '',
})

const callInsightSaving = ref(false)
const callInsightStatus = ref('')
const callInsightApplyPendingId = ref('')
const saveRequestId = ref(0)

const saveMetaText = computed(() => {
  if (saveState.value === 'saving') return 'сохраняем...'
  if (saveState.value === 'error') return 'ошибка сохранения'
  return savedAt.value ? `обновлено ${savedAt.value}` : ''
})

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

const phaseGateStats = computed(() => control.phases.reduce((acc, phase) => {
  acc.total += phase.gates.length
  acc.done += phase.gates.filter(gate => gate.done).length
  return acc
}, { done: 0, total: 0 }))

const sprintTaskStats = computed(() => control.sprints.reduce((acc, sprint) => {
  acc.total += sprint.tasks.length
  acc.done += sprint.tasks.filter(task => task.status === 'done').length
  return acc
}, { done: 0, total: 0 }))

const phaseStats = computed(() => ([
  { label: 'Фаз', value: `${control.phases.length}` },
  { label: 'Активных', value: `${control.phases.filter(phase => phase.status === 'active').length}` },
  { label: 'Гейтов', value: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total}` : '0' },
  { label: 'Спринтов', value: `${control.sprints.length}` },
]))

const sprintStats = computed(() => ([
  { label: 'Спринтов', value: `${control.sprints.length}` },
  { label: 'Активных', value: `${control.sprints.filter(sprint => sprint.status === 'active').length}` },
  { label: 'Задач', value: `${sprintTaskStats.value.total}` },
  { label: 'Готово', value: sprintTaskStats.value.total ? `${sprintTaskStats.value.done}/${sprintTaskStats.value.total}` : '0' },
]))

const selectedSprint = computed(() => getSprintById(activeSprintId.value)
  || getTaskContext(activeTaskId.value)?.sprint
  || summary.value.activeSprint
  || control.sprints[0]
  || null)

const selectedTaskContext = computed(() => getTaskContext(activeTaskId.value))

const selectedTask = computed(() => {
  const sprint = selectedSprint.value
  const taskContext = selectedTaskContext.value
  if (!sprint || !taskContext || taskContext.sprint.id !== sprint.id) return null
  return taskContext.task
})

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

const moduleCards = computed(() => ([
  {
    id: 'overview' as const,
    label: 'Обзор',
    glyph: 'О',
    navLabel: 'Обзор',
    metric: `${summary.value.phasePercent}% каркаса`,
    meta: control.manager || 'ответственный не назначен',
  },
  {
    id: 'timeline' as const,
    label: 'Таймлайн / Таблица',
    glyph: 'П',
    navLabel: 'План',
    metric: timelineWindowLabel.value,
    meta: `${visibleTimelineRows.value.length} строк плана`,
  },
  {
    id: 'phases' as const,
    label: 'Этапы и Спринты',
    glyph: 'Э',
    navLabel: 'Этапы',
    metric: `${control.phases.length} фаз / ${control.sprints.length} спринтов`,
    meta: phaseGateStats.value.total ? `${phaseGateStats.value.done}/${phaseGateStats.value.total} гейтов закрыто` : 'гейты не заданы',
  },
  {
    id: 'kanban' as const,
    label: 'Канбан',
    glyph: 'К',
    navLabel: 'Канбан',
    metric: `${sprintTaskStats.value.total} задач`,
    meta: sprintTaskStats.value.total ? `${sprintTaskStats.value.done} готово` : 'задачи не заведены',
  },
  {
    id: 'health' as const,
    label: 'Контрольные точки',
    glyph: 'Т',
    navLabel: 'Точки',
    metric: `${summary.value.blockerCount} блокеров`,
    meta: control.nextReviewDate || 'обзор не назначен',
  },
  {
    id: 'communications' as const,
    label: 'Звонки и Агенты',
    glyph: 'А',
    navLabel: 'Агенты',
    metric: `${coordinationBrief.value.agents.filter(item => item.enabled).length} агентов`,
    meta: control.callInsights.length ? `${control.callInsights.length} звонков в базе` : 'звонки не добавлены',
  },
]))

const activeModuleCard = computed(() => moduleCards.value.find(moduleCard => moduleCard.id === activeModule.value) ?? moduleCards.value[0])

const activeTaskContext = computed(() => getTaskContext(activeTaskId.value))
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
    cards.push({
      label: 'Период',
      value: formatDateRange(selected.startDate, selected.endDate),
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
        key: `subject-${item.key}`,
        label: item.label,
        value: item.value,
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
    const linkedSprints = control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
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

    const checkpointActions = control.checkpoints.slice(0, 2).map(checkpoint => ({
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

  const projectBlockers = control.blockers.slice(0, 2).map((blocker, index) => ({
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
    return [] as Array<{
      key: string
      label: string
      kind: TimelineGovernanceSettingFieldKind
      value: string | number | boolean | null
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const knownKeys = timelineGovernanceSettingOrder.filter(key => key in timelineGovernanceSettingsDraft.value)
  const dynamicKeys = Object.keys(timelineGovernanceSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof timelineGovernanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = timelineGovernanceSettingsDraft.value[key]

    if (key === 'communicationChannel') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'select' as const,
        value: typeof rawValue === 'string' ? rawValue : '',
      }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'number' as const,
        value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
      }
    }

    if (key === 'escalateOnBlocked') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'boolean' as const,
        value: Boolean(rawValue),
      }
    }

    if (key === 'requiredResponsibilities') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'list' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
      }
    }

    return {
      key,
      label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
      kind: 'text' as const,
      value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
    }
  })
})

watch(() => timelineScopeDetail.value?.revision, () => {
  timelineGovernanceSettingsDraft.value = cloneTimelineGovernanceSettings(timelineScopeDetail.value?.settings || {})
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''
}, { immediate: true })

function getMemberName(id: string) {
  const m = control.team?.find((t: any) => t.id === id)
  return m ? m.name : id
}

function cloneTimelineGovernanceSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeTimelineGovernanceError(error: unknown, fallback: string) {
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

function extractTimelineGovernanceAssignmentId(assignmentId: string) {
  const match = assignmentId.match(/^assignment:(\d+)$/)
  return match ? Number(match[1]) : 0
}

function normalizeTimelineGovernanceSettingValue(kind: TimelineGovernanceSettingFieldKind, value: unknown) {
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

function updateTimelineGovernanceSettingDraft(key: string, kind: TimelineGovernanceSettingFieldKind, value: unknown) {
  timelineGovernanceSettingsDraft.value = {
    ...timelineGovernanceSettingsDraft.value,
    [key]: normalizeTimelineGovernanceSettingValue(kind, value),
  }
}

async function refreshTimelineGovernanceView(refreshControl = false) {
  const selectedRow = selectedTimelineRowDetails.value
  const jobs: Array<Promise<unknown>> = []

  if (selectedRow) {
    jobs.push(fetchTimelineScopeDetail(selectedRow))
  }

  if (refreshControl) {
    jobs.push(refresh())
  }

  if (!jobs.length) {
    return
  }

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
    const participantResponse = await $fetch<TimelineGovernanceMutationResponse>(`/api/projects/${props.slug}/coordination/participants`, {
      method: 'POST',
      body: {
        displayName,
        roleKey: timelineGovernanceParticipantDraft.roleKey,
        sourceKind: 'custom',
      },
    })

    await $fetch(`/api/projects/${props.slug}/coordination/assignments`, {
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
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'PATCH',
      body: { responsibility },
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
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'DELETE',
    })
  }, 'Назначение удалено.', true, 'Не удалось удалить назначение.')
}

async function commitTimelineGovernanceSettings() {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
      method: 'PATCH',
      body: {
        settings: cloneTimelineGovernanceSettings(timelineGovernanceSettingsDraft.value),
      },
    })
  }, 'Настройки контура обновлены.', false, 'Не удалось обновить настройки контура.')
}

function handleTimelineGovernanceResponsibilityChange(assignmentId: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value as ProjectResponsibilityKey | undefined
  if (!value) {
    return
  }

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

function resolveSaveOptions(value?: unknown): SaveOptions {
  if (value && typeof value === 'object' && !('target' in value)) {
    return value as SaveOptions
  }

  return {}
}

async function save(value?: unknown) {
  const options = resolveSaveOptions(value)
  const requestId = saveRequestId.value + 1
  saveRequestId.value = requestId
  saveState.value = 'saving'

  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: {
        profile: {
          ...(project.value?.profile || {}),
          hybridControl: control,
        },
      },
    })

    if (requestId !== saveRequestId.value) return

    markSaved()
    saveState.value = 'idle'
    if (options.refreshAfter === true) {
      await refresh()
    }
  } catch {
    if (requestId !== saveRequestId.value) return
    saveState.value = 'error'
  }
}

function addSprint() {
  const sprint: HybridControlSprint = {
    id: `hybrid-sprint-${Date.now()}`,
    name: `Спринт ${control.sprints.length + 1}`,
    linkedPhaseKey: summary.value.activePhase?.phaseKey || 'construction',
    goal: '',
    focus: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    retrospective: '',
    tasks: [],
  }

  control.sprints.push(sprint)
  activeSprintId.value = sprint.id
  activeTaskId.value = ''
  void save({ refreshAfter: false })
}

function removeSprint(index: number) {
  const removed = control.sprints[index]
  control.sprints.splice(index, 1)

  if (removed?.id === activeSprintId.value) {
    activeSprintId.value = control.sprints[index]?.id || control.sprints[index - 1]?.id || ''
  }

  if (removed?.tasks.some(task => task.id === activeTaskId.value)) {
    activeTaskId.value = ''
  }

  void save({ refreshAfter: false })
}

function addTask(sprint: HybridControlSprint) {
  const task: HybridControlTask = {
    id: `hybrid-task-${Date.now()}`,
    title: 'Новая задача',
    status: 'todo',
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  }

  sprint.tasks.push(task)
  activeSprintId.value = sprint.id
  activeTaskId.value = task.id
  void save({ refreshAfter: false })
}

function removeTask(sprint: HybridControlSprint, index: number) {
  const removed = sprint.tasks[index]
  sprint.tasks.splice(index, 1)

  if (removed?.id === activeTaskId.value) {
    activeTaskId.value = sprint.tasks[index]?.id || sprint.tasks[index - 1]?.id || ''
  }

  void save({ refreshAfter: false })
}

function getTaskContext(taskId?: string) {
  if (!taskId) return null

  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

async function selectModule(moduleId: ControlModuleId) {
  const moduleChanged = activeModule.value !== moduleId
  activeModule.value = moduleId

  if (!moduleChanged || !import.meta.client || typeof window === 'undefined' || window.innerWidth > 900) {
    return
  }

  await nextTick()
  moduleViewportStart.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  queueMobileModuleDockSync()
}

function syncMobileModuleDockVisibility() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (window.innerWidth > 768) {
    isMobileModuleDockVisible.value = true
    return
  }

  const shell = controlShell.value
  if (!shell) {
    isMobileModuleDockVisible.value = false
    return
  }

  const shellRect = shell.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const dockHeight = moduleNavRef.value?.getBoundingClientRect().height || 72

  isMobileModuleDockVisible.value = shellRect.top <= viewportHeight * 0.45 && shellRect.bottom >= dockHeight + 32
}

function queueMobileModuleDockSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (moduleDockSyncFrame) {
    window.cancelAnimationFrame(moduleDockSyncFrame)
  }

  moduleDockSyncFrame = window.requestAnimationFrame(() => {
    moduleDockSyncFrame = 0
    syncMobileModuleDockVisibility()
  })
}

onMounted(() => {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  queueMobileModuleDockSync()
  window.addEventListener('scroll', queueMobileModuleDockSync, { passive: true })
  window.addEventListener('resize', queueMobileModuleDockSync)
})

onBeforeUnmount(() => {
  clearTimelineTooltipTimer()

  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (moduleDockSyncFrame) {
    window.cancelAnimationFrame(moduleDockSyncFrame)
  }

  window.removeEventListener('scroll', queueMobileModuleDockSync)
  window.removeEventListener('resize', queueMobileModuleDockSync)
})

watch([activeModule, pending], async () => {
  if (!import.meta.client) {
    return
  }

  await nextTick()
  queueMobileModuleDockSync()
}, { flush: 'post' })

function setActiveTaskId(taskId: string) {
  activeTaskId.value = taskId || ''
}

function clearTaskFocus() {
  activeTaskId.value = ''
}

function isSelectedSprint(sprint: HybridControlSprint) {
  return selectedSprint.value?.id === sprint.id
}

function isSelectedTask(task: HybridControlTask) {
  return selectedTask.value?.id === task.id
}

function removeSelectedSprint() {
  const sprint = selectedSprint.value
  if (!sprint) return

  const index = control.sprints.findIndex(item => item.id === sprint.id)
  if (index < 0) return

  removeSprint(index)
}

function removeSelectedTask() {
  const taskContext = selectedTaskContext.value
  if (!taskContext) return

  const index = taskContext.sprint.tasks.findIndex(task => task.id === taskContext.task.id)
  if (index < 0) return

  removeTask(taskContext.sprint, index)
}

async function scrollControlTargetIntoView(targetModule: ControlModuleId, options: { sprintId?: string, taskId?: string }) {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()

  const selector = targetModule === 'kanban'
    ? (options.taskId
      ? `[data-kanban-task-id="${options.taskId}"]`
      : options.sprintId
        ? `[data-kanban-sprint-id="${options.sprintId}"]`
        : '')
    : (options.taskId
      ? `[data-phase-task-id="${options.taskId}"]`
      : options.sprintId
        ? `[data-sprint-id="${options.sprintId}"]`
        : '')

  if (!selector) return
  document.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

async function focusSprint(sprintId?: string) {
  if (!sprintId) return

  activeTaskId.value = ''
  activeSprintId.value = sprintId
  selectModule('phases')
  await scrollControlTargetIntoView('phases', { sprintId })
}

async function focusTask(taskId?: string, sprintId?: string, targetModule: ControlModuleId = 'kanban') {
  if (!taskId) return

  const taskContext = getTaskContext(taskId)
  const resolvedSprintId = sprintId || taskContext?.sprint.id || ''

  activeTaskId.value = taskId
  if (resolvedSprintId) {
    activeSprintId.value = resolvedSprintId
  }
  selectModule(targetModule)
  await scrollControlTargetIntoView(targetModule, {
    sprintId: resolvedSprintId,
    taskId,
  })
}

watch(() => [activeModule.value, activeSprintId.value, activeTaskId.value], async ([moduleId, sprintId, taskId]) => {
  if (moduleId !== 'phases') return

  if (taskId) {
    await scrollControlTargetIntoView('phases', { sprintId, taskId })
    return
  }

  if (sprintId) {
    await scrollControlTargetIntoView('phases', { sprintId })
  }
})

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
  await scrollControlTargetIntoView('kanban', { sprintId })
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

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  void save({ refreshAfter: false })
}

function addCommunicationRule() {
  control.communicationPlaybook.push({
    id: `hybrid-rule-${Date.now()}`,
    title: `Правило ${control.communicationPlaybook.length + 1}`,
    trigger: 'Опишите условие, при котором запускается сценарий.',
    linkedChannel: 'project-room',
    audience: ['manager', 'designer'],
    ownerAgentId: managerAgentOptions.value[0]?.value || '',
    cadenceDays: 7,
    template: 'Коротко обозначьте статус, ожидание и следующий шаг.',
  })
  save()
}

function removeCommunicationRule(index: number) {
  control.communicationPlaybook.splice(index, 1)
  save()
}

async function submitCallInsight() {
  if (!callInsightDraft.summary.trim() || callInsightSaving.value) return

  callInsightSaving.value = true
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        blockerCountAdded: number
        checkpointCreated: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights`, {
      method: 'POST',
      body: {
        title: callInsightDraft.title,
        relatedPhaseKey: callInsightDraft.relatedPhaseKey,
        summary: callInsightDraft.summary,
        transcript: callInsightDraft.transcript,
      },
    })

    Object.assign(control, ensureHybridControl(response.hybridControl, project.value || {}))
    callInsightDraft.title = ''
    callInsightDraft.relatedPhaseKey = ''
    callInsightDraft.summary = ''
    callInsightDraft.transcript = ''
    callInsightStatus.value = response.meta.checkpointCreated
      ? `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}, контрольная точка создана.`
      : `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}.`
    markSaved()
  } catch {
    callInsightStatus.value = 'Не удалось сохранить инсайты звонка.'
  } finally {
    callInsightSaving.value = false
  }
}

async function applyCallInsightToSprint(insightId: string) {
  if (!insightId || callInsightApplyPendingId.value) return

  callInsightApplyPendingId.value = insightId
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        createdTaskCount: number
        createdSprint: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights/${insightId}/apply`, {
      method: 'POST',
      body: {},
    })

    Object.assign(control, ensureHybridControl(response.hybridControl, project.value || {}))
    callInsightStatus.value = response.meta.createdTaskCount
      ? `Задач создано: ${response.meta.createdTaskCount}${response.meta.createdSprint ? '. Для них автоматически создан follow-up спринт.' : '.'}`
      : 'Новых задач не создано: все следующие шаги уже есть в спринте.'
    markSaved()
  } catch {
    callInsightStatus.value = 'Не удалось превратить инсайт звонка в задачи спринта.'
  } finally {
    callInsightApplyPendingId.value = ''
  }
}

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function formatTaskDueDate(value?: string) {
  if (!value) return 'без дедлайна'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return taskDateFormatter.format(parsed)
}

function getSprintCompletionLabel(sprint: HybridControlSprint) {
  if (!sprint.tasks.length) return '0/0'
  return `${sprint.tasks.filter(task => task.status === 'done').length}/${sprint.tasks.length}`
}

function getTimelineBarStyle(row: HybridTimelineRow) {
  return getHybridTimelineBarStyle(row, timelineBounds.value)
}

function getPhaseById(id: string) {
  return control.phases.find(phase => phase.id === id) || null
}

function getSprintById(id: string) {
  return control.sprints.find(sprint => sprint.id === id) || null
}

function getManagerAgentRoleLabel(role: HybridControlManagerAgentRole) {
  return getHybridControlManagerAgentRoleLabel(role)
}

function getCommunicationChannelLabel(channel: HybridControlCommunicationChannel) {
  return getHybridCommunicationChannelLabel(channel)
}

function getStakeholderRoleLabel(role: HybridControlStakeholderRole) {
  return getHybridStakeholderRoleLabel(role)
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return control.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function formatCallInsightDate(value?: string) {
  if (!value) return 'без даты'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getCallInsightActorLabel(insight: HybridControlCallInsight) {
  const roleLabel = insight.actorRole ? getStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''

  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}

function openCallInsightTasks(insight: HybridControlCallInsight) {
  const taskIds = insight.appliedTaskIds || []
  const sprintId = insight.appliedSprintId
    || control.sprints.find(sprint => sprint.tasks.some(task => taskIds.includes(task.id)))?.id

  if (taskIds.length === 1) {
    void focusTask(taskIds[0], sprintId, 'kanban')
    return
  }

  void openTimelineSprintInKanban(sprintId)
}

function hasRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  return rule.audience.includes(role)
}

function toggleRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  const index = rule.audience.indexOf(role)

  if (index >= 0) {
    if (rule.audience.length === 1) return
    rule.audience.splice(index, 1)
  } else {
    rule.audience.push(role)
  }

  save()
}

function getAgentRecommendationCount(agentId: string) {
  return coordinationBrief.value.agents.find(agent => agent.id === agentId)?.recommendedActionCount || 0
}

function getTeamMemberRoleLabel(role: HybridControlTeamMember['role']) {
  return teamMemberRoleLabels[role] || role
}

function getTeamMemberChannelLabel(channel: HybridControlTeamMember['notifyBy']) {
  return teamMemberChannelLabels[channel] || channel
}

function getRecommendationRecipients(recommendation: { audience: HybridControlStakeholderRole[] }) {
  return control.team.filter(member => teamMemberStakeholderMap[member.role]?.some(role => recommendation.audience.includes(role)))
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
  if (!timelineEditingEnabled.value) {
    onDragEnd()
    return
  }
  if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind) || timelineDrag.rowId !== row.id || timelineDrag.rowType !== row.type) {
    onDragEnd()
    return
  }

  const column = timelineColumns.value[columnIndex]
  if (!column) {
    onDragEnd()
    return
  }

  const range = resolveHybridTimelineRowRange(row)
  const durationDays = Math.max(Math.round((range.end.getTime() - range.start.getTime()) / 86400000), 0)
  const nextStart = new Date(column.start)
  const nextEnd = addTimelineDays(nextStart, durationDays)

  if (timelineDrag.kind === 'resize-start') {
    const resizedEnd = new Date(range.end)
    const resizedStart = nextStart.getTime() > resizedEnd.getTime() ? resizedEnd : nextStart
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  if (timelineDrag.kind === 'resize-end') {
    const resizedStart = new Date(range.start)
    const droppedWeekEnd = endOfHybridTimelineScale(nextStart, timelineScale.value)
    const resizedEnd = droppedWeekEnd.getTime() < resizedStart.getTime() ? resizedStart : droppedWeekEnd
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  await persistTimelineRange(row, nextStart, nextEnd)
  onDragEnd()
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

function onDragEnd() {
  timelineDrag.kind = 'idle'
  timelineDrag.rowId = ''
  timelineDrag.rowType = null
  timelineDrag.overRowId = ''
  timelineDrag.overColumnKey = ''
}

const msgModalOpen = ref(false)
const msgModalTarget = ref<HybridControlTeamMember | null>(null)
const msgModalText = ref('')
const msgModalSending = ref(false)
const msgModalError = ref('')

function openMessageModal(member: HybridControlTeamMember, draftMessage: string = '') {
  msgModalTarget.value = member
  msgModalText.value = draftMessage
  msgModalError.value = ''
  msgModalOpen.value = true
}

function closeMessageModal() {
  msgModalOpen.value = false
  msgModalTarget.value = null
  msgModalText.value = ''
  msgModalError.value = ''
}

async function executeMessageDispatch() {
  if (!msgModalTarget.value || !msgModalText.value.trim()) return

  msgModalError.value = ''
  msgModalSending.value = true

  try {
    const res = await $fetch<{ success: boolean }>(`/api/projects/${props.slug}/communications/dispatch`, {
      method: 'POST',
      body: {
        memberId: msgModalTarget.value.id,
        message: msgModalText.value
      }
    })
    
    if (res.success) {
      if (!control.communicationLog) {
        control.communicationLog = []
      }
      control.communicationLog.push({
        id: crypto.randomUUID(),
        memberId: msgModalTarget.value.id,
        channel: msgModalTarget.value.notifyBy || 'manual',
        message: msgModalText.value,
        status: 'delivered',
        dispatchedAt: new Date().toISOString()
      })

      markSaved()
      closeMessageModal()
    }
  } catch (e: any) {
    msgModalError.value = e?.message || 'Не удалось отправить сообщение'
  } finally {
    msgModalSending.value = false
  }
}

function isTimelineRowSelected(row: HybridTimelineRow) {
  return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
}

function normalizeTaskScopeId(taskId: string) {
  return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
}

function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineRowState {
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

function buildProjectScopeState(): SelectedTimelineRowState {
  return {
    id: props.slug,
    scopeType: 'project',
    scopeId: props.slug,
    type: 'project',
    typeLabel: 'Проект',
    title: project.value?.title || 'Проект',
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

async function scrollTimelineDetailModalIntoView() {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()
  document.querySelector<HTMLElement>('.hpc-timeline-details-modal')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const timelineTooltip = ref({
  visible: false,
  content: '',
  left: 0,
  top: 0,
  maxWidth: 280,
})

let timelineTooltipTimer: number | null = null

function getTimelineRowTooltip(row: HybridTimelineRow) {
  return [
    row.title,
    row.typeLabel,
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

  if ('pointerType' in event && event.pointerType === 'touch') {
    return
  }

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
    const detail = await $fetch<ProjectScopeDetailBundle>(`/api/projects/${props.slug}/coordination/scopes/${scope.scopeType}/${encodeURIComponent(scope.scopeId)}`)

    if (timelineScopeDetailRequestId.value !== requestId) {
      return
    }

    timelineScopeDetail.value = detail
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

async function openSelectedTimelineScope(scope: SelectedTimelineRowState) {
  hideTimelineTooltip()
  if (activeModule.value !== 'timeline') {
    activeModule.value = 'timeline'
  }

  selectedTimelineRowState.value = scope
  void fetchTimelineScopeDetail(scope)

  if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
  await scrollTimelineDetailModalIntoView()
}

async function openTimelineRowDetails(row: HybridTimelineRow) {
  await openSelectedTimelineScope(buildSelectedTimelineScopeState(row))
}

async function openProjectScopeDetails() {
  selectModule('timeline')
  await nextTick()
  timelineSectionRef.value?.openProjectScopeDetails()
}

async function openTaskScopeDetailsFromTimeline(taskId?: string, sprintId?: string) {
  if (!taskId) return
  selectModule('timeline')
  await nextTick()
  timelineSectionRef.value?.openTaskScopeDetails(taskId, sprintId)
}

function closeTimelineRowDetails() {
  timelineSectionRef.value?.closeTimelineRowDetails()
}
</script>

<style scoped src="./AdminProjectControl.scoped.css"></style>
