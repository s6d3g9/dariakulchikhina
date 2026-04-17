<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { HybridControl, HybridControlSprint, HybridControlTask, HybridControlTaskStatus } from '~/shared/types/project'

const props = defineProps<{
  control: HybridControl | undefined
  activeSprintId?: string
  activeTaskId?: string
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'update:active-task', taskId: string): void
}>()

const selectedTaskId = ref<string | null>(props.activeTaskId || null)

const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
})

const statuses: Array<{ value: HybridControlTaskStatus, label: string }> = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'doing', label: 'В работе' },
  { value: 'review', label: 'Ревью' },
  { value: 'done', label: 'Готово' },
]

const allTasks = computed(() => (props.control?.sprints ?? []).flatMap(sprint => sprint.tasks ?? []))

const kanbanStats = computed(() => {
  const totalTasks = allTasks.value.length
  const doneTasks = allTasks.value.filter(task => task.status === 'done').length
  const inProgressTasks = allTasks.value.filter(task => task.status === 'doing' || task.status === 'review').length

  return [
    { label: 'Спринтов', value: String(props.control?.sprints?.length ?? 0) },
    { label: 'Задач', value: String(totalTasks) },
    { label: 'В работе', value: String(inProgressTasks) },
    { label: 'Готово', value: totalTasks ? `${doneTasks}/${totalTasks}` : '0' },
  ]
})

const selectedTask = computed(() => {
  const taskId = selectedTaskId.value
  if (!taskId) return null
  return allTasks.value.find(task => task.id === taskId) ?? null
})

const selectedTaskSprint = computed(() => {
  const taskId = selectedTaskId.value
  if (!taskId || !props.control?.sprints?.length) return null
  return props.control.sprints.find(sprint => (sprint.tasks ?? []).some(task => task.id === taskId)) ?? null
})

const highlightedSprintId = computed(() => selectedTaskSprint.value?.id || props.activeSprintId || '')

watch(() => props.activeTaskId, async (taskId) => {
  const normalizedTaskId = taskId || null
  if (selectedTaskId.value !== normalizedTaskId) {
    selectedTaskId.value = normalizedTaskId
  }

  if (!import.meta.client || typeof document === 'undefined') return
  if (!normalizedTaskId) return

  await nextTick()
  const taskElement = document.querySelector<HTMLElement>(`[data-kanban-task-id="${normalizedTaskId}"]`)
  if (taskElement) {
    taskElement.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}, { immediate: true })

watch(selectedTaskId, (taskId) => {
  const normalizedTaskId = taskId || ''
  if ((props.activeTaskId || '') === normalizedTaskId) return
  emit('update:active-task', normalizedTaskId)
})

watch(() => props.activeSprintId, async (sprintId) => {
  if (!import.meta.client || typeof document === 'undefined') return

  if (!sprintId || selectedTaskSprint.value || selectedTaskId.value) return
  await nextTick()
  document.querySelector<HTMLElement>(`[data-kanban-sprint-id="${sprintId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}, { immediate: true })

function createTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatTaskDate(value?: string) {
  if (!value) return 'без дедлайна'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return taskDateFormatter.format(parsed)
}

function getTasks(sprint: HybridControlSprint, status: HybridControlTaskStatus) {
  return (sprint.tasks ?? []).filter(task => task.status === status)
}

function getTaskCount(sprint: HybridControlSprint) {
  return sprint.tasks?.length ?? 0
}

function getStatusLabel(status: HybridControlTaskStatus) {
  return statuses.find(item => item.value === status)?.label ?? status
}

function focusTask(task: HybridControlTask) {
  selectedTaskId.value = task.id
}

function clearTaskSelection() {
  selectedTaskId.value = null
}

function persistTaskChanges() {
  emit('save')
}

function onDragStart(event: DragEvent, task: HybridControlTask, sprintId: string) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('taskId', task.id)
  event.dataTransfer.setData('sprintId', sprintId)
  event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event: DragEvent, targetSprintId: string, targetStatus: HybridControlTaskStatus) {
  const taskId = event.dataTransfer?.getData('taskId')
  const sourceSprintId = event.dataTransfer?.getData('sprintId')
  if (!taskId || !sourceSprintId || !props.control?.sprints) return

  const sourceSprint = props.control.sprints.find(sprint => sprint.id === sourceSprintId)
  if (!sourceSprint) return

  const sourceTasks = sourceSprint.tasks ?? (sourceSprint.tasks = [])
  const sourceTaskIndex = sourceTasks.findIndex(task => task.id === taskId)
  if (sourceTaskIndex === -1) return

  const [task] = sourceTasks.splice(sourceTaskIndex, 1)
  if (!task) return

  const targetSprint = props.control.sprints.find(sprint => sprint.id === targetSprintId)
  if (!targetSprint) {
    sourceTasks.splice(sourceTaskIndex, 0, task)
    return
  }

  task.status = targetStatus

  const targetTasks = targetSprint.tasks ?? (targetSprint.tasks = [])
  targetTasks.push(task)
  selectedTaskId.value = task.id
  emit('save')
}

function addTask(sprint: HybridControlSprint, status: HybridControlTaskStatus) {
  const newTask: HybridControlTask = {
    id: createTaskId(),
    title: 'Новая задача',
    status,
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  }

  const sprintTasks = sprint.tasks ?? (sprint.tasks = [])
  sprintTasks.push(newTask)
  selectedTaskId.value = newTask.id
  emit('save')
}

function removeTask(sprint: HybridControlSprint, taskId: string) {
  const sprintTasks = sprint.tasks ?? []
  const taskIndex = sprintTasks.findIndex(task => task.id === taskId)
  if (taskIndex === -1) return

  sprintTasks.splice(taskIndex, 1)
  if (selectedTaskId.value === taskId) {
    selectedTaskId.value = null
  }
  emit('save')
}

function removeSelectedTask() {
  if (!selectedTaskSprint.value || !selectedTaskId.value) return
  removeTask(selectedTaskSprint.value, selectedTaskId.value)
}
</script>

<template>
  <div v-if="control?.sprints?.length" class="akanban">
    <div class="akanban-overview">
      <article v-for="stat in kanbanStats" :key="stat.label" class="akanban-stat">
        <span class="akanban-stat__label">{{ stat.label }}</span>
        <strong class="akanban-stat__value">{{ stat.value }}</strong>
      </article>
    </div>

    <div class="akanban-workspace">
      <div class="akanban-board-card">
        <div class="akanban-board">
          <div class="akanban-header">
            <div class="akanban-head-copy">
              <p class="akanban-eyebrow">Спринтовый поток</p>
              <h3 class="akanban-title">Канбан спринтов</h3>
            </div>
            <div class="akanban-columns">
              <div v-for="status in statuses" :key="status.value" class="akanban-col-head">
                {{ status.label }}
              </div>
            </div>
          </div>

          <article
            v-for="sprint in control.sprints"
            :key="sprint.id"
            class="akanban-swimlane"
            :class="{ 'akanban-swimlane--selected': highlightedSprintId === sprint.id }"
            :data-kanban-sprint-id="sprint.id"
          >
            <div class="akanban-sprint-info">
              <p class="akanban-eyebrow">{{ sprint.linkedPhaseKey ? 'Фаза' : 'Спринт' }}</p>
              <div class="akanban-sprint-name-row">
                <div class="akanban-sprint-name">{{ sprint.name }}</div>
                <span class="akanban-token">{{ sprint.status }}</span>
              </div>
              <div class="akanban-sprint-phase">{{ sprint.linkedPhaseKey || 'Без привязки' }}</div>
              <div class="akanban-sprint-meta">
                <span class="akanban-token">{{ getTaskCount(sprint) }} задач</span>
                <span v-if="sprint.goal" class="akanban-sprint-goal">{{ sprint.goal }}</span>
              </div>
            </div>

            <div class="akanban-sprint-columns">
              <section
                v-for="status in statuses"
                :key="`${sprint.id}-${status.value}`"
                class="akanban-col"
                @dragover.prevent
                @drop="onDrop($event, sprint.id, status.value)"
              >
                <div class="akanban-col__head">
                  <span>{{ status.label }}</span>
                  <strong>{{ getTasks(sprint, status.value).length }}</strong>
                </div>

                <div class="akanban-col__stack">
                  <button
                    v-for="task in getTasks(sprint, status.value)"
                    :key="task.id"
                    class="akanban-card"
                    :class="{ 'akanban-card--active': selectedTask?.id === task.id }"
                    :data-kanban-task-id="task.id"
                    type="button"
                    draggable="true"
                    @dragstart="onDragStart($event, task, sprint.id)"
                    @click="focusTask(task)"
                  >
                    <div class="akanban-card__top">
                      <div class="akanban-card-title">{{ task.title }}</div>
                      <span class="akanban-token akanban-token--score">{{ task.points || 0 }} pt</span>
                    </div>
                    <div class="akanban-card-meta">
                      <span>{{ task.assignee || 'без исполнителя' }}</span>
                      <span>{{ formatTaskDate(task.dueDate) }}</span>
                    </div>
                    <div v-if="task.notes" class="akanban-card-note">{{ task.notes }}</div>
                  </button>
                </div>

                <GlassButton
                  variant="secondary"
                  density="compact"
                  class="akanban-add-btn"
                  type="button"
                  @click="addTask(sprint, status.value)"
                >
                  + задача
                </GlassButton>
              </section>
            </div>
          </article>
        </div>
      </div>

      <aside class="akanban-inspector" :class="{ 'akanban-inspector--empty': !selectedTask }">
        <template v-if="selectedTask">
          <div class="akanban-inspector__head">
            <div class="akanban-inspector__copy">
              <p class="akanban-eyebrow">{{ selectedTaskSprint?.name || 'Задача' }}</p>
              <h4 class="akanban-inspector__title">{{ selectedTask.title || 'Новая задача' }}</h4>
              <div class="akanban-inspector__tokens">
                <span class="akanban-token">{{ getStatusLabel(selectedTask.status) }}</span>
                <span v-if="selectedTaskSprint?.linkedPhaseKey" class="akanban-token">{{ selectedTaskSprint.linkedPhaseKey }}</span>
                <span class="akanban-token">{{ selectedTask.points || 0 }} pt</span>
              </div>
            </div>
            <GlassButton variant="secondary" density="compact" type="button" @click="clearTaskSelection">закрыть</GlassButton>
          </div>

          <div class="akanban-inspector__grid">
            <div class="u-field">
              <label class="u-field__label">Название</label>
              <GlassInput v-model="selectedTask.title" @blur="persistTaskChanges" />
            </div>

            <div class="u-field">
              <label class="u-field__label">Статус</label>
              <select v-model="selectedTask.status" class="u-status-sel" @change="persistTaskChanges">
                <option v-for="status in statuses" :key="status.value" :value="status.value">{{ status.label }}</option>
              </select>
            </div>

            <div class="u-field">
              <label class="u-field__label">Исполнитель</label>
              <GlassInput v-model="selectedTask.assignee" @blur="persistTaskChanges" />
            </div>

            <div class="u-field">
              <label class="u-field__label">Оценка</label>
              <GlassInput v-model.number="selectedTask.points" type="number" min="0" max="100" @blur="persistTaskChanges" />
            </div>

            <div class="u-field">
              <label class="u-field__label">Дедлайн</label>
              <AppDatePicker v-model="selectedTask.dueDate" model-type="iso" input-class="glass-input" @update:model-value="persistTaskChanges" />
            </div>

            <div class="u-field">
              <label class="u-field__label">Спринт</label>
              <div class="akanban-inspector__value">{{ selectedTaskSprint?.name || 'Без спринта' }}</div>
            </div>

            <div class="u-field u-field--full">
              <label class="u-field__label">Заметки</label>
              <GlassTextarea v-model="selectedTask.notes" :rows="5" @blur="persistTaskChanges" />
            </div>
          </div>

          <div class="akanban-inspector__actions">
            <GlassButton variant="danger" density="compact" type="button" @click="removeSelectedTask">удалить</GlassButton>
          </div>
        </template>

        <div v-else class="akanban-empty">[ ЗАДАЧА НЕ ВЫБРАНА ]</div>
      </aside>
    </div>
  </div>

  <div v-else class="u-empty">
    Нет активных спринтов
  </div>
</template>

<style scoped>
.akanban {
  --akanban-text: var(--glass-text);
  --akanban-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --akanban-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --akanban-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --akanban-panel: color-mix(in srgb, var(--glass-bg) 88%, white 4%);
  --akanban-panel-strong: color-mix(in srgb, var(--glass-bg) 96%, white 6%);
  --akanban-panel-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --akanban-radius: 28px;
  --akanban-inner-radius: 22px;
  --akanban-chip-radius: 999px;
  --akanban-border-width: 1px;
  --akanban-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  --akanban-backdrop: blur(18px) saturate(145%);
  --akanban-label-transform: uppercase;
  --akanban-label-spacing: 0.12em;
  display: grid;
  gap: 18px;
  margin-top: 16px;
}

:global(html[data-design-mode="liquid-glass"] .akanban) {
  --akanban-text: var(--glass-text);
  --akanban-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --akanban-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --akanban-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --akanban-panel: color-mix(in srgb, var(--glass-bg) 88%, white 4%);
  --akanban-panel-strong: color-mix(in srgb, var(--glass-bg) 96%, white 6%);
  --akanban-panel-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --akanban-radius: 22px;
  --akanban-inner-radius: 22px;
  --akanban-chip-radius: 999px;
  --akanban-border-width: 1px;
  --akanban-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
  --akanban-backdrop: blur(18px) saturate(145%);
  --akanban-label-transform: uppercase;
  --akanban-label-spacing: 0.12em;
}

:global(html[data-design-mode="material3"] .akanban) {
  --akanban-text: var(--sys-color-on-surface);
  --akanban-muted: var(--sys-color-on-surface-variant);
  --akanban-border: var(--sys-color-outline-variant);
  --akanban-strong-border: var(--sys-color-outline);
  --akanban-panel: var(--sys-color-surface-container-low);
  --akanban-panel-strong: var(--sys-color-surface-container);
  --akanban-panel-muted: color-mix(in srgb, var(--sys-color-secondary-container) 44%, transparent);
  --akanban-radius: var(--sys-radius-xl, 28px);
  --akanban-inner-radius: var(--sys-radius-lg, 20px);
  --akanban-shadow: var(--sys-elevation-level2, 0 12px 28px rgba(15, 23, 42, 0.12));
  --akanban-backdrop: none;
  --akanban-label-transform: none;
  --akanban-label-spacing: 0.01em;
}

:global(html[data-design-mode="brutalist"] .akanban) {
  --akanban-border-width: 2px;
  --akanban-radius: 0px;
  --akanban-inner-radius: 0px;
  --akanban-chip-radius: 0px;
  --akanban-shadow: none;
  --akanban-backdrop: none;
  --akanban-label-transform: uppercase;
  --akanban-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .akanban) {
  --akanban-text: rgba(255, 255, 255, 0.92);
  --akanban-muted: rgba(255, 255, 255, 0.54);
  --akanban-border: rgba(255, 255, 255, 0.12);
  --akanban-strong-border: rgba(255, 255, 255, 0.24);
  --akanban-panel: rgba(255, 255, 255, 0.02);
  --akanban-panel-strong: rgba(255, 255, 255, 0.04);
  --akanban-panel-muted: rgba(255, 255, 255, 0.03);
  --akanban-radius: 4px 4px 0 0;
  --akanban-inner-radius: 4px 4px 0 0;
  --akanban-chip-radius: 4px 4px 0 0;
  --akanban-shadow: none;
  --akanban-backdrop: none;
  --akanban-label-spacing: 0.16em;
}

:global(html[data-concept="brutal"] .akanban) {
  --akanban-text: #000000;
  --akanban-muted: rgba(0, 0, 0, 0.66);
  --akanban-border: #000000;
  --akanban-strong-border: #000000;
  --akanban-panel: #ffffff;
  --akanban-panel-strong: #f5efdf;
  --akanban-panel-muted: #fbf4e7;
  --akanban-radius: 4px 4px 0 0;
  --akanban-inner-radius: 4px 4px 0 0;
  --akanban-chip-radius: 4px 4px 0 0;
  --akanban-border-width: 2px;
  --akanban-shadow: 6px 6px 0 #000000;
  --akanban-backdrop: none;
  --akanban-label-spacing: 0.14em;
}

.akanban-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.akanban-stat,
.akanban-board-card,
.akanban-inspector {
  border: var(--akanban-border-width) solid var(--akanban-border);
  border-radius: var(--akanban-radius);
  background: var(--akanban-panel);
  color: var(--akanban-text);
  box-shadow: var(--akanban-shadow);
  backdrop-filter: var(--akanban-backdrop);
  -webkit-backdrop-filter: var(--akanban-backdrop);
}

.akanban-stat {
  display: grid;
  gap: 10px;
  min-height: 88px;
  padding: 16px 18px;
}

.akanban-stat__label,
.akanban-eyebrow,
.akanban-col-head,
.akanban-col__head,
.akanban-empty {
  text-transform: var(--akanban-label-transform);
  letter-spacing: var(--akanban-label-spacing);
}

.akanban-stat__label,
.akanban-eyebrow,
.akanban-col-head,
.akanban-col__head,
.akanban-card-meta,
.akanban-sprint-phase,
.akanban-sprint-goal,
.akanban-empty {
  font-size: 0.72rem;
  color: var(--akanban-muted);
}

.akanban-stat__value,
.akanban-title,
.akanban-sprint-name,
.akanban-inspector__title,
.akanban-card-title {
  margin: 0;
  color: var(--akanban-text);
}

.akanban-stat__value {
  font-size: clamp(1rem, 2vw, 1.24rem);
}

.akanban-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.akanban-board-card {
  overflow: auto;
  padding: 16px;
}

.akanban-board {
  display: grid;
  gap: 14px;
  min-width: 1160px;
}

.akanban-header,
.akanban-swimlane {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 14px;
}

.akanban-header {
  align-items: end;
}

.akanban-head-copy {
  display: grid;
  gap: 6px;
}

.akanban-columns,
.akanban-sprint-columns {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 12px;
}

.akanban-col-head,
.akanban-col__head,
.akanban-sprint-name-row,
.akanban-card__top,
.akanban-card-meta,
.akanban-inspector__head,
.akanban-inspector__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.akanban-swimlane {
  padding: 16px;
  border: var(--akanban-border-width) solid var(--akanban-border);
  border-radius: var(--akanban-inner-radius);
  background: var(--akanban-panel-muted);
}

.akanban-swimlane--selected {
  border-color: color-mix(in srgb, var(--ds-accent) 34%, var(--akanban-strong-border));
  background: color-mix(in srgb, var(--ds-accent) 6%, var(--akanban-panel-muted));
}

.akanban-sprint-info {
  display: grid;
  align-content: start;
  gap: 10px;
  padding-right: 14px;
  border-right: 1px solid var(--akanban-border);
}

.akanban-sprint-meta {
  display: grid;
  gap: 8px;
}

.akanban-token,
.akanban-inspector__value {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border: var(--akanban-border-width) solid var(--akanban-border);
  border-radius: var(--akanban-chip-radius);
  background: var(--akanban-panel-strong);
  color: var(--akanban-text);
  font-size: 0.72rem;
  line-height: 1;
}

.akanban-token--score {
  white-space: nowrap;
}

.akanban-col {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  min-height: 240px;
  padding: 10px;
  border: var(--akanban-border-width) dashed var(--akanban-border);
  border-radius: var(--akanban-inner-radius);
  background: color-mix(in srgb, var(--akanban-panel-strong) 82%, transparent);
}

.akanban-col__stack {
  display: grid;
  align-content: start;
  gap: 10px;
}

.akanban-card {
  display: grid;
  gap: 10px;
  width: 100%;
  min-height: 96px;
  padding: 12px;
  border: var(--akanban-border-width) solid var(--akanban-border);
  border-radius: var(--akanban-inner-radius);
  background: var(--akanban-panel);
  color: var(--akanban-text);
  text-align: left;
  cursor: grab;
  user-select: none;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.akanban-card--active,
.akanban-card:hover {
  border-color: var(--akanban-strong-border);
  background: var(--akanban-panel-strong);
  transform: translateY(-1px);
}

.akanban-card:active {
  cursor: grabbing;
  transform: none;
}

.akanban-card-note {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--akanban-text);
}

.akanban-add-btn {
  width: 100%;
  min-height: 44px;
  justify-content: center;
}

.akanban-inspector {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 16px;
  min-height: 280px;
  padding: 18px;
}

.akanban-inspector__copy,
.akanban-inspector__grid,
.akanban-inspector__tokens {
  display: grid;
  gap: 10px;
}

.akanban-inspector__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.akanban-inspector__tokens {
  grid-template-columns: repeat(auto-fit, minmax(0, max-content));
}

.akanban-inspector__value {
  min-height: 44px;
}

.akanban-inspector--empty {
  align-content: center;
}

.akanban-empty {
  display: grid;
  place-items: center;
  min-height: 220px;
}

:global(html[data-design-mode="brutalist"] .akanban-card) {
  transition: none;
}

:global(html[data-design-mode="brutalist"] .akanban-card--active),
:global(html[data-design-mode="brutalist"] .akanban-card:hover) {
  transform: none;
}

:global(html[data-concept="brutal"] .akanban-board-card),
:global(html[data-concept="brutal"] .akanban-inspector),
:global(html[data-concept="brutal"] .akanban-stat),
:global(html[data-concept="brutal"] .akanban-card),
:global(html[data-concept="brutal"] .akanban-swimlane),
:global(html[data-concept="brutal"] .akanban-col),
:global(html[data-concept="brutal"] .akanban-token),
:global(html[data-concept="brutal"] .akanban-inspector__value) {
  box-shadow: 4px 4px 0 #000000;
}

:global(html[data-concept="brutal"] .akanban-card:hover),
:global(html[data-concept="brutal"] .akanban-card--active) {
  background: #f0e5d1;
}

@media (max-width: 1220px) {
  .akanban-workspace {
    grid-template-columns: 1fr;
  }

  .akanban-inspector {
    position: static;
  }
}

@media (max-width: 900px) {
  .akanban-overview,
  .akanban-header,
  .akanban-swimlane {
    grid-template-columns: 1fr;
  }

  .akanban-board {
    min-width: 0;
  }

  .akanban-columns,
  .akanban-sprint-columns {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .akanban-sprint-info {
    padding-right: 0;
    padding-bottom: 12px;
    border-right: 0;
    border-bottom: 1px solid var(--akanban-border);
  }
}

@media (max-width: 720px) {
  .akanban-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .akanban-columns,
  .akanban-sprint-columns,
  .akanban-inspector__grid {
    grid-template-columns: 1fr;
  }
}
</style>
