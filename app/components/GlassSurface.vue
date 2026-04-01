<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Стекло размывает фон? (true = 48px blur, false = нет размытия) */
  blur?: boolean
  /** Плотность заливки (0-1). layer 'surface' обычно 0.15, 'elevated' 0.25 */
  density?: number
  /** Наличие бликов и физического преломления (inset box-shadow) */
  refraction?: boolean
  /** Уровень высоты (влияет на тени). 'surface' = базовая, 'elevated' = над, 'floating' = парящая (dropdowns) */
  layer?: 'surface' | 'elevated' | 'floating'
  /** Реагирует ли на hover/focus? (brightness, transform) */
  interactive?: boolean
  /** Внутренние отступы для слота (tailwind padding classes) */
  padding?: string
  /** HTML тег элемента (div, section, article, etc) */
  as?: string
}>(), {
  blur: true,
  density: 0.15,
  refraction: true,
  layer: 'surface',
  interactive: false,
  padding: '',
  as: 'div'
})

const surfaceClasses = computed(() => {
  return [
    'glass-surface',
    'glass-card',
    props.padding,
    {
      '!backdrop-blur-none': !props.blur,
      '!shadow-none': !props.refraction && props.layer === 'surface',
      'hover:brightness-110 hover:-translate-y-0.5 cursor-pointer': props.interactive,
      // В зависимости от слоя можно добавить вспомогательные классы тени
      'shadow-xl': props.layer === 'elevated',
      'shadow-2xl z-50': props.layer === 'floating',
    }
  ]
})

const surfaceStyles = computed(() => {
  // Переопределяем --glass-opacity локально для конкретного элемента, если передан density
  const styles: Record<string, string> = {}
  if (props.density !== 0.15) {
    styles['--glass-opacity'] = String(props.density)
  }
  return styles
})
</script>

<template>
  <component :is="as" :class="surfaceClasses" :style="surfaceStyles">
    <slot />
  </component>
</template>
