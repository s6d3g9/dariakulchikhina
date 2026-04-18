<template>
  <div class="dp-page dp-page--cols">
    <div class="dp-col">
      <div class="dp-col-label">Макет</div>
      <div class="dp-field">
        <label class="dp-label">контейнер <span class="dp-val">{{ tokens.containerWidth }}px</span></label>
        <input type="range" min="900" max="1400" step="10" :value="tokens.containerWidth" class="dp-range" @input="onRange('containerWidth', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">сайдбар <span class="dp-val">{{ tokens.sidebarWidth }}px</span></label>
        <input type="range" min="200" max="360" step="10" :value="tokens.sidebarWidth" class="dp-range" @input="onRange('sidebarWidth', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">gap <span class="dp-val">{{ tokens.gridGap }}px</span></label>
        <input type="range" min="4" max="32" step="1" :value="tokens.gridGap" class="dp-range" @input="onRange('gridGap', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">колонки контента <span class="dp-val">{{ tokens.gridColumns }}</span></label>
        <input type="range" min="2" max="12" step="1" :value="tokens.gridColumns" class="dp-range" @input="onRange('gridColumns', $event)">
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Генератор контента</div>
      <div class="dp-field">
        <label class="dp-label">раскладка контента <span class="dp-val">{{ activeContentLayoutLabel }}</span></label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="preset in contentLayoutPresets"
              :key="`content-layout-${preset.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': activeContentLayoutId === preset.id }"
              @click="applyContentLayoutPreset(preset.id)"
            >{{ preset.label }}</button>
          </div>
        </div>
        <div class="dp-field-hint">Меняет ширину контейнера, число колонок, ритм секций и характер карточек в основной области.</div>
      </div>
      <div class="dp-field">
        <div class="dp-menu-generator-actions">
          <button type="button" class="dp-sm-btn" @click="generateContentLayout">сгенерировать</button>
          <button type="button" class="dp-sm-btn" @click="applyContentLayoutPreset('balanced')">сбросить</button>
        </div>
      </div>
      <div class="dp-content-preview">
        <div class="dp-content-preview-shell" :style="contentPreviewStyle">
          <div class="dp-content-preview-hero">
            <div class="dp-content-preview-kicker">{{ activeContentLayoutLabel }}</div>
            <div class="dp-content-preview-title">{{ activeContentLayoutDescription }}</div>
          </div>
          <div class="dp-content-preview-grid" :class="`dp-content-preview-grid--${tokens.archSectionStyle || 'flat'}`">
            <article
              v-for="card in contentPreviewCards"
              :key="card.title"
              class="dp-content-preview-card"
              :class="{ 'dp-content-preview-card--accent': card.accent }"
              :style="{ gridColumn: `span ${card.span}` }"
            >
              <div class="dp-content-preview-card-eyebrow">{{ card.eyebrow }}</div>
              <div class="dp-content-preview-card-title">{{ card.title }}</div>
              <div class="dp-content-preview-card-text">{{ card.text }}</div>
            </article>
          </div>
        </div>
      </div>
      <div class="dp-col-label" style="margin-top:14px">Пресеты карточек</div>
      <div class="dp-card-presets-grid">
        <button
          v-for="preset in contentCardPresets"
          :key="`content-card-${preset.id}`"
          type="button"
          class="dp-card-preset"
          :class="{ 'dp-card-preset--active': activeContentCardPresetId === preset.id }"
          @click="applyContentCardPreset(preset.id)"
        >
          <span class="dp-card-preset-preview" :class="`dp-card-preset-preview--${preset.id}`">
            <span class="dp-card-preset-preview-line dp-card-preset-preview-line--lg" />
            <span class="dp-card-preset-preview-line" />
            <span class="dp-card-preset-preview-line dp-card-preset-preview-line--sm" />
          </span>
          <span class="dp-card-preset-name">{{ preset.label }}</span>
          <span class="dp-card-preset-desc">{{ preset.description }}</span>
        </button>
      </div>
      <div class="dp-col-label" style="margin-top:14px">Сценические пресеты</div>
      <div class="dp-field">
        <div class="dp-menu-generator-actions">
          <button type="button" class="dp-sm-btn" @click="generateFullDesignScene">сгенерировать всё</button>
          <button type="button" class="dp-sm-btn" @click="generateContentScene">сгенерировать сцену</button>
          <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('workbench')">база</button>
          <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('registry')">реестр</button>
          <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('atelier')">студия</button>
        </div>
      </div>
      <div class="dp-scene-presets-grid">
        <button
          v-for="scene in contentScenePresets"
          :key="`content-scene-${scene.id}`"
          type="button"
          class="dp-scene-preset"
          :class="{ 'dp-scene-preset--active': activeContentScenePresetId === scene.id }"
          @click="applyContentScenePreset(scene.id)"
        >
          <span class="dp-scene-preset-preview" :class="`dp-scene-preset-preview--${scene.id}`">
            <span class="dp-scene-block dp-scene-block--hero" />
            <span class="dp-scene-row">
              <span class="dp-scene-block dp-scene-block--wide" />
              <span class="dp-scene-block dp-scene-block--side" />
            </span>
            <span class="dp-scene-row dp-scene-row--triple">
              <span class="dp-scene-block" />
              <span class="dp-scene-block" />
              <span class="dp-scene-block" />
            </span>
          </span>
          <span class="dp-card-preset-name">{{ scene.label }}</span>
          <span class="dp-card-preset-desc">{{ scene.description }}</span>
        </button>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Генератор меню</div>
      <div class="dp-field">
        <label class="dp-label">раскладка объектов <span class="dp-val">{{ activeNavLayoutLabel }}</span></label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="preset in navLayoutPresets"
              :key="`nav-layout-${preset.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': tokens.navLayoutPreset === preset.id }"
              @click="applyNavLayoutPreset(preset.id)"
            >{{ preset.label }}</button>
          </div>
        </div>
        <div class="dp-field-hint">Пресет меняет плотность меню, интервалы и поведение навигационных объектов в сайдбаре.</div>
      </div>
      <div class="dp-field">
        <div class="dp-menu-generator-actions">
          <button type="button" class="dp-sm-btn" @click="generateNavLayout">сгенерировать</button>
          <button type="button" class="dp-sm-btn" @click="applyNavLayoutPreset('balanced')">сбросить</button>
        </div>
      </div>
      <div class="dp-grid-menu-preview">
        <div
          class="dp-grid-menu-preview-shell"
          :class="`dp-grid-menu-preview-shell--${tokens.navLayoutPreset}`"
          :style="menuPreviewStyle"
        >
          <div class="dp-grid-menu-preview-search" />
          <div class="dp-grid-menu-preview-list">
            <div
              v-for="(item, index) in menuPreviewItems"
              :key="item"
              class="dp-grid-menu-preview-item"
              :class="{ 'dp-grid-menu-preview-item--active': index === 1, 'dp-grid-menu-preview-item--branch': index === 3 }"
            >
              <span>{{ item }}</span>
              <span v-if="index === 3" class="dp-grid-menu-preview-arrow">›</span>
            </div>
          </div>
          <div class="dp-grid-menu-preview-meta">{{ activeNavLayoutDescription }}</div>
        </div>
      </div>
    </div>
    <div class="dp-col">
      <div class="dp-col-label">Обводки</div>
      <div class="dp-field">
        <label class="dp-label">толщина <span class="dp-val">{{ tokens.borderWidth }}px</span></label>
        <input type="range" min="0" max="3" step="0.5" :value="tokens.borderWidth" class="dp-range" @input="onFloat('borderWidth', $event)">
      </div>
      <div class="dp-field">
        <label class="dp-label">стиль</label>
        <div class="dp-chip-picker">
          <div class="dp-chip-pool">
            <button
              v-for="s in BORDER_STYLE_OPTIONS"
              :key="`border-style-${s.id}`"
              type="button"
              class="dp-chip"
              :class="{ 'dp-chip--active': String(tokens.borderStyle) === String(s.id) }"
              @click="set('borderStyle', s.id)"
            >{{ s.label }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDesignTokenControls } from '~/entities/design-system/model/useDesignTokenControls'
import type { DesignTokens } from '~/entities/design-system/model/useDesignSystem'

const { tokens, set, onRange, onFloat } = useDesignTokenControls()

const BORDER_STYLE_OPTIONS = [
  { id: 'solid' as const, label: 'solid' },
  { id: 'dashed' as const, label: 'dashed' },
  { id: 'none' as const, label: 'none' },
]

const contentLayoutPresets = [
  { id: 'balanced' as const, label: 'баланс', description: 'Универсальная двухколоночная раскладка с ровным ритмом.' },
  { id: 'registry' as const, label: 'реестр', description: 'Плотная матрица для таблиц, статусов и списков.' },
  { id: 'matrix' as const, label: 'матрица', description: 'Равномерная сетка для модульных карточек и обзорных экранов.' },
  { id: 'editorial' as const, label: 'редакция', description: 'Шире контейнер, меньше карточного хрома, больше воздуха.' },
  { id: 'studio' as const, label: 'студия', description: 'Широкая рабочая сцена для проектных разворотов и мудбордов.' },
  { id: 'dashboard' as const, label: 'дашборд', description: 'Более плотная сетка с компактными аналитическими карточками.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Крупные hero-карточки и широкий межсекционный ритм.' },
  { id: 'storyboard' as const, label: 'сториборд', description: 'Крупные блоки и длинный ритм для презентационных страниц.' },
]

const contentCardPresets = [
  { id: 'flat' as const, label: 'плоские', description: 'Строгие карточки без лишнего объёма.' },
  { id: 'soft' as const, label: 'мягкие', description: 'Скруглённые блоки с мягкой тенью.' },
  { id: 'glass' as const, label: 'стекло', description: 'Полупрозрачные карточки с живой кромкой.' },
  { id: 'brutal' as const, label: 'брутализм', description: 'Контрастные панели с жёсткой рамкой.' },
]

const contentScenePresets = [
  { id: 'workbench' as const, label: 'workbench', description: 'Рабочая сцена: ровная сетка и строгие панели.' },
  { id: 'registry' as const, label: 'registry', description: 'Операционный реестр для документов, задач и контроллинга.' },
  { id: 'magazine' as const, label: 'magazine', description: 'Редакционный разворот с мягкими крупными блоками.' },
  { id: 'atelier' as const, label: 'atelier', description: 'Студийная сцена для концептов, коллажей и презентаций.' },
  { id: 'ops' as const, label: 'ops', description: 'Плотная операционная панель для аналитики и статусов.' },
  { id: 'gallery' as const, label: 'gallery', description: 'Витринная сцена с воздухом и стеклянными карточками.' },
  { id: 'cinematic' as const, label: 'cinematic', description: 'Медленная презентационная сцена с драматичными переходами.' },
]

const navLayoutPresets = [
  { id: 'compact' as const, label: 'компактно', description: 'Плотная и быстрая вертикаль для длинных деревьев.' },
  { id: 'balanced' as const, label: 'баланс', description: 'Нейтральная раскладка для повседневной работы.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Больше воздуха, крупнее блоки и выраженный ритм.' },
  { id: 'rail' as const, label: 'рейл', description: 'Собранная колонка с акцентом на компактную навигацию.' },
]

const contentLayoutRecipes: Record<(typeof contentLayoutPresets)[number]['id'], Partial<DesignTokens>> = {
  balanced: { containerWidth: 1180, gridColumns: 12, gridGap: 16, archDensity: 'normal', archVerticalRhythm: 1, archSectionStyle: 'flat', archCardChrome: 'visible' },
  registry: { containerWidth: 1160, gridColumns: 12, gridGap: 10, archDensity: 'dense', archVerticalRhythm: 0.75, archSectionStyle: 'card', archCardChrome: 'visible' },
  matrix: { containerWidth: 1260, gridColumns: 12, gridGap: 18, archDensity: 'normal', archVerticalRhythm: 1.1, archSectionStyle: 'card', archCardChrome: 'subtle' },
  editorial: { containerWidth: 1320, gridColumns: 10, gridGap: 24, archDensity: 'airy', archVerticalRhythm: 1.5, archSectionStyle: 'flat', archCardChrome: 'ghost' },
  studio: { containerWidth: 1360, gridColumns: 9, gridGap: 26, archDensity: 'airy', archVerticalRhythm: 1.7, archSectionStyle: 'flat', archCardChrome: 'subtle' },
  dashboard: { containerWidth: 1240, gridColumns: 12, gridGap: 12, archDensity: 'dense', archVerticalRhythm: 0.8, archSectionStyle: 'card', archCardChrome: 'visible' },
  showcase: { containerWidth: 1380, gridColumns: 8, gridGap: 28, archDensity: 'grand', archVerticalRhythm: 1.8, archSectionStyle: 'striped', archCardChrome: 'subtle' },
  storyboard: { containerWidth: 1400, gridColumns: 6, gridGap: 30, archDensity: 'grand', archVerticalRhythm: 2, archSectionStyle: 'striped', archCardChrome: 'ghost' },
}

const contentCardRecipes: Record<(typeof contentCardPresets)[number]['id'], Partial<DesignTokens>> = {
  flat: { cardRadius: 0, borderWidth: 1, glassOpacity: 0.96, glassBorderOpacity: 0.08, shadowOffsetY: 0, shadowBlurRadius: 0, shadowOpacity: 0, archCardChrome: 'visible', cardHoverAnim: 'border' },
  soft: { cardRadius: 18, borderWidth: 0, glassOpacity: 0.84, glassBorderOpacity: 0.03, shadowOffsetY: 10, shadowBlurRadius: 24, shadowOpacity: 0.1, archCardChrome: 'subtle', cardHoverAnim: 'lift' },
  glass: { cardRadius: 24, borderWidth: 1, glassBlur: 32, glassSaturation: 200, glassOpacity: 0.25, glassBorderOpacity: 0.35, shadowOffsetY: 12, shadowBlurRadius: 32, shadowOpacity: 0.15, archCardChrome: 'visible', cardHoverAnim: 'reveal' },
  brutal: { cardRadius: 0, borderWidth: 2, glassBlur: 0, glassOpacity: 0.98, glassBorderOpacity: 0.22, shadowOffsetY: 0, shadowBlurRadius: 0, shadowOpacity: 0, archCardChrome: 'visible', cardHoverAnim: 'border' },
}

const contentSceneRecipes: Record<(typeof contentScenePresets)[number]['id'], {
  layout: (typeof contentLayoutPresets)[number]['id']
  card: (typeof contentCardPresets)[number]['id']
  nav: DesignTokens['navLayoutPreset']
  pageEnter: DesignTokens['archPageEnter']
  pageDuration: number
  navTransition: DesignTokens['archNavTransition']
  navDuration: number
  extras?: Partial<DesignTokens>
}> = {
  workbench: { layout: 'balanced', card: 'flat', nav: 'balanced', pageEnter: 'fade', pageDuration: 260, navTransition: 'slide', navDuration: 220, extras: { archContentReveal: 'fade-up', btnHoverAnim: 'fill' } },
  registry: { layout: 'registry', card: 'flat', nav: 'compact', pageEnter: 'none', pageDuration: 0, navTransition: 'fade', navDuration: 160, extras: { archContentReveal: 'none', archTextReveal: 'none', btnHoverAnim: 'shutter' } },
  magazine: { layout: 'editorial', card: 'soft', nav: 'showcase', pageEnter: 'slide-l', pageDuration: 760, navTransition: 'push', navDuration: 320, extras: { archContentReveal: 'fade', archTextReveal: 'clip', btnHoverAnim: 'magnet' } },
  atelier: { layout: 'studio', card: 'glass', nav: 'rail', pageEnter: 'drift-r', pageDuration: 980, navTransition: 'blur', navDuration: 360, extras: { archContentReveal: 'blur', archTextReveal: 'blur-in', btnHoverAnim: 'sheen' } },
  ops: { layout: 'dashboard', card: 'brutal', nav: 'compact', pageEnter: 'none', pageDuration: 0, navTransition: 'none', navDuration: 0, extras: { archContentReveal: 'none', archTextReveal: 'none' } },
  gallery: { layout: 'showcase', card: 'glass', nav: 'rail', pageEnter: 'zoom', pageDuration: 860, navTransition: 'blur', navDuration: 340, extras: { archContentReveal: 'blur', archTextReveal: 'blur-in', btnHoverAnim: 'pulse' } },
  cinematic: { layout: 'storyboard', card: 'soft', nav: 'showcase', pageEnter: 'curtain', pageDuration: 1800, navTransition: 'stack', navDuration: 420, extras: { archContentReveal: 'fade-up', archTextReveal: 'letter-fade', btnHoverAnim: 'scan' } },
}

const navLayoutRecipes: Record<DesignTokens['navLayoutPreset'], Partial<DesignTokens>> = {
  compact: { navLayoutPreset: 'compact', sidebarWidth: 232, navItemPaddingH: 10, navItemPaddingV: 7, navPanelGap: 6, navListGap: 1, navItemRadius: 6, navTransitDistance: 12, navItemStagger: 6 },
  balanced: { navLayoutPreset: 'balanced', sidebarWidth: 260, navItemPaddingH: 16, navItemPaddingV: 12, navPanelGap: 8, navListGap: 2, navItemRadius: 0, navTransitDistance: 18, navItemStagger: 12 },
  showcase: { navLayoutPreset: 'showcase', sidebarWidth: 304, navItemPaddingH: 18, navItemPaddingV: 15, navPanelGap: 14, navListGap: 7, navItemRadius: 14, navTransitDistance: 24, navItemStagger: 18 },
  rail: { navLayoutPreset: 'rail', sidebarWidth: 216, navItemPaddingH: 12, navItemPaddingV: 10, navPanelGap: 10, navListGap: 6, navItemRadius: 999, navTransitDistance: 14, navItemStagger: 10 },
}

const menuPreviewItems = ['обзор', 'планировка', 'материалы', 'подрядчики', 'документы']

const activeContentLayoutId = ref<(typeof contentLayoutPresets)[number]['id']>('balanced')
const activeContentCardPresetId = ref<(typeof contentCardPresets)[number]['id']>('flat')
const activeContentScenePresetId = ref<(typeof contentScenePresets)[number]['id']>('workbench')

const activeContentLayout = computed(() =>
  contentLayoutPresets.find(preset => preset.id === activeContentLayoutId.value) || contentLayoutPresets[0]!,
)
const activeContentLayoutLabel = computed(() => activeContentLayout.value.label)
const activeContentLayoutDescription = computed(() => activeContentLayout.value.description)

const contentPreviewCards = computed(() => {
  const columns = Math.max(2, Math.min(12, tokens.value.gridColumns || 12))
  const wideSpan = Math.max(2, Math.min(columns, columns >= 10 ? 6 : Math.ceil(columns * 0.6)))
  const midSpan = Math.max(2, Math.min(columns, columns >= 8 ? 4 : Math.ceil(columns / 2)))
  const smallSpan = Math.max(1, Math.min(columns, Math.ceil(columns / 3)))

  if (activeContentLayoutId.value === 'dashboard') {
    return [
      { title: 'KPI блок', eyebrow: 'метрика', text: 'Короткая сводка и статус.', span: smallSpan, accent: true },
      { title: 'Дорожная карта', eyebrow: 'процесс', text: 'Компактная аналитическая секция.', span: midSpan, accent: false },
      { title: 'Финансы', eyebrow: 'контроль', text: 'Табличный блок с плотным ритмом.', span: smallSpan, accent: false },
      { title: 'Материалы', eyebrow: 'реестр', text: 'Карточка среднего масштаба.', span: midSpan, accent: false },
      { title: 'Подрядчики', eyebrow: 'команда', text: 'Регистровая колонка с быстрым доступом.', span: midSpan, accent: false },
    ]
  }
  if (activeContentLayoutId.value === 'showcase') {
    return [
      { title: 'Hero секция', eyebrow: 'витрина', text: 'Крупный вводный блок с выразительной типографикой.', span: columns, accent: true },
      { title: 'Галерея проекта', eyebrow: 'контент', text: 'Широкая карточка для визуального нарратива.', span: wideSpan, accent: false },
      { title: 'Матрица задач', eyebrow: 'матрица', text: 'Высокая секция для ритма и навигации.', span: columns - wideSpan || midSpan, accent: false },
      { title: 'Технический блок', eyebrow: 'данные', text: 'Подчинённая карточка с сухими деталями.', span: midSpan, accent: false },
    ]
  }
  if (activeContentLayoutId.value === 'editorial') {
    return [
      { title: 'Вводный разворот', eyebrow: 'редакция', text: 'Воздух, широкий контейнер и длинные строки.', span: wideSpan, accent: true },
      { title: 'Служебные данные', eyebrow: 'поля', text: 'Вторичная колонка для сопровождающей информации.', span: columns - wideSpan || midSpan, accent: false },
      { title: 'Основной материал', eyebrow: 'контент', text: 'Крупный текстовый блок с большим межсекционным ритмом.', span: columns, accent: false },
    ]
  }
  return [
    { title: 'Обзор проекта', eyebrow: 'баланс', text: 'Ровная шапка и стабильный рабочий ритм.', span: wideSpan, accent: true },
    { title: 'Сводка', eyebrow: 'метаданные', text: 'Спутниковая карточка рядом с основным блоком.', span: columns - wideSpan || midSpan, accent: false },
    { title: 'Рабочая секция', eyebrow: 'контент', text: 'Базовая карточка для форм и регистров.', span: midSpan, accent: false },
    { title: 'Документы', eyebrow: 'реестр', text: 'Секция под таблицы и документы.', span: midSpan, accent: false },
  ]
})

const contentPreviewStyle = computed(() => ({
  '--dp-content-preview-width': `${Math.max(320, Math.min(560, tokens.value.containerWidth * 0.34))}px`,
  '--dp-content-preview-gap': `${tokens.value.gridGap}px`,
  '--dp-content-preview-columns': String(Math.max(2, Math.min(12, tokens.value.gridColumns || 12))),
  '--dp-content-preview-rhythm': String(tokens.value.archVerticalRhythm ?? 1),
}))

const activeNavLayout = computed(() =>
  navLayoutPresets.find(preset => preset.id === tokens.value.navLayoutPreset) || navLayoutPresets[1]!,
)
const activeNavLayoutLabel = computed(() => activeNavLayout.value.label)
const activeNavLayoutDescription = computed(() => activeNavLayout.value.description)

const menuPreviewStyle = computed(() => ({
  '--dp-menu-preview-width': `${Math.max(188, tokens.value.sidebarWidth - 24)}px`,
  '--dp-menu-preview-gap': `${tokens.value.navListGap + 2}px`,
  '--dp-menu-preview-radius': `${tokens.value.navItemRadius}px`,
  '--dp-menu-preview-pad-x': `${tokens.value.navItemPaddingH}px`,
  '--dp-menu-preview-pad-y': `${tokens.value.navItemPaddingV}px`,
}))

function applyNavLayoutPreset(presetId: DesignTokens['navLayoutPreset']) {
  const recipe = navLayoutRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function generateNavLayout() {
  const preset = navLayoutPresets[Math.floor(Math.random() * navLayoutPresets.length)]!
  applyNavLayoutPreset(preset.id)
  set('sidebarWidth', Math.min(340, Math.max(208, tokens.value.sidebarWidth + (Math.floor(Math.random() * 5) - 2) * 8)))
  set('navItemPaddingH', Math.min(22, Math.max(8, tokens.value.navItemPaddingH + (Math.floor(Math.random() * 5) - 2))))
  set('navItemPaddingV', Math.min(18, Math.max(6, tokens.value.navItemPaddingV + (Math.floor(Math.random() * 5) - 2))))
  set('navListGap', Math.min(10, Math.max(1, tokens.value.navListGap + (Math.floor(Math.random() * 5) - 2))))
  set('navPanelGap', Math.min(18, Math.max(4, tokens.value.navPanelGap + (Math.floor(Math.random() * 5) - 2))))
}

function applyContentLayoutPreset(presetId: (typeof contentLayoutPresets)[number]['id']) {
  activeContentLayoutId.value = presetId
  const recipe = contentLayoutRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function generateContentLayout() {
  const preset = contentLayoutPresets[Math.floor(Math.random() * contentLayoutPresets.length)]!
  applyContentLayoutPreset(preset.id)
  set('containerWidth', Math.min(1400, Math.max(980, tokens.value.containerWidth + (Math.floor(Math.random() * 7) - 3) * 20)))
  set('gridColumns', Math.min(12, Math.max(2, tokens.value.gridColumns + (Math.floor(Math.random() * 5) - 2))))
  set('gridGap', Math.min(32, Math.max(8, tokens.value.gridGap + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('archVerticalRhythm', Math.min(2.4, Math.max(0.7, Number(((tokens.value.archVerticalRhythm ?? 1) + (Math.random() * 0.6 - 0.3)).toFixed(1)))))
}

function applyContentCardPreset(presetId: (typeof contentCardPresets)[number]['id']) {
  activeContentCardPresetId.value = presetId
  const recipe = contentCardRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function applyContentScenePreset(sceneId: (typeof contentScenePresets)[number]['id']) {
  activeContentScenePresetId.value = sceneId
  const recipe = contentSceneRecipes[sceneId]
  if (!recipe) return
  applyContentLayoutPreset(recipe.layout)
  applyContentCardPreset(recipe.card)
  applyNavLayoutPreset(recipe.nav)
  set('archPageEnter', recipe.pageEnter)
  set('pageTransitDuration', recipe.pageDuration)
  set('archNavTransition', recipe.navTransition)
  set('navTransitDuration', recipe.navDuration)
  if (recipe.extras) {
    for (const [key, value] of Object.entries(recipe.extras) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
      set(key, value)
    }
  }
}

function generateContentScene() {
  const scene = contentScenePresets[Math.floor(Math.random() * contentScenePresets.length)]!
  applyContentScenePreset(scene.id)
  set('containerWidth', Math.min(1400, Math.max(980, tokens.value.containerWidth + (Math.floor(Math.random() * 5) - 2) * 20)))
  set('gridGap', Math.min(32, Math.max(8, tokens.value.gridGap + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('pageTransitDuration', Math.min(10000, Math.max(0, (tokens.value.pageTransitDuration ?? 280) + (Math.floor(Math.random() * 5) - 2) * 80)))
}

function generateFullDesignScene() {
  const scene = contentScenePresets[Math.floor(Math.random() * contentScenePresets.length)]!
  applyContentScenePreset(scene.id)
  set('navTransitDuration', Math.min(700, Math.max(100, (tokens.value.navTransitDuration ?? 220) + (Math.floor(Math.random() * 5) - 2) * 20)))
  set('navTransitDistance', Math.min(40, Math.max(0, (tokens.value.navTransitDistance ?? 18) + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('navItemStagger', Math.min(40, Math.max(0, (tokens.value.navItemStagger ?? 12) + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('animDuration', Math.min(500, Math.max(80, (tokens.value.animDuration ?? 180) + (Math.floor(Math.random() * 5) - 2) * 20)))
}
</script>
