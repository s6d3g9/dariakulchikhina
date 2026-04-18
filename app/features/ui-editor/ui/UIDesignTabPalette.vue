<template>
  <!-- Блок 1: Темы + акцент + статусы -->
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Цветовые темы</div>
      <div class="dp-swatch-grid">
        <button
          v-for="t in UI_THEMES"
          :key="t.id"
          type="button"
          class="dp-swatch-btn"
          :class="{ 'dp-swatch-btn--active': themeId === t.id }"
          @click="pickTheme(t.id)"
        >
          <span class="dp-swatch" :style="{ background: isDark ? t.swatchDark : t.swatch }" />
          <span class="dp-swatch-name">{{ t.label }}</span>
        </button>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Акцентный цвет</div>
      <div class="dp-accent-preview-big" :style="{ background: accentColor }" />
      <div class="dp-field" style="margin-top:10px">
        <label class="dp-label">H <span class="dp-val">{{ tokens.accentHue }}°</span></label>
        <input type="range" min="0" max="360" step="1" :value="tokens.accentHue" class="dp-range dp-range--hue" @input="onRange('accentHue', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">S <span class="dp-val">{{ tokens.accentSaturation }}%</span></label>
        <input type="range" min="0" max="100" step="1" :value="tokens.accentSaturation" class="dp-range" @input="onRange('accentSaturation', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">L <span class="dp-val">{{ tokens.accentLightness }}%</span></label>
        <input type="range" min="20" max="80" step="1" :value="tokens.accentLightness" class="dp-range" @input="onRange('accentLightness', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Статусы</div>
      <div class="dp-status-row">
        <span class="dp-status-dot" :style="{ background: `hsl(${tokens.successHue},${tokens.successSaturation}%,45%)` }" />
        <span class="dp-status-name">успех / выполнено</span>
      </div>
      <div class="dp-field">
        <label class="dp-label">H <span class="dp-val">{{ tokens.successHue }}°</span></label>
        <input type="range" min="0" max="360" step="1" :value="tokens.successHue" class="dp-range dp-range--hue" @input="onRange('successHue', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">S <span class="dp-val">{{ tokens.successSaturation }}%</span></label>
        <input type="range" min="0" max="100" step="1" :value="tokens.successSaturation" class="dp-range" @input="onRange('successSaturation', $event)">
      </div>
      <div class="dp-status-row" style="margin-top:10px">
        <span class="dp-status-dot" :style="{ background: `hsl(${tokens.warningHue},${tokens.warningSaturation}%,50%)` }" />
        <span class="dp-status-name">в работе / ожидание</span>
      </div>
      <div class="dp-field">
        <label class="dp-label">H <span class="dp-val">{{ tokens.warningHue }}°</span></label>
        <input type="range" min="0" max="360" step="1" :value="tokens.warningHue" class="dp-range dp-range--hue" @input="onRange('warningHue', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">S <span class="dp-val">{{ tokens.warningSaturation }}%</span></label>
        <input type="range" min="0" max="100" step="1" :value="tokens.warningSaturation" class="dp-range" @input="onRange('warningSaturation', $event)">
      </div>
      <div class="dp-status-row" style="margin-top:10px">
        <span class="dp-status-dot" :style="{ background: `hsl(${tokens.errorHue},${tokens.errorSaturation}%,50%)` }" />
        <span class="dp-status-name">ошибка / отмена</span>
      </div>
      <div class="dp-field">
        <label class="dp-label">H <span class="dp-val">{{ tokens.errorHue }}°</span></label>
        <input type="range" min="0" max="360" step="1" :value="tokens.errorHue" class="dp-range dp-range--hue" @input="onRange('errorHue', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">S <span class="dp-val">{{ tokens.errorSaturation }}%</span></label>
        <input type="range" min="0" max="100" step="1" :value="tokens.errorSaturation" class="dp-range" @input="onRange('errorSaturation', $event)">
      </div>
    </div>
  </div>

  <!-- Блок 2: Цвета элементов (chips-grid) -->
  <div class="dp-page dp-palette-colors">
    <div class="dp-palette-colors-title">Цвета элементов</div>

    <div v-for="group in COLOR_GROUPS" :key="group.label" class="dp-clr-group">
      <div class="dp-clr-group-label">{{ group.label }}</div>
      <div class="dp-clr-chips">
        <div v-for="chip in group.chips" :key="chip.key" class="dp-clr-chip">
          <div class="dp-clr-chip-swatch" :style="{ background: tokens[chip.key] || chip.fallbackVar }" />
          <label class="dp-clr-chip-label">{{ chip.label }}</label>
          <input
            type="color"
            class="dp-clr-chip-input"
            :value="colorInputValue(tokens[chip.key], chip.defaultHex)"
            @input="set(chip.key, ($event.target as HTMLInputElement).value)"
          >
          <button v-if="tokens[chip.key]" type="button" class="dp-clr-chip-reset" @click="set(chip.key, '')">✕</button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="dp-sm-btn dp-sm-btn--warn"
      style="margin-top:8px"
      :disabled="!hasAnyCustomColor"
      @click="resetAllColors"
    >
      ↺ сбросить все цвета элементов
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'

// `useUITheme` and `useThemeToggle` are auto-imported by Nuxt.
const { tokens, set, onRange } = useDesignTokenControls()

const { themeId, applyThemeWithTokens, UI_THEMES } = useUITheme()
const { isDark } = useThemeToggle()

function pickTheme(id: string) {
  applyThemeWithTokens(id)
}

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`,
)

type ColorKey =
  | 'colorPageBg' | 'colorSurface' | 'colorNavBg' | 'colorCardBg' | 'colorBorder'
  | 'colorText' | 'colorHeading' | 'colorMuted' | 'colorLink'
  | 'colorBtnBg' | 'colorBtnText' | 'colorInputBg' | 'colorTagBg' | 'colorTagText'

interface ColorChip {
  key: ColorKey
  label: string
  fallbackVar: string
  defaultHex: string
}

const COLOR_GROUPS: { label: string; chips: ColorChip[] }[] = [
  {
    label: 'Фоны',
    chips: [
      { key: 'colorPageBg', label: 'страница', fallbackVar: 'var(--glass-page-bg, #f3f4f6)', defaultHex: '#f3f4f6' },
      { key: 'colorSurface', label: 'карточки', fallbackVar: 'var(--glass-bg, rgba(255,255,255,.5))', defaultHex: '#ffffff' },
      { key: 'colorNavBg', label: 'навигация', fallbackVar: 'var(--ds-nav-bg, var(--glass-bg, rgba(255,255,255,.4)))', defaultHex: '#ffffff' },
      { key: 'colorCardBg', label: 'модальные', fallbackVar: 'var(--ds-card-bg, var(--glass-bg, rgba(255,255,255,.5)))', defaultHex: '#ffffff' },
      { key: 'colorBorder', label: 'границы', fallbackVar: 'var(--glass-border, rgba(180,180,220,.2))', defaultHex: '#b4b4dc' },
    ],
  },
  {
    label: 'Текст',
    chips: [
      { key: 'colorText', label: 'основной', fallbackVar: 'var(--glass-text, #1f1f1f)', defaultHex: '#1f1f1f' },
      { key: 'colorHeading', label: 'заголовки', fallbackVar: 'var(--ds-heading-color, var(--glass-text, #1f1f1f))', defaultHex: '#1f1f1f' },
      { key: 'colorMuted', label: 'второстепенный', fallbackVar: 'var(--ds-muted, #888)', defaultHex: '#888888' },
      { key: 'colorLink', label: 'ссылки', fallbackVar: 'var(--ds-link-color, #3b6bdb)', defaultHex: '#3b6bdb' },
    ],
  },
  {
    label: 'Интерактивные элементы',
    chips: [
      { key: 'colorBtnBg', label: 'кнопка (фон)', fallbackVar: 'var(--btn-bg-base, rgba(0,0,0,.07))', defaultHex: '#000000' },
      { key: 'colorBtnText', label: 'кнопка (текст)', fallbackVar: 'var(--btn-color, var(--glass-text, #1f1f1f))', defaultHex: '#1f1f1f' },
      { key: 'colorInputBg', label: 'поле ввода', fallbackVar: 'var(--input-bg, rgba(0,0,0,.04))', defaultHex: '#f5f5f5' },
      { key: 'colorTagBg', label: 'тег (фон)', fallbackVar: 'var(--ds-tag-bg, var(--chip-bg, rgba(0,0,0,.06)))', defaultHex: '#e5e7eb' },
      { key: 'colorTagText', label: 'тег (текст)', fallbackVar: 'var(--ds-tag-color, var(--glass-text, #1f1f1f))', defaultHex: '#374151' },
    ],
  },
]

const ALL_COLOR_KEYS: ColorKey[] = COLOR_GROUPS.flatMap(g => g.chips.map(c => c.key))

const hasAnyCustomColor = computed(() => ALL_COLOR_KEYS.some(k => Boolean(tokens.value[k])))

function resetAllColors() {
  for (const k of ALL_COLOR_KEYS) set(k, '')
}

function colorInputValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}
</script>
