<script setup lang="ts">
import { computed } from 'vue'

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

const textareaClasses = computed(() => {
  return [
    'glass-input w-full outline-none transition-all duration-300 backdrop-blur-md relative py-3 resize-y',
    'placeholder:text-current placeholder:opacity-40 px-4',
    {
      'border-red-500/50 focus:ring-red-500/30 bg-red-500/5': props.error,
      'opacity-50 cursor-not-allowed': props.disabled
    }
  ]
})
</script>

<template>
  <div class="relative w-full group">
    <textarea
      :id="id"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="textareaClasses"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    ></textarea>

    <div
      v-if="animateFill"
      class="absolute bottom-0 left-4 right-4 h-[2px] bg-sky-500/50 transition-transform origin-left rounded-full z-10"
      :class="[modelValue ? 'scale-x-100' : 'scale-x-0']"
    ></div>
  </div>
</template>

<style scoped>
.glass-input {
  min-height: 48px;
  line-height: 1.5;
  border-radius: var(--input-radius, 16px);
}
</style>