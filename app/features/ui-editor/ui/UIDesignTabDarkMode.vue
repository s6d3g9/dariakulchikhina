<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Параметры</div>
      <div class="dp-field">
        <label class="dp-label">подъём поверхностей <span class="dp-val">{{ tokens.darkElevation }}</span></label>
        <input type="range" min="0" max="20" step="1" :value="tokens.darkElevation" class="dp-range" @input="onRange('darkElevation', $event)">
        <div class="dp-field-hint">Осветляет фоны карточек в тёмном режиме</div>
      </div>
      <div class="dp-field">
        <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.darkSaturation }}%</span></label>
        <input type="range" min="0" max="100" step="5" :value="tokens.darkSaturation" class="dp-range" @input="onRange('darkSaturation', $event)">
        <div class="dp-field-hint">Убавляет цветовую насыщенность в тёмном режиме</div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Превью тёмной темы</div>
      <div class="dp-live-preview dp-dark-preview" style="margin-top:0">
        <div class="dp-dark-cards">
          <div
            class="dp-dark-card"
            :style="{
              background: `hsl(220, ${tokens.darkSaturation}%, ${8 + tokens.darkElevation * 0.5}%)`,
              borderRadius: tokens.cardRadius + 'px',
              border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`
            }"
          >
            <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Карточка</div>
            <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Пример текста в тёмной теме с текущими настройками.</div>
          </div>
          <div
            class="dp-dark-card"
            :style="{
              background: `hsl(220, ${tokens.darkSaturation}%, ${10 + tokens.darkElevation * 0.8}%)`,
              borderRadius: tokens.cardRadius + 'px',
              border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`
            }"
          >
            <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Элевация +1</div>
            <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Вложенная поверхность с большей яркостью.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, onRange } = useDesignTokenControls()
</script>
