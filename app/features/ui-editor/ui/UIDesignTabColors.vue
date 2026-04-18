<template>
  <div class="dp-page dp-page--cols">
    <!-- Колонка 1: Фоны -->
    <div class="dp-col">
      <div class="dp-col-label">Фоны</div>
      <div class="dp-field">
        <label class="dp-label">страница <button v-if="tokens.colorPageBg" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorPageBg', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorPageBg, '#f3f4f6')" @input="set('colorPageBg', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorPageBg }">{{ tokens.colorPageBg || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">поверхности / панели <button v-if="tokens.colorSurface" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorSurface', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorSurface, '#ffffff')" @input="set('colorSurface', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorSurface }">{{ tokens.colorSurface || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">границы / рамки <button v-if="tokens.colorBorder" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorBorder', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBorder, '#ffffff')" @input="set('colorBorder', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBorder }">{{ tokens.colorBorder || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-type-ctx-hint" style="margin-top:4px">Прозрачность поверхностей и&nbsp;границ — вкладка <em>поверхности</em></div>
    </div>

    <!-- Колонка 2: Текст -->
    <div class="dp-col">
      <div class="dp-col-label">Текст и ссылки</div>
      <div class="dp-field">
        <label class="dp-label">основной текст <button v-if="tokens.colorText" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorText', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorText, '#1f1f1f')" @input="set('colorText', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorText }">{{ tokens.colorText || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">заголовки h1–h6 <button v-if="tokens.colorHeading" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorHeading', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorHeading, '#1f1f1f')" @input="set('colorHeading', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorHeading }">{{ tokens.colorHeading || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">ссылки <button v-if="tokens.colorLink" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorLink', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorLink, '#3b6bdb')" @input="set('colorLink', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorLink }">{{ tokens.colorLink || 'авто' }}</span>
        </div>
      </div>
    </div>

    <!-- Колонка 3: Кнопки + превью -->
    <div class="dp-col">
      <div class="dp-col-label">Кнопки</div>
      <div class="dp-field">
        <label class="dp-label">фон кнопки <button v-if="tokens.colorBtnBg" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorBtnBg', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBtnBg, '#000000')" @input="set('colorBtnBg', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBtnBg }">{{ tokens.colorBtnBg || 'авто' }}</span>
        </div>
      </div>
      <div class="dp-field">
        <label class="dp-label">текст кнопки <button v-if="tokens.colorBtnText" type="button" class="dp-clr-reset" title="Сбросить" @click="set('colorBtnText', '')">✕</button></label>
        <div class="dp-clr-row">
          <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBtnText, '#2c2c2a')" @input="set('colorBtnText', ($event.target as HTMLInputElement).value)">
          <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBtnText }">{{ tokens.colorBtnText || 'авто' }}</span>
        </div>
      </div>

      <button
        type="button"
        class="dp-sm-btn dp-sm-btn--warn"
        style="margin-top:10px; width:100%"
        :disabled="!hasAnyCustomColor"
        @click="resetAllColors"
      >
        ↺ сбросить все цвета
      </button>

      <div class="dp-col-label" style="margin-top:14px">Превью</div>
      <div :style="{
        background: tokens.colorPageBg || 'var(--glass-page-bg)',
        border: '1px solid color-mix(in srgb, var(--glass-text) 12%, transparent)',
        borderRadius: 'var(--card-radius, 14px)',
        padding: '10px',
        marginTop: '0'
      }">
        <div :style="{
          background: tokens.colorSurface ? `rgba(${clrRgb(tokens.colorSurface)}, ${tokens.glassOpacity})` : 'var(--glass-bg)',
          border: tokens.colorBorder ? `1px solid rgba(${clrRgb(tokens.colorBorder)}, ${tokens.glassBorderOpacity})` : '1px solid var(--glass-border)',
          borderRadius: 'var(--card-radius-inner, 8px)',
          padding: '8px 10px',
          marginBottom: '6px'
        }">
          <div :style="{ fontSize: '.72rem', fontWeight: 700, marginBottom: '3px', color: tokens.colorHeading || 'var(--glass-text)' }">Заголовок</div>
          <div :style="{ fontSize: '.65rem', color: tokens.colorText || 'var(--glass-text)', opacity: .85 }">Основной текст страницы</div>
          <span :style="{ fontSize: '.65rem', color: tokens.colorLink || 'var(--ds-accent, var(--glass-text))' }">Ссылка →</span>
        </div>
        <button
          type="button"
          :style="{
            background: tokens.colorBtnBg || 'var(--btn-bg-base, rgba(0,0,0,0.07))',
            color: tokens.colorBtnText || 'var(--btn-color, var(--glass-text))',
            border: '1px solid transparent',
            borderRadius: 'var(--btn-radius, 4px)',
            padding: '4px 10px',
            fontSize: '.65rem',
            fontFamily: 'inherit',
            cursor: 'default'
          }"
        >Кнопка</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

const { tokens, set } = useDesignTokenControls()

const CUSTOMIZABLE_COLOR_KEYS = [
  'colorPageBg', 'colorSurface', 'colorBorder', 'colorText', 'colorHeading',
  'colorLink', 'colorBtnBg', 'colorBtnText', 'colorNavBg', 'colorMuted',
  'colorInputBg', 'colorTagBg', 'colorTagText', 'colorCardBg',
] as const

const hasAnyCustomColor = computed(() =>
  CUSTOMIZABLE_COLOR_KEYS.some(k => Boolean(tokens.value[k])),
)

function resetAllColors() {
  for (const k of CUSTOMIZABLE_COLOR_KEYS) {
    set(k, '')
  }
}

function colorInputValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function clrRgb(hex: string): string {
  if (!hex || hex.length < 7) return '128, 128, 128'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
</script>
