<script setup lang="ts">
import { computed, useAttrs, type HTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  variant?: 'sidebar' | 'header' | 'pills'
  activeColor?: string
}>(), {
  variant: 'sidebar',
  activeColor: '#0ea5e9' // sky-500
})

const attrs = useAttrs()

const attrsClass = computed(() => attrs.class as HTMLAttributes['class'])
const attrsStyle = computed<StyleValue>(() => attrs.style as StyleValue)

const navAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const navClasses = computed(() => {
  return [
    'glass-nav',
    `glass-nav--${props.variant}`,
  ]
})

const navStyle = computed(() => ({
  '--glass-nav-active-color': props.activeColor,
}))

const mergedNavStyle = computed<StyleValue>(() => [navStyle.value, attrsStyle.value])
</script>

<template>
  <nav v-bind="navAttrs" :class="[navClasses, attrsClass]" :style="mergedNavStyle">
    <slot />
  </nav>
</template>
