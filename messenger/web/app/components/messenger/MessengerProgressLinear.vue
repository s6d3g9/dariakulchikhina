<script setup lang="ts">
const props = withDefaults(defineProps<{
  ariaLabel: string
  value?: number | null
  buffer?: number | null
  indeterminate?: boolean
  fourColor?: boolean
  compact?: boolean
}>(), {
  value: null,
  buffer: null,
  indeterminate: false,
  fourColor: false,
  compact: false,
})

const normalizedValue = computed(() => {
  if (props.value === null || Number.isNaN(props.value)) {
    return 0
  }

  return Math.min(Math.max(props.value, 0), 1)
})

const normalizedBuffer = computed(() => {
  if (props.buffer === null || Number.isNaN(props.buffer)) {
    return 0
  }

  return Math.min(Math.max(props.buffer, normalizedValue.value), 1)
})

const determinate = computed(() => !props.indeterminate)
</script>

<template>
  <div
    class="m3-progress m3-progress--linear"
    :class="{
      'm3-progress--indeterminate': props.indeterminate,
      'm3-progress--four-color': props.fourColor,
      'm3-progress--compact': props.compact,
      'm3-progress--buffer': determinate && normalizedBuffer > normalizedValue,
    }"
    role="progressbar"
    :aria-label="props.ariaLabel"
    :aria-valuemin="determinate ? 0 : undefined"
    :aria-valuemax="determinate ? 100 : undefined"
    :aria-valuenow="determinate ? Math.round(normalizedValue * 100) : undefined"
    :style="{
      '--m3-progress-value': `${normalizedValue * 100}%`,
      '--m3-progress-buffer': `${normalizedBuffer * 100}%`,
    }"
  >
    <div class="m3-progress__track"></div>
    <div v-if="determinate && normalizedBuffer > normalizedValue" class="m3-progress__buffer"></div>
    <div v-if="determinate" class="m3-progress__bar"></div>
    <template v-else>
      <div class="m3-progress__bar m3-progress__bar--indeterminate"></div>
      <div class="m3-progress__bar m3-progress__bar--indeterminate-secondary"></div>
    </template>
  </div>
</template>