<script setup lang="ts">
import { computed, useAttrs } from 'vue'

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

defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const wrapperAttrs = computed(() => ({ class: attrs.class as string | undefined, style: attrs.style as any }));
const inputAttrs = computed(() => { const { class: _, style: __, ...rest } = attrs; return rest; });
</script>

<template>
  <div class="relative group" v-bind="wrapperAttrs" :class="!(attrs.class as string || '').includes('w-') ? 'w-full' : ''">
    <!-- Левая иконка если есть -->
    <UIcon
      v-if="icon"
      :name="icon"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-current opacity-40 transition-colors group-focus-within:text-sky-500 group-focus-within:opacity-100 z-10"
    />

    
    <!-- Fix for type=file preventing value assignment and $event.target usage -->
    <input v-if="type === 'file'" type="file" :disabled="disabled" :class="inputClasses" v-bind="inputAttrs" @change="emit('update:modelValue', ($event.target as HTMLInputElement).files ? ($event.target as HTMLInputElement).files![0] as any : null)" @focus="emit('focus', $event as FocusEvent)" @blur="emit('blur', $event as FocusEvent)" />
    <input v-else v-bind="inputAttrs"
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
