<template>
  <div class="hpc-root">
    <div v-if="pending" class="ent-content-loading">
      <div v-for="i in 6" :key="i" class="ent-skeleton-line" />
    </div>

    <template v-else>
      <section class="hpc-summary">
        <div class="hpc-summary__head">
          <div>
            <p class="hpc-eyebrow">Контур контроля</p>
            <h2 class="hpc-title">Фазовый каркас и спринтовый ритм исполнения</h2>
          </div>
          <div class="hpc-summary__meta">
            <span class="hpc-pill" :class="`hpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
            <span v-if="savedAt" class="hpc-saved">обновлено {{ savedAt }}</span>
          </div>
        </div>

        <div class="hpc-metrics">
          <div class="hpc-metric">
            <span class="hpc-metric__label">Фазовый прогресс</span>
            <strong class="hpc-metric__value">{{ summary.phasePercent }}%</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Спринтовое исполнение</span>
            <strong class="hpc-metric__value">{{ summary.doneTasks }} / {{ summary.totalTasks }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Блокеры</span>
            <strong class="hpc-metric__value">{{ summary.blockerCount }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Следующий обзор</span>
            <strong class="hpc-metric__value">{{ control.nextReviewDate || 'не задан' }}</strong>
          </div>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Контур</p>
            <h3 class="hpc-section__title">Управление ритмом проекта</h3>
          </div>
        </div>
        <div class="hpc-grid hpc-grid--top">
          <div class="u-field">
            <label class="u-field__label">Ответственный за контроль</label>
            <input v-model="control.manager" class="glass-input" placeholder="Имя или роль" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Интервал обзора, дней</label>
            <input v-model.number="control.cadenceDays" type="number" min="1" max="90" class="glass-input" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Следующий контрольный обзор</label>
            <AppDatePicker v-model="control.nextReviewDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Последняя синхронизация</label>
            <AppDatePicker v-model="control.lastSyncAt" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Матрица исполнения</p>
            <h3 class="hpc-section__title">Табличный вид с таймлайном и перетаскиванием</h3>
          </div>
          <div class="hpc-section__tools">
            <div class="hpc-scale-switch" role="group" aria-label="Масштаб таймлайна">
              <button
                v-for="option in timelineScaleOptions"
                :key="option.value"
                type="button"
                class="hpc-scale-switch__btn"
                :class="{ 'hpc-scale-switch__btn--active': timelineScale === option.value }"
                @click="timelineScale = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="hpc-summary__meta">
            <span class="hpc-saved">перетащите строку для порядка</span>
            <span class="hpc-saved">перетащите полосу по неделям для сдвига сроков</span>
            <span class="hpc-saved">тяните край полосы для длительности</span>
            <span v-if="timelineScale === 'hours'" class="hpc-saved">часы сейчас только для zoom-просмотра</span>
          </div>
        </div>

        <div class="hpc-board-wrap">
          <div class="hpc-board" :style="timelineBoardStyle">
            <div class="hpc-board__head">
              <div class="hpc-board__cell hpc-board__cell--entity">Слой</div>
              <div class="hpc-board__cell hpc-board__cell--period">Период</div>
              <div class="hpc-board__timeline-head-stack">
                <div class="hpc-board__timeline-groups" :style="timelineGridStyle">
                  <div
                    v-for="group in timelineGroups"
                    :key="group.key"
                    class="hpc-board__timeline-group-label"
                    :style="{ gridColumn: `span ${group.span}` }"
                  >
                    <span>{{ group.label }}</span>
                  </div>
                </div>
                <div class="hpc-board__timeline-head" :style="timelineGridStyle">
                  <div
                    v-for="column in timelineColumns"
                    :key="column.key"
                    class="hpc-board__week-label"
                  >
                    <span>{{ column.label }}</span>
                    <strong>{{ column.rangeLabel }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-for="row in timelineRows"
              :key="row.id"
              class="hpc-board__row"
              :class="{
                'hpc-board__row--phase': row.type === 'phase',
                'hpc-board__row--drag-over': timelineDrag.overRowId === row.id && timelineDrag.kind === 'reorder',
              }"
            >
              <div
                class="hpc-board__cell hpc-board__cell--entity hpc-board__entity"
                @dragover.prevent="onRowDragOver(row.id)"
                @drop="onRowDrop(row)"
              >
                <button
                  class="hpc-board__drag"
                  type="button"
                  :draggable="timelineEditingEnabled"
                  :disabled="!timelineEditingEnabled"
                  :aria-label="`Переместить ${row.title}`"
                  @dragstart="onReorderDragStart($event, row)"
                  @dragend="onDragEnd"
                >
                  ::
                </button>
                <div class="hpc-board__entity-body">
                  <div class="hpc-board__entity-top">
                    <span class="hpc-board__type">{{ row.typeLabel }}</span>
                    <span class="hpc-pill" :class="`hpc-pill--${row.tone}`">{{ row.statusLabel }}</span>
                  </div>
                  <strong class="hpc-board__title">{{ row.title }}</strong>
                  <div class="hpc-board__meta-line">{{ row.meta }}</div>
                </div>
              </div>

              <div class="hpc-board__cell hpc-board__cell--period hpc-board__period">
                <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
                <strong>{{ row.progressLabel }}</strong>
              </div>

              <div class="hpc-board__timeline">
                <div class="hpc-board__weeks" :style="timelineGridStyle">
                  <div
                    v-for="(column, columnIndex) in timelineColumns"
                    :key="`${row.id}-${column.key}`"
                    class="hpc-board__week"
                    :class="{ 'hpc-board__week--drop': timelineDrag.overColumnKey === `${row.id}-${column.key}` }"
                    @dragover.prevent="onTimelineWeekDragOver(row.id, column.key)"
                    @drop="onTimelineWeekDrop(row, columnIndex)"
                  />
                </div>
                <div
                  class="hpc-board__bar"
                  :class="`hpc-board__bar--${row.tone}`"
                  :style="getTimelineBarStyle(row)"
                  :draggable="timelineEditingEnabled"
                  @dragstart="onScheduleDragStart($event, row)"
                  @dragend="onDragEnd"
                >
                  <button
                    class="hpc-board__bar-handle hpc-board__bar-handle--start"
                    type="button"
                    :disabled="!timelineEditingEnabled"
                    :aria-label="`Сдвинуть начало ${row.title}`"
                    :draggable="timelineEditingEnabled"
                    @dragstart.stop="onResizeDragStart($event, row, 'start')"
                    @dragend="onDragEnd"
                  />
                  <span class="hpc-board__bar-label">{{ row.title }}</span>
                  <button
                    class="hpc-board__bar-handle hpc-board__bar-handle--end"
                    type="button"
                    :disabled="!timelineEditingEnabled"
                    :aria-label="`Сдвинуть окончание ${row.title}`"
                    :draggable="timelineEditingEnabled"
                    @dragstart.stop="onResizeDragStart($event, row, 'end')"
                    @dragend="onDragEnd"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Фазовый слой</p>
            <h3 class="hpc-section__title">Базовые этапы и контрольные ворота</h3>
          </div>
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

            <div class="hpc-grid">
              <div class="u-field">
                <label class="u-field__label">Ответственный</label>
                <input v-model="phase.owner" class="glass-input" placeholder="Ответственный" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Прогресс, %</label>
                <input v-model.number="phase.percent" type="number" min="0" max="100" class="glass-input" @blur="save" />
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
                <textarea v-model="phase.deliverable" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Заметка менеджера</label>
                <textarea v-model="phase.notes" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-gates">
              <label v-for="gate in phase.gates" :key="gate.id" class="hpc-gate-row">
                <input v-model="gate.done" type="checkbox" @change="save" />
                <span>{{ gate.label }}</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Спринтовый слой</p>
            <h3 class="hpc-section__title">Спринты внутри активных фаз</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addSprint">+ спринт</button>
        </div>

        <div v-if="control.sprints.length" class="hpc-sprint-list">
          <article v-for="(sprint, sprintIndex) in control.sprints" :key="sprint.id" class="hpc-sprint-card">
            <div class="hpc-sprint-card__head">
              <div class="hpc-grid hpc-grid--top">
                <div class="u-field">
                  <label class="u-field__label">Название спринта</label>
                  <input v-model="sprint.name" class="glass-input" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Привязка к фазе</label>
                  <select v-model="sprint.linkedPhaseKey" class="u-status-sel" @change="save">
                    <option v-for="phase in control.phases" :key="phase.phaseKey" :value="phase.phaseKey">{{ phase.title }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Статус</label>
                  <select v-model="sprint.status" class="u-status-sel" @change="save">
                    <option v-for="option in sprintStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Удалить спринт</label>
                  <button class="a-btn-sm a-btn-danger" type="button" @click="removeSprint(sprintIndex)">удалить</button>
                </div>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field u-field--full">
                <label class="u-field__label">Цель спринта</label>
                <textarea v-model="sprint.goal" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Старт</label>
                <AppDatePicker v-model="sprint.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Финиш</label>
                <AppDatePicker v-model="sprint.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Фокус команды</label>
                <textarea v-model="sprint.focus" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-task-head">
              <span class="hpc-task-head__title">Бэклог поставки</span>
              <button class="a-btn-sm" type="button" @click="addTask(sprint)">+ задача</button>
            </div>

            <div v-if="sprint.tasks.length" class="hpc-task-list">
              <div v-for="(task, taskIndex) in sprint.tasks" :key="task.id" class="hpc-task-row">
                <button class="hpc-task-state" type="button" @click="cycleTask(task)">{{ taskStatusLabels[task.status] }}</button>
                <input v-model="task.title" class="glass-input hpc-task-row__title" placeholder="Что должно быть доставлено" @blur="save" />
                <input v-model.number="task.points" type="number" min="0" max="100" class="glass-input hpc-task-row__points" @blur="save" />
                <input v-model="task.assignee" class="glass-input hpc-task-row__assignee" placeholder="Исполнитель" @blur="save" />
                <AppDatePicker v-model="task.dueDate" model-type="iso" input-class="glass-input hpc-task-row__date" @update:model-value="save" />
                <button class="a-btn-sm a-btn-danger" type="button" @click="removeTask(sprint, taskIndex)">×</button>
              </div>
            </div>
            <div v-else class="hpc-empty">бэклог пока пуст</div>

            <div class="u-field">
              <label class="u-field__label">Ретроспектива</label>
              <textarea v-model="sprint.retrospective" class="glass-input u-ta" rows="2" @blur="save" />
            </div>
          </article>
        </div>
        <div v-else class="hpc-empty">спринты ещё не добавлены</div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Здоровье проекта</p>
            <h3 class="hpc-section__title">Контрольные точки и блокеры</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addCheckpoint">+ точка</button>
        </div>

        <div class="hpc-checkpoint-list">
          <div v-for="(checkpoint, checkpointIndex) in control.checkpoints" :key="checkpoint.id" class="hpc-checkpoint-row">
            <input v-model="checkpoint.title" class="glass-input" placeholder="Контрольная точка" @blur="save" />
            <input v-model="checkpoint.category" class="glass-input" placeholder="Категория" @blur="save" />
            <select v-model="checkpoint.status" class="u-status-sel" @change="save">
              <option v-for="option in checkpointStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input v-model="checkpoint.note" class="glass-input hpc-checkpoint-row__note" placeholder="Что происходит" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeCheckpoint(checkpointIndex)">×</button>
          </div>
        </div>

        <div class="hpc-task-head hpc-task-head--blockers">
          <span class="hpc-task-head__title">Текущие блокеры</span>
          <button class="a-btn-sm" type="button" @click="addBlocker">+ блокер</button>
        </div>
        <div class="hpc-blocker-list">
          <div v-for="(blocker, blockerIndex) in control.blockers" :key="`blocker-${blockerIndex}`" class="hpc-blocker-row">
            <input v-model="control.blockers[blockerIndex]" class="glass-input hpc-blocker-row__input" placeholder="Что тормозит проект" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeBlocker(blockerIndex)">×</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, ensureHybridControl } from '~~/shared/utils/project-control'
import {
  addTimelineDays,
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
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
import type { HybridControl, HybridControlTask } from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const control = reactive<HybridControl>(ensureHybridControl(undefined))

const phaseStatusOptions = [
  { value: 'planned', label: 'запланирована' },
  { value: 'active', label: 'в работе' },
  { value: 'blocked', label: 'заблокирована' },
  { value: 'done', label: 'завершена' },
] as const

const sprintStatusOptions = [
  { value: 'planned', label: 'запланирован' },
  { value: 'active', label: 'активен' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'завершён' },
] as const

const checkpointStatusOptions = [
  { value: 'stable', label: 'стабильно' },
  { value: 'warning', label: 'внимание' },
  { value: 'critical', label: 'критично' },
] as const

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const timelineScale = ref<HybridTimelineScale>('weeks')

const timelineScaleOptions = [
  'months',
  'weeks',
  'days',
  'hours',
].map(value => ({ value, label: getHybridTimelineScaleLabel(value) }))

type TimelineDragKind = 'idle' | 'reorder' | 'schedule' | 'resize-start' | 'resize-end'

const timelineDrag = reactive<{
  kind: TimelineDragKind
  rowId: string
  rowType: TimelineRow['type'] | null
  overRowId: string
  overColumnKey: string
}>({
  kind: 'idle',
  rowId: '',
  rowType: null,
  overRowId: '',
  overColumnKey: '',
})

watch(project, (value) => {
  if (!value) return
  Object.assign(control, ensureHybridControl(value.profile?.hybridControl, value))
}, { immediate: true })

const summary = computed(() => buildHybridControlSummary(control))

const timelineRows = computed(() => buildHybridTimelineRows(control))

const timelineBounds = computed(() => buildHybridTimelineBounds(timelineRows.value, timelineScale.value))

const timelineColumns = computed(() => buildHybridTimelineColumns(timelineBounds.value, timelineScale.value))

const timelineGroups = computed(() => buildHybridTimelineGroups(timelineColumns.value, timelineScale.value))

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(timelineColumns.value.length, 1)}, minmax(0, 1fr))`,
}))

const timelineEditingEnabled = computed(() => timelineScale.value !== 'hours')
const timelineBoardStyle = computed(() => ({
  minWidth: `${430 + Math.max(timelineColumns.value.length, 1) * getHybridTimelineColumnWidth(timelineScale.value)}px`,
}))

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: {
      profile: {
        ...(project.value?.profile || {}),
        hybridControl: control,
      },
    },
  })
  markSaved()
  await refresh()
}

function addSprint() {
  control.sprints.push({
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
  })
  save()
}

function removeSprint(index: number) {
  control.sprints.splice(index, 1)
  save()
}

function addTask(sprint: HybridControlSprint) {
  sprint.tasks.push({
    id: `hybrid-task-${Date.now()}`,
    title: 'Новая задача',
    status: 'todo',
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  })
  save()
}

function removeTask(sprint: HybridControlSprint, index: number) {
  sprint.tasks.splice(index, 1)
  save()
}

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  save()
}

function addCheckpoint() {
  control.checkpoints.push({
    id: `hybrid-checkpoint-${Date.now()}`,
    title: 'Новая контрольная точка',
    category: 'control',
    status: 'stable',
    note: '',
  })
  save()
}

function removeCheckpoint(index: number) {
  control.checkpoints.splice(index, 1)
  save()
}

function addBlocker() {
  control.blockers.push('')
  save()
}

function removeBlocker(index: number) {
  control.blockers.splice(index, 1)
  save()
}

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
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

function reorderItems<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false
  const [moved] = items.splice(sourceIndex, 1)
  if (!moved) return false
  items.splice(targetIndex, 0, moved)
  return true
}

function onReorderDragStart(event: DragEvent, row: TimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'reorder'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'reorder', rowId: row.id, rowType: row.type }))
  }
}

function onScheduleDragStart(event: DragEvent, row: TimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'schedule'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'schedule', rowId: row.id, rowType: row.type }))
  }
}

function onResizeDragStart(event: DragEvent, row: TimelineRow, edge: 'start' | 'end') {
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

async function onRowDrop(target: TimelineRow) {
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
  if (changed) await save()
}

async function onTimelineWeekDrop(row: TimelineRow, columnIndex: number) {
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

async function persistTimelineRange(row: TimelineRow, start: Date, end: Date) {
  if (row.type === 'phase') {
    const phase = getPhaseById(row.id)
    if (!phase) return
    phase.startDate = toIsoLocalDate(start)
    phase.endDate = toIsoLocalDate(end)
    await save()
    return
  }

  const sprint = getSprintById(row.id)
  if (!sprint) return
  sprint.startDate = toIsoLocalDate(start)
  sprint.endDate = toIsoLocalDate(end)
  await save()
}

function onDragEnd() {
  timelineDrag.kind = 'idle'
  timelineDrag.rowId = ''
  timelineDrag.rowType = null
  timelineDrag.overRowId = ''
  timelineDrag.overColumnKey = ''
}
</script>

<style scoped>
.hpc-root {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 4px 0 40px;
}

.hpc-summary,
.hpc-section {
  position: relative;
  padding: 18px 0 0;
}

.hpc-summary::before,
.hpc-section::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-accent) 42%, transparent), color-mix(in srgb, var(--glass-text) 8%, transparent) 62%, transparent);
}

.hpc-summary__head,
.hpc-section__head,
.hpc-phase-card__head,
.hpc-sprint-card__head,
.hpc-task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.hpc-summary__meta,
.hpc-phase-card__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hpc-section__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hpc-scale-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hpc-scale-switch__btn {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-scale-switch__btn--active {
  color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.hpc-eyebrow,
.hpc-section__label,
.hpc-phase-card__kicker {
  margin: 0 0 6px;
  font-size: .68rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.hpc-title,
.hpc-section__title,
.hpc-phase-card__title {
  margin: 0;
  letter-spacing: .04em;
}

.hpc-title {
  font-size: clamp(1.2rem, 2.2vw, 1.8rem);
}

.hpc-section__title {
  font-size: 1rem;
}

.hpc-phase-card__title {
  font-size: .96rem;
}

.hpc-saved,
.hpc-chip,
.hpc-task-head__title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-pill,
.hpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.hpc-pill--stable { color: var(--ds-success); }
.hpc-pill--warning { color: var(--ds-warning); }
.hpc-pill--critical { color: var(--ds-error); }

.hpc-metrics,
.hpc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hpc-grid--top {
  width: 100%;
}

.hpc-metric {
  min-height: 72px;
  padding: 10px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-metric__label {
  display: block;
  margin-bottom: 8px;
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.hpc-metric__value {
  font-size: 1.1rem;
  letter-spacing: .06em;
}

.hpc-phase-list,
.hpc-sprint-list,
.hpc-checkpoint-list,
.hpc-blocker-list {
  display: grid;
  gap: 14px;
}

.hpc-board-wrap {
  overflow-x: auto;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.hpc-board {
  min-width: 1040px;
}

.hpc-board__head,
.hpc-board__row {
  display: grid;
  grid-template-columns: minmax(260px, 1.15fr) 170px minmax(520px, 2fr);
  gap: 0;
  align-items: stretch;
}

.hpc-board__head {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  backdrop-filter: blur(12px);
}

.hpc-board__row {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__row--phase {
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.hpc-board__row--drag-over {
  background: color-mix(in srgb, var(--ds-accent) 4%, transparent);
}

.hpc-board__cell,
.hpc-board__timeline-head-stack,
.hpc-board__timeline {
  min-height: 72px;
}

.hpc-board__cell {
  padding: 12px 0;
}

.hpc-board__head .hpc-board__cell,
.hpc-board__head .hpc-board__timeline-head-stack,
.hpc-board__head .hpc-board__timeline-groups,
.hpc-board__head .hpc-board__timeline-head,
.hpc-board__head .hpc-board__timeline-group-label,
.hpc-board__head .hpc-board__week-label {
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
}

.hpc-board__cell--entity,
.hpc-board__cell--period {
  padding-right: 14px;
}

.hpc-board__cell--period {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  padding-left: 14px;
}

.hpc-board__entity {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.hpc-board__drag {
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
  cursor: grab;
}

.hpc-board__drag:disabled,
.hpc-board__bar-handle:disabled {
  opacity: .45;
  cursor: default;
}

.hpc-board__entity-body,
.hpc-board__period {
  display: grid;
  gap: 6px;
  align-content: center;
}

.hpc-board__entity-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hpc-board__type {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.hpc-board__title {
  font-size: .92rem;
  letter-spacing: .03em;
}

.hpc-board__meta-line,
.hpc-board__period span,
.hpc-board__week-label {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.hpc-board__period strong,
.hpc-board__week-label strong {
  font-size: .76rem;
  color: var(--glass-text);
}

.hpc-board__timeline-head-stack,
.hpc-board__timeline-groups,
.hpc-board__timeline-head,
.hpc-board__weeks {
  display: grid;
}

.hpc-board__timeline-head-stack {
  grid-template-rows: auto auto;
}

.hpc-board__timeline-groups {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__timeline-head {
  align-items: stretch;
}

.hpc-board__timeline-group-label,
.hpc-board__week-label {
  display: grid;
  gap: 4px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-board__timeline-group-label {
  min-height: 34px;
  padding: 8px 10px;
  align-content: center;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
}

.hpc-board__week-label {
  padding: 12px 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-board__timeline {
  position: relative;
}

.hpc-board__weeks {
  height: 100%;
}

.hpc-board__week {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 7%, transparent);
}

.hpc-board__week--drop {
  background: color-mix(in srgb, var(--ds-accent) 5%, transparent);
}

.hpc-board__bar {
  position: absolute;
  top: 14px;
  bottom: 14px;
  min-width: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 6px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
  cursor: grab;
  overflow: hidden;
}

.hpc-board__bar-handle {
  width: 14px;
  min-width: 14px;
  min-height: 44px;
  align-self: stretch;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: ew-resize;
  appearance: none;
}

.hpc-board__bar-handle--start {
  border-right: 1px solid currentColor;
}

.hpc-board__bar-handle--end {
  border-left: 1px solid currentColor;
}

.hpc-board__bar--stable {
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
}

.hpc-board__bar--warning {
  color: var(--ds-warning);
}

.hpc-board__bar--critical {
  color: var(--ds-error);
}

.hpc-board__bar-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .74rem;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.hpc-phase-card,
.hpc-sprint-card {
  display: grid;
  gap: 14px;
  padding: 0 0 0 18px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-gates,
.hpc-task-list {
  display: grid;
  gap: 10px;
}

.hpc-gate-row,
.hpc-task-row,
.hpc-checkpoint-row,
.hpc-blocker-row {
  display: grid;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-gate-row {
  grid-template-columns: auto 1fr;
  min-height: 44px;
}

.hpc-task-row {
  grid-template-columns: 88px minmax(0, 2fr) 88px minmax(0, 1fr) 150px auto;
}

.hpc-checkpoint-row {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .8fr) 160px minmax(0, 1.4fr) auto;
}

.hpc-blocker-row {
  grid-template-columns: 1fr auto;
}

.hpc-task-row__title,
.hpc-checkpoint-row__note,
.hpc-blocker-row__input {
  min-width: 0;
}

.hpc-task-state {
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-transform: uppercase;
  letter-spacing: .06em;
  cursor: pointer;
}

.hpc-empty {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
  text-transform: uppercase;
  letter-spacing: .12em;
}

:deep(.glass-input),
:deep(.u-status-sel) {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

:deep(.u-ta) {
  min-height: 64px;
}

@media (max-width: 900px) {
  .hpc-metrics,
  .hpc-grid,
  .hpc-task-row,
  .hpc-checkpoint-row {
    grid-template-columns: 1fr;
  }

  .hpc-summary__head,
  .hpc-section__head,
  .hpc-phase-card__head,
  .hpc-task-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .hpc-section__tools {
    width: 100%;
  }
}
</style>