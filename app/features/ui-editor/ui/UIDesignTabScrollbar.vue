<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Полоса прокрутки</div>
      <div class="dp-field">
        <label class="dp-label">ширина <span class="dp-val">{{ tokens.scrollbarWidth }}px</span></label>
        <input type="range" min="2" max="14" step="1" :value="tokens.scrollbarWidth" class="dp-range" @input="onRange('scrollbarWidth', $event)">
        <div class="dp-field-hint">Ширина в пикселях для всех скроллбаров</div>
      </div>
      <div class="dp-field">
        <label class="dp-label">непрозрачность <span class="dp-val">{{ pct(tokens.scrollbarOpacity) }}</span></label>
        <input type="range" min="0" max="0.8" step="0.01" :value="tokens.scrollbarOpacity" class="dp-range" @input="onFloat('scrollbarOpacity', $event)">
        <div class="dp-field-hint">0 — невидимый, скроллбар появляется при наведении</div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div :style="{
        height: '120px',
        overflowY: 'scroll',
        padding: '8px 12px',
        background: 'color-mix(in srgb, var(--glass-text) 3%, transparent)',
        borderRadius: 'var(--card-radius,14px)',
        scrollbarWidth: 'thin',
        scrollbarColor: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.scrollbarOpacity * 100)}%, transparent) transparent`
      }">
        <div
          v-for="i in 12"
          :key="i"
          :style="{
            padding: '4px 0',
            fontSize: 'var(--ds-text-xs,.7rem)',
            color: 'var(--glass-text)',
            borderBottom: '1px solid color-mix(in srgb, var(--glass-text) 7%, transparent)'
          }"
        >Строка {{ i }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()
</script>
