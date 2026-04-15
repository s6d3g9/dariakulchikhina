import {
  CONCEPT_TO_DESIGN_MODE,
  DEFAULT_DESIGN_MODE,
  DEFAULT_DESIGN_CONCEPT,
  DESIGN_MODE_DATA_ATTRIBUTE,
  DESIGN_CONCEPT_STORAGE_KEY,
  DESIGN_MODE_STORAGE_KEY,
  DESIGN_MODE_TO_CONCEPT,
  DESIGN_TOKENS_STORAGE_KEY,
  LEGACY_DESIGN_TOKENS_STORAGE_KEYS,
  normalizeDesignConceptSlug,
  resolveDesignModeFromConceptSlug,
} from '~~/shared/constants/design-modes'
import type { DesignConceptSlug, DesignMode } from '~~/shared/types/design-mode'
import {
  BTN_SIZE_MAP,
  DEFAULT_TOKENS,
  type DesignPreset,
  type DesignTokens,
} from './useDesignSystem.core'

const HISTORY_MAX = 50

export function useDesignSystem() {
  const tokens  = useState<DesignTokens>('designTokens', () => ({ ...DEFAULT_TOKENS }))
  const history = useState<DesignTokens[]>('dsHistory', () => [])
  const future  = useState<DesignTokens[]>('dsFuture', () => [])
  const activeConceptSlug = useState<string>('dsConceptSlug', () => DEFAULT_DESIGN_CONCEPT)
  const isHydrated = useState<boolean>('dsHydrated', () => false)
  const presetConceptMap: Partial<Record<string, DesignConceptSlug>> = {
    material3: 'm3',
    glassmorphism: 'glass',
    apple: 'glass',
    brutalist: 'brutal',
  }

  function resolvePresetConceptSlug(presetId: string, fallbackConceptSlug: string = activeConceptSlug.value) {
    if (!presetId) {
      return normalizeDesignConceptSlug(fallbackConceptSlug) || DEFAULT_DESIGN_CONCEPT
    }

    const explicitConceptSlug = normalizeDesignConceptSlug(presetId)
    if (explicitConceptSlug) {
      return explicitConceptSlug
    }

    const mappedPresetConceptSlug = presetConceptMap[presetId]
    if (mappedPresetConceptSlug) {
      return mappedPresetConceptSlug
    }

    if (presetId.includes('glass')) {
      return 'glass'
    }

    if (presetId.includes('material') || presetId === 'm3') {
      return 'm3'
    }

    if (presetId.includes('brutal')) {
      return 'brutal'
    }

    return normalizeDesignConceptSlug(fallbackConceptSlug) || DEFAULT_DESIGN_CONCEPT
  }

  const currentDesignMode = computed<DesignMode>(() => {
    if (!isHydrated.value) {
      return DEFAULT_DESIGN_MODE
    }

    const conceptSlug = normalizeDesignConceptSlug(activeConceptSlug.value)
    if (!conceptSlug) {
      return DEFAULT_DESIGN_MODE
    }

    return CONCEPT_TO_DESIGN_MODE[conceptSlug] || DEFAULT_DESIGN_MODE
  })

  /* ── Persist / restore ─────────────────────────────────── */
  function save() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(DESIGN_TOKENS_STORAGE_KEY, JSON.stringify(tokens.value))

      const conceptSlug = normalizeDesignConceptSlug(activeConceptSlug.value)
      if (conceptSlug) {
        localStorage.setItem(DESIGN_CONCEPT_STORAGE_KEY, conceptSlug)
      } else {
        localStorage.removeItem(DESIGN_CONCEPT_STORAGE_KEY)
      }

      const designMode = CONCEPT_TO_DESIGN_MODE[conceptSlug as DesignConceptSlug]
      if (designMode) {
        localStorage.setItem(DESIGN_MODE_STORAGE_KEY, designMode)
      } else {
        localStorage.removeItem(DESIGN_MODE_STORAGE_KEY)
      }
    } catch (err) {
      console.warn('Failed to save design tokens:', err)
    }
  }

  function load() {
    if (!import.meta.client) return
    try {
      const savedConcept = normalizeDesignConceptSlug(localStorage.getItem(DESIGN_CONCEPT_STORAGE_KEY)?.trim() || '')
      const savedMode = (localStorage.getItem(DESIGN_MODE_STORAGE_KEY)?.trim() || '') as DesignMode | ''
      const inferredMode = savedMode || CONCEPT_TO_DESIGN_MODE[savedConcept as DesignConceptSlug] || 'brutalist'
      const raw = localStorage.getItem(DESIGN_TOKENS_STORAGE_KEY)
        || LEGACY_DESIGN_TOKENS_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DesignTokens>
        const migratedTokens: DesignTokens = {
          ...DEFAULT_TOKENS,
          ...parsed,
          contentViewMode: parsed.contentViewMode ?? (inferredMode === 'brutalist' ? 'wipe' : DEFAULT_TOKENS.contentViewMode),
        }

        tokens.value = migratedTokens

        if (!Object.prototype.hasOwnProperty.call(parsed, 'contentViewMode')) {
          localStorage.setItem(DESIGN_TOKENS_STORAGE_KEY, JSON.stringify(migratedTokens))
        }
      }

      activeConceptSlug.value = savedConcept
        || (savedMode ? DESIGN_MODE_TO_CONCEPT[savedMode] : '')
        || DEFAULT_DESIGN_CONCEPT
    } catch { /* corrupt data → just use defaults */ }
  }

  /* ── Token updates ─────────────────────────────────────── */
  function set<K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) {
    if (tokens.value[key] === value) return
    pushHistory()
    tokens.value[key] = value
    scheduleApplyToDOM()
    save()
  }

  function reset() {
    pushHistory()
    tokens.value = { ...DEFAULT_TOKENS }
    activeConceptSlug.value = DEFAULT_DESIGN_CONCEPT
    _syncConceptAttr()
    applyToDOM()
    save()
  }

  /* ── History stack (Undo / Redo) ─────────────────────── */
  function pushHistory() {
    history.value = [...history.value.slice(-(HISTORY_MAX - 1)), { ...tokens.value }]
    future.value = []
  }

  function undo() {
    if (!history.value.length) return
    future.value = [...future.value, { ...tokens.value }]
    tokens.value = { ...history.value[history.value.length - 1] }
    history.value = history.value.slice(0, -1)
    applyToDOM()
    save()
  }

  function redo() {
    if (!future.value.length) return
    history.value = [...history.value, { ...tokens.value }]
    tokens.value = { ...future.value[future.value.length - 1] }
    future.value = future.value.slice(0, -1)
    applyToDOM()
    save()
  }

  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /* ── Apply tokens to CSS custom properties on <html> ──── */
  let _rafId = 0
  function scheduleApplyToDOM() {
    if (!import.meta.client) return
    if (_rafId) cancelAnimationFrame(_rafId)
    _rafId = requestAnimationFrame(() => { _rafId = 0; _applyToDOMSync() })
  }
  /** Synchronous version — for immediate calls (undo/redo/preset). */
  function applyToDOM() {
    if (!import.meta.client) return
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = 0 }
    _applyToDOMSync()
  }
  function _applyToDOMSync() {
    try {
      const el = document.documentElement
      const t = tokens.value
      const sz = BTN_SIZE_MAP[t.btnSize]

      // Buttons
      el.style.setProperty('--btn-radius', `${t.btnRadius}px`)
      el.style.setProperty('--btn-py', `${t.btnPaddingV > 0 ? t.btnPaddingV : sz.py}px`)
      el.style.setProperty('--btn-px', `${t.btnPaddingH > 0 ? t.btnPaddingH : sz.px}px`)
      el.style.setProperty('--btn-font-size', `${sz.fontSize}rem`)
      el.style.setProperty('--btn-transform', t.btnTransform)
      el.style.setProperty('--btn-tracking', `${t.letterSpacing}em`)
      el.style.setProperty('--btn-weight', String(t.btnWeight))
      el.style.setProperty('--btn-padding-h', `${t.btnPaddingH > 0 ? t.btnPaddingH : sz.px}px`)
      el.style.setProperty('--btn-padding-v', `${t.btnPaddingV > 0 ? t.btnPaddingV : sz.py}px`)

    switch (t.btnStyle) {
      case 'filled':
        el.style.setProperty('--btn-bg', 'var(--btn-bg-base, rgba(0,0,0,0.07))')
        el.style.setProperty('--btn-border', 'var(--btn-border-base, rgba(0,0,0,0.14))')
        break
      case 'outline':
        el.style.setProperty('--btn-bg', 'transparent')
        el.style.setProperty('--btn-border', 'var(--btn-border-base, rgba(0,0,0,0.25))')
        break
      case 'ghost':
        el.style.setProperty('--btn-bg', 'transparent')
        el.style.setProperty('--btn-border', 'transparent')
        break
      case 'soft':
        el.style.setProperty('--btn-bg', 'var(--btn-bg-base, rgba(0,0,0,0.04))')
        el.style.setProperty('--btn-border', 'transparent')
        break
    }

    // Small button — derive from main style
    switch (t.btnStyle) {
      case 'ghost':
        el.style.setProperty('--btn-sm-bg', 'transparent')
        el.style.setProperty('--btn-sm-border', 'transparent')
        break
      case 'outline':
        el.style.setProperty('--btn-sm-bg', 'transparent')
        el.style.setProperty('--btn-sm-border', 'var(--btn-border-base, rgba(0,0,0,0.12))')
        break
      default: // filled, soft
        el.style.setProperty('--btn-sm-bg', 'transparent')
        el.style.setProperty('--btn-sm-border', 'var(--btn-border-base, rgba(0,0,0,0.12))')
        break
    }

    // Typography — set DIRECTLY on <html> so ALL rem values scale proportionally
    // and font-family/weight/line-height inherit into every component automatically
    el.style.fontSize = `${t.fontSize}rem`
    el.style.fontFamily = t.fontFamily
    el.style.fontWeight = String(t.fontWeight)
    el.style.lineHeight = String(t.lineHeight)
    el.style.letterSpacing = `${t.letterSpacing}em`

    el.style.setProperty('--ds-font-family', t.fontFamily)
    el.style.setProperty('--ds-font-size', `${t.fontSize}rem`)
    el.style.setProperty('--ds-font-weight', String(t.fontWeight))
    el.style.setProperty('--ds-heading-weight', String(t.headingWeight))
    el.style.setProperty('--ds-letter-spacing', `${t.letterSpacing}em`)
    el.style.setProperty('--ds-line-height', String(t.lineHeight))
    el.style.setProperty('--ds-paragraph-spacing', `${t.paragraphSpacing}rem`)
    el.style.setProperty('--ds-word-spacing', t.wordSpacing === 0 ? 'normal' : `${t.wordSpacing}em`)
    el.style.setProperty('--ds-text-indent', t.textIndent === 0 ? '0' : `${t.textIndent}em`)
    el.style.setProperty('--ds-heading-letter-spacing', `${t.headingLetterSpacing}em`)
    el.style.setProperty('--ds-heading-line-height', String(t.headingLineHeight))
    el.style.setProperty('--ds-paragraph-max-width', t.paragraphMaxWidth === 0 ? 'none' : `${t.paragraphMaxWidth}ch`)
    el.style.setProperty('--ds-text-align', t.textAlign)

    // Type scale (modular ratio)
    const r = t.typeScale
    el.style.setProperty('--ds-type-scale', String(r))
    el.style.setProperty('--ds-text-xs', `${(t.fontSize / r / r).toFixed(3)}rem`)
    el.style.setProperty('--ds-text-sm', `${(t.fontSize / r).toFixed(3)}rem`)
    el.style.setProperty('--ds-text-base', `${t.fontSize}rem`)
    el.style.setProperty('--ds-text-lg', `${(t.fontSize * r).toFixed(3)}rem`)
    el.style.setProperty('--ds-text-xl', `${(t.fontSize * r * r).toFixed(3)}rem`)
    el.style.setProperty('--ds-text-2xl', `${(t.fontSize * r * r * r).toFixed(3)}rem`)
    el.style.setProperty('--ds-text-3xl', `${(t.fontSize * r * r * r * r).toFixed(3)}rem`)

    // Semantic colors (accent, success, error, warning)
    el.style.setProperty('--ds-accent', `hsl(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%)`)
    el.style.setProperty('--ds-accent-hue', String(t.accentHue))
    el.style.setProperty('--ds-accent-sat', `${t.accentSaturation}%`)
    el.style.setProperty('--ds-accent-ltn', `${t.accentLightness}%`)
    el.style.setProperty('--ds-accent-light', `hsl(${t.accentHue}, ${t.accentSaturation}%, ${Math.min(95, t.accentLightness + 35)}%)`)
    el.style.setProperty('--ds-accent-dark', `hsl(${t.accentHue}, ${t.accentSaturation}%, ${Math.max(15, t.accentLightness - 20)}%)`)

    el.style.setProperty('--ds-success', `hsl(${t.successHue}, ${t.successSaturation}%, 45%)`)
    el.style.setProperty('--ds-success-light', `hsl(${t.successHue}, ${t.successSaturation}%, 92%)`)
    el.style.setProperty('--ds-error', `hsl(${t.errorHue}, ${t.errorSaturation}%, 50%)`)
    el.style.setProperty('--ds-error-light', `hsl(${t.errorHue}, ${t.errorSaturation}%, 93%)`)
    el.style.setProperty('--ds-warning', `hsl(${t.warningHue}, ${t.warningSaturation}%, 50%)`)
    el.style.setProperty('--ds-warning-light', `hsl(${t.warningHue}, ${t.warningSaturation}%, 92%)`)

    // Glass surface
    el.style.setProperty('--glass-blur', `${t.glassBlur}px`)
    el.style.setProperty('--glass-bg-alpha', String(t.glassOpacity))
    el.style.setProperty('--glass-border-alpha', String(t.glassBorderOpacity))
    el.style.setProperty('--glass-saturation', `${t.glassSaturation}%`)

    // Shadows (multi-layered like Vercel)
    el.style.setProperty('--ds-shadow', `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(0,0,0,${t.shadowOpacity})`)
    el.style.setProperty('--ds-shadow-sm', `0 ${Math.round(t.shadowOffsetY * 0.3)}px ${Math.round(t.shadowBlurRadius * 0.4)}px rgba(0,0,0,${(t.shadowOpacity * 0.7).toFixed(3)})`)
    el.style.setProperty('--ds-shadow-lg', `0 ${Math.round(t.shadowOffsetY * 2)}px ${Math.round(t.shadowBlurRadius * 2)}px ${t.shadowSpread}px rgba(0,0,0,${(t.shadowOpacity * 1.4).toFixed(3)})`)
    el.style.setProperty('--ds-shadow-y', `${t.shadowOffsetY}px`)
    el.style.setProperty('--ds-shadow-blur', `${t.shadowBlurRadius}px`)
    el.style.setProperty('--ds-shadow-spread', `${t.shadowSpread}px`)
    el.style.setProperty('--ds-shadow-alpha', String(t.shadowOpacity))

    // Spacing scale (generate 0..12 spacing tokens)
    const base = t.spacingBase * t.spacingScale
    for (let i = 0; i <= 12; i++) {
      el.style.setProperty(`--ds-space-${i}`, `${(base * i).toFixed(1)}px`)
    }
    el.style.setProperty('--ds-spacing-unit', `${t.spacingBase}px`)
    el.style.setProperty('--ds-spacing', String(t.spacingScale))

    // Radii
    el.style.setProperty('--card-radius', `${t.cardRadius}px`)
    el.style.setProperty('--input-radius', `${t.inputRadius}px`)
    el.style.setProperty('--chip-radius', `${t.chipRadius}px`)
    el.style.setProperty('--modal-radius', `${t.modalRadius}px`)
    // Computed inner radii — scale proportionally with card-radius
    el.style.setProperty('--card-radius-inner', `${Math.max(3, Math.round(t.cardRadius * 0.6))}px`)
    el.style.setProperty('--card-radius-xs',    `${Math.max(2, Math.round(t.cardRadius * 0.35))}px`)

    // Animation
    el.style.setProperty('--ds-anim-duration', `${t.animDuration}ms`)
    el.style.setProperty('--ds-anim-easing', t.animEasing)
    el.style.setProperty('--ds-transition', `${t.animDuration}ms ${t.animEasing}`)

    // Grid
    el.style.setProperty('--ds-container-width', `${t.containerWidth}px`)
    el.style.setProperty('--ds-sidebar-width', `${t.sidebarWidth}px`)
    el.style.setProperty('--ds-grid-gap', `${t.gridGap}px`)
    el.style.setProperty('--ds-grid-columns', String(t.gridColumns))

    // Borders
    el.style.setProperty('--ds-border-width', `${t.borderWidth}px`)
    el.style.setProperty('--ds-border-style', t.borderStyle)

    // Dark mode — set token-driven CSS variables consumed by html.dark rules
    el.style.setProperty('--ds-dark-elevation', String(t.darkElevation))
    el.style.setProperty('--ds-dark-saturation', `${t.darkSaturation}%`)
    // Computed dark surface colors for JS-driven inline previews & theme rules
    const dkSat = t.darkSaturation
    const dkElev = t.darkElevation
    el.style.setProperty('--ds-dark-page-bg', `hsl(220, ${(dkSat * 0.15).toFixed(1)}%, ${(4 + dkElev * 0.15).toFixed(1)}%)`)
    el.style.setProperty('--ds-dark-surface-bg', `hsla(220, ${(dkSat * 0.2).toFixed(1)}%, ${(8 + dkElev * 0.5).toFixed(1)}%, 0.92)`)
    el.style.setProperty('--ds-dark-text', `hsl(220, ${(dkSat * 0.15).toFixed(1)}%, 90%)`)
    el.style.setProperty('--ds-dark-text-muted', `hsl(220, ${(dkSat * 0.1).toFixed(1)}%, 65%)`)
    el.style.setProperty('--ds-dark-border', `hsl(220, ${(dkSat * 0.2).toFixed(1)}%, ${(14 + dkElev * 0.6).toFixed(1)}%)`)

    // Input fields
    const inputBgPct = Math.round(t.inputBgOpacity * 100)
    const inputFocusPct = Math.min(18, Math.round(t.inputBgOpacity * 1.8 * 100))
    const inputBorderPct = Math.round(t.inputBorderOpacity * 100)
    el.style.setProperty('--input-bg', `color-mix(in srgb, var(--glass-text) ${inputBgPct}%, transparent)`)
    el.style.setProperty('--input-bg-focus', `color-mix(in srgb, var(--glass-text) ${inputFocusPct}%, transparent)`)
    el.style.setProperty('--input-border-color', t.inputBorderOpacity > 0.005
      ? `color-mix(in srgb, var(--glass-text) ${inputBorderPct}%, transparent)`
      : 'transparent')
    el.style.setProperty('--input-padding-h', `${t.inputPaddingH}px`)
    el.style.setProperty('--input-padding-v', `${t.inputPaddingV}px`)
    el.style.setProperty('--input-font-size', t.inputFontSize > 0 ? `${t.inputFontSize}rem` : 'var(--ds-text-sm, .833rem)')

    // Chips / Tags
    const chipBgPct = Math.round(t.chipBgOpacity * 100)
    const chipBorderPct = Math.round(t.chipBorderOpacity * 100)
    el.style.setProperty('--chip-bg', `color-mix(in srgb, var(--glass-text) ${chipBgPct}%, transparent)`)
    el.style.setProperty('--chip-border-color', t.chipBorderOpacity > 0.005
      ? `color-mix(in srgb, var(--glass-text) ${chipBorderPct}%, transparent)`
      : 'transparent')
    el.style.setProperty('--chip-padding-h', `${t.chipPaddingH}px`)
    el.style.setProperty('--chip-padding-v', `${t.chipPaddingV}px`)

    // Navigation
    el.style.setProperty('--nav-item-radius', `${t.navItemRadius}px`)
    el.style.setProperty('--nav-item-padding-h', `${t.navItemPaddingH}px`)
    el.style.setProperty('--nav-item-padding-v', `${t.navItemPaddingV}px`)
    el.style.setProperty('--ds-nav-panel-gap', `${t.navPanelGap}px`)
    el.style.setProperty('--ds-nav-list-gap', `${t.navListGap}px`)
    el.style.setProperty('--ds-nav-trans-duration', `${t.navTransitDuration}ms`)
    el.style.setProperty('--ds-nav-trans-distance', `${t.navTransitDistance}px`)
    el.style.setProperty('--ds-nav-item-stagger', `${t.navItemStagger}ms`)
    el.setAttribute('data-nav-layout', t.navLayoutPreset || 'balanced')

    // Status pills / pin bars
    const sBg = t.statusBgOpacity
    el.style.setProperty('--status-pill-radius', `${t.statusPillRadius}px`)
    el.style.setProperty('--rm-bg-pending',   `color-mix(in srgb, var(--glass-text) ${Math.round(sBg * 100)}%, transparent)`)
    el.style.setProperty('--rm-bg-progress',  `color-mix(in srgb, var(--ds-warning) ${Math.round(sBg * 155)}%, transparent)`)
    el.style.setProperty('--rm-bg-done',      `color-mix(in srgb, var(--ds-success) ${Math.round(sBg * 122)}%, transparent)`)
    el.style.setProperty('--rm-bg-skipped',   `color-mix(in srgb, var(--glass-text) ${Math.round(sBg * 55)}%, transparent)`)
    el.style.setProperty('--ws-bg-pending',   `color-mix(in srgb, var(--glass-text) ${Math.round(sBg * 100)}%, transparent)`)
    el.style.setProperty('--ws-bg-planned',   `color-mix(in srgb, var(--ds-accent) ${Math.round(sBg * 133)}%, transparent)`)
    el.style.setProperty('--ws-bg-progress',  `color-mix(in srgb, var(--ds-warning) ${Math.round(sBg * 155)}%, transparent)`)
    el.style.setProperty('--ws-bg-done',      `color-mix(in srgb, var(--ds-success) ${Math.round(sBg * 122)}%, transparent)`)
    el.style.setProperty('--ws-bg-paused',    `color-mix(in srgb, var(--ds-accent) ${Math.round(sBg * 110)}%, transparent)`)
    el.style.setProperty('--ws-bg-cancelled', `color-mix(in srgb, var(--ds-error) ${Math.round(sBg * 133)}%, transparent)`)
    el.style.setProperty('--ws-bg-skipped',   `color-mix(in srgb, var(--glass-text) ${Math.round(sBg * 55)}%, transparent)`)

    // Modal overlay / Dropdowns
    el.style.setProperty('--modal-overlay-opacity', String(t.modalOverlayOpacity))
    el.style.setProperty('--dropdown-blur', `${t.dropdownBlur}px`)
    // Derive dropdown bg from current page bg: opaque surface clearly visible above page
    const isDark = el.classList.contains('dark')
    const ddAlpha = t.dropdownBlur > 16 ? Math.max(0.15, 1 - (t.dropdownBlur / 40)) : (isDark ? 0.98 : 0.97)

    if (isDark) {
      el.style.setProperty('--dropdown-bg', `rgba(18, 21, 30, ${ddAlpha})`)
      el.style.setProperty('--dropdown-border', `rgba(255,255,255,${t.dropdownBlur > 16 ? 0.2 : 0.12})`)
      el.style.setProperty('--dropdown-shadow', '0 4px 28px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.30), inset 0 1px 1px rgba(255, 255, 255, 0.1), inset 0 0 24px rgba(255, 255, 255, 0.02)')
    } else {
      el.style.setProperty('--dropdown-bg', `rgba(255, 255, 255, ${ddAlpha})`)
      el.style.setProperty('--dropdown-border', `rgba(0,0,0,${t.dropdownBlur > 16 ? 0.2 : 0.10})`)
      el.style.setProperty('--dropdown-shadow', '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 0 24px rgba(255, 255, 255, 0.4)')
    }

    // Scrollbar
    el.style.setProperty('--scrollbar-width', `${t.scrollbarWidth}px`)
    el.style.setProperty('--scrollbar-thumb', `color-mix(in srgb, var(--glass-text) ${Math.round(t.scrollbarOpacity * 100)}%, transparent)`)

    // Tables
    const thPct = Math.round(t.tableHeaderOpacity * 100)
    const trPct = Math.round(t.tableRowHoverOpacity * 100)
    const tbPct = Math.round(t.tableBorderOpacity * 100)
    el.style.setProperty('--table-header-bg', `color-mix(in srgb, var(--glass-text) ${thPct}%, transparent)`)
    el.style.setProperty('--table-row-hover-bg', `color-mix(in srgb, var(--glass-text) ${trPct}%, transparent)`)
    el.style.setProperty('--table-border-color', `color-mix(in srgb, var(--glass-text) ${tbPct}%, transparent)`)

    // Badges / Counters
    const bdgPct = Math.round(t.badgeBgOpacity * 100)
    el.style.setProperty('--badge-bg', `color-mix(in srgb, var(--ds-accent) ${bdgPct}%, transparent)`)
    el.style.setProperty('--badge-radius', `${t.badgeRadius}px`)

    // Accessibility / Focus ring
    el.style.setProperty('--ds-focus-ring-width', `${t.focusRingWidth}px`)
    el.style.setProperty('--ds-focus-ring-offset', `${t.focusRingOffset}px`)
    el.style.setProperty('--ds-focus-ring-style', t.focusRingStyle)
    el.style.setProperty('--ds-focus-ring-opacity', String(t.focusRingOpacity))
    el.style.setProperty('--ds-focus-ring-color', `hsla(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%, ${t.focusRingOpacity})`)
    el.style.setProperty('--ds-focus-ring', `${t.focusRingWidth}px ${t.focusRingStyle} hsla(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%, ${t.focusRingOpacity})`)

    // ── Button & card hover animation ─────────────────────────────
    el.setAttribute('data-btn-hover',  t.btnHoverAnim)
    el.setAttribute('data-card-hover', t.cardHoverAnim)

    // ── Design Architecture tokens ────────────────────────────────
    el.style.setProperty('--ds-heading-letter-spacing', `${((t.archHeadingTracking ?? -1) * 0.01).toFixed(3)}em`)
    el.setAttribute('data-density',       t.archDensity      || 'normal')
    el.setAttribute('data-heading-case',  t.archHeadingCase  || 'none')
    el.setAttribute('data-divider',       t.archDivider      || 'none')
    el.setAttribute('data-page-enter',    t.archPageEnter    || 'none')
    el.setAttribute('data-content-view',  t.contentViewMode  || 'scroll')
    el.setAttribute('data-link-anim',     t.archLinkAnim     || 'none')
    el.setAttribute('data-section-style', t.archSectionStyle || 'flat')
    el.setAttribute('data-nav-style',     t.archNavStyle     || 'full')
    el.setAttribute('data-card-chrome',   t.archCardChrome   || 'visible')
    el.setAttribute('data-hero-scale',    t.archHeroScale    || 'normal')
    el.style.setProperty('--arch-vertical-rhythm', String(t.archVerticalRhythm ?? 1))
    el.setAttribute('data-content-reveal', t.archContentReveal || 'none')
    el.setAttribute('data-text-reveal',   t.archTextReveal   || 'none')
    el.setAttribute('data-nav-transition', t.archNavTransition || 'slide')

    // ── Wipe mode CSS custom properties ────────────────────
    el.style.setProperty('--wipe-top-inset', `${t.wipeTopInset ?? 48}px`)
    el.style.setProperty('--wipe-bottom-inset', `${t.wipeBottomInset ?? 106}px`)
    el.style.setProperty('--wipe-side-margin', `${t.wipeSideMargin ?? 20}px`)
    el.style.setProperty('--wipe-content-padding', `${t.wipeContentPadding ?? 20}px`)
    el.style.setProperty('--wipe-card-radius', `${t.wipeCardRadius ?? 14}px`)
    el.style.setProperty('--wipe-card-border', `${t.wipeCardBorder ?? 1}px`)
    const ws = t.wipeCardShadow ?? 0.4
    el.style.setProperty('--wipe-card-shadow', String(ws))
    el.style.setProperty('--wipe-shadow-sm', `rgba(0,0,0,${(ws * 0.1).toFixed(3)})`)
    el.style.setProperty('--wipe-shadow-lg', `rgba(0,0,0,${(ws * 0.075).toFixed(3)})`)
    el.style.setProperty('--wipe-page-fill', String(t.wipePageFill ?? 0.85))
    el.style.setProperty('--wipe-transition', t.wipeTransition ?? 'slide')

    // Set data-dark-surface when page bg is very dark (for CSS dark-surface cascade)
    if (t.colorPageBg && /^#[0-1][0-9a-f]/i.test(t.colorPageBg)) {
      el.setAttribute('data-dark-surface', 'true')
    } else {
      el.removeAttribute('data-dark-surface')
    }

    // Set data-warm-surface when page bg is a warm off-white (for warm concept cascade)
    if (t.colorPageBg) {
      const r = parseInt(t.colorPageBg.slice(1, 3), 16)
      const g = parseInt(t.colorPageBg.slice(3, 5), 16)
      const b = parseInt(t.colorPageBg.slice(5, 7), 16)
      // Warm off-white: bright (r>200), warm shift (r > b + 10)
      if (r > 200 && g > 200 && r > b + 10) {
        el.setAttribute('data-warm-surface', 'true')
      } else {
        el.removeAttribute('data-warm-surface')
      }
    } else {
      el.removeAttribute('data-warm-surface')
    }

    // Re-apply UI theme's CSS vars on top (they set --btn-bg-base, --glass-* etc.
    // which must persist after applyToDOM sets --btn-bg = var(--btn-bg-base))
    try {
      const { refreshThemeVars, themeId, UI_THEMES } = useUITheme()
      refreshThemeVars()

      // Override glass-bg / glass-border / glass-shadow alpha with design-system
      // token values. Theme vars hardcode rgba(…,0.52) etc.; we parse out the RGB
      // and re-apply the alpha from the token so the Glass controls in the panel
      // actually work.
      const theme = UI_THEMES.value.find((th: any) => th.id === themeId.value)
      if (theme) {
        const isDark = el.classList.contains('dark')
        const tVars = isDark ? theme.darkVars : theme.vars
        const rgbaRe = /rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/

        // Glass background alpha
        const bgMatch = (tVars['--glass-bg'] || '').match(rgbaRe)
        if (bgMatch) {
          el.style.setProperty('--glass-bg', `rgba(${bgMatch[1]}, ${bgMatch[2]}, ${bgMatch[3]}, ${t.glassOpacity})`)
        }

        // Glass border alpha
        const borderMatch = (tVars['--glass-border'] || '').match(rgbaRe)
        if (borderMatch) {
          el.style.setProperty('--glass-border', `rgba(${borderMatch[1]}, ${borderMatch[2]}, ${borderMatch[3]}, ${t.glassBorderOpacity})`)
        }

        // Glass shadow — re-apply DS shadow tokens over theme's hardcoded shadow
        // Parse the theme shadow to extract the rgba color, then rebuild with DS offset/blur/spread/opacity
        const shadowVal = tVars['--glass-shadow'] || ''
        const shadowColorMatch = shadowVal.match(rgbaRe)
        if (shadowColorMatch) {
          const [, sr, sg, sb] = shadowColorMatch
          el.style.setProperty('--glass-shadow',
            `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(${sr}, ${sg}, ${sb}, ${t.shadowOpacity})`)
        }
      }
    } catch { /* useUITheme not ready yet */ }

    // ── Element colour overrides ─────────────────────────────────────
    // Run LAST so they override both defaults and refreshed theme vars.
    // Empty string → remove inline override so the theme CSS drives the value.
    function _setOrDel(prop: string, val: string) {
      if (val) el.style.setProperty(prop, val)
      else el.style.removeProperty(prop)
    }
    function _hexRgba(hex: string, alpha: number) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    _setOrDel('--glass-page-bg',    t.colorPageBg)
    _setOrDel('--glass-text',        t.colorText)
    _setOrDel('--ds-text-color',     t.colorText)
    _setOrDel('--ds-surface-bg',     t.colorSurface)
    _setOrDel('--btn-bg-base',       t.colorBtnBg)
    _setOrDel('--ds-btn-bg',         t.colorBtnBg)
    _setOrDel('--ds-btn-text',       t.colorBtnText)
    _setOrDel('--btn-color',         t.colorBtnText)
    _setOrDel('--ds-heading-color',  t.colorHeading)
    _setOrDel('--ds-link-color',     t.colorLink)
    _setOrDel('--ds-nav-bg',         t.colorNavBg)
    _setOrDel('--ds-muted',          t.colorMuted)
    _setOrDel('--ds-input-bg-custom',t.colorInputBg)
    _setOrDel('--ds-tag-bg',         t.colorTagBg)
    _setOrDel('--ds-tag-color',      t.colorTagText)
    _setOrDel('--ds-card-bg',        t.colorCardBg)

    if (t.colorSurface && /^#[0-9a-f]{6}$/i.test(t.colorSurface)) {
      el.style.setProperty('--glass-bg', _hexRgba(t.colorSurface, t.glassOpacity))
    }
    if (t.colorBorder && /^#[0-9a-f]{6}$/i.test(t.colorBorder)) {
      el.style.setProperty('--glass-border', _hexRgba(t.colorBorder, t.glassBorderOpacity))
    }

    } catch (e) {
      console.warn('[DesignSystem] applyToDOM error:', e)
    }
  }

  /* ── Batch setter (one undo step for preset switch) ───── */
  function applyPreset(preset: DesignPreset) {
    pushHistory()
    // Start from DEFAULT_TOKENS — complete reset, no residue from prev presets
    tokens.value = { ...DEFAULT_TOKENS, ...preset.tokens }
    // Track active concept slug for CSS selectors like html[data-concept="brutal"]
    activeConceptSlug.value = resolvePresetConceptSlug(preset.id, activeConceptSlug.value)
    _syncConceptAttr()
    applyToDOM()
    save()
  }

  /* ── Export / Import ───────────────────────────────────── */
  function exportJSON(): string {
    return JSON.stringify(tokens.value, null, 2)
  }

  function importJSON(json: string) {
    try {
      const parsed = JSON.parse(json) as Partial<DesignTokens>
      pushHistory()
      tokens.value = { ...DEFAULT_TOKENS, ...parsed }
      applyToDOM()
      save()
      return true
    } catch {
      return false
    }
  }

  function exportCSS(): string {
    const t = tokens.value
    const sz = BTN_SIZE_MAP[t.btnSize]
    const r = t.typeScale
    const inputBgPct = Math.round(t.inputBgOpacity * 100)
    const inputBorderPct = Math.round(t.inputBorderOpacity * 100)
    const chipBgPct = Math.round(t.chipBgOpacity * 100)
    const chipBorderPct = Math.round(t.chipBorderOpacity * 100)
    const sBg = t.statusBgOpacity
    const thPct = Math.round(t.tableHeaderOpacity * 100)
    const trPct = Math.round(t.tableRowHoverOpacity * 100)
    const tbPct = Math.round(t.tableBorderOpacity * 100)
    const bdgPct = Math.round(t.badgeBgOpacity * 100)
    const lines = [
      ':root {',
      `  /* ── Buttons ── */`,
      `  --btn-radius: ${t.btnRadius}px;`,
      `  --btn-py: ${sz.py}px;`,
      `  --btn-px: ${sz.px}px;`,
      `  --btn-font-size: ${sz.fontSize}rem;`,
      `  --btn-transform: ${t.btnTransform};`,
      `  --btn-weight: ${t.btnWeight};`,
      `  --btn-padding-h: ${t.btnPaddingH > 0 ? t.btnPaddingH : sz.px}px;`,
      `  --btn-padding-v: ${t.btnPaddingV > 0 ? t.btnPaddingV : sz.py}px;`,
      ``,
      `  /* ── Typography ── */`,
      `  --ds-font-family: ${t.fontFamily};`,
      `  --ds-font-size: ${t.fontSize}rem;`,
      `  --ds-font-weight: ${t.fontWeight};`,
      `  --ds-heading-weight: ${t.headingWeight};`,
      `  --ds-letter-spacing: ${t.letterSpacing}em;`,
      `  --ds-line-height: ${t.lineHeight};`,
      `  --ds-paragraph-spacing: ${t.paragraphSpacing}rem;`,
      `  --ds-word-spacing: ${t.wordSpacing === 0 ? 'normal' : t.wordSpacing + 'em'};`,
      `  --ds-text-indent: ${t.textIndent === 0 ? '0' : t.textIndent + 'em'};`,
      `  --ds-heading-letter-spacing: ${t.headingLetterSpacing}em;`,
      `  --ds-heading-line-height: ${t.headingLineHeight};`,
      `  --ds-paragraph-max-width: ${t.paragraphMaxWidth === 0 ? 'none' : t.paragraphMaxWidth + 'ch'};`,
      `  --ds-text-align: ${t.textAlign};`,
      ``,
      `  /* ── Type Scale (ratio: ${r}) ── */`,
      `  --ds-text-xs:  ${(t.fontSize / r / r).toFixed(3)}rem;`,
      `  --ds-text-sm:  ${(t.fontSize / r).toFixed(3)}rem;`,
      `  --ds-text-base: ${t.fontSize}rem;`,
      `  --ds-text-lg:  ${(t.fontSize * r).toFixed(3)}rem;`,
      `  --ds-text-xl:  ${(t.fontSize * r * r).toFixed(3)}rem;`,
      `  --ds-text-2xl: ${(t.fontSize * r * r * r).toFixed(3)}rem;`,
      `  --ds-text-3xl: ${(t.fontSize * r * r * r * r).toFixed(3)}rem;`,
      ``,
      `  /* ── Semantic Colors ── */`,
      `  --ds-accent: hsl(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%);`,
      `  --ds-accent-light: hsl(${t.accentHue}, ${t.accentSaturation}%, ${Math.min(95, t.accentLightness + 35)}%);`,
      `  --ds-accent-dark: hsl(${t.accentHue}, ${t.accentSaturation}%, ${Math.max(15, t.accentLightness - 20)}%);`,
      `  --ds-success: hsl(${t.successHue}, ${t.successSaturation}%, 45%);`,
      `  --ds-error: hsl(${t.errorHue}, ${t.errorSaturation}%, 50%);`,
      `  --ds-warning: hsl(${t.warningHue}, ${t.warningSaturation}%, 50%);`,
      ``,
      `  /* ── Glass ── */`,
      `  --glass-blur: ${t.glassBlur}px;`,
      `  --glass-saturation: ${t.glassSaturation}%;`,
      ``,
      `  /* ── Shadows ── */`,
      `  --ds-shadow: 0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(0,0,0,${t.shadowOpacity});`,
      `  --ds-shadow-sm: 0 ${Math.round(t.shadowOffsetY * 0.3)}px ${Math.round(t.shadowBlurRadius * 0.4)}px rgba(0,0,0,${(t.shadowOpacity * 0.7).toFixed(3)});`,
      `  --ds-shadow-lg: 0 ${Math.round(t.shadowOffsetY * 2)}px ${Math.round(t.shadowBlurRadius * 2)}px rgba(0,0,0,${(t.shadowOpacity * 1.4).toFixed(3)});`,
      ``,
      `  /* ── Radii ── */`,
      `  --card-radius: ${t.cardRadius}px;`,
      `  --input-radius: ${t.inputRadius}px;`,
      `  --chip-radius: ${t.chipRadius}px;`,
      `  --modal-radius: ${t.modalRadius}px;`,
      ``,
      `  /* ── Animation ── */`,
      `  --ds-anim-duration: ${t.animDuration}ms;`,
      `  --ds-anim-easing: ${t.animEasing};`,
      `  --ds-transition: ${t.animDuration}ms ${t.animEasing};`,
      ``,
      `  /* ── Grid ── */`,
      `  --ds-container-width: ${t.containerWidth}px;`,
      `  --ds-sidebar-width: ${t.sidebarWidth}px;`,
      `  --ds-grid-gap: ${t.gridGap}px;`,
      ``,
      `  /* ── Borders ── */`,
      `  --ds-border-width: ${t.borderWidth}px;`,
      `  --ds-border-style: ${t.borderStyle};`,
      ``,
      `  /* ── Inputs ── */`,
      `  --input-bg: color-mix(in srgb, var(--glass-text) ${inputBgPct}%, transparent);`,
      `  --input-border-color: ${t.inputBorderOpacity > 0.005 ? `color-mix(in srgb, var(--glass-text) ${inputBorderPct}%, transparent)` : 'transparent'};`,
      `  --input-padding-h: ${t.inputPaddingH}px;`,
      `  --input-padding-v: ${t.inputPaddingV}px;`,
      `  --input-font-size: ${t.inputFontSize > 0 ? t.inputFontSize + 'rem' : 'var(--ds-text-sm)'};`,
      ``,
      `  /* ── Chips / Tags ── */`,
      `  --chip-bg: color-mix(in srgb, var(--glass-text) ${chipBgPct}%, transparent);`,
      `  --chip-border-color: ${t.chipBorderOpacity > 0.005 ? `color-mix(in srgb, var(--glass-text) ${chipBorderPct}%, transparent)` : 'transparent'};`,
      `  --chip-padding-h: ${t.chipPaddingH}px;`,
      `  --chip-padding-v: ${t.chipPaddingV}px;`,
      ``,
      `  /* ── Navigation ── */`,
      `  --nav-item-radius: ${t.navItemRadius}px;`,
      `  --nav-item-padding-h: ${t.navItemPaddingH}px;`,
      `  --nav-item-padding-v: ${t.navItemPaddingV}px;`,
      `  --ds-nav-panel-gap: ${t.navPanelGap}px;`,
      `  --ds-nav-list-gap: ${t.navListGap}px;`,
      `  --ds-nav-trans-duration: ${t.navTransitDuration}ms;`,
      `  --ds-nav-trans-distance: ${t.navTransitDistance}px;`,
      `  --ds-nav-item-stagger: ${t.navItemStagger}ms;`,
      ``,
      `  /* ── Status pills ── */`,
      `  --status-pill-radius: ${t.statusPillRadius}px;`,
      ``,
      `  /* ── Popups ── */`,
      `  --modal-overlay-opacity: ${t.modalOverlayOpacity};`,
      `  --dropdown-blur: ${t.dropdownBlur}px;`,
      ``,
      `  /* ── Scrollbar ── */`,
      `  --scrollbar-width: ${t.scrollbarWidth}px;`,
      `  --scrollbar-thumb: color-mix(in srgb, var(--glass-text) ${Math.round(t.scrollbarOpacity * 100)}%, transparent);`,
      ``,
      `  /* ── Tables ── */`,
      `  --table-header-bg: color-mix(in srgb, var(--glass-text) ${thPct}%, transparent);`,
      `  --table-row-hover-bg: color-mix(in srgb, var(--glass-text) ${trPct}%, transparent);`,
      `  --table-border-color: color-mix(in srgb, var(--glass-text) ${tbPct}%, transparent);`,
      ``,
      `  /* ── Badges ── */`,
      `  --badge-bg: color-mix(in srgb, var(--ds-accent) ${bdgPct}%, transparent);`,
      `  --badge-radius: ${t.badgeRadius}px;`,
      ``,
      `  /* ── Accessibility / Focus Ring ── */`,
      `  --ds-focus-ring-width: ${t.focusRingWidth}px;`,
      `  --ds-focus-ring-offset: ${t.focusRingOffset}px;`,
      `  --ds-focus-ring-style: ${t.focusRingStyle};`,
      `  --ds-focus-ring-opacity: ${t.focusRingOpacity};`,
      `  --ds-focus-ring-color: hsla(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%, ${t.focusRingOpacity});`,
      `  --ds-focus-ring: ${t.focusRingWidth}px ${t.focusRingStyle} hsla(${t.accentHue}, ${t.accentSaturation}%, ${t.accentLightness}%, ${t.focusRingOpacity});`,
      `}`,
    ]
    return lines.join('\n')
  }

  /* ── Concept slug helper ────────────────────────────────── */
  function _syncConceptAttr() {
    if (import.meta.server) return
    const el = document.documentElement
    const slug = normalizeDesignConceptSlug(activeConceptSlug.value)
    const designMode = resolveDesignModeFromConceptSlug(slug)
    if (slug) {
      el.setAttribute('data-concept', slug)
    } else {
      el.removeAttribute('data-concept')
    }

    if (designMode) {
      el.setAttribute(DESIGN_MODE_DATA_ATTRIBUTE, designMode)
    } else {
      el.removeAttribute(DESIGN_MODE_DATA_ATTRIBUTE)
    }
  }

  /* ── Init ──────────────────────────────────────────────── */
  function initDesignSystem() {
    load()
    _syncConceptAttr()
    applyToDOM()
    isHydrated.value = true
  }

  /* ── Preview mode (try preset without committing) ──── */
  const snapshotBeforePreview = useState<{ tokens: DesignTokens; conceptSlug: string } | null>('dsSnapshot', () => null)
  const isPreviewActive = computed(() => snapshotBeforePreview.value !== null)

  function previewPreset(preset: DesignPreset) {
    if (!snapshotBeforePreview.value) {
      snapshotBeforePreview.value = {
        tokens: { ...tokens.value },
        conceptSlug: activeConceptSlug.value,
      }
    }
    // Track active concept slug for CSS selectors
    activeConceptSlug.value = resolvePresetConceptSlug(preset.id, snapshotBeforePreview.value?.conceptSlug || activeConceptSlug.value)
    _syncConceptAttr()
    // Always start from DEFAULT_TOKENS so no residue leaks between presets
    tokens.value = { ...DEFAULT_TOKENS, ...preset.tokens }
    applyToDOM()
  }

  function confirmPreview() {
    if (snapshotBeforePreview.value) {
      pushHistory()
      // tokens already have the preview state — just persist
      // We pushed history with the snapshot so undo goes back correctly
      history.value[history.value.length - 1] = { ...snapshotBeforePreview.value.tokens }
      snapshotBeforePreview.value = null
      save()
    }
  }

  function cancelPreview() {
    if (snapshotBeforePreview.value) {
      tokens.value = { ...snapshotBeforePreview.value.tokens }
      activeConceptSlug.value = snapshotBeforePreview.value.conceptSlug || DEFAULT_DESIGN_CONCEPT
      snapshotBeforePreview.value = null
      _syncConceptAttr()
      applyToDOM()
    }
  }

  /* ── Batch setter — one undo step for multiple token changes ── */
  function batchSet(overrides: Partial<DesignTokens>) {
    pushHistory()
    Object.assign(tokens.value, overrides)
    applyToDOM()
    save()
  }

  /* ══════════════════════════════════════════════════════
     CUSTOM PRESETS — user-saved favorites
     ══════════════════════════════════════════════════════ */
  const CUSTOM_LS_KEY = 'design-custom-presets'

  interface CustomPreset {
    id: string
    name: string
    icon: string
    createdAt: number
    tokens: Partial<DesignTokens>
  }

  const customPresets = useState<CustomPreset[]>('dsCustomPresets', () => [])

  function loadCustomPresets() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(CUSTOM_LS_KEY)
      if (raw) customPresets.value = JSON.parse(raw)
    } catch { /* corrupt data */ }
  }

  function saveCustomPresetsToLS() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify(customPresets.value))
    } catch { /* */ }
  }

  function saveCustomPreset(name: string, icon: string = '⭐') {
    const id = 'custom_' + Date.now()
    const preset: CustomPreset = {
      id,
      name,
      icon,
      createdAt: Date.now(),
      tokens: { ...tokens.value },
    }
    customPresets.value = [...customPresets.value, preset]
    saveCustomPresetsToLS()
    return preset
  }

  function deleteCustomPreset(id: string) {
    customPresets.value = customPresets.value.filter(p => p.id !== id)
    saveCustomPresetsToLS()
  }

  function renameCustomPreset(id: string, newName: string) {
    const p = customPresets.value.find(cp => cp.id === id)
    if (p) {
      p.name = newName
      customPresets.value = [...customPresets.value]
      saveCustomPresetsToLS()
    }
  }

  return {
    tokens, set, batchSet, reset, applyPreset,
    undo, redo, canUndo, canRedo,
    exportJSON, importJSON, exportCSS,
    initDesignSystem, applyToDOM, save, load,
    activeConceptSlug, currentDesignMode, isHydrated,
    previewPreset, confirmPreview, cancelPreview, isPreviewActive,
    customPresets, loadCustomPresets, saveCustomPreset, deleteCustomPreset, renameCustomPreset,
  }
}
