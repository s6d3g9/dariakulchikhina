<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Стекло</div>
      <div class="dp-field">
        <label class="dp-label">размытие <span class="dp-val">{{ tokens.glassBlur }}px</span></label>
        <input type="range" min="0" max="64" step="1" :value="tokens.glassBlur" class="dp-range" @input="onRange('glassBlur', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.glassSaturation }}%</span></label>
        <input type="range" min="0" max="300" step="5" :value="tokens.glassSaturation" class="dp-range" @input="onRange('glassSaturation', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.glassOpacity) }}</span></label>
        <input type="range" min="0" max="1" step="0.02" :value="tokens.glassOpacity" class="dp-range" @input="onFloat('glassOpacity', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">обводка <span class="dp-val">{{ pct(tokens.glassBorderOpacity) }}</span></label>
        <input type="range" min="0" max="0.5" step="0.01" :value="tokens.glassBorderOpacity" class="dp-range" @input="onFloat('glassBorderOpacity', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Тени</div>
      <div class="dp-field">
        <label class="dp-label">тень Y <span class="dp-val">{{ tokens.shadowOffsetY }}px</span></label>
        <input type="range" min="0" max="24" step="1" :value="tokens.shadowOffsetY" class="dp-range" @input="onRange('shadowOffsetY', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">размытие <span class="dp-val">{{ tokens.shadowBlurRadius }}px</span></label>
        <input type="range" min="0" max="64" step="1" :value="tokens.shadowBlurRadius" class="dp-range" @input="onRange('shadowBlurRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">spread <span class="dp-val">{{ tokens.shadowSpread }}px</span></label>
        <input type="range" min="-8" max="8" step="1" :value="tokens.shadowSpread" class="dp-range" @input="onRange('shadowSpread', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.shadowOpacity) }}</span></label>
        <input type="range" min="0" max="0.4" step="0.01" :value="tokens.shadowOpacity" class="dp-range" @input="onFloat('shadowOpacity', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-surface-demo" style="margin-top:0">
        <div class="dp-surface-card" :style="surfaceStyle">
          <div class="dp-surface-title">Карточка</div>
          <div class="dp-surface-text">Пример поверхности с текущими настройками стекла и теней.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()

const surfaceStyle = computed(() => {
  const t = tokens.value
  return {
    backdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    WebkitBackdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    background: 'var(--glass-bg)',
    border: `${t.borderWidth}px ${t.borderStyle} var(--glass-border)`,
    boxShadow: `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(0,0,0,${t.shadowOpacity})`,
    borderRadius: `${t.cardRadius}px`,
  }
})
</script>
