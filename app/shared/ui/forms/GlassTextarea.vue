<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  placeholder?: string
  modelValue?: string | null
  error?: boolean
  disabled?: boolean
  rows?: number
  animateFill?: boolean
  id?: string
  name?: string
}>(), {
  placeholder: '',
  modelValue: '',
  error: false,
  disabled: false,
  rows: 3,
  animateFill: false,
  id: undefined,
  name: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const attrs = useAttrs()

const attrsClass = computed(() => attrs.class as HTMLAttributes['class'])
const attrsStyle = computed<StyleValue>(() => attrs.style as StyleValue)

const textareaAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const hasValue = computed(() => {
  return !!props.modelValue && props.modelValue.length > 0
})

const textareaClasses = computed(() => {
  return [
    'glass-input glass-input--multiline',
    {
      'error': props.error,
    }
  ]
})
</script>

<template>
  <div class="glass-field glass-field--textarea">
    <textarea
      v-bind="textareaAttrs"
      :id="id"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="[textareaClasses, attrsClass]"
      :style="attrsStyle"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />

    <div
      v-if="animateFill"
      class="glass-input__fill"
      :class="{ 'glass-input__fill--active': hasValue }"
    />
  </div>
</template>