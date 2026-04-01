<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai'
  glow?: string | null
  loading?: boolean
  disabled?: boolean
  icon?: string | null
  iconPosition?: 'left' | 'right'
  density?: 'default' | 'compact' | 'comfortable'
}>(), {
  variant: 'primary',
  glow: null,
  loading: false,
  disabled: false,
  icon: null,
  iconPosition: 'left',
  density: 'default'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const attrs = useAttrs()

const attrsClass = computed(() => attrs.class as HTMLAttributes['class'])
const attrsStyle = computed<StyleValue>(() => attrs.style as StyleValue)

const buttonClasses = computed(() => {
  return [
    'glass-btn',
    {
      'a-btn-save': props.variant === 'primary',
      'a-btn-sm': props.variant === 'secondary',
      'a-btn-sm a-btn-danger': props.variant === 'danger',
      'a-btn-ai': props.variant === 'ai',
      'glass-btn--ghost': props.variant === 'ghost',
      'glass-btn--loading': props.loading,
      'glass-btn--disabled': props.disabled || props.loading,
    }
  ]
})

const buttonAttrs = computed(() => {
  const { class: _class, style: _style, type: _type, ...rest } = attrs
  return rest
})

const resolvedType = computed<ButtonType>(() => {
  return attrs.type === 'submit' || attrs.type === 'reset' ? attrs.type : 'button'
})

const buttonStyle = computed(() => {
  if (props.glow && ['primary', 'ai', 'danger'].includes(props.variant)) {
    return {
      '--glass-btn-glow': `0 0 20px ${props.glow}`
    }
  }
  return {}
})

const mergedButtonStyle = computed<StyleValue>(() => [buttonStyle.value, attrsStyle.value])
</script>

<template>
  <button
    v-bind="buttonAttrs"
    :type="resolvedType"
    :class="[buttonClasses, attrsClass]"
    :style="mergedButtonStyle"
    :disabled="disabled || loading"
    @click="(e) => !loading && !disabled && emit('click', e)"
  >
    <div
      v-if="loading"
      class="glass-btn__overlay"
    >
      <span class="glass-btn__loading-label">[ LOADING... ]</span>
    </div>

    <UIcon v-if="icon && iconPosition === 'left'" :name="icon" class="glass-btn__icon glass-btn__icon--left" />

    <slot />

    <UIcon v-if="icon && iconPosition === 'right'" :name="icon" class="glass-btn__icon glass-btn__icon--right" />
  </button>
</template>
