<script setup lang="ts">
defineProps<{
  modelStartValue: string
  modelEndValue: string
}>()

const emit = defineEmits<{
  'update:startValue': [value: string]
  'update:endValue': [value: string]
}>()

function formatRangeLabel(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'Период не задан'
}
</script>

<template>
  <div class="rs-range-row rs-field-block--full">
    <VTextField
      :model-value="modelStartValue"
      type="date"
      variant="outlined"
      density="comfortable"
      label="Начало"
      hide-details
      @update:model-value="emit('update:startValue', $event)"
    />
    <VTextField
      :model-value="modelEndValue"
      type="date"
      variant="outlined"
      density="comfortable"
      label="Конец"
      hide-details
      @update:model-value="emit('update:endValue', $event)"
    />
  </div>
</template>

<style scoped>
.rs-range-row {
  display: grid;
  gap: 10px;
}

.rs-field-block--full {
  grid-column: 1 / -1;
}

@container project-actions (max-width: 479px) {
  .rs-range-row {
    grid-template-columns: 1fr;
  }
}

@container project-actions (min-width: 640px) {
  .rs-range-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
}
</style>
