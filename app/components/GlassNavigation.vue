<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'sidebar' | 'header' | 'pills'
  activeColor?: string
}>(), {
  variant: 'sidebar',
  activeColor: '#0ea5e9' // sky-500
})

const navClasses = computed(() => {
  return [
    'flex gap-1 w-full',
    {
      'flex-col adm-sidebar border-r border-white/10 dark:border-white/5': props.variant === 'sidebar',
      'flex-row items-center border-b border-white/10 dark:border-white/5 relative z-20': props.variant === 'header',
      'flex-row items-center gap-2': props.variant === 'pills'
    }
  ]
})
</script>

<template>
  <nav :class="navClasses">
    <slot />
  </nav>
</template>

<style scoped>
/* Применение стиля для дочерних a / button */
:deep(a),
:deep(button) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--btn-radius, 12px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  color: currentColor;
  opacity: 0.7;
}

:deep(a:hover),
:deep(button:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.05); /* Слегка подсвечивает */
  backdrop-filter: blur(12px);
}

:deep(a.router-link-active),
:deep(a.router-link-exact-active),
:deep(button.active) {
  opacity: 1;
  background: rgba(14, 165, 233, 0.15); /* Sky-500 с прозрачностью */
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 12px rgba(14, 165, 233, 0.2), inset 0 -1px 2px rgba(14,165,233, 0.1);
  color: #fff; /* Или можно использовать v-bind(activeColor) */
}
</style>
