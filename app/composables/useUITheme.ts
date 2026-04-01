import type { DesignTokens } from './useDesignSystem'
import {
  CONCEPT_TO_DESIGN_MODE,
  DEFAULT_DESIGN_MODE,
  getUiThemeStorageKey,
  normalizeDesignConceptSlug,
  UI_THEME_STORAGE_KEY,
} from '~~/shared/constants/design-modes'
import type { DesignConceptSlug, DesignMode } from '~~/shared/types/design-mode'

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

interface Material3Palette {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  secondaryContainer: string
  tertiary: string
  tertiaryContainer: string
  surface: string
  surfaceDim: string
  surfaceLowest: string
  surfaceLow: string
  surfaceContainer: string
  surfaceHigh: string
  surfaceHighest: string
  onSurface: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  shadow: string
}

interface BrutalPalette {
  pageBg: string
  surface: string
  border: string
  text: string
  buttonBg: string
  buttonText: string
  accent: string
  muted: string
  shadow: string
}

const M3_BASE_TOKENS: Partial<DesignTokens> = {
  btnRadius: 20,
  btnSize: 'md',
  btnStyle: 'filled',
  btnTransform: 'none',
  btnWeight: 500,
  headingWeight: 600,
  letterSpacing: 0.01,
  lineHeight: 1.5,
  typeScale: 1.18,
  glassBlur: 0,
  glassOpacity: 1,
  glassBorderOpacity: 0.1,
  glassSaturation: 100,
  shadowOffsetY: 2,
  shadowBlurRadius: 10,
  shadowSpread: 0,
  shadowOpacity: 0.08,
  spacingBase: 8,
  gridGap: 20,
  borderWidth: 1,
  borderStyle: 'solid',
  cardRadius: 28,
  inputRadius: 18,
  chipRadius: 12,
  modalRadius: 28,
  animDuration: 180,
  animEasing: 'cubic-bezier(0.2, 0, 0, 1)',
  inputBgOpacity: 0.04,
  inputBorderOpacity: 0.12,
  inputPaddingH: 14,
  inputPaddingV: 10,
  chipBgOpacity: 0.1,
  chipBorderOpacity: 0.08,
  chipPaddingH: 10,
  chipPaddingV: 4,
  navItemRadius: 18,
  navItemPaddingH: 14,
  navItemPaddingV: 10,
  navLayoutPreset: 'balanced',
  statusBgOpacity: 0.18,
  statusPillRadius: 999,
  modalOverlayOpacity: 0.4,
  dropdownBlur: 0,
  scrollbarWidth: 8,
  scrollbarOpacity: 0.16,
  tableHeaderOpacity: 0.06,
  tableRowHoverOpacity: 0.04,
  tableBorderOpacity: 0.1,
  badgeBgOpacity: 0.18,
  badgeRadius: 999,
  focusRingWidth: 2,
  focusRingOffset: 2,
  focusRingStyle: 'solid',
  focusRingOpacity: 0.55,
  btnHoverAnim: 'none',
  cardHoverAnim: 'lift',
  archDensity: 'normal',
  archHeadingTracking: 0,
  archHeadingCase: 'none',
  archDivider: 'none',
  archPageEnter: 'fade',
  archLinkAnim: 'underline',
  archSectionStyle: 'card',
  archCardChrome: 'subtle',
  archHeroScale: 'normal',
  archVerticalRhythm: 1,
}

const BRUTAL_BASE_TOKENS: Partial<DesignTokens> = {
  btnRadius: 0,
  btnSize: 'md',
  btnStyle: 'outline',
  btnTransform: 'uppercase',
  btnWeight: 700,
  headingWeight: 800,
  letterSpacing: 0.08,
  lineHeight: 1.35,
  typeScale: 1.25,
  glassBlur: 0,
  glassOpacity: 1,
  glassBorderOpacity: 0.18,
  glassSaturation: 100,
  shadowOffsetY: 6,
  shadowBlurRadius: 0,
  shadowSpread: 0,
  shadowOpacity: 0.16,
  spacingBase: 6,
  gridGap: 14,
  borderWidth: 2,
  borderStyle: 'solid',
  cardRadius: 0,
  inputRadius: 0,
  chipRadius: 0,
  modalRadius: 0,
  animDuration: 90,
  animEasing: 'linear',
  inputBgOpacity: 0,
  inputBorderOpacity: 0.24,
  inputPaddingH: 12,
  inputPaddingV: 10,
  chipBgOpacity: 0,
  chipBorderOpacity: 0.2,
  chipPaddingH: 8,
  chipPaddingV: 4,
  navItemRadius: 0,
  navItemPaddingH: 12,
  navItemPaddingV: 8,
  navLayoutPreset: 'compact',
  statusBgOpacity: 0.14,
  statusPillRadius: 0,
  modalOverlayOpacity: 0.62,
  dropdownBlur: 0,
  scrollbarWidth: 10,
  scrollbarOpacity: 0.2,
  tableHeaderOpacity: 0.08,
  tableRowHoverOpacity: 0.04,
  tableBorderOpacity: 0.18,
  badgeBgOpacity: 0.18,
  badgeRadius: 0,
  focusRingWidth: 2,
  focusRingOffset: 1,
  focusRingStyle: 'solid',
  focusRingOpacity: 0.72,
  btnHoverAnim: 'fill',
  cardHoverAnim: 'border',
  archDensity: 'dense',
  archHeadingTracking: 16,
  archHeadingCase: 'uppercase',
  archDivider: 'line',
  archPageEnter: 'none',
  archLinkAnim: 'underline',
  archSectionStyle: 'flat',
  archCardChrome: 'visible',
  archHeroScale: 'large',
  archVerticalRhythm: 0.9,
}

function createM3Theme(input: {
  id: string
  label: string
  swatch: string
  swatchDark: string
  btnPreview: string
  light: Material3Palette
  dark: Material3Palette
  tokens: Partial<DesignTokens>
}): UITheme {
  const buildVars = (palette: Material3Palette): Record<string, string> => ({
    '--glass-page-bg': palette.surface,
    '--glass-bg': palette.surfaceContainer,
    '--glass-border': palette.outlineVariant,
    '--glass-shadow': palette.shadow,
    '--glass-text': palette.onSurface,
    '--btn-bg-base': palette.primary,
    '--btn-color': palette.onPrimary,
    '--btn-border-base': palette.primary,
    '--btn-sm-bg': palette.surfaceLow,
    '--btn-sm-border': palette.outline,
    '--ds-link-color': palette.primary,
    '--ds-heading-color': palette.onSurface,
    '--ds-muted': palette.onSurfaceVariant,
    '--ds-nav-bg': palette.surfaceLow,
    '--input-bg': palette.surfaceLowest,
    '--chip-bg': palette.primaryContainer,
    '--chip-border': palette.outlineVariant,
    '--scrollbar-thumb': `color-mix(in srgb, ${palette.onSurface} 18%, transparent)`,
    '--sys-color-primary': palette.primary,
    '--sys-color-on-primary': palette.onPrimary,
    '--sys-color-primary-container': palette.primaryContainer,
    '--sys-color-on-primary-container': palette.onPrimaryContainer,
    '--sys-color-secondary': palette.secondary,
    '--sys-color-secondary-container': palette.secondaryContainer,
    '--sys-color-tertiary': palette.tertiary,
    '--sys-color-tertiary-container': palette.tertiaryContainer,
    '--sys-color-surface': palette.surface,
    '--sys-color-surface-dim': palette.surfaceDim,
    '--sys-color-surface-container-lowest': palette.surfaceLowest,
    '--sys-color-surface-container-low': palette.surfaceLow,
    '--sys-color-surface-container': palette.surfaceContainer,
    '--sys-color-surface-container-high': palette.surfaceHigh,
    '--sys-color-surface-container-highest': palette.surfaceHighest,
    '--sys-color-on-surface': palette.onSurface,
    '--sys-color-on-surface-variant': palette.onSurfaceVariant,
    '--sys-color-outline': palette.outline,
    '--sys-color-outline-variant': palette.outlineVariant,
    '--m3-surface': palette.surface,
    '--m3-surface-container': palette.surfaceContainer,
    '--m3-surface-container-high': palette.surfaceHigh,
    '--m3-outline': palette.outline,
    '--m3-outline-variant': palette.outlineVariant,
  })

  return {
    id: input.id,
    label: input.label,
    swatch: input.swatch,
    swatchDark: input.swatchDark,
    btnPreview: input.btnPreview,
    vars: buildVars(input.light),
    darkVars: buildVars(input.dark),
    tokens: {
      ...M3_BASE_TOKENS,
      ...input.tokens,
    },
  }
}

function createBrutalTheme(input: {
  id: string
  label: string
  swatch: string
  swatchDark: string
  btnPreview: string
  light: BrutalPalette
  dark: BrutalPalette
  tokens: Partial<DesignTokens>
}): UITheme {
  const buildVars = (palette: BrutalPalette): Record<string, string> => ({
    '--glass-page-bg': palette.pageBg,
    '--glass-bg': palette.surface,
    '--glass-border': palette.border,
    '--glass-shadow': palette.shadow,
    '--glass-text': palette.text,
    '--btn-bg-base': palette.buttonBg,
    '--btn-color': palette.buttonText,
    '--btn-border-base': palette.border,
    '--btn-sm-bg': 'transparent',
    '--btn-sm-border': palette.border,
    '--ds-link-color': palette.accent,
    '--ds-heading-color': palette.text,
    '--ds-muted': palette.muted,
    '--ds-nav-bg': palette.surface,
    '--input-bg': palette.surface,
    '--chip-bg': `color-mix(in srgb, ${palette.text} 8%, ${palette.surface})`,
    '--scrollbar-thumb': `color-mix(in srgb, ${palette.text} 18%, transparent)`,
  })

  return {
    id: input.id,
    label: input.label,
    swatch: input.swatch,
    swatchDark: input.swatchDark,
    btnPreview: input.btnPreview,
    vars: buildVars(input.light),
    darkVars: buildVars(input.dark),
    tokens: {
      ...BRUTAL_BASE_TOKENS,
      ...input.tokens,
    },
  }
}

export const GLASS_THEMES: UITheme[] = [
  /* ── 1. Cloud — clean cool grey ── */
  {
    id: 'cloud', label: 'Облако', swatch: '#f4f4f2', swatchDark: '#1a1c22', btnPreview: 'серый',
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
    tokens: {
      btnRadius: 3, btnTransform: 'none', letterSpacing: 0.03,
      accentHue: 220, accentSaturation: 14, accentLightness: 50,
      successHue: 142, successSaturation: 71,
      errorHue: 0, errorSaturation: 72,
      warningHue: 38, warningSaturation: 92,
    },
  },

  /* ── 2. Linen — warm ivory ── */
  {
    id: 'linen', label: 'Лён', swatch: '#ede8de', swatchDark: '#231e16', btnPreview: 'кремовый',
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
    tokens: {
      btnRadius: 4, btnTransform: 'none', letterSpacing: 0.03,
      accentHue: 25, accentSaturation: 45, accentLightness: 48,
      successHue: 150, successSaturation: 55,
      errorHue: 8, errorSaturation: 60,
      warningHue: 35, warningSaturation: 80,
    },
  },

  /* ── 3. Stone — greige, sharp, uppercase ── */
  {
    id: 'stone', label: 'Камень', swatch: '#e8e5e0', swatchDark: '#1e1c18', btnPreview: 'грейдж',
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
    tokens: {
      btnRadius: 1, btnTransform: 'uppercase', letterSpacing: 0.08,
      accentHue: 75, accentSaturation: 20, accentLightness: 42,
      successHue: 140, successSaturation: 40,
      errorHue: 0, errorSaturation: 55,
      warningHue: 40, warningSaturation: 70,
    },
  },

  /* ── 4. Fog — cool grey-blue, pill buttons ── */
  {
    id: 'fog', label: 'Туман', swatch: '#eeeef0', swatchDark: '#181a26', btnPreview: 'скруглённый',
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
    tokens: {
      btnRadius: 999, btnTransform: 'none', letterSpacing: 0.02,
      accentHue: 245, accentSaturation: 45, accentLightness: 55,
      successHue: 160, successSaturation: 60,
      errorHue: 350, errorSaturation: 65,
      warningHue: 42, warningSaturation: 85,
    },
  },

  /* ── 5. Parchment — warm ivory, outline only ── */
  {
    id: 'parchment', label: 'Пергамент', swatch: '#f2ece1', swatchDark: '#201a10', btnPreview: 'контур',
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
    tokens: {
      btnRadius: 0, btnTransform: 'uppercase', letterSpacing: 0.09,
      accentHue: 32, accentSaturation: 55, accentLightness: 46,
      successHue: 145, successSaturation: 50,
      errorHue: 5, errorSaturation: 58,
      warningHue: 38, warningSaturation: 78,
    },
  },
]

const DEFAULT_THEME_ID = GLASS_THEMES[0]?.id || 'cloud'

export const M3_THEMES: UITheme[] = [
  createM3Theme({
    id: 'm3-ocean',
    label: 'Океан',
    swatch: '#d3e3fd',
    swatchDark: '#384b6b',
    btnPreview: 'холодный',
    light: {
      primary: '#0B57D0',
      onPrimary: '#FFFFFF',
      primaryContainer: '#D3E3FD',
      onPrimaryContainer: '#041E49',
      secondary: '#545F70',
      secondaryContainer: '#D7E3F8',
      tertiary: '#17677A',
      tertiaryContainer: '#BDEAF5',
      surface: '#F8F9FF',
      surfaceDim: '#DEE3F0',
      surfaceLowest: '#FFFFFF',
      surfaceLow: '#F1F4FB',
      surfaceContainer: '#EBEEF6',
      surfaceHigh: '#E3E8F1',
      surfaceHighest: '#DDE2EB',
      onSurface: '#1A1C1E',
      onSurfaceVariant: '#43474E',
      outline: '#74777F',
      outlineVariant: '#C3C7CF',
      shadow: '0 12px 32px rgba(11, 87, 208, 0.12)',
    },
    dark: {
      primary: '#A8C7FA',
      onPrimary: '#062E6F',
      primaryContainer: '#0842A0',
      onPrimaryContainer: '#D3E3FD',
      secondary: '#BCC7DC',
      secondaryContainer: '#3D4758',
      tertiary: '#8ED4E5',
      tertiaryContainer: '#004F60',
      surface: '#111318',
      surfaceDim: '#0D0F13',
      surfaceLowest: '#0A0C10',
      surfaceLow: '#181A1F',
      surfaceContainer: '#1E2025',
      surfaceHigh: '#26282D',
      surfaceHighest: '#2E3136',
      onSurface: '#E2E2E6',
      onSurfaceVariant: '#C3C6CF',
      outline: '#8D9199',
      outlineVariant: '#43474E',
      shadow: '0 18px 40px rgba(0, 0, 0, 0.36)',
    },
    tokens: {
      accentHue: 217,
      accentSaturation: 88,
      accentLightness: 44,
      successHue: 145,
      successSaturation: 54,
      errorHue: 4,
      errorSaturation: 72,
      warningHue: 42,
      warningSaturation: 90,
    },
  }),
  createM3Theme({
    id: 'm3-sage',
    label: 'Шалфей',
    swatch: '#c1f0ae',
    swatchDark: '#29501f',
    btnPreview: 'спокойный',
    light: {
      primary: '#406836',
      onPrimary: '#FFFFFF',
      primaryContainer: '#C1F0AE',
      onPrimaryContainer: '#0E2107',
      secondary: '#54634D',
      secondaryContainer: '#D6E8CB',
      tertiary: '#166D63',
      tertiaryContainer: '#B9F1E5',
      surface: '#F6FBF1',
      surfaceDim: '#DCE6D7',
      surfaceLowest: '#FFFFFF',
      surfaceLow: '#EEF5E9',
      surfaceContainer: '#E6EEE0',
      surfaceHigh: '#DEE7D8',
      surfaceHighest: '#D7E0D2',
      onSurface: '#181D17',
      onSurfaceVariant: '#40493E',
      outline: '#70796D',
      outlineVariant: '#C0C9BD',
      shadow: '0 12px 28px rgba(64, 104, 54, 0.12)',
    },
    dark: {
      primary: '#A6D393',
      onPrimary: '#12380B',
      primaryContainer: '#29501F',
      onPrimaryContainer: '#C1F0AE',
      secondary: '#B9CCB0',
      secondaryContainer: '#3D4B37',
      tertiary: '#70D3C1',
      tertiaryContainer: '#005247',
      surface: '#101511',
      surfaceDim: '#0C100D',
      surfaceLowest: '#090D0A',
      surfaceLow: '#171C18',
      surfaceContainer: '#1C221D',
      surfaceHigh: '#252B26',
      surfaceHighest: '#2F3530',
      onSurface: '#E0E4DD',
      onSurfaceVariant: '#C0C8BC',
      outline: '#8A9387',
      outlineVariant: '#40493E',
      shadow: '0 18px 40px rgba(0, 0, 0, 0.36)',
    },
    tokens: {
      btnStyle: 'soft',
      accentHue: 109,
      accentSaturation: 33,
      accentLightness: 36,
      successHue: 130,
      successSaturation: 42,
      errorHue: 6,
      errorSaturation: 58,
      warningHue: 52,
      warningSaturation: 72,
    },
  }),
  createM3Theme({
    id: 'm3-terracotta',
    label: 'Терракота',
    swatch: '#ffdbca',
    swatchDark: '#73350b',
    btnPreview: 'тёплый',
    light: {
      primary: '#8F4D22',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFDBCA',
      onPrimaryContainer: '#351000',
      secondary: '#735847',
      secondaryContainer: '#FFDBC8',
      tertiary: '#675D17',
      tertiaryContainer: '#F0E389',
      surface: '#FFF8F4',
      surfaceDim: '#E8DED9',
      surfaceLowest: '#FFFFFF',
      surfaceLow: '#FFF1EB',
      surfaceContainer: '#F7EAE4',
      surfaceHigh: '#F0E2DC',
      surfaceHighest: '#E9DBD5',
      onSurface: '#231914',
      onSurfaceVariant: '#51433A',
      outline: '#84736A',
      outlineVariant: '#D6C2B8',
      shadow: '0 12px 28px rgba(143, 77, 34, 0.12)',
    },
    dark: {
      primary: '#FFB68B',
      onPrimary: '#552000',
      primaryContainer: '#73350B',
      onPrimaryContainer: '#FFDBCA',
      secondary: '#E4C0AA',
      secondaryContainer: '#5A4132',
      tertiary: '#D4C76D',
      tertiaryContainer: '#4C4500',
      surface: '#171210',
      surfaceDim: '#110C0A',
      surfaceLowest: '#0D0807',
      surfaceLow: '#201A17',
      surfaceContainer: '#261F1C',
      surfaceHigh: '#302824',
      surfaceHighest: '#3A312D',
      onSurface: '#F0DFD8',
      onSurfaceVariant: '#D4C3BA',
      outline: '#9E8D84',
      outlineVariant: '#51433A',
      shadow: '0 18px 40px rgba(0, 0, 0, 0.4)',
    },
    tokens: {
      btnRadius: 18,
      accentHue: 21,
      accentSaturation: 72,
      accentLightness: 44,
      successHue: 145,
      successSaturation: 40,
      errorHue: 8,
      errorSaturation: 78,
      warningHue: 35,
      warningSaturation: 88,
    },
  }),
  createM3Theme({
    id: 'm3-slate',
    label: 'Сланец',
    swatch: '#d6e3ff',
    swatchDark: '#264777',
    btnPreview: 'строгий',
    light: {
      primary: '#415F91',
      onPrimary: '#FFFFFF',
      primaryContainer: '#D6E3FF',
      onPrimaryContainer: '#001B3D',
      secondary: '#56606F',
      secondaryContainer: '#D9E2F3',
      tertiary: '#2F6C74',
      tertiaryContainer: '#BCEBF3',
      surface: '#F8F9FD',
      surfaceDim: '#E1E3EA',
      surfaceLowest: '#FFFFFF',
      surfaceLow: '#F0F2F8',
      surfaceContainer: '#E9ECF3',
      surfaceHigh: '#E2E6EE',
      surfaceHighest: '#DCE0E8',
      onSurface: '#1B1B21',
      onSurfaceVariant: '#44474E',
      outline: '#74777F',
      outlineVariant: '#C4C6D0',
      shadow: '0 12px 28px rgba(65, 95, 145, 0.12)',
    },
    dark: {
      primary: '#AAC7FF',
      onPrimary: '#0A305F',
      primaryContainer: '#264777',
      onPrimaryContainer: '#D6E3FF',
      secondary: '#BDC7D7',
      secondaryContainer: '#3E4857',
      tertiary: '#88D0DB',
      tertiaryContainer: '#005059',
      surface: '#101217',
      surfaceDim: '#0C0E13',
      surfaceLowest: '#090B10',
      surfaceLow: '#171A1F',
      surfaceContainer: '#1D2025',
      surfaceHigh: '#25282E',
      surfaceHighest: '#2E3137',
      onSurface: '#E3E2E9',
      onSurfaceVariant: '#C4C6D0',
      outline: '#8E9199',
      outlineVariant: '#44474E',
      shadow: '0 18px 40px rgba(0, 0, 0, 0.36)',
    },
    tokens: {
      btnStyle: 'outline',
      cardRadius: 24,
      accentHue: 217,
      accentSaturation: 40,
      accentLightness: 42,
      successHue: 156,
      successSaturation: 35,
      errorHue: 0,
      errorSaturation: 58,
      warningHue: 44,
      warningSaturation: 78,
    },
  }),
]

export const BRUTAL_THEMES: UITheme[] = [
  createBrutalTheme({
    id: 'brutal-mono',
    label: 'Моно',
    swatch: '#f5f3ee',
    swatchDark: '#080808',
    btnPreview: 'чёрно-белый',
    light: {
      pageBg: '#F5F3EE',
      surface: '#FFFFFF',
      border: '#111111',
      text: '#111111',
      buttonBg: '#111111',
      buttonText: '#F5F3EE',
      accent: '#111111',
      muted: '#676767',
      shadow: '6px 6px 0 rgba(17, 17, 17, 0.12)',
    },
    dark: {
      pageBg: '#080808',
      surface: '#111111',
      border: '#F1F1EC',
      text: '#F1F1EC',
      buttonBg: '#F1F1EC',
      buttonText: '#080808',
      accent: '#F1F1EC',
      muted: '#A4A4A1',
      shadow: '6px 6px 0 rgba(241, 241, 236, 0.1)',
    },
    tokens: {
      accentHue: 0,
      accentSaturation: 0,
      accentLightness: 8,
      successHue: 142,
      successSaturation: 28,
      errorHue: 0,
      errorSaturation: 0,
      warningHue: 0,
      warningSaturation: 0,
    },
  }),
  createBrutalTheme({
    id: 'brutal-signal',
    label: 'Сигнал',
    swatch: '#f5ed48',
    swatchDark: '#141414',
    btnPreview: 'жёлтый',
    light: {
      pageBg: '#F5ED48',
      surface: '#FFFAD1',
      border: '#111111',
      text: '#111111',
      buttonBg: '#111111',
      buttonText: '#FFF36A',
      accent: '#111111',
      muted: '#5A561D',
      shadow: '8px 8px 0 rgba(17, 17, 17, 0.16)',
    },
    dark: {
      pageBg: '#090909',
      surface: '#141414',
      border: '#FFF36A',
      text: '#FFF7AD',
      buttonBg: '#FFF36A',
      buttonText: '#090909',
      accent: '#FFF36A',
      muted: '#D6CC5E',
      shadow: '8px 8px 0 rgba(255, 243, 106, 0.16)',
    },
    tokens: {
      btnStyle: 'filled',
      btnWeight: 800,
      shadowOffsetY: 8,
      accentHue: 57,
      accentSaturation: 92,
      accentLightness: 56,
      successHue: 109,
      successSaturation: 62,
      errorHue: 4,
      errorSaturation: 88,
      warningHue: 50,
      warningSaturation: 100,
    },
  }),
  createBrutalTheme({
    id: 'brutal-poster',
    label: 'Афиша',
    swatch: '#f7efe7',
    swatchDark: '#211210',
    btnPreview: 'плакатный',
    light: {
      pageBg: '#F7EFE7',
      surface: '#FFF8F0',
      border: '#1A1A1A',
      text: '#1A1A1A',
      buttonBg: '#C53A23',
      buttonText: '#FFF8F0',
      accent: '#C53A23',
      muted: '#76695F',
      shadow: '8px 8px 0 rgba(197, 58, 35, 0.14)',
    },
    dark: {
      pageBg: '#140C0A',
      surface: '#211210',
      border: '#F06752',
      text: '#F7E7DE',
      buttonBg: '#F06752',
      buttonText: '#140C0A',
      accent: '#F06752',
      muted: '#C79A8D',
      shadow: '8px 8px 0 rgba(240, 103, 82, 0.18)',
    },
    tokens: {
      btnStyle: 'filled',
      btnWeight: 800,
      shadowOffsetY: 8,
      accentHue: 10,
      accentSaturation: 76,
      accentLightness: 46,
      successHue: 128,
      successSaturation: 38,
      errorHue: 8,
      errorSaturation: 80,
      warningHue: 35,
      warningSaturation: 88,
    },
  }),
  createBrutalTheme({
    id: 'brutal-cobalt',
    label: 'Кобальт',
    swatch: '#e8eeff',
    swatchDark: '#101a3e',
    btnPreview: 'синий',
    light: {
      pageBg: '#E8EEFF',
      surface: '#FFFFFF',
      border: '#0D1F5C',
      text: '#0D1F5C',
      buttonBg: '#174AE6',
      buttonText: '#FFFFFF',
      accent: '#174AE6',
      muted: '#5B689A',
      shadow: '8px 8px 0 rgba(23, 74, 230, 0.14)',
    },
    dark: {
      pageBg: '#091026',
      surface: '#101A3E',
      border: '#8CB2FF',
      text: '#E3ECFF',
      buttonBg: '#8CB2FF',
      buttonText: '#091026',
      accent: '#8CB2FF',
      muted: '#B1C3EE',
      shadow: '8px 8px 0 rgba(140, 178, 255, 0.18)',
    },
    tokens: {
      btnStyle: 'filled',
      btnWeight: 800,
      shadowOffsetY: 8,
      accentHue: 222,
      accentSaturation: 84,
      accentLightness: 52,
      successHue: 162,
      successSaturation: 38,
      errorHue: 8,
      errorSaturation: 72,
      warningHue: 40,
      warningSaturation: 86,
    },
  }),
]

export const UI_THEMES = [...GLASS_THEMES, ...M3_THEMES, ...BRUTAL_THEMES];

const THEME_VAR_KEYS = Array.from(
  new Set(UI_THEMES.flatMap((theme) => [...Object.keys(theme.vars), ...Object.keys(theme.darkVars)])),
)

const UI_THEME_MODE_MAP: Record<DesignMode, UITheme[]> = {
  brutalist: BRUTAL_THEMES,
  'liquid-glass': GLASS_THEMES,
  material3: M3_THEMES,
}

export const UI_THEMES_MAP: Partial<Record<DesignConceptSlug, UITheme[]>> = {
  glass: GLASS_THEMES,
  craft: GLASS_THEMES,
  future: GLASS_THEMES,
  m3: M3_THEMES,
  brutal: BRUTAL_THEMES,
  minale: BRUTAL_THEMES,
  silence: BRUTAL_THEMES,
  function: BRUTAL_THEMES,
  editorial: BRUTAL_THEMES,
  grand: BRUTAL_THEMES,
};


function resolveThemesForConcept(conceptSlug?: string | null, designMode: DesignMode = DEFAULT_DESIGN_MODE) {
  const normalizedConcept = normalizeDesignConceptSlug(conceptSlug)
  if (normalizedConcept) {
    return UI_THEMES_MAP[normalizedConcept] || UI_THEME_MODE_MAP[CONCEPT_TO_DESIGN_MODE[normalizedConcept]]
  }

  return UI_THEME_MODE_MAP[designMode] || GLASS_THEMES
}


export function useUITheme() {
  const { activeConceptSlug, currentDesignMode } = useDesignSystem()
  const themeId = useState<string>('uiTheme', () => DEFAULT_THEME_ID)

  const availableThemes = computed(() => {
    return resolveThemesForConcept(activeConceptSlug?.value, currentDesignMode.value)
  })

  function resolveTheme(id?: string) {
    const themes = availableThemes.value
    if (!themes.length) {
      return null
    }

    return themes.find((theme) => theme.id === (id ?? themeId.value)) || themes[0]
  }

  function getStoredThemeId(designMode: DesignMode = currentDesignMode.value) {
    if (!import.meta.client) {
      return ''
    }

    return (
      localStorage.getItem(getUiThemeStorageKey(designMode))
      || localStorage.getItem(UI_THEME_STORAGE_KEY)
      || ''
    ).trim()
  }

  /**
   * Apply the theme's CSS custom-property set as inline styles on <html>.
   * Uses dark or light vars depending on current color-mode.
   */
  function applyThemeVars(id?: string) {
    if (!import.meta.client) return
    const theme = resolveTheme(id)
    if (!theme) return
    const isDark = document.documentElement.classList.contains('dark')
    const vars = isDark ? theme.darkVars : theme.vars
    const el = document.documentElement
    for (const key of THEME_VAR_KEYS) {
      el.style.removeProperty(key)
    }
    for (const [k, v] of Object.entries(vars)) {
      el.style.setProperty(k, v as string)
    }
  }

  /**
   * Set and persist the active UI theme.
   * Only applies CSS colour variables — does NOT push structural tokens.
   * Called on init and when dark mode toggles.
   */
  function applyTheme(id: string) {
    const theme = resolveTheme(id)
    if (!theme) return
    themeId.value = theme.id
    if (!import.meta.client) return
    document.documentElement.setAttribute('data-theme', theme.id)
    localStorage.setItem(UI_THEME_STORAGE_KEY, theme.id)
    localStorage.setItem(getUiThemeStorageKey(currentDesignMode.value), theme.id)
    applyThemeVars(theme.id)
  }

  /**
   * Set theme AND push its structural tokens into the design system
   * (btnRadius, btnTransform, letterSpacing). Called when user
   * actively picks a theme in the palette UI.
   */
  function applyThemeWithTokens(id: string) {
    const theme = resolveTheme(id)
    // Apply CSS vars first (so --btn-bg-base etc. are available for applyToDOM)
    if (!theme) return
    applyTheme(theme.id)
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

  function syncThemeForCurrentMode() {
    if (!import.meta.client) return

    const currentThemeAttr = document.documentElement.getAttribute('data-theme') || ''
    const preferredTheme = resolveTheme(getStoredThemeId() || themeId.value)

    if (!preferredTheme) {
      return
    }

    if (themeId.value !== preferredTheme.id || currentThemeAttr !== preferredTheme.id) {
      applyTheme(preferredTheme.id)
      return
    }

    refreshThemeVars()
  }

  function initTheme() {
    if (!import.meta.client) return
    syncThemeForCurrentMode()
  }

  return {
    themeId,
    applyTheme,
    applyThemeWithTokens,
    refreshThemeVars,
    initTheme,
    getStoredThemeId,
    syncThemeForCurrentMode,
    UI_THEMES: availableThemes,
    availableThemes,
  }
}
