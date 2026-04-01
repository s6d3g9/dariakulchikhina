<script setup lang="ts">
import { computed } from 'vue'

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

const inputClasses = computed(() => {
  return [
    'glass-input w-full outline-none transition-all duration-300 relative',
    'placeholder:text-current',
    {
      'error': props.error,
      'opacity-50 cursor-not-allowed': props.disabled,
      'px-10': props.icon, // Место под иконку
      'px-4': !props.icon
    }
  ]
})
</script>

<template>
  <div class="relative w-full group">
    <!-- Левая иконка если есть -->
    <UIcon
      v-if="icon"
      :name="icon"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-current opacity-40 transition-colors group-focus-within:text-sky-500 group-focus-within:opacity-100 z-10"
    />

    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClasses"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />

    <!-- Эффект заливки "воды" (в нижней части border-radius инпута) -->
    <div
      v-if="animateFill"
      class="absolute bottom-0 left-4 right-4 h-[2px] bg-sky-500/50 transition-transform origin-left drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] rounded-full z-10"
      :class="[modelValue ? 'scale-x-100' : 'scale-x-0']"
    ></div>
  </div>
</template>

<style scoped>
.glass-input {
  min-height: 48px;
  line-height: normal;
  border-radius: var(--input-radius, 16px);
}
</style>
