<script setup lang="ts">
const props = withDefaults(defineProps<{
  ariaLabel?: string
  value?: number | null
  indeterminate?: boolean
  fourColor?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  ariaLabel: '',
  value: null,
  indeterminate: false,
  fourColor: false,
  size: 'md',
})

const normalizedValue = computed(() => {
  if (props.value === null || Number.isNaN(props.value)) {
    return 0
  }

  return Math.min(Math.max(props.value, 0), 1)
})

const circumference = 100.531

const dashOffset = computed(() => circumference * (1 - normalizedValue.value))
</script>

<template>
  <div
    class="m3-progress m3-progress--circular"
    :class="{
      'm3-progress--indeterminate': props.indeterminate,
      'm3-progress--four-color': props.fourColor,
      [`m3-progress--${props.size}`]: true,
    }"
    role="progressbar"
    :aria-label="props.ariaLabel"
    :aria-valuemin="!props.indeterminate ? 0 : undefined"
    :aria-valuemax="!props.indeterminate ? 100 : undefined"
    :aria-valuenow="!props.indeterminate ? Math.round(normalizedValue * 100) : undefined"
  >
    <svg class="m3-progress__svg" viewBox="0 0 40 40" aria-hidden="true">
      <circle class="m3-progress__circle-track" cx="20" cy="20" r="16"></circle>
      <circle
        class="m3-progress__circle-indicator"
        cx="20"
        cy="20"
        r="16"
        :style="props.indeterminate ? undefined : {
          strokeDasharray: `${circumference}`,
          strokeDashoffset: `${dashOffset}`,
        }"
      ></circle>
    </svg>
  </div>
</template>