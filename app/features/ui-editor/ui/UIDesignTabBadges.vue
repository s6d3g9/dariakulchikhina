<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Счётчики и метки</div>
      <div class="dp-field">
        <label class="dp-label">скругление <span class="dp-val">{{ tokens.badgeRadius === 999 ? '∞ (пилюля)' : tokens.badgeRadius + 'px' }}</span></label>
        <input type="range" min="0" max="999" step="1" :value="tokens.badgeRadius" class="dp-range" @input="onRange('badgeRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">насыщенность фона <span class="dp-val">{{ pct(tokens.badgeBgOpacity) }}</span></label>
        <input type="range" min="0" max="0.5" step="0.01" :value="tokens.badgeBgOpacity" class="dp-range" @input="onFloat('badgeBgOpacity', $event)">
        <div class="dp-field-hint">Фон использует акцентный цвет из палитры</div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:8px; align-content:flex-start; align-items:center;">
        <span
          v-for="n in [1, 5, 12, 99]"
          :key="n"
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            height: '22px',
            padding: '0 6px',
            borderRadius: (tokens.badgeRadius > 99 ? 999 : tokens.badgeRadius) + 'px',
            background: `color-mix(in srgb, ${accentColor} ${Math.round(tokens.badgeBgOpacity * 100)}%, transparent)`,
            color: 'var(--glass-text)',
            fontSize: '.62rem',
            fontWeight: 700,
            fontFamily: 'inherit'
          }"
        >{{ n }}</span>
        <span
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            height: '22px',
            padding: '0 6px',
            borderRadius: (tokens.badgeRadius > 99 ? 999 : tokens.badgeRadius) + 'px',
            background: accentColor,
            color: '#fff',
            fontSize: '.62rem',
            fontWeight: 700,
            fontFamily: 'inherit'
          }"
        >NEW</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`,
)
</script>
