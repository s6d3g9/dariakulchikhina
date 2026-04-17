<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

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

const attrs = useAttrs()

const attrsClass = computed(() => attrs.class as HTMLAttributes['class'])
const attrsStyle = computed<StyleValue>(() => attrs.style as StyleValue)

const selectAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && `${props.modelValue}` !== ''
})

const selectClasses = computed(() => {
  return [
    'glass-input glass-input--select glass-input--with-chevron',
    {
      'error': props.error,
      'glass-select--placeholder': !hasValue.value,
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
  <div class="glass-field glass-field--select" :class="{ 'glass-field--inline': autoWidth }">
    <select
      v-bind="selectAttrs"
      :id="id"
      :name="name"
      :value="modelValue ?? ''"
      :disabled="disabled"
      :class="[selectClasses, attrsClass]"
      :style="attrsStyle"
      @change="onChange"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <option value="" disabled hidden>{{ placeholder }}</option>
      <template v-if="options && options.length > 0">
        <option 
          v-for="opt in options" 
          :key="opt.value" 
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </template>
      <slot v-else></slot>
    </select>

    <div class="glass-select__chevron">
      <UIcon name="i-heroicons-chevron-down-20-solid" class="glass-select__chevron-icon" />
    </div>
  </div>
</template>