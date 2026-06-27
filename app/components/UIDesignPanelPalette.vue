<template>
  <div>
    <!-- ═══ Палитра: темы + акцент + статусы + M3 превью ═══ -->
    <div v-show="activeTab === 'palette'" class="dp-page dp-page--cols">
      <div v-if="isMaterial3Mode" class="dp-col dp-col--full">
        <div class="dp-col-label">M3 сцена</div>
        <div class="dp-m3-preview">
          <div class="dp-m3-preview__head">
            <div class="dp-m3-preview__copy">
              <span class="dp-m3-preview__eyebrow">material 3</span>
              <strong class="dp-m3-preview__title">{{ currentPresetMeta?.name || 'M3 режим' }}</strong>
            </div>
            <div class="dp-m3-preview__legend">
              <div class="dp-m3-preview__legend-card">
                <span class="dp-m3-preview__legend-label">палитра</span>
                <span class="dp-m3-preview__legend-value" v-if="currentThemeMeta">
                  <span class="dp-m3-sync-pill__dot" :style="themeSwatchStyle(currentThemeMeta)" />
                  <span>{{ currentThemeMeta.label }}</span>
                </span>
              </div>
              <div class="dp-m3-preview__legend-card" v-if="activePresetRecommendedTheme">
                <span class="dp-m3-preview__legend-label">рекомендуем</span>
                <span class="dp-m3-preview__legend-value">
                  <span class="dp-m3-sync-pill__dot" :style="themeSwatchStyle(activePresetRecommendedTheme)" />
                  <span>{{ activePresetRecommendedTheme.label }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="dp-m3-preview__body">
            <aside class="dp-m3-preview__nav">
              <button v-for="(item, index) in m3PreviewNavItems" :key="item" type="button"
                class="dp-m3-preview__nav-item" :class="{ 'dp-m3-preview__nav-item--active': index === 1 }">
                <span>{{ item }}</span>
                <span v-if="index === 1" class="dp-m3-preview__nav-mark">●</span>
              </button>
            </aside>
            <div class="dp-m3-preview__stage">
              <section class="dp-m3-preview__surface">
                <span class="dp-m3-preview__kicker">filled field</span>
                <label class="dp-m3-preview__field-label">Этап проекта</label>
                <div class="dp-m3-preview__field">Материалы и подрядчики</div>
                <div class="dp-m3-preview__chips">
                  <span v-for="chip in m3PreviewChips" :key="chip" class="dp-m3-preview__chip">{{ chip }}</span>
                </div>
                <div class="dp-m3-preview__status-row">
                  <span v-for="status in m3PreviewStatuses" :key="status.label" class="dp-m3-preview__status" :class="`dp-m3-preview__status--${status.kind}`">{{ status.label }}</span>
                </div>
              </section>
              <section class="dp-m3-preview__dialog">
                <span class="dp-m3-preview__kicker">dialog</span>
                <strong class="dp-m3-preview__dialog-title">Согласование решения</strong>
                <div class="dp-m3-preview__dialog-lines" aria-hidden="true">
                  <span class="dp-m3-preview__line dp-m3-preview__line--lg" />
                  <span class="dp-m3-preview__line" />
                  <span class="dp-m3-preview__line dp-m3-preview__line--sm" />
                </div>
                <div class="dp-m3-preview__actions">
                  <button type="button" class="dp-m3-preview__action dp-m3-preview__action--ghost">Отмена</button>
                  <button type="button" class="dp-m3-preview__action dp-m3-preview__action--filled">Сохранить</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div class="dp-col">
        <div class="dp-col-label">Цветовые темы</div>
        <div v-if="hasSearchQuery" class="dp-search-results dp-search-results--compact">
          <span class="dp-search-results__label">поиск</span>
          <span class="dp-search-results__query">{{ trimmedSearchQuery }}</span>
          <span class="dp-search-results__count">{{ filteredUIThemes.length }} / {{ UI_THEMES.length }}</span>
        </div>
        <div v-if="filteredUIThemes.length" class="dp-swatch-grid">
          <button v-for="t in filteredUIThemes" :key="t.id" type="button"
            class="dp-swatch-btn" :class="{ 'dp-swatch-btn--active': themeId === t.id, 'dp-swatch-btn--suggested': isRecommendedTheme(t.id) }"
            @click="pickTheme(t.id)">
            <span class="dp-swatch" :style="{ background: isDark ? t.swatchDark : t.swatch }" />
            <span class="dp-swatch-name">{{ t.label }}</span>
            <span v-if="isRecommendedTheme(t.id)" class="dp-swatch-hint">для образа</span>
          </button>
        </div>
        <div v-else class="dp-search-empty">[ палитры не найдены по запросу «{{ trimmedSearchQuery }}» ]</div>
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
          <span class="dp-status-dot" :style="{background:`hsl(${tokens.successHue},${tokens.successSaturation}%,45%)`}"/>
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
          <span class="dp-status-dot" :style="{background:`hsl(${tokens.warningHue},${tokens.warningSaturation}%,50%)`}"/>
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
          <span class="dp-status-dot" :style="{background:`hsl(${tokens.errorHue},${tokens.errorSaturation}%,50%)`}"/>
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

    <!-- ═══ Палитра — цвета всех элементов (чип-блок) ═══ -->
    <div v-show="activeTab === 'palette'" class="dp-page dp-palette-colors">
      <div class="dp-palette-colors-title">Цвета элементов</div>
      <div class="dp-clr-group">
        <div class="dp-clr-group-label">Фоны</div>
        <div class="dp-clr-chips">
          <div v-for="c in bgColorChips" :key="c.token" class="dp-clr-chip">
            <div class="dp-clr-chip-swatch" :style="{ background: (tokens as any)[c.token] || c.fallback }" />
            <label class="dp-clr-chip-label">{{ c.label }}</label>
            <input type="color" class="dp-clr-chip-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-chip-reset" @click="set(c.token, '')">✕</button>
          </div>
        </div>
      </div>
      <div class="dp-clr-group">
        <div class="dp-clr-group-label">Текст</div>
        <div class="dp-clr-chips">
          <div v-for="c in textColorChips" :key="c.token" class="dp-clr-chip">
            <div class="dp-clr-chip-swatch" :style="{ background: (tokens as any)[c.token] || c.fallback }" />
            <label class="dp-clr-chip-label">{{ c.label }}</label>
            <input type="color" class="dp-clr-chip-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-chip-reset" @click="set(c.token, '')">✕</button>
          </div>
        </div>
      </div>
      <div class="dp-clr-group">
        <div class="dp-clr-group-label">Интерактивные элементы</div>
        <div class="dp-clr-chips">
          <div v-for="c in interactiveColorChips" :key="c.token" class="dp-clr-chip">
            <div class="dp-clr-chip-swatch" :style="{ background: (tokens as any)[c.token] || c.fallback }" />
            <label class="dp-clr-chip-label">{{ c.label }}</label>
            <input type="color" class="dp-clr-chip-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-chip-reset" @click="set(c.token, '')">✕</button>
          </div>
        </div>
      </div>
      <button type="button" class="dp-sm-btn dp-sm-btn--warn" style="margin-top:8px" @click="resetAllColors">
        ↺ сбросить все цвета элементов
      </button>
    </div>

    <!-- ═══ Цвета элементов (расширенный вид) ═══ -->
    <div v-show="activeTab === 'colors'" class="dp-page dp-page--cols">
      <div class="dp-col">
        <div class="dp-col-label">Фоны</div>
        <div v-for="c in bgColorsExpanded" :key="c.token" class="dp-field">
          <label class="dp-label">{{ c.label }} <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-reset" @click="set(c.token, '')" title="Сбросить">✕</button></label>
          <div class="dp-clr-row">
            <input type="color" class="dp-color-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !(tokens as any)[c.token] }">{{ (tokens as any)[c.token] || 'авто' }}</span>
          </div>
        </div>
        <div class="dp-type-ctx-hint" style="margin-top:4px">Прозрачность поверхностей и&nbsp;границ — вкладка <em>поверхности</em></div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Текст и ссылки</div>
        <div v-for="c in textColorsExpanded" :key="c.token" class="dp-field">
          <label class="dp-label">{{ c.label }} <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-reset" @click="set(c.token, '')" title="Сбросить">✕</button></label>
          <div class="dp-clr-row">
            <input type="color" class="dp-color-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !(tokens as any)[c.token] }">{{ (tokens as any)[c.token] || 'авто' }}</span>
          </div>
        </div>
      </div>
      <div class="dp-col">
        <div class="dp-col-label">Кнопки</div>
        <div v-for="c in btnColorsExpanded" :key="c.token" class="dp-field">
          <label class="dp-label">{{ c.label }} <button v-if="(tokens as any)[c.token]" type="button" class="dp-clr-reset" @click="set(c.token, '')" title="Сбросить">✕</button></label>
          <div class="dp-clr-row">
            <input type="color" class="dp-color-input" :value="colorInputValue((tokens as any)[c.token], c.hex)" @input="set(c.token, ($event.target as HTMLInputElement).value)">
            <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !(tokens as any)[c.token] }">{{ (tokens as any)[c.token] || 'авто' }}</span>
          </div>
        </div>
        <button type="button" class="dp-sm-btn dp-sm-btn--warn" style="margin-top:10px; width:100%"
          :disabled="!hasAnyColor" @click="resetAllColors">
          ↺ сбросить все цвета
        </button>
        <div class="dp-col-label" style="margin-top:14px">Превью</div>
        <div :style="{ background: tokens.colorPageBg || 'var(--glass-page-bg)', border: '1px solid color-mix(in srgb, var(--glass-text) 12%, transparent)', borderRadius: 'var(--card-radius, 14px)', padding: '10px', marginTop: '0' }">
          <div :style="{ background: tokens.colorSurface ? `rgba(${clrRgb(tokens.colorSurface)}, ${tokens.glassOpacity})` : 'var(--glass-bg)', border: tokens.colorBorder ? `1px solid rgba(${clrRgb(tokens.colorBorder)}, ${tokens.glassBorderOpacity})` : '1px solid var(--glass-border)', borderRadius: 'var(--card-radius-inner, 8px)', padding: '8px 10px', marginBottom: '6px' }">
            <div :style="{ fontSize: '.72rem', fontWeight: 700, marginBottom: '3px', color: tokens.colorHeading || 'var(--glass-text)' }">Заголовок</div>
            <div :style="{ fontSize: '.65rem', color: tokens.colorText || 'var(--glass-text)', opacity: .85 }">Основной текст страницы</div>
            <span :style="{ fontSize: '.65rem', color: tokens.colorLink || 'var(--ds-accent, var(--glass-text))' }">Ссылка →</span>
          </div>
          <button type="button" :style="{ background: tokens.colorBtnBg || 'var(--btn-bg-base, rgba(0,0,0,0.07))', color: tokens.colorBtnText || 'var(--btn-color, var(--glass-text))', border: '1px solid transparent', borderRadius: 'var(--btn-radius, 4px)', padding: '4px 10px', fontSize: '.65rem', fontFamily: 'inherit', cursor: 'default' }">Кнопка</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useDesignSystem,
  MATERIAL3_DESIGN_PRESETS, LIQUID_GLASS_DESIGN_PRESETS,
  type DesignPreset,
} from '~/composables/useDesignSystem'
import { UI_THEMES as UI_THEME_CATALOG, type UITheme } from '~/composables/useUITheme'
import { useDesignPanelHelpers, useDesignPanelSearch } from '~/composables/useDesignPanelHelpers'

defineProps<{ activeTab: string }>()

const { tokens, set, onRange, colorInputValue, clrRgb } = useDesignPanelHelpers()
const { trimmedSearchQuery, hasSearchQuery, matchesPanelSearch } = useDesignPanelSearch()
const { currentDesignMode } = useDesignSystem()
const { themeId, applyThemeWithTokens, UI_THEMES } = useUITheme()
const { isDark } = useThemeToggle()

const THEME_CATALOG_BY_ID = new Map(UI_THEME_CATALOG.map(t => [t.id, t] as const))
const ALL_DESIGN_PRESETS = [...LIQUID_GLASS_DESIGN_PRESETS, ...MATERIAL3_DESIGN_PRESETS]

const isMaterial3Mode = computed(() => currentDesignMode.value === 'material3')

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`
)

const activePresetId = ref('')
const currentPresetMeta = computed(() =>
  ALL_DESIGN_PRESETS.find(p => p.id === activePresetId.value) || null
)
const currentThemeMeta = computed(() => THEME_CATALOG_BY_ID.get(themeId.value) || null)
const activePresetRecommendedTheme = computed(() => {
  const rid = currentPresetMeta.value?.recommendedThemeId
  return rid ? THEME_CATALOG_BY_ID.get(rid) || null : null
})

function isRecommendedTheme(id: string) {
  return activePresetRecommendedTheme.value?.id === id
}
function themeSwatchStyle(theme: UITheme | null) {
  return theme ? { background: isDark.value ? theme.swatchDark : theme.swatch } : {}
}
function pickTheme(id: string) { applyThemeWithTokens(id) }

const filteredUIThemes = computed(() =>
  UI_THEMES.value.filter(theme => matchesPanelSearch(theme.id, theme.label, theme.btnPreview))
)

const m3PreviewNavItems = ['обзор', 'проект', 'материалы', 'диалог']
const m3PreviewChips = ['тональная поверхность', 'pill-nav', 'filled field']
const m3PreviewStatuses = [
  { label: 'в работе', kind: 'active' },
  { label: 'на проверке', kind: 'review' },
  { label: 'готово', kind: 'done' },
] as const

/* ── Color chip data ── */
const bgColorChips = [
  { token: 'colorPageBg', label: 'страница', fallback: 'var(--glass-page-bg, #f3f4f6)', hex: '#f3f4f6' },
  { token: 'colorSurface', label: 'карточки', fallback: 'var(--glass-bg, rgba(255,255,255,.5))', hex: '#ffffff' },
  { token: 'colorNavBg', label: 'навигация', fallback: 'var(--ds-nav-bg, var(--glass-bg, rgba(255,255,255,.4)))', hex: '#ffffff' },
  { token: 'colorCardBg', label: 'модальные', fallback: 'var(--ds-card-bg, var(--glass-bg, rgba(255,255,255,.5)))', hex: '#ffffff' },
  { token: 'colorBorder', label: 'границы', fallback: 'var(--glass-border, rgba(180,180,220,.2))', hex: '#b4b4dc' },
]
const textColorChips = [
  { token: 'colorText', label: 'основной', fallback: 'var(--glass-text, #1f1f1f)', hex: '#1f1f1f' },
  { token: 'colorHeading', label: 'заголовки', fallback: 'var(--ds-heading-color, var(--glass-text, #1f1f1f))', hex: '#1f1f1f' },
  { token: 'colorMuted', label: 'второстепенный', fallback: 'var(--ds-muted, #888)', hex: '#888888' },
  { token: 'colorLink', label: 'ссылки', fallback: 'var(--ds-link-color, #3b6bdb)', hex: '#3b6bdb' },
]
const interactiveColorChips = [
  { token: 'colorBtnBg', label: 'кнопка (фон)', fallback: 'var(--btn-bg-base, rgba(0,0,0,.07))', hex: '#000000' },
  { token: 'colorBtnText', label: 'кнопка (текст)', fallback: 'var(--btn-color, var(--glass-text, #1f1f1f))', hex: '#1f1f1f' },
  { token: 'colorInputBg', label: 'поле ввода', fallback: 'var(--input-bg, rgba(0,0,0,.04))', hex: '#f5f5f5' },
  { token: 'colorTagBg', label: 'тег (фон)', fallback: 'var(--ds-tag-bg, var(--chip-bg, rgba(0,0,0,.06)))', hex: '#e5e7eb' },
  { token: 'colorTagText', label: 'тег (текст)', fallback: 'var(--ds-tag-color, var(--glass-text, #1f1f1f))', hex: '#374151' },
]

/* ── Expanded colors tab data ── */
const bgColorsExpanded = [
  { token: 'colorPageBg', label: 'страница', hex: '#f3f4f6' },
  { token: 'colorSurface', label: 'поверхности / панели', hex: '#ffffff' },
  { token: 'colorBorder', label: 'границы / рамки', hex: '#ffffff' },
]
const textColorsExpanded = [
  { token: 'colorText', label: 'основной текст', hex: '#1f1f1f' },
  { token: 'colorHeading', label: 'заголовки h1–h6', hex: '#1f1f1f' },
  { token: 'colorLink', label: 'ссылки', hex: '#3b6bdb' },
]
const btnColorsExpanded = [
  { token: 'colorBtnBg', label: 'фон кнопки', hex: '#000000' },
  { token: 'colorBtnText', label: 'текст кнопки', hex: '#2c2c2a' },
]

const allColorTokens = [
  'colorPageBg', 'colorSurface', 'colorBorder', 'colorText', 'colorHeading',
  'colorLink', 'colorBtnBg', 'colorBtnText', 'colorNavBg', 'colorMuted',
  'colorInputBg', 'colorTagBg', 'colorTagText', 'colorCardBg',
]
const hasAnyColor = computed(() => allColorTokens.some(t => (tokens.value as any)[t]))
function resetAllColors() {
  allColorTokens.forEach(t => set(t, ''))
}
</script>
