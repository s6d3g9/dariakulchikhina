<script setup lang="ts">
import { computed } from 'vue'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  options?: SelectOption[]
  placeholder?: string
  error?: boolean
  disabled?: boolean
  id?: string
  name?: string
  autoWidth?: boolean
}>(), {
  modelValue: '',
  options: () => [],
  placeholder: 'Выберите...',
  error: false,
  disabled: false,
  id: undefined,
  name: undefined,
  autoWidth: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const selectClasses = computed(() => {
  return [
    'glass-input appearance-none outline-none transition-all duration-300 relative h-12',
    props.autoWidth ? 'w-auto' : 'w-full',
    'placeholder:text-current px-4 pr-10', // pr-10 для иконки стрелочки
    {
      'error': props.error,
      'opacity-50 cursor-not-allowed': props.disabled,
      'text-current/40': !props.modelValue && props.modelValue !== 0 // placeholder style
    }
  ]
})

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <div class="relative group" :class="[autoWidth ? 'inline-block' : 'w-full']">
    <select
      :id="id"
      :name="name"
      :value="modelValue"
      :disabled="disabled"
      :class="selectClasses"
      @change="onChange"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <!-- Скрытый placeholder -->
      <option value="" disabled hidden selected>{{ placeholder }}</option>
      <!-- Основные опции -->
      <template v-if="options && options.length > 0">
        <option 
          v-for="opt in options" 
          :key="opt.value" 
          :value="opt.value"
          :disabled="opt.disabled"
          class="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800"
        >
          {{ opt.label }}
        </option>
      </template>
      <slot v-else></slot>
    </select>
    
    <!-- Кастомная стрелочка -->
    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
      <UIcon name="i-heroicons-chevron-down-20-solid" class="w-5 h-5 block" />
    </div>
  </div>
</template>

<style scoped>
.glass-input {
  min-height: 48px;
  line-height: normal;
  border-radius: var(--input-radius, 16px);
}
</style>