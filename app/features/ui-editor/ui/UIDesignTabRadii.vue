<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Радиусы</div>
      <div class="dp-field">
        <label class="dp-label">карточки <span class="dp-val">{{ tokens.cardRadius }}px</span></label>
        <input type="range" min="0" max="32" step="1" :value="tokens.cardRadius" class="dp-range" @input="onRange('cardRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">поля ввода <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
        <input type="range" min="0" max="20" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">чипы <span class="dp-val">{{ tokens.chipRadius === 999 ? '∞' : tokens.chipRadius + 'px' }}</span></label>
        <input type="range" min="0" max="999" step="1" :value="tokens.chipRadius" class="dp-range" @input="onRange('chipRadius', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">модальные <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
        <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Отступы</div>
      <div class="dp-field">
        <label class="dp-label">базовый юнит <span class="dp-val">{{ tokens.spacingBase }}px</span></label>
        <input type="range" min="2" max="12" step="1" :value="tokens.spacingBase" class="dp-range" @input="onRange('spacingBase', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">масштаб <span class="dp-val">{{ pct(tokens.spacingScale) }}</span></label>
        <input type="range" min="0.6" max="1.8" step="0.05" :value="tokens.spacingScale" class="dp-range" @input="onFloat('spacingScale', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью</div>
      <div class="dp-radii-row">
        <div class="dp-radii-box" :style="{ borderRadius: tokens.cardRadius + 'px' }">card</div>
        <div class="dp-radii-box" :style="{ borderRadius: tokens.inputRadius + 'px' }">input</div>
        <div class="dp-radii-box" :style="{ borderRadius: tokens.chipRadius + 'px' }">chip</div>
        <div class="dp-radii-box" :style="{ borderRadius: tokens.modalRadius + 'px' }">modal</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, pct, onRange, onFloat } = useDesignTokenControls()
</script>
