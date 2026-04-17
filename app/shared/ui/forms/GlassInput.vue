<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  type?: string
  placeholder?: string
  modelValue?: string | number | null
  icon?: string | null
  error?: boolean
  animateFill?: boolean
  disabled?: boolean
}>(), {
  type: 'text',
  placeholder: '',
  icon: null,
  error: false,
  animateFill: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const attrs = useAttrs()

const attrsClass = computed(() => attrs.class as HTMLAttributes['class'])
const attrsStyle = computed<StyleValue>(() => attrs.style as StyleValue)

const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const hasValue = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && `${props.modelValue}`.length > 0
})

const inputClasses = computed(() => {
  return [
    'glass-input',
    {
      'error': props.error,
      'glass-input--with-icon': props.icon,
    }
  ]
})
</script>

<template>
  <div class="glass-field" :class="{ 'glass-field--with-icon': !!icon }">
    <UIcon
      v-if="icon"
      :name="icon"
      class="glass-field__icon"
    />

    <input
      v-if="type === 'file'"
      v-bind="inputAttrs"
      type="file"
      :disabled="disabled"
      :class="[inputClasses, attrsClass]"
      :style="attrsStyle"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).files ? ($event.target as HTMLInputElement).files![0] as any : null)"
      @focus="emit('focus', $event as FocusEvent)"
      @blur="emit('blur', $event as FocusEvent)"
    />
    <input
      v-else
      v-bind="inputAttrs"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[inputClasses, attrsClass]"
      :style="attrsStyle"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
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
