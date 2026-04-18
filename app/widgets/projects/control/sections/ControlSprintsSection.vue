<template>
  <section class="hpc-section hpc-section--sprints">
    <div class="hpc-section__head">
      <div>
        <p class="hpc-section__label">Формы метаданных</p>
        <h3 class="hpc-section__title">Редактирование спринтов</h3>
      </div>
      <GlassButton variant="secondary" density="compact" type="button" @click="addSprint">+ спринт</GlassButton>
    </div>

    <div v-if="control.sprints.length" class="hpc-phase-overview hpc-phase-overview--sprints">
      <article v-for="stat in sprintStats" :key="stat.label" class="hpc-phase-stat">
        <span class="hpc-phase-stat__label">{{ stat.label }}</span>
        <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
      </article>
    </div>

    <div v-if="control.sprints.length" class="hpc-sprint-shell hpc-sprint-shell--detail">
      <div class="hpc-sprint-list hpc-sprint-list--cards">
        <article
          v-for="sprint in control.sprints"
          :key="sprint.id"
          class="hpc-sprint-card"
          :class="{ 'hpc-sprint-card--active': isSelectedSprint(sprint) }"
          :data-sprint-id="sprint.id"
          tabindex="0"
          @click="focusSprint(sprint.id)"
          @keydown.enter.prevent="focusSprint(sprint.id)"
          @keydown.space.prevent="focusSprint(sprint.id)"
        >
          <div class="hpc-sprint-card__head">
            <div>
              <p class="hpc-phase-card__kicker">{{ sprint.linkedPhaseKey ? getPhaseTitleByKey(sprint.linkedPhaseKey) : 'Без фазы' }}</p>
              <h4 class="hpc-phase-card__title">{{ sprint.name }}</h4>
            </div>
            <div class="hpc-phase-card__head-right">
              <span class="hpc-chip">{{ sprintStatusLabels[sprint.status] }}</span>
              <span class="hpc-chip">{{ getSprintCompletionLabel(sprint) }}</span>
            </div>
          </div>

          <div class="hpc-sprint-card__summary">
            <article class="hpc-sprint-card__summary-item">
              <span class="hpc-sprint-card__summary-label">Цель</span>
              <strong class="hpc-sprint-card__summary-value">{{ sprint.goal || 'Цель пока не зафиксирована' }}</strong>
            </article>
            <article class="hpc-sprint-card__summary-item">
              <span class="hpc-sprint-card__summary-label">Фокус</span>
              <strong class="hpc-sprint-card__summary-value">{{ sprint.focus || 'Фокус не заполнен' }}</strong>
            </article>
            <article class="hpc-sprint-card__summary-item">
              <span class="hpc-sprint-card__summary-label">Период</span>
              <strong class="hpc-sprint-card__summary-value">{{ formatDateRange(sprint.startDate, sprint.endDate) }}</strong>
            </article>
          </div>

          <div class="hpc-sprint-card__foot">
            <span class="hpc-recommendation-text">{{ sprint.tasks.length }} задач в спринте</span>
            <GlassButton variant="secondary" density="compact" type="button" @click.stop="focusSprint(sprint.id)">редактировать</GlassButton>
          </div>
        </article>
      </div>

      <section
        v-if="selectedSprint"
        class="hpc-sprint-detail-card"
        :data-admin-sprint-detail-id="selectedSprint.id"
      >
        <div class="hpc-sprint-detail__head">
          <div>
            <p class="hpc-phase-card__kicker">{{ selectedSprintPhaseTitle }}</p>
            <h3 class="hpc-section__title">{{ selectedSprint.name }}</h3>
          </div>
          <div class="hpc-phase-card__head-right">
            <span class="hpc-chip">{{ sprintStatusLabels[selectedSprint.status] }}</span>
            <span class="hpc-chip">{{ selectedSprint.tasks.length }} задач</span>
            <GlassButton variant="danger" density="compact" type="button" @click="removeSelectedSprint">удалить спринт</GlassButton>
          </div>
        </div>

        <div class="hpc-phase-overview hpc-phase-overview--detail">
          <article v-for="stat in selectedSprintStats" :key="stat.label" class="hpc-phase-stat">
            <span class="hpc-phase-stat__label">{{ stat.label }}</span>
            <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
          </article>
        </div>

        <div class="hpc-grid hpc-grid--top">
          <div class="u-field">
            <label class="u-field__label">Название спринта</label>
            <GlassInput v-model="selectedSprint.name" @blur="emit('save')" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Привязка к фазе</label>
            <select v-model="selectedSprint.linkedPhaseKey" class="u-status-sel" @change="emit('save')">
              <option v-for="phase in control.phases" :key="phase.phaseKey" :value="phase.phaseKey">{{ phase.title }}</option>
            </select>
          </div>
          <div class="u-field">
            <label class="u-field__label">Статус</label>
            <select v-model="selectedSprint.status" class="u-status-sel" @change="emit('save')">
              <option v-for="option in sprintStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="u-field">
            <label class="u-field__label">Старт</label>
            <AppDatePicker v-model="selectedSprint.startDate" model-type="iso" input-class="glass-input" @update:model-value="emit('save')" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Финиш</label>
            <AppDatePicker v-model="selectedSprint.endDate" model-type="iso" input-class="glass-input" @update:model-value="emit('save')" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Цель спринта</label>
            <GlassTextarea v-model="selectedSprint.goal" :rows="2" @blur="emit('save')" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Фокус команды</label>
            <GlassTextarea v-model="selectedSprint.focus" :rows="2" @blur="emit('save')" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">Ретроспектива</label>
            <GlassTextarea v-model="selectedSprint.retrospective" :rows="2" @blur="emit('save')" />
          </div>
        </div>

        <div class="hpc-task-head">
          <span class="hpc-task-head__title">Задачи спринта</span>
          <div class="hpc-phase-card__head-right">
            <span class="hpc-chip">{{ selectedSprint.tasks.length }} задач</span>
            <GlassButton variant="secondary" density="compact" type="button" @click="addTask(selectedSprint)">+ задача</GlassButton>
          </div>
        </div>

        <div class="hpc-sprint-board">
          <section v-for="column in selectedSprintColumns" :key="column.status" class="hpc-sprint-column">
            <div class="hpc-sprint-column__head">
              <span>{{ column.label }}</span>
              <strong>{{ column.tasks.length }}</strong>
            </div>

            <div v-if="column.tasks.length" class="hpc-task-list hpc-task-list--board">
              <article
                v-for="task in column.tasks"
                :key="task.id"
                class="hpc-task-card"
                :class="{ 'hpc-task-card--active': isSelectedTask(task) }"
                :data-phase-task-id="task.id"
                tabindex="0"
                @click="focusTask(task.id, selectedSprint.id)"
                @keydown.enter.prevent="focusTask(task.id, selectedSprint.id)"
                @keydown.space.prevent="focusTask(task.id, selectedSprint.id)"
              >
                <div class="hpc-task-card__top">
                  <div class="hpc-task-card__title">{{ task.title }}</div>
                  <span class="hpc-chip">{{ task.points || 0 }} pt</span>
                </div>
                <div class="hpc-task-card__meta">
                  <span>{{ task.assignee || 'без исполнителя' }}</span>
                  <span>{{ formatTaskDueDate(task.dueDate) }}</span>
                </div>
                <div v-if="task.notes" class="hpc-task-card__note">{{ task.notes }}</div>
              </article>
            </div>
            <div v-else class="hpc-empty hpc-empty--inline">Нет задач</div>
          </section>
        </div>

        <section v-if="selectedTask" class="hpc-sprint-detail-card hpc-task-detail-card">
          <div class="hpc-sprint-detail__head">
            <div>
              <p class="hpc-phase-card__kicker">{{ taskStatusLabels[selectedTask.status] }}</p>
              <h3 class="hpc-section__title">{{ selectedTask.title }}</h3>
            </div>
            <div class="hpc-phase-card__head-right">
              <span class="hpc-chip">{{ selectedSprint.name }}</span>
              <span class="hpc-chip">{{ selectedTask.points || 0 }} pt</span>
              <GlassButton variant="secondary" density="compact" type="button" @click="emit('open-task-scope-details', selectedTask.id, selectedSprint.id)">контур задачи</GlassButton>
              <GlassButton variant="secondary" density="compact" type="button" @click="clearTaskFocus">снять фокус</GlassButton>
            </div>
          </div>

          <div class="hpc-phase-overview hpc-phase-overview--detail">
            <article v-for="stat in selectedTaskStats" :key="stat.label" class="hpc-phase-stat">
              <span class="hpc-phase-stat__label">{{ stat.label }}</span>
              <strong class="hpc-phase-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div class="hpc-grid hpc-grid--top">
            <div class="u-field">
              <label class="u-field__label">Статус</label>
              <button class="hpc-task-state" type="button" @click="cycleTask(selectedTask)">{{ taskStatusLabels[selectedTask.status] }}</button>
            </div>
            <div class="u-field">
              <label class="u-field__label">Название</label>
              <GlassInput v-model="selectedTask.title" @blur="emit('save')" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Оценка</label>
              <GlassInput v-model.number="selectedTask.points" type="number" min="0" max="100" @blur="emit('save')" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Исполнитель</label>
              <GlassInput v-model="selectedTask.assignee" @blur="emit('save')" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Дедлайн</label>
              <AppDatePicker v-model="selectedTask.dueDate" model-type="iso" input-class="glass-input" @update:model-value="emit('save')" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Удалить задачу</label>
              <GlassButton variant="danger" density="compact" type="button" @click="removeSelectedTask">удалить</GlassButton>
            </div>
            <div class="u-field u-field--full">
              <label class="u-field__label">Заметки</label>
              <GlassTextarea v-model="selectedTask.notes" :rows="2" @blur="emit('save')" />
            </div>
          </div>
        </section>
      </section>
    </div>

    <div v-else class="hpc-empty">Нет спринтов</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatHybridTimelineDateRange } from '~~/shared/utils/project-control-timeline'
import type {
  HybridControl,
  HybridControlSprint,
  HybridControlTask,
} from '~~/shared/types/project'

const props = defineProps<{
  control: HybridControl
  activeSprintId: string
  activeTaskId: string
  summary: {
    activePhase: { phaseKey?: string } | null
    activeSprint: { id?: string } | null
  }
}>()

const emit = defineEmits<{
  save: []
  'update:activeSprintId': [id: string]
  'update:activeTaskId': [id: string]
  'open-task-scope-details': [taskId: string, sprintId: string]
}>()

const sprintStatusOptions = [
  { value: 'planned', label: 'запланирован' },
  { value: 'active', label: 'активен' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'завершён' },
] as const

const sprintStatusLabels = Object.fromEntries(
  sprintStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof sprintStatusOptions)[number]['value'], string>

const taskStatuses: HybridControlTask['status'][] = ['todo', 'doing', 'review', 'done']

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const taskDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
})

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return props.control.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function getSprintById(id: string) {
  return props.control.sprints.find(sprint => sprint.id === id) || null
}

function getTaskContext(taskId?: string) {
  if (!taskId) return null
  for (const sprint of props.control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) return { sprint, task }
  }
  return null
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

const sprintTaskStats = computed(() => props.control.sprints.reduce((acc, sprint) => {
  acc.total += sprint.tasks.length
  acc.done += sprint.tasks.filter(task => task.status === 'done').length
  return acc
}, { done: 0, total: 0 }))

const sprintStats = computed(() => ([
  { label: 'Спринтов', value: `${props.control.sprints.length}` },
  { label: 'Активных', value: `${props.control.sprints.filter(sprint => sprint.status === 'active').length}` },
  { label: 'Задач', value: `${sprintTaskStats.value.total}` },
  { label: 'Готово', value: sprintTaskStats.value.total ? `${sprintTaskStats.value.done}/${sprintTaskStats.value.total}` : '0' },
]))

const selectedSprint = computed(() => getSprintById(props.activeSprintId)
  || getTaskContext(props.activeTaskId)?.sprint
  || props.summary.activeSprint && getSprintById(props.summary.activeSprint.id || '')
  || props.control.sprints[0]
  || null)

const selectedTaskContext = computed(() => getTaskContext(props.activeTaskId))

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

function isSelectedSprint(sprint: HybridControlSprint) {
  return selectedSprint.value?.id === sprint.id
}

function isSelectedTask(task: HybridControlTask) {
  return selectedTask.value?.id === task.id
}

function focusSprint(sprintId?: string) {
  if (!sprintId) return
  emit('update:activeTaskId', '')
  emit('update:activeSprintId', sprintId)
}

function focusTask(taskId?: string, sprintId?: string) {
  if (!taskId) return
  emit('update:activeTaskId', taskId)
  if (sprintId) emit('update:activeSprintId', sprintId)
}

function clearTaskFocus() {
  emit('update:activeTaskId', '')
}

function addSprint() {
  const sprint: HybridControlSprint = {
    id: `hybrid-sprint-${Date.now()}`,
    name: `Спринт ${props.control.sprints.length + 1}`,
    linkedPhaseKey: props.summary.activePhase?.phaseKey || 'construction',
    goal: '',
    focus: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    retrospective: '',
    tasks: [],
  }

  props.control.sprints.push(sprint)
  emit('update:activeSprintId', sprint.id)
  emit('update:activeTaskId', '')
  emit('save')
}

function removeSprint(index: number) {
  const removed = props.control.sprints[index]
  props.control.sprints.splice(index, 1)

  if (removed?.id === props.activeSprintId) {
    emit('update:activeSprintId', props.control.sprints[index]?.id || props.control.sprints[index - 1]?.id || '')
  }

  if (removed?.tasks.some(task => task.id === props.activeTaskId)) {
    emit('update:activeTaskId', '')
  }

  emit('save')
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
  emit('update:activeSprintId', sprint.id)
  emit('update:activeTaskId', task.id)
  emit('save')
}

function removeTask(sprint: HybridControlSprint, index: number) {
  const removed = sprint.tasks[index]
  sprint.tasks.splice(index, 1)

  if (removed?.id === props.activeTaskId) {
    emit('update:activeTaskId', sprint.tasks[index]?.id || sprint.tasks[index - 1]?.id || '')
  }

  emit('save')
}

function removeSelectedSprint() {
  const sprint = selectedSprint.value
  if (!sprint) return

  const index = props.control.sprints.findIndex(item => item.id === sprint.id)
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

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  emit('save')
}
</script>
