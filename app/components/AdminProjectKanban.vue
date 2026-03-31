<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HybridControl, HybridControlTask, HybridControlSprint, HybridControlTaskStatus } from '~/shared/types/project'

const props = defineProps<{
  control: HybridControl | undefined
}>()

const emit = defineEmits<{
  (e: 'save'): void
}>()

const openTask = ref<HybridControlTask | null>(null)
const statuses: { value: HybridControlTaskStatus, label: string }[] = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'doing', label: 'В работе' },
  { value: 'review', label: 'Ревью' },
  { value: 'done', label: 'Готово' }
]

function getTasks(sprint: HybridControlSprint, status: HybridControlTaskStatus) {
  return sprint.tasks?.filter(t => t.status === status) || []
}

function onDragStart(event: DragEvent, task: HybridControlTask, sprintId: string) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('taskId', task.id)
  event.dataTransfer.setData('sprintId', sprintId)
  event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event: DragEvent, targetSprintId: string, status: HybridControlTaskStatus) {
  const taskId = event.dataTransfer?.getData('taskId')
  const sourceSprintId = event.dataTransfer?.getData('sprintId')
  if (!taskId || !sourceSprintId || !props.control?.sprints) return
  
  // Find task
  const sourceSprint = props.control.sprints.find(s => s.id === sourceSprintId)
  if (!sourceSprint) return
  
  const taskIndex = sourceSprint.tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) return
  
  const [task] = sourceSprint.tasks.splice(taskIndex, 1)
  
  // Set new status
  task.status = status
  
  // Add to target sprint
  const targetSprint = props.control.sprints.find(s => s.id === targetSprintId)
  if (targetSprint) {
    if (!targetSprint.tasks) targetSprint.tasks = []
    targetSprint.tasks.push(task)
  }
  
  emit('save')
}

function addTask(sprint: HybridControlSprint, status: HybridControlTaskStatus) {
  const newTask: HybridControlTask = {
    id: 't-' + Date.now(),
    title: 'Новая задача',
    status,
    points: 1
  }
  if (!sprint.tasks) sprint.tasks = []
  sprint.tasks.push(newTask)
  emit('save')
  openTask.value = newTask
}

function saveTask() {
  openTask.value = null
  emit('save')
}

function removeTask(sprint: HybridControlSprint, taskId: string) {
  const idx = sprint.tasks.findIndex(t => t.id === taskId)
  if (idx !== -1) {
    sprint.tasks.splice(idx, 1)
    openTask.value = null
    emit('save')
  }
}
</script>

<template>
  <div class="akanban" v-if="control?.sprints?.length">
    <div class="akanban-header">
      <h3 class="akanban-title">Канбан спринтов</h3>
      <div class="akanban-columns">
        <div v-for="st in statuses" :key="st.value" class="akanban-col-head">
          {{ st.label }}
        </div>
      </div>
    </div>
    
    <div v-for="sprint in control.sprints" :key="sprint.id" class="akanban-swimlane">
      <div class="akanban-sprint-info">
        <div class="akanban-sprint-name">{{ sprint.name }}</div>
        <div class="akanban-sprint-phase" v-if="sprint.linkedPhaseKey">Фаза: {{ sprint.linkedPhaseKey }}</div>
      </div>
      
      <div class="akanban-sprint-columns">
        <div 
          v-for="st in statuses" 
          :key="st.value" 
          class="akanban-col"
          @dragover.prevent
          @drop="onDrop($event, sprint.id, st.value)"
        >
          <div 
            v-for="task in getTasks(sprint, st.value)" 
            :key="task.id"
            class="akanban-card glass-card"
            draggable="true"
            @dragstart="onDragStart($event, task, sprint.id)"
            @click="openTask = task"
          >
            <div class="akanban-card-title">{{ task.title }}</div>
            <div class="akanban-card-meta">
              <span v-if="task.assignee">@{{ task.assignee }}</span>
              <span v-if="task.points">{{ task.points }}pt</span>
            </div>
          </div>
          <button class="akanban-add-btn" @click="addTask(sprint, st.value)">+ Добавить</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="openTask" class="akanban-modal-overlay" @click.self="saveTask">
        <div class="akanban-modal glass-surface">
          <h3 class="akanban-modal-title">Задача</h3>
          <div class="u-form-section">
            <label class="u-field__label">Название</label>
            <input v-model="openTask.title" class="glass-input" />
          </div>
          <div class="u-form-section">
            <label class="u-field__label">Исполнитель (ID/Имя)</label>
            <input v-model="openTask.assignee" class="glass-input" />
          </div>
          <div class="u-form-section">
            <label class="u-field__label">Оценка (points)</label>
            <input v-model.number="openTask.points" type="number" class="glass-input" />
          </div>
          <div class="u-form-section">
            <label class="u-field__label">Заметки</label>
            <textarea v-model="openTask.notes" class="glass-input" rows="3"></textarea>
          </div>
          <div class="akanban-modal-actions" style="justify-content: space-between">
            <button class="a-btn-sm a-btn-danger" @click="() => {
              const sprint = control?.sprints.find(s => s.tasks?.some(t => t.id === openTask?.id))
              if(sprint && openTask) removeTask(sprint, openTask.id)
            }">Удалить</button>
            <button class="a-btn-save" @click="saveTask">Сохранить</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
  <div v-else class="u-empty">
    Нет активных спринтов
  </div>
</template>

<style scoped>
.akanban {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
  overflow-x: auto;
}
.akanban-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.akanban-title {
  font-size: 1.1rem;
  font-weight: 500;
}
.akanban-columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding-left: 200px;
}
.akanban-col-head {
  font-size: 0.85rem;
  color: var(--glass-text-dim, #888);
  font-weight: 500;
  text-transform: uppercase;
}
.akanban-swimlane {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--glass-bg-base, rgba(0,0,0,0.02));
  border-radius: 12px;
  min-height: 120px;
}
:global(html.dark) .akanban-swimlane {
  background: rgba(255,255,255,0.03);
}
.akanban-sprint-info {
  width: 188px;
  flex-shrink: 0;
  border-right: 1px solid var(--glass-border, rgba(0,0,0,0.1));
  padding-right: 12px;
}
.akanban-sprint-name {
  font-weight: 500;
}
.akanban-sprint-phase {
  font-size: 0.8rem;
  color: var(--glass-text-dim, #888);
  margin-top: 4px;
}
.akanban-sprint-columns {
  flex-grow: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  min-width: 800px;
}
.akanban-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0,0,0,0.01);
  border-radius: 8px;
  padding: 8px;
}
:global(html.dark) .akanban-col {
  background: rgba(255,255,255,0.01);
}
.akanban-card {
  padding: 10px;
  cursor: grab;
  font-size: 0.9rem;
  transition: transform 0.2s;
  user-select: none;
}
.akanban-card:active {
  cursor: grabbing;
}
.akanban-card:-moz-drag-over {
  opacity: 0.5;
}
.akanban-card-title {
  margin-bottom: 6px;
  font-weight: 500;
  line-height: 1.3;
}
.akanban-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--glass-text-dim, #888);
}
.akanban-add-btn {
  background: transparent;
  border: 1px dashed var(--glass-border, rgba(0,0,0,0.2));
  border-radius: 8px;
  color: var(--glass-text-dim, #888);
  padding: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: auto;
}
.akanban-add-btn:hover {
  background: rgba(0,0,0,0.03);
}
:global(html.dark) .akanban-add-btn:hover {
  background: rgba(255,255,255,0.05);
}
.akanban-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.akanban-modal {
  width: 400px;
  max-width: 90vw;
  padding: 24px;
}
.akanban-modal-title {
  margin-bottom: 20px;
  font-size: 1.1rem;
  font-weight: 500;
}
.akanban-modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
