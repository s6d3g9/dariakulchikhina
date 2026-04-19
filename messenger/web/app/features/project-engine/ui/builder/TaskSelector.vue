<script setup lang="ts">
type TaskStatusItem = { title: string; value: string }

const _props = defineProps<{
  taskMode: 'existing' | 'new'
  selectedTaskId: string
  taskTitle: string
  selectedTaskStatus: string
  taskItems: Array<{ id: string; title: string; source?: string; phaseKey?: string; sprintId?: string; rangeStart?: string; rangeEnd?: string; status?: string }>
  phaseItems: Array<{ phaseKey: string; title: string; startDate?: string; endDate?: string }>
  sprintItems: Array<{ id: string; name: string; startDate?: string; endDate?: string; linkedPhaseKey?: string }>
  selectedTaskStatusItems: TaskStatusItem[]
  usesTaskStatusSelection: boolean
}>()

const emit = defineEmits<{
  'update:taskMode': [value: 'existing' | 'new']
  'update:selectedTaskId': [value: string]
  'update:taskTitle': [value: string]
  'update:selectedTaskStatus': [value: string]
}>()
</script>

<template>
  <div class="pa-field-block pa-field-block--full">
    <div class="pa-field-block__head">
      <span class="pa-field-block__title">Задача</span>
      <span class="pa-field-block__hint">Новая или из существующего списка.</span>
    </div>

    <div class="pa-mode-row">
      <button
        type="button"
        class="pa-mode-chip"
        :class="{ 'pa-mode-chip--active': taskMode === 'new' }"
        @click="emit('update:taskMode', 'new')"
      >
        Новая
      </button>
      <button
        type="button"
        class="pa-mode-chip"
        :class="{ 'pa-mode-chip--active': taskMode === 'existing' }"
        @click="emit('update:taskMode', 'existing')"
      >
        Из списка
      </button>
    </div>

    <VAutocomplete
      v-if="taskMode === 'existing'"
      :model-value="selectedTaskId"
      :items="taskItems"
      item-title="title"
      item-value="id"
      variant="outlined"
      density="comfortable"
      label="Задача"
      clearable
      hide-details
      @update:model-value="emit('update:selectedTaskId', $event)"
    />

    <VTextField
      v-else
      :model-value="taskTitle"
      variant="outlined"
      density="comfortable"
      label="Название задачи"
      placeholder="Например: Согласовать акт"
      hide-details
      @update:model-value="emit('update:taskTitle', $event)"
    />

    <VSelect
      v-if="usesTaskStatusSelection"
      :model-value="selectedTaskStatus"
      :items="selectedTaskStatusItems"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="comfortable"
      label="Статус"
      hide-details
      @update:model-value="emit('update:selectedTaskStatus', $event)"
    />
  </div>
</template>

<style scoped>
.pa-field-block {
  display: grid;
  gap: 10px;
}

.pa-field-block--full {
  grid-column: 1 / -1;
}

.pa-field-block__head {
  display: grid;
  gap: 2px;
}

.pa-field-block__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-field-block__hint {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pa-mode-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-container-highest));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.pa-mode-chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

@container project-actions (max-width: 479px) {
  .pa-mode-chip {
    min-height: 40px;
    padding-inline: 12px;
  }
}
</style>
