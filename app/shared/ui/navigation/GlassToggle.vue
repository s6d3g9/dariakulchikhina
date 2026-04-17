<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Включен/выключен */
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
}>(), {
  modelValue: false,
  label: '',
  description: '',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div 
    class="flex items-start gap-3 cursor-pointer group"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
    @click="toggle"
  >
    <!-- Switch Track -->
    <div 
      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-300 shadow-[inset_0_1px_4px_rgba(0,0,0,0.2)] border border-white/10 mt-0.5"
      :class="modelValue ? 'bg-sky-500/50 border-sky-500/50' : 'bg-black/10 dark:bg-white/5'"
    >
      <!-- Knob with refraction -->
      <span 
        class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 shadow-md ring-0 group-hover:scale-110"
        :class="modelValue ? 'translate-x-4 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'translate-x-1 opacity-80'"
      ></span>
    </div>

    <!-- Label & Description -->
    <div v-if="label || description" class="flex flex-col gap-0.5 select-none">
      <span v-if="label" class="text-sm font-medium tracking-wide transition-colors group-hover:text-sky-500" :class="modelValue ? 'text-current' : 'opacity-80'">
        {{ label }}
      </span>
      <span v-if="description" class="text-xs opacity-50 tracking-wide">
        {{ description }}
      </span>
    </div>
  </div>
</template>
