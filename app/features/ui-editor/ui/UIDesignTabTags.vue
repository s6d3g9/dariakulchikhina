<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Внешний вид</div>
      <div class="dp-field">
        <label class="dp-label">скругление <span class="dp-val">{{ tokens.chipRadius === 999 ? '∞ (пилюля)' : tokens.chipRadius + 'px' }}</span></label>
        <input type="range" min="0" max="999" step="1" :value="tokens.chipRadius" class="dp-range" @input="onRange('chipRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">фоновый слой <span class="dp-val">{{ pct(tokens.chipBgOpacity) }}</span></label>
        <input type="range" min="0" max="0.3" step="0.005" :value="tokens.chipBgOpacity" class="dp-range" @input="onFloat('chipBgOpacity', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">непрозрачность рамки <span class="dp-val">{{ pct(tokens.chipBorderOpacity) }}</span></label>
        <input type="range" min="0" max="0.4" step="0.01" :value="tokens.chipBorderOpacity" class="dp-range" @input="onFloat('chipBorderOpacity', $event)">
      </div>
      <div class="dp-col-label" style="margin-top:10px">Отступы внутри тега</div>
      <div class="dp-field">
        <label class="dp-label">горизонт. <span class="dp-val">{{ tokens.chipPaddingH }}px</span></label>
        <input type="range" min="3" max="24" step="1" :value="tokens.chipPaddingH" class="dp-range" @input="onRange('chipPaddingH', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">вертикальн. <span class="dp-val">{{ tokens.chipPaddingV }}px</span></label>
        <input type="range" min="1" max="12" step="1" :value="tokens.chipPaddingV" class="dp-range" @input="onRange('chipPaddingV', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:6px; align-content:flex-start">
        <span
          v-for="label in ['Тег', 'Метка', 'Категория', '#хэштег', 'Статус', 'Фильтр']"
          :key="label"
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: (tokens.chipRadius > 99 ? 999 : tokens.chipRadius) + 'px',
            background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.chipBgOpacity * 100)}%, transparent)`,
            border: tokens.chipBorderOpacity > 0.005
              ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.chipBorderOpacity * 100)}%, transparent)`
              : '1px solid transparent',
            padding: `${tokens.chipPaddingV}px ${tokens.chipPaddingH}px`,
            fontSize: 'var(--ds-text-xs, .7rem)',
            color: 'var(--glass-text)',
            fontFamily: 'inherit'
          }"
        >{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()
</script>
