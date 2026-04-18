<template>
  <div class="dp-mode-bar">
    <span class="dp-mode-label">режим</span>
    <button
      type="button"
      class="dp-mode-btn"
      :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-glass' }"
      title="Жидкое стекло: blur, глубина, мягкий хром, pill-формы"
      @click="$emit('pick-mode', 'concept-glass')"
    >
      <span class="dp-mode-icon">❖</span>
      <span class="dp-mode-name">Жидкое стекло</span>
      <span class="dp-mode-hint">apple · blur · depth</span>
    </button>
    <button
      type="button"
      class="dp-mode-btn"
      :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-minale' }"
      title="Брутализм / Minale + Mann — чёрный фон, белый текст, uppercase, hairlines"
      @click="$emit('pick-mode', 'concept-minale')"
    >
      <span class="dp-mode-icon">◼</span>
      <span class="dp-mode-name">Брутализм / Minale</span>
      <span class="dp-mode-hint">black · tracked · primary</span>
    </button>
    <button
      type="button"
      class="dp-mode-btn"
      :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-m3' }"
      title="Material 3 — тональные поверхности, скруглённые формы, тени"
      @click="$emit('pick-mode', 'concept-m3')"
    >
      <span class="dp-mode-icon">⨁</span>
      <span class="dp-mode-name">Material 3</span>
      <span class="dp-mode-hint">google · tonal · pill</span>
    </button>
    <button
      type="button"
      class="dp-mode-btn dp-mode-btn--reset"
      :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-minale' }"
      title="Вернуть режим по умолчанию — Брутализм / Minale"
      @click="$emit('clear-mode')"
    >
      <span class="dp-mode-icon">○</span>
      <span class="dp-mode-name">По умолчанию</span>
      <span class="dp-mode-hint">brutalist · default</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeModeSlug: string
}>()

defineEmits<{
  'pick-mode': [slug: string]
  'clear-mode': []
}>()
</script>
