<template>
  <div>
    <!-- ═══ Рецепты дизайна ═══ -->
    <div v-show="activeTab === 'presets'" class="dp-page">
      <div
        v-if="supportsPresetGallery"
        class="dp-preset-family-shell"
        :class="`dp-preset-family-shell--${activePresetFamily}`"
      >
        <div class="dp-preset-family-head">
          <div class="dp-preset-family-copy">
            <span class="dp-preset-family-kicker">активное семейство</span>
            <strong class="dp-preset-family-title">{{ currentModeLabel }}</strong>
          </div>
          <div class="dp-preset-family-actions">
            <button
              type="button"
              class="dp-preset-family-btn dp-preset-family-btn--glass"
              :class="{ 'dp-preset-family-btn--active': isLiquidGlassMode }"
              @click="activateLiquidGlassPresetMode"
            >
              Жидкое стекло
            </button>
            <button
              type="button"
              class="dp-preset-family-btn dp-preset-family-btn--m3"
              :class="{ 'dp-preset-family-btn--active': isMaterial3Mode }"
              @click="activateMaterial3PresetMode"
            >
              Material 3
            </button>
          </div>
        </div>

        <div class="dp-preset-sync-rail">
          <div class="dp-preset-sync-pill" :class="`dp-preset-sync-pill--${activePresetFamily}`">
            <span class="dp-preset-sync-pill__label">коллекция</span>
            <span class="dp-preset-sync-pill__value">{{ presetCollectionLabel }}</span>
          </div>
          <div class="dp-preset-sync-pill" :class="`dp-preset-sync-pill--${activePresetFamily}`" v-if="currentThemeMeta">
            <span class="dp-preset-sync-pill__label">текущая тема</span>
            <span class="dp-preset-sync-pill__value">
              <span class="dp-preset-sync-pill__dot" :style="themeSwatchStyle(currentThemeMeta)" />
              <span>{{ currentThemeMeta.label }}</span>
            </span>
          </div>
          <div class="dp-preset-sync-pill" :class="`dp-preset-sync-pill--${activePresetFamily}`" v-if="activePresetRecommendedTheme">
            <span class="dp-preset-sync-pill__label">палитра образа</span>
            <span class="dp-preset-sync-pill__value">
              <span class="dp-preset-sync-pill__dot" :style="themeSwatchStyle(activePresetRecommendedTheme)" />
              <span>{{ activePresetRecommendedTheme.label }}</span>
            </span>
          </div>
        </div>
      </div>

      <div v-else class="dp-preset-mode-switch">
        <span class="dp-preset-mode-switch__label">каталоги образов</span>
        <span class="dp-preset-mode-switch__chip">{{ currentModeLabel }}</span>
        <div class="dp-preset-mode-switch__actions">
          <button type="button" class="dp-preset-mode-switch__btn" @click="activateLiquidGlassPresetMode">Жидкое стекло</button>
          <button type="button" class="dp-preset-mode-switch__btn dp-preset-mode-switch__btn--secondary" @click="activateMaterial3PresetMode">Material 3</button>
        </div>
      </div>

      <div v-if="hasSearchQuery && supportsPresetGallery" class="dp-search-results">
        <span class="dp-search-results__label">поиск</span>
        <span class="dp-search-results__query">{{ trimmedSearchQuery }}</span>
        <span class="dp-search-results__count">{{ filteredDesignPresets.length }} / {{ visibleDesignPresets.length }}</span>
      </div>

      <div v-if="supportsPresetGallery" class="dp-presets-shell" :class="`dp-presets-shell--${activePresetFamily}`">
        <div v-if="filteredDesignPresets.length" class="dp-presets-grid">
          <button
            v-for="p in filteredDesignPresets" :key="p.id" type="button"
            class="dp-preset-card"
            :class="[
              { 'dp-preset-card--active': activePresetId === p.id },
              `dp-preset-card--${activePresetFamily}`,
            ]"
            @click="pickPreset(p)"
          >
            <span class="dp-preset-visual" :class="`dp-preset-visual--${getPresetVisualKind(p)}`" :style="presetVisualStyle(p)">
              <span class="dp-preset-visual__sheen" />
              <span class="dp-preset-visual__orb dp-preset-visual__orb--a" />
              <span class="dp-preset-visual__orb dp-preset-visual__orb--b" />
              <span class="dp-preset-visual__panel" />
              <span class="dp-preset-visual__badge">{{ p.icon }}</span>
            </span>
            <span class="dp-preset-kicker" :class="`dp-preset-kicker--${activePresetFamily}`">{{ getPresetFamilyTag(p) }}</span>
            <span class="dp-preset-name">{{ p.name }}</span>
            <span class="dp-preset-desc">{{ p.description }}</span>
            <div v-if="resolvePresetTheme(p)" class="dp-preset-theme">
              <span class="dp-preset-theme-label">палитра</span>
              <span
                class="dp-preset-theme-chip"
                :class="[
                  { 'dp-preset-theme-chip--active': isPresetThemeActive(p) },
                  `dp-preset-theme-chip--${activePresetFamily}`,
                ]"
              >
                <span class="dp-preset-theme-dot" :style="themeSwatchStyle(resolvePresetTheme(p))" />
                <span>{{ resolvePresetTheme(p)?.label }}</span>
              </span>
            </div>
          </button>
        </div>
        <div v-else class="dp-search-empty">[ ничего не найдено по запросу «{{ trimmedSearchQuery }}» ]</div>
      </div>
    </div>

    <!-- ═══ Концепция дизайна ═══ -->
    <div v-show="activeTab === 'concept'" class="dp-page">
      <div v-if="hasSearchQuery" class="dp-search-results">
        <span class="dp-search-results__label">поиск</span>
        <span class="dp-search-results__query">{{ trimmedSearchQuery }}</span>
        <span class="dp-search-results__count">{{ filteredDesignConcepts.length }} / {{ DESIGN_CONCEPTS.length }}</span>
      </div>

      <div v-if="filteredDesignConcepts.length" class="dp-concepts-grid">
        <button
          v-for="c in filteredDesignConcepts" :key="c.id" type="button"
          class="dp-concept-card" :class="{ 'dp-concept-card--active': activePresetId === c.id }"
          @click="pickPreset(c)"
        >
          <span class="dp-concept-icon">{{ c.icon }}</span>
          <div class="dp-concept-body">
            <div class="dp-concept-head">
              <span class="dp-concept-name">{{ c.name }}</span>
              <span class="dp-concept-family">{{ getConceptFamilyLabel(c.id) }}</span>
            </div>
            <span class="dp-concept-desc">{{ c.description }}</span>
          </div>
        </button>
      </div>
      <div v-else class="dp-search-empty">[ концепции не найдены по запросу «{{ trimmedSearchQuery }}» ]</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useDesignSystem,
  MATERIAL3_DESIGN_PRESETS, LIQUID_GLASS_DESIGN_PRESETS, DESIGN_CONCEPTS,
  type DesignPreset,
} from '~/composables/useDesignSystem'
import { useDesignPanelHelpers, useDesignPanelSearch } from '~/composables/useDesignPanelHelpers'
import { useUITheme, type UITheme } from '~/composables/useUITheme'

const props = defineProps<{
  activeTab: string
}>()

const { tokens, set } = useDesignPanelHelpers()
const { hasSearchQuery, trimmedSearchQuery, matchesPanelSearch } = useDesignPanelSearch()
const {
  previewPreset, confirmPreview, cancelPreview, isPreviewActive,
  currentDesignMode,
} = useDesignSystem()
const { themeId, applyTheme, getStoredThemeId, UI_THEMES } = useUITheme()
const { isDark } = useThemeToggle()

const THEME_CATALOG_BY_ID = new Map(UI_THEMES.value.map(theme => [theme.id, theme] as const))
const ALL_DESIGN_PRESETS = [...LIQUID_GLASS_DESIGN_PRESETS, ...MATERIAL3_DESIGN_PRESETS]

const activePresetId = ref('')
const previewThemeSnapshot = ref('')

const isMaterial3Mode = computed(() => currentDesignMode.value === 'material3')
const isLiquidGlassMode = computed(() => currentDesignMode.value === 'liquid-glass')

const activePresetFamily = computed<'glass' | 'm3' | 'brutal'>(() => {
  if (isMaterial3Mode.value) return 'm3'
  if (isLiquidGlassMode.value) return 'glass'
  return 'brutal'
})

const visibleDesignPresets = computed(() => {
  if (isMaterial3Mode.value) return MATERIAL3_DESIGN_PRESETS
  if (isLiquidGlassMode.value) return LIQUID_GLASS_DESIGN_PRESETS
  return []
})

const filteredDesignPresets = computed(() =>
  visibleDesignPresets.value.filter(preset => matchesPanelSearch(
    preset.id, preset.name, preset.description,
    getPresetFamilyTag(preset),
    resolvePresetTheme(preset)?.label || '',
  ))
)

const filteredDesignConcepts = computed(() =>
  DESIGN_CONCEPTS.filter(concept => matchesPanelSearch(
    concept.id, concept.name, concept.description,
    getConceptFamilyLabel(concept.id),
  ))
)

const supportsPresetGallery = computed(() => visibleDesignPresets.value.length > 0)

const currentModeLabel = computed(() => {
  if (currentDesignMode.value === 'material3') return 'Material 3'
  if (currentDesignMode.value === 'liquid-glass') return 'Жидкое стекло'
  return 'Брутализм / Minale'
})

const presetCollectionLabel = computed(() => {
  if (isMaterial3Mode.value) {
    if (hasSearchQuery.value) return `Material 3 · ${filteredDesignPresets.value.length} из ${visibleDesignPresets.value.length} образов`
    return `Material 3 · ${visibleDesignPresets.value.length} образов`
  }
  if (isLiquidGlassMode.value) {
    if (hasSearchQuery.value) return `Жидкое стекло · ${filteredDesignPresets.value.length} из ${visibleDesignPresets.value.length} образов`
    return `Жидкое стекло · ${visibleDesignPresets.value.length} образов`
  }
  return currentModeLabel.value
})

const currentPresetMeta = computed(() =>
  ALL_DESIGN_PRESETS.find(p => p.id === activePresetId.value) || null
)

const currentThemeMeta = computed(() => THEME_CATALOG_BY_ID.get(themeId.value) || null)

const activePresetRecommendedTheme = computed(() => {
  const id = currentPresetMeta.value?.recommendedThemeId
  return id ? THEME_CATALOG_BY_ID.get(id) || null : null
})

function resolvePresetTheme(preset: DesignPreset): UITheme | null {
  return preset.recommendedThemeId ? THEME_CATALOG_BY_ID.get(preset.recommendedThemeId) || null : null
}

function isPresetThemeActive(preset: DesignPreset) {
  return resolvePresetTheme(preset)?.id === themeId.value
}

function themeSwatchStyle(theme: UITheme | null) {
  if (!theme) return {}
  return { background: isDark.value ? theme.swatchDark : theme.swatch }
}

function getPresetVisualKind(preset: DesignPreset) {
  if (preset.id.startsWith('material-')) return 'material'
  if (preset.id.startsWith('craft-')) return 'craft'
  if (preset.id.startsWith('future-')) return 'future'
  return 'glass'
}

function getPresetFamilyTag(preset: DesignPreset) {
  const kind = getPresetVisualKind(preset)
  if (kind === 'material') return 'material 3'
  if (kind === 'craft') return 'craft'
  if (kind === 'future') return 'future'
  return 'liquid glass'
}

function presetVisualStyle(preset: DesignPreset) {
  const accentHue = preset.tokens.accentHue ?? tokens.value.accentHue
  const accentSaturation = preset.tokens.accentSaturation ?? tokens.value.accentSaturation
  const accentLightness = preset.tokens.accentLightness ?? tokens.value.accentLightness
  const glassBlur = Math.max(18, Math.min(60, preset.tokens.glassBlur ?? 28))
  const glassOpacity = Math.max(0.1, Math.min(0.34, preset.tokens.glassOpacity ?? 0.18))
  const glassBorderOpacity = Math.max(0.12, Math.min(0.4, (preset.tokens.glassBorderOpacity ?? 0.12) + 0.08))
  const linkedTheme = resolvePresetTheme(preset)
  const swatch = linkedTheme
    ? (isDark.value ? linkedTheme.swatchDark : linkedTheme.swatch)
    : `hsla(${accentHue}, ${accentSaturation}%, ${Math.min(92, accentLightness + 18)}%, 0.78)`

  return {
    '--dp-preset-accent': `hsl(${accentHue} ${accentSaturation}% ${accentLightness}%)`,
    '--dp-preset-accent-soft': `hsla(${accentHue}, ${accentSaturation}%, ${Math.min(92, accentLightness + 20)}%, 0.78)`,
    '--dp-preset-ink': `hsla(${accentHue}, ${Math.min(100, accentSaturation + 12)}%, ${Math.max(10, accentLightness - 34)}%, 0.55)`,
    '--dp-preset-swatch': swatch,
    '--dp-preset-frost': `rgba(255,255,255,${Math.min(0.42, glassOpacity + 0.14)})`,
    '--dp-preset-border': `rgba(255,255,255,${glassBorderOpacity})`,
    '--dp-preset-blur': `${glassBlur}px`,
    '--dp-preset-shadow': `0 18px 44px hsla(${accentHue}, ${Math.min(100, accentSaturation + 6)}%, ${Math.max(8, accentLightness - 34)}%, 0.18)`,
  }
}

function getConceptFamilyLabel(conceptId: string) {
  if (conceptId === 'concept-m3') return 'material3'
  if (['concept-glass', 'concept-craft', 'concept-future'].includes(conceptId)) return 'liquid-glass'
  return 'brutalist'
}

function activateLiquidGlassPresetMode() { switchMode('concept-glass') }
function activateMaterial3PresetMode() { switchMode('concept-m3') }

function switchMode(conceptId: string) {
  const concept = DESIGN_CONCEPTS.find(c => c.id === conceptId) || ALL_DESIGN_PRESETS.find(p => p.id === conceptId)
  if (concept) {
    activePresetId.value = concept.id
    previewPreset(concept)
    confirmPreview()
    previewThemeSnapshot.value = ''
  }
}

function ensurePreviewThemeSnapshot() {
  if (isPreviewActive.value || previewThemeSnapshot.value) return
  previewThemeSnapshot.value = themeId.value || getStoredThemeId() || ''
}

function pickPreset(p: DesignPreset) {
  ensurePreviewThemeSnapshot()
  activePresetId.value = p.id
  previewPreset(p)
  if (p.recommendedThemeId) applyTheme(p.recommendedThemeId)
}
</script>
