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
        @update:active-sprint-id="(id: string) => { activeSprintId = id }"
        @update:active-task-id="(id: string) => { activeTaskId = id }"
        @open-task-scope-details="(taskId?: string, sprintId?: string) => openTaskScopeDetailsFromTimeline(taskId, sprintId)"
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
} from '~~/shared/utils/project-control'
import { phaseStatusOptions } from './model/control-options'
import type { HybridControl } from '~~/shared/types/project'

const modules = [
  { id: 'overview', label: 'Обзор' },
  { id: 'timeline', label: 'Таймлайн / Таблица' },
  { id: 'phases', label: 'Этапы и Спринты' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'health', label: 'Контрольные точки' },
  { id: 'communications', label: 'Звонки и Агенты' }
] as const

type ControlModuleId = (typeof modules)[number]['id']

type SaveOptions = {
  refreshAfter?: boolean
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
const saveRequestId = ref(0)

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

const saveMetaText = computed(() => {
  if (saveState.value === 'saving') return 'сохраняем...'
  if (saveState.value === 'error') return 'ошибка сохранения'
  return savedAt.value ? `обновлено ${savedAt.value}` : ''
})

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
    metric: timelineSectionRef.value?.timelineWindowLabel.value ?? '',
    meta: `${timelineSectionRef.value?.visibleTimelineRows.value.length ?? 0} строк плана`,
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

function openTimelinePhaseEditor() {
  closeTimelineRowDetails()
  selectModule('phases')
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
