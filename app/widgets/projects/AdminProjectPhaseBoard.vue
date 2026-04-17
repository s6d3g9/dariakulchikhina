<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HybridControl, HybridControlPhase, HybridControlSprint } from '~/shared/types/project'

const props = defineProps<{
  control: HybridControl
}>()

const emit = defineEmits<{
  (e: 'save'): void
}>()

const dragSprint = ref<string | null>(null)

function onDragStart(event: DragEvent, sprintId: string) {
  dragSprint.value = sprintId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', sprintId)
  }
}

function onDrop(event: DragEvent, targetPhaseKey: string) {
  const sprintId = event.dataTransfer?.getData('text/plain') || dragSprint.value
  if (!sprintId) return

  const sprint = props.control.sprints.find(s => s.id === sprintId)
  if (sprint && sprint.linkedPhaseKey !== targetPhaseKey) {
    sprint.linkedPhaseKey = targetPhaseKey || undefined
    emit('save')
  }
  dragSprint.value = null
}

const sprintMatrix = computed(() => {
  const map: Record<string, HybridControlSprint[]> = {
    unlinked: []
  }
  
  if (props.control.phases) {
    props.control.phases.forEach(p => {
      map[p.phaseKey] = []
    })
  }

  if (props.control.sprints) {
    props.control.sprints.forEach(s => {
      if (s.linkedPhaseKey && map[s.linkedPhaseKey]) {
        map[s.linkedPhaseKey].push(s)
      } else {
        map.unlinked.push(s)
      }
    })
  }

  return map
})
</script>

<template>
  <div class="aphase-board">
    <!-- Unlinked (Backlog) Column -->
    <div 
      class="aphase-col"
      @dragover.prevent
      @dragenter.prevent
      @drop="onDrop($event, '')"
    >
      <div class="aphase-col__head">
        <h4>Без фазы (Спринты: бэклог)</h4>
      </div>
      <div class="aphase-col__body">
        <div 
          v-for="sprint in sprintMatrix.unlinked" 
          :key="sprint.id" 
          class="aphase-sprint-card"
          draggable="true"
          @dragstart="onDragStart($event, sprint.id)"
        >
          <div class="aphase-sprint-card__head">
            <strong>{{ sprint.name }}</strong>
            <span class="aphase-sprint-status" :class="`aphase-sprint-status--${sprint.status}`">{{ sprint.status }}</span>
          </div>
          <span class="aphase-sprint-dates">{{ sprint.startDate || '...' }} – {{ sprint.endDate || '...' }}</span>
        </div>
      </div>
    </div>

    <!-- Phase Columns -->
    <div 
      v-for="phase in control.phases" 
      :key="phase.id"
      class="aphase-col"
      :class="{ 'aphase-col--done': phase.status === 'done' }"
      @dragover.prevent
      @dragenter.prevent
      @drop="onDrop($event, phase.phaseKey)"
    >
      <div class="aphase-col__head">
        <div class="aphase-col__head-top">
          <p class="aphase-col__kicker">{{ phase.phaseKey }}</p>
          <span class="aphase-col__percent">{{ phase.percent || 0 }}%</span>
        </div>
        <h4>{{ phase.title }}</h4>
      </div>
      <div class="aphase-col__body">
        <div 
          v-for="sprint in sprintMatrix[phase.phaseKey]" 
          :key="sprint.id" 
          class="aphase-sprint-card"
          draggable="true"
          @dragstart="onDragStart($event, sprint.id)"
        >
          <div class="aphase-sprint-card__head">
            <strong>{{ sprint.name }}</strong>
            <span class="aphase-sprint-status" :class="`aphase-sprint-status--${sprint.status}`">{{ sprint.status }}</span>
          </div>
          <span class="aphase-sprint-dates">{{ sprint.startDate || '...' }} – {{ sprint.endDate || '...' }}</span>
          <p class="aphase-sprint-goal" v-if="sprint.goal">{{ sprint.goal }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aphase-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 16px 0;
  align-items: flex-start;
  min-height: 250px;
}

.aphase-col {
  flex: 0 0 280px;
  background: color-mix(in srgb, var(--glass-surface) 40%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s;
}

.aphase-col--done {
  opacity: 0.6;
}

.aphase-col__head {
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.aphase-col__head-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.aphase-col__kicker {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: color-mix(in srgb, var(--glass-text) 60%, transparent);
}

.aphase-col__percent {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--theme-accent);
}

.aphase-col__head h4 {
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
}

.aphase-col__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100px;
}

.aphase-sprint-card {
  background: var(--glass-surface);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding: 12px;
  border-radius: 8px;
  cursor: grab;
  transition: transform 0.2s, box-shadow 0.2s;
}

.aphase-sprint-card:active {
  cursor: grabbing;
  transform: scale(0.98);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.aphase-sprint-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.aphase-sprint-status {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  text-transform: uppercase;
}

.aphase-sprint-dates {
  display: block;
  font-size: 0.8rem;
  color: color-mix(in srgb, var(--glass-text) 70%, transparent);
  margin-top: 6px;
}

.aphase-sprint-goal {
  font-size: 0.85rem;
  margin-top: 8px;
  line-height: 1.3;
  color: color-mix(in srgb, var(--glass-text) 90%, transparent);
}
</style>
