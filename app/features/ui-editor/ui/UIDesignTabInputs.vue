<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Фон поля</div>
      <div class="dp-field">
        <label class="dp-label">прозрачность фона <span class="dp-val">{{ pct(tokens.inputBgOpacity) }}</span></label>
        <input type="range" min="0" max="0.25" step="0.005" :value="tokens.inputBgOpacity" class="dp-range" @input="onFloat('inputBgOpacity', $event)">
        <div class="dp-field-hint">0% — полностью прозрачный фон; 25% — плотный</div>
      </div>
      <div class="dp-field">
        <label class="dp-label">непрозрачность рамки <span class="dp-val">{{ pct(tokens.inputBorderOpacity) }}</span></label>
        <input type="range" min="0" max="0.4" step="0.01" :value="tokens.inputBorderOpacity" class="dp-range" @input="onFloat('inputBorderOpacity', $event)">
        <div class="dp-field-hint">0% — рамки нет; добавляет тонкую обводку вокруг поля</div>
      </div>
      <div class="dp-col-label" style="margin-top:10px">Скругление</div>
      <div class="dp-field">
        <label class="dp-label">радиус <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
        <input type="range" min="0" max="20" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-live-preview" style="margin-top:0; flex-direction:column; gap:8px">
        <GlassInput
          placeholder="Текстовое поле"
          :style="previewFieldStyle"
        />
        <select class="glass-input" :style="previewSelectStyle">
          <option>Выпадающий список</option>
        </select>
        <textarea
          placeholder="Многострочное поле&#10;второй ряд"
          rows="2"
          :style="previewTextareaStyle"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()

function baseFieldStyle() {
  return {
    borderRadius: tokens.value.inputRadius + 'px',
    background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.value.inputBgOpacity * 100)}%, transparent)`,
    border: tokens.value.inputBorderOpacity > 0.005
      ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.value.inputBorderOpacity * 100)}%, transparent)`
      : 'none',
    padding: '7px 10px',
    width: '100%',
    fontSize: 'var(--ds-text-sm, .8rem)',
    fontFamily: 'inherit',
    color: 'var(--glass-text)',
  }
}

const previewFieldStyle = computed(() => ({
  ...baseFieldStyle(),
  outline: 'none',
}))

const previewSelectStyle = computed(() => ({
  ...baseFieldStyle(),
  appearance: 'none',
}))

const previewTextareaStyle = computed(() => ({
  ...baseFieldStyle(),
  resize: 'none',
}))
</script>
