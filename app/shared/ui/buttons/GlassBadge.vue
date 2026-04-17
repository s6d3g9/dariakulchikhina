<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Тип бэйджа/статуса */
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'ghost' | 'neutral'
  /** Уменьшенный размер */
  size?: 'sm' | 'md'
  /** Интенсивность размытия */
  blur?: boolean
}>(), {
  variant: 'neutral',
  size: 'md',
  blur: true
})

const badgeClasses = computed(() => {
  return [
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 border',
    props.blur ? 'backdrop-blur-md' : '',
    props.size === 'sm' ? 'px-2 py-0.5 text-[0.65rem] tracking-wider' : 'px-3 py-1 text-xs tracking-wide',
    
    // Liquid Variants
    props.variant === 'info' ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-300 shadow-[inset_0_1px_2px_rgba(14,165,233,0.3)]' : '',
    props.variant === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 shadow-[inset_0_1px_2px_rgba(16,185,129,0.3)]' : '',
    props.variant === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300 shadow-[inset_0_1px_2px_rgba(245,158,11,0.3)]' : '',
    props.variant === 'danger' ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300 shadow-[inset_0_1px_2px_rgba(225,29,72,0.3)]' : '',
    props.variant === 'neutral' ? 'bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 text-current shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]' : '',
    props.variant === 'ghost' ? 'bg-transparent border-transparent text-current opacity-70' : '',
  ]
})
</script>

<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>
