<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tabs: string[]
  modelValue: string
  /** Плотность фона самих кнопок: ghost, pill */
  variant?: 'pill' | 'ghost'
}>(), {
  variant: 'pill'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="inline-flex items-center gap-1.5 p-1.5 rounded-[20px] bg-black/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
    <button
      v-for="tab in tabs"
      :key="tab"
      class="relative px-4 py-1.5 text-sm font-medium transition-all duration-300 rounded-[14px]"
      :class="[
        modelValue === tab 
          ? 'text-sky-600 dark:text-sky-300 shadow-sm blur-0' 
          : 'text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
      ]"
      @click="emit('update:modelValue', tab)"
    >
      <span class="relative z-10">{{ tab }}</span>

      <!-- Плавающий бэкграунд -->
      <div 
        v-if="modelValue === tab" 
        class="absolute inset-0 bg-white dark:bg-white/10 rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]"
        :class="variant === 'ghost' ? 'bg-sky-500/10 border-sky-500/20' : ''"
      ></div>
    </button>
  </div>
</template>
