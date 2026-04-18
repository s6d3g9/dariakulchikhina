<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Ratio: <strong>{{ currentScaleLabel }}</strong></div>
      <div class="dp-chip-picker" style="margin-top:8px">
        <div class="dp-chip-pool">
          <button
            v-for="s in TYPE_SCALE_OPTIONS"
            :key="`type-scale-${s.ratio}`"
            type="button"
            class="dp-chip"
            :class="{ 'dp-chip--active': Math.abs(tokens.typeScale - s.ratio) < 0.005 }"
            @click="set('typeScale', s.ratio)"
          >{{ s.label }}</button>
        </div>
      </div>
    </div>
    <div class="dp-col dp-col--wide">
      <div class="dp-col-label">Визуализация шкалы</div>
      <div class="dp-scale-visual">
        <div
          v-for="s in typeScaleSizes"
          :key="s.name"
          class="dp-scale-row"
          :style="{ fontSize: s.size + 'rem', fontFamily: tokens.fontFamily }"
        >
          <span class="dp-scale-name">{{ s.name }}</span>
          <span class="dp-scale-sample">Аа — The quick brown fox</span>
          <span class="dp-scale-px">{{ (s.size * 16).toFixed(0) }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TYPE_SCALE_OPTIONS } from '~/entities/design-system/model/useDesignSystem'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set } = useDesignTokenControls()

const typeScaleSizes = computed(() => {
  const r = tokens.value.typeScale
  const fs = tokens.value.fontSize
  return [
    { name: '3xl', size: fs * r * r * r * r },
    { name: '2xl', size: fs * r * r * r },
    { name: 'xl', size: fs * r * r },
    { name: 'lg', size: fs * r },
    { name: 'md', size: fs },
    { name: 'sm', size: fs / r },
    { name: 'xs', size: fs / r / r },
  ]
})

const currentScaleLabel = computed(() =>
  TYPE_SCALE_OPTIONS.find((s: { ratio: number; label: string }) => Math.abs(s.ratio - tokens.value.typeScale) < 0.005)?.label || `${tokens.value.typeScale.toFixed(3)}`,
)
</script>
