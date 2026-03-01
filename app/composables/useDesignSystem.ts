/**
 * useDesignSystem — centralized design‑token manager.
 *
 * Manages all customizable visual tokens (radius, font, spacing, glass,
 * button style, etc.) and persists them in localStorage.
 * Theme presets from useUITheme set the *color* baseline;
 * this composable controls *everything else*.
 */

/* ── Token shape ────────────────────────────────────────── */
export interface DesignTokens {
  /* buttons */
  btnRadius: number          // px  0‥32
  btnSize: 'xs' | 'sm' | 'md' | 'lg'
  btnStyle: 'filled' | 'outline' | 'ghost' | 'soft'
  btnTransform: 'none' | 'uppercase' | 'capitalize'

  /* typography */
  fontFamily: string         // CSS font‑family string
  fontSize: number           // rem multiplier, 0.7‥1.3
  fontWeight: number         // 300‥700
  letterSpacing: number      // em  0‥0.15
  lineHeight: number         // 1.2‥2.0

  /* glass / surface */
  glassBlur: number          // px  0‥32
  glassOpacity: number       // 0‥1   (bg alpha)
  glassBorderOpacity: number // 0‥1
  glassShadowIntensity: number // 0‥1

  /* spacing */
  spacingScale: number       // multiplier  0.6‥1.6

  /* misc */
  cardRadius: number         // px 0‥28
  inputRadius: number        // px 0‥16
}

/* ── Defaults ───────────────────────────────────────────── */
export const DEFAULT_TOKENS: DesignTokens = {
  btnRadius: 3,
  btnSize: 'md',
  btnStyle: 'filled',
  btnTransform: 'none',

  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 1,
  fontWeight: 400,
  letterSpacing: 0.03,
  lineHeight: 1.5,

  glassBlur: 18,
  glassOpacity: 0.48,
  glassBorderOpacity: 0.07,
  glassShadowIntensity: 0.06,

  spacingScale: 1,

  cardRadius: 14,
  inputRadius: 6,
}

/* ── Font catalogue ─────────────────────────────────────── */
export const FONT_OPTIONS = [
  { id: 'system',    label: 'System',         value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'inter',     label: 'Inter',          value: '"Inter", sans-serif' },
  { id: 'geist',     label: 'Geist',          value: '"Geist", sans-serif' },
  { id: 'dmSans',    label: 'DM Sans',        value: '"DM Sans", sans-serif' },
  { id: 'manrope',   label: 'Manrope',        value: '"Manrope", sans-serif' },
  { id: 'jetbrains', label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { id: 'georgia',   label: 'Georgia',        value: 'Georgia, "Times New Roman", serif' },
] as const

/* ── Button size map ────────────────────────────────────── */
export const BTN_SIZE_MAP = {
  xs: { py: 4, px: 10, fontSize: 0.7 },
  sm: { py: 6, px: 14, fontSize: 0.76 },
  md: { py: 9, px: 22, fontSize: 0.8 },
  lg: { py: 12, px: 28, fontSize: 0.88 },
} as const

const LS_KEY = 'design-tokens'

export function useDesignSystem() {
  const tokens = useState<DesignTokens>('designTokens', () => ({ ...DEFAULT_TOKENS }))

  /* ── Persist / restore ─────────────────────────────────── */
  function save() {
    if (!import.meta.client) return
    localStorage.setItem(LS_KEY, JSON.stringify(tokens.value))
  }

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DesignTokens>
        tokens.value = { ...DEFAULT_TOKENS, ...parsed }
      }
    } catch { /* ignore corrupt data */ }
  }

  function reset() {
    tokens.value = { ...DEFAULT_TOKENS }
    save()
    applyToDOM()
  }

  /* ── Apply tokens to CSS custom properties on <html> ──── */
  function applyToDOM() {
    if (!import.meta.client) return
    const el = document.documentElement
    const t = tokens.value
    const sz = BTN_SIZE_MAP[t.btnSize]

    // Buttons
    el.style.setProperty('--btn-radius', `${t.btnRadius}px`)
    el.style.setProperty('--btn-py', `${sz.py}px`)
    el.style.setProperty('--btn-px', `${sz.px}px`)
    el.style.setProperty('--btn-font-size', `${sz.fontSize}rem`)
    el.style.setProperty('--btn-transform', t.btnTransform)
    el.style.setProperty('--btn-tracking', `${t.letterSpacing}em`)

    // Btn style tokens
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

    // Typography
    el.style.setProperty('--ds-font-family', t.fontFamily)
    el.style.setProperty('--ds-font-size', `${t.fontSize}rem`)
    el.style.setProperty('--ds-font-weight', String(t.fontWeight))
    el.style.setProperty('--ds-letter-spacing', `${t.letterSpacing}em`)
    el.style.setProperty('--ds-line-height', String(t.lineHeight))

    // Glass surface
    el.style.setProperty('--glass-blur', `${t.glassBlur}px`)
    el.style.setProperty('--glass-bg-alpha', String(t.glassOpacity))
    el.style.setProperty('--glass-border-alpha', String(t.glassBorderOpacity))
    el.style.setProperty('--glass-shadow-alpha', String(t.glassShadowIntensity))

    // Spacing
    el.style.setProperty('--ds-spacing', String(t.spacingScale))

    // Radii
    el.style.setProperty('--card-radius', `${t.cardRadius}px`)
    el.style.setProperty('--input-radius', `${t.inputRadius}px`)
  }

  /* ── Patch helper (set one key and re-apply) ───────────── */
  function set<K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) {
    tokens.value[key] = value
    applyToDOM()
    save()
  }

  /* ── Init (call once on mount) ─────────────────────────── */
  function initDesignSystem() {
    load()
    applyToDOM()
  }

  return { tokens, set, reset, initDesignSystem, applyToDOM, save, load }
}
