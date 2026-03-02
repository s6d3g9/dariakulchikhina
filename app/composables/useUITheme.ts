import type { DesignTokens } from './useDesignSystem'

/* ═══════════════════════════════════════════════════════════
   UI Themes — complete definitions with light & dark CSS vars,
   plus design-token overrides (btnRadius, btnTransform, etc.)
   applied via JS inline styles to avoid CSS specificity issues.
   ═══════════════════════════════════════════════════════════ */

export interface UITheme {
  id: string
  label: string
  swatch: string       // picker dot colour – light
  swatchDark: string   // picker dot colour – dark
  btnPreview: string   // short description in picker
  /** CSS custom-property overrides for light mode */
  vars: Record<string, string>
  /** CSS custom-property overrides for dark mode */
  darkVars: Record<string, string>
  /** Design-system token overrides pushed when theme is picked */
  tokens: Partial<DesignTokens>
}

export const UI_THEMES: UITheme[] = [
  /* ── 1. Cloud — clean cool grey ── */
  {
    id: 'cloud', label: 'Cloud', swatch: '#f4f4f2', swatchDark: '#1a1c22', btnPreview: 'серый',
    vars: {
      '--glass-page-bg': '#f4f4f2',
      '--glass-bg':      'rgba(255, 255, 255, 0.52)',
      '--glass-border':  'rgba(0, 0, 0, 0.07)',
      '--glass-shadow':  '0 8px 24px rgba(0, 0, 0, 0.06)',
      '--glass-text':    '#2c2c2a',
      '--btn-bg-base':   'rgba(0, 0, 0, 0.07)',
      '--btn-color':     '#2c2c2a',
      '--btn-border-base': 'rgba(0, 0, 0, 0.15)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(0, 0, 0, 0.11)',
    },
    darkVars: {
      '--glass-page-bg': '#0d0e11',
      '--glass-bg':      'rgba(18, 20, 26, 0.92)',
      '--glass-border':  'rgba(255, 255, 255, 0.10)',
      '--glass-shadow':  '0 8px 28px rgba(0, 0, 0, 0.50)',
      '--glass-text':    '#e8e8e6',
      '--btn-bg-base':   'rgba(255, 255, 255, 0.07)',
      '--btn-color':     '#e8e8e6',
      '--btn-border-base': 'rgba(255, 255, 255, 0.14)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(255, 255, 255, 0.10)',
    },
    tokens: { btnRadius: 3, btnTransform: 'none', letterSpacing: 0.03 },
  },

  /* ── 2. Linen — warm ivory ── */
  {
    id: 'linen', label: 'Linen', swatch: '#ede8de', swatchDark: '#231e16', btnPreview: 'кремовый',
    vars: {
      '--glass-page-bg': '#ede8de',
      '--glass-bg':      'rgba(253, 248, 238, 0.60)',
      '--glass-border':  'rgba(100, 78, 42, 0.12)',
      '--glass-shadow':  '0 8px 24px rgba(80, 58, 22, 0.07)',
      '--glass-text':    '#3e3228',
      '--btn-bg-base':   'rgba(100, 78, 42, 0.09)',
      '--btn-color':     '#3e3228',
      '--btn-border-base': 'rgba(100, 78, 42, 0.22)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(100, 78, 42, 0.14)',
    },
    darkVars: {
      '--glass-page-bg': '#120f0a',
      '--glass-bg':      'rgba(26, 22, 16, 0.92)',
      '--glass-border':  'rgba(200, 170, 120, 0.12)',
      '--glass-shadow':  '0 8px 28px rgba(0, 0, 0, 0.48)',
      '--glass-text':    '#e8e0d2',
      '--btn-bg-base':   'rgba(200, 170, 120, 0.09)',
      '--btn-color':     '#e8e0d2',
      '--btn-border-base': 'rgba(200, 170, 120, 0.20)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(200, 170, 120, 0.12)',
    },
    tokens: { btnRadius: 4, btnTransform: 'none', letterSpacing: 0.03 },
  },

  /* ── 3. Stone — greige, sharp, uppercase ── */
  {
    id: 'stone', label: 'Stone', swatch: '#e8e5e0', swatchDark: '#1e1c18', btnPreview: 'GREIGE',
    vars: {
      '--glass-page-bg': '#e8e5e0',
      '--glass-bg':      'rgba(242, 239, 233, 0.60)',
      '--glass-border':  'rgba(68, 63, 54, 0.10)',
      '--glass-shadow':  '0 6px 20px rgba(50, 45, 36, 0.07)',
      '--glass-text':    '#38342e',
      '--btn-bg-base':   'rgba(68, 63, 54, 0.09)',
      '--btn-color':     '#38342e',
      '--btn-border-base': 'rgba(68, 63, 54, 0.20)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(68, 63, 54, 0.14)',
    },
    darkVars: {
      '--glass-page-bg': '#100f0d',
      '--glass-bg':      'rgba(24, 22, 18, 0.92)',
      '--glass-border':  'rgba(180, 170, 150, 0.10)',
      '--glass-shadow':  '0 6px 22px rgba(0, 0, 0, 0.48)',
      '--glass-text':    '#dedad4',
      '--btn-bg-base':   'rgba(180, 170, 150, 0.09)',
      '--btn-color':     '#dedad4',
      '--btn-border-base': 'rgba(180, 170, 150, 0.18)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(180, 170, 150, 0.12)',
    },
    tokens: { btnRadius: 1, btnTransform: 'uppercase', letterSpacing: 0.08 },
  },

  /* ── 4. Fog — cool grey-blue, pill buttons ── */
  {
    id: 'fog', label: 'Fog', swatch: '#eeeef0', swatchDark: '#181a26', btnPreview: 'rounded',
    vars: {
      '--glass-page-bg': '#eeeef0',
      '--glass-bg':      'rgba(248, 248, 252, 0.56)',
      '--glass-border':  'rgba(38, 42, 58, 0.08)',
      '--glass-shadow':  '0 6px 20px rgba(28, 32, 48, 0.07)',
      '--glass-text':    '#343540',
      '--btn-bg-base':   'rgba(38, 42, 58, 0.07)',
      '--btn-color':     '#343540',
      '--btn-border-base': 'rgba(38, 42, 58, 0.13)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(38, 42, 58, 0.10)',
    },
    darkVars: {
      '--glass-page-bg': '#0c0c14',
      '--glass-bg':      'rgba(16, 16, 28, 0.92)',
      '--glass-border':  'rgba(160, 165, 200, 0.10)',
      '--glass-shadow':  '0 6px 22px rgba(0, 0, 0, 0.48)',
      '--glass-text':    '#e0e0e8',
      '--btn-bg-base':   'rgba(160, 165, 200, 0.07)',
      '--btn-color':     '#e0e0e8',
      '--btn-border-base': 'rgba(160, 165, 200, 0.13)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(160, 165, 200, 0.10)',
    },
    tokens: { btnRadius: 999, btnTransform: 'none', letterSpacing: 0.02 },
  },

  /* ── 5. Parchment — warm ivory, outline only ── */
  {
    id: 'parchment', label: 'Parchment', swatch: '#f2ece1', swatchDark: '#201a10', btnPreview: 'OUTLINE',
    vars: {
      '--glass-page-bg': '#f2ece1',
      '--glass-bg':      'rgba(255, 251, 242, 0.56)',
      '--glass-border':  'rgba(108, 84, 50, 0.13)',
      '--glass-shadow':  '0 6px 20px rgba(80, 58, 28, 0.07)',
      '--glass-text':    '#453a2c',
      '--btn-bg-base':   'transparent',
      '--btn-color':     '#453a2c',
      '--btn-border-base': 'rgba(108, 84, 50, 0.32)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(108, 84, 50, 0.20)',
    },
    darkVars: {
      '--glass-page-bg': '#0f0c06',
      '--glass-bg':      'rgba(20, 18, 10, 0.92)',
      '--glass-border':  'rgba(200, 170, 100, 0.13)',
      '--glass-shadow':  '0 6px 22px rgba(0, 0, 0, 0.48)',
      '--glass-text':    '#e5ddd0',
      '--btn-bg-base':   'transparent',
      '--btn-color':     '#e5ddd0',
      '--btn-border-base': 'rgba(200, 170, 100, 0.28)',
      '--btn-sm-bg':     'transparent',
      '--btn-sm-border': 'rgba(200, 170, 100, 0.18)',
    },
    tokens: { btnRadius: 0, btnTransform: 'uppercase', letterSpacing: 0.09 },
  },
]

const LS_KEY = 'ui-theme'

export function useUITheme() {
  const themeId = useState<string>('uiTheme', () => 'cloud')

  /**
   * Apply the theme's CSS custom-property set as inline styles on <html>.
   * Uses dark or light vars depending on current color-mode.
   */
  function applyThemeVars(id?: string) {
    if (!import.meta.client) return
    const theme = UI_THEMES.find(t => t.id === (id ?? themeId.value))
    if (!theme) return
    const isDark = document.documentElement.classList.contains('dark')
    const vars = isDark ? theme.darkVars : theme.vars
    const el = document.documentElement
    for (const [k, v] of Object.entries(vars)) {
      el.style.setProperty(k, v)
    }
  }

  /**
   * Set and persist the active UI theme.
   * Only applies CSS colour variables — does NOT push structural tokens.
   * Called on init and when dark mode toggles.
   */
  function applyTheme(id: string) {
    themeId.value = id
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', id)
    localStorage.setItem(LS_KEY, id)
    applyThemeVars(id)
  }

  /**
   * Set theme AND push its structural tokens into the design system
   * (btnRadius, btnTransform, letterSpacing). Called when user
   * actively picks a theme in the palette UI.
   */
  function applyThemeWithTokens(id: string) {
    const theme = UI_THEMES.find(t => t.id === id)
    // Apply CSS vars first (so --btn-bg-base etc. are available for applyToDOM)
    applyTheme(id)
    // Then push structural tokens into the design system
    if (theme?.tokens) {
      try {
        const { batchSet } = useDesignSystem()
        batchSet(theme.tokens)
      } catch { /* composable not yet ready */ }
    }
  }

  /** Re-apply current theme's CSS vars (after dark-mode toggle or applyToDOM). */
  function refreshThemeVars() {
    applyThemeVars()
  }

  function initTheme() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(LS_KEY) || 'cloud'
    applyTheme(saved)
  }

  return { themeId, applyTheme, applyThemeWithTokens, refreshThemeVars, initTheme, UI_THEMES }
}
