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

<style scoped src="./AdminProjectKanban.scoped.css"></style>
