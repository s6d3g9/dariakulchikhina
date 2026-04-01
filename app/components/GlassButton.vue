<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai'
  glow?: string | null
  loading?: boolean
  disabled?: boolean
  icon?: string | null
  iconPosition?: 'left' | 'right'
}>(), {
  variant: 'primary',
  glow: null,
  loading: false,
  disabled: false,
  icon: null,
  iconPosition: 'left'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const buttonClasses = computed(() => {
  return [
    'transition-all duration-300 relative overflow-hidden active:scale-95 flex items-center justify-center',
    {
      'opacity-50 cursor-not-allowed pointer-events-none': props.disabled || props.loading,
      'a-btn-save': props.variant === 'primary',
      'a-btn-sm': props.variant === 'secondary',
      'a-btn-danger': props.variant === 'danger',
      'a-btn-ai': props.variant === 'ai',
      // ghost = без фона/теней
      'bg-transparent hover:bg-neutral-500/10 text-current rounded-full px-4 py-2 text-sm font-medium border border-transparent': props.variant === 'ghost'
    }
  ]
})

const buttonStyle = computed(() => {
  if (props.glow && ['primary', 'ai', 'danger'].includes(props.variant)) {
    return {
      '--liquid-glow': `0 0 20px ${props.glow}`
    }
  }
  return {}
})
</script>

<template>
  <button
    :class="buttonClasses"
    :style="buttonStyle"
    :disabled="disabled || loading"
    @click="(e) => !loading && !disabled && emit('click', e)"
  >
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm z-10"
    >
      <UIcon name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-current" />
    </div>

    <!-- Иконка слева -->
    <UIcon v-if="icon && iconPosition === 'left'" :name="icon" class="w-4 h-4 shrink-0 transition-transform mr-1.5" />

    <slot />

    <!-- Иконка справа -->
    <UIcon v-if="icon && iconPosition === 'right'" :name="icon" class="w-4 h-4 shrink-0 transition-transform ml-1.5" />
  </button>
</template>
