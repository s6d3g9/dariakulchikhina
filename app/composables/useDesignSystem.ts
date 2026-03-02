/**
 * useDesignSystem v3 — world-class design-token engine.
 *
 * Inspired by:
 *  • W3C Design Tokens Community Group specification
 *  • Figma Variables / Tokens Studio
 *  • Vercel Geist / Linear / Radix UI
 *  • Material Design 3 token layers
 *  • Style Dictionary architecture
 *  • Tailwind CSS utility-first approach
 *
 * Features:
 *  ✔ Full token surface: colour, typography, spacing, radii, shadows,
 *    buttons, glass, animation, grid, semantic colors, type scale
 *  ✔ Undo / Redo history (max 50)
 *  ✔ 6 design presets ("recipes") — one-click full reskin
 *  ✔ Export / Import JSON + CSS custom properties output
 *  ✔ Token search / filter
 *  ✔ Dark-mode fine-tuning tokens
 *  ✔ Modular type scale (minor-third → augmented-fourth)
 *  ✔ CSS custom-property bridge — zero-JS hydration via plugin
 */

/* ═══════════════════════════════════════════════════════════
   TOKEN SHAPE
   ═══════════════════════════════════════════════════════════ */
export interface DesignTokens {
  /* ── Buttons ── */
  btnRadius: number
  btnSize: 'xs' | 'sm' | 'md' | 'lg'
  btnStyle: 'filled' | 'outline' | 'ghost' | 'soft'
  btnTransform: 'none' | 'uppercase' | 'capitalize'
  btnWeight: number

  /* ── Typography ── */
  fontFamily: string
  fontSize: number
  fontWeight: number
  headingWeight: number
  letterSpacing: number
  lineHeight: number
  paragraphSpacing: number
  typeScale: number  // ratio 1.067..1.5 (minor second .. perfect fifth)

  /* ── Semantic colors (HSL) ── */
  accentHue: number
  accentSaturation: number
  accentLightness: number
  successHue: number
  successSaturation: number
  errorHue: number
  errorSaturation: number
  warningHue: number
  warningSaturation: number

  /* ── Glass / Surface ── */
  glassBlur: number
  glassOpacity: number
  glassBorderOpacity: number
  glassSaturation: number

  /* ── Shadows ── */
  shadowOffsetY: number
  shadowBlurRadius: number
  shadowSpread: number
  shadowOpacity: number

  /* ── Spacing ── */
  spacingBase: number
  spacingScale: number

  /* ── Radii ── */
  cardRadius: number
  inputRadius: number
  chipRadius: number
  modalRadius: number

  /* ── Animation ── */
  animDuration: number
  animEasing: string

  /* ── Grid / Layout ── */
  containerWidth: number
  sidebarWidth: number
  gridGap: number
  gridColumns: number

  /* ── Borders ── */
  borderWidth: number
  borderStyle: 'solid' | 'none' | 'dashed'

  /* ── Dark mode adjustments ── */
  darkElevation: number   // lighten surfaces 0..20
  darkSaturation: number  // desaturate 0..100
}

/* ═══════════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════════ */
export const DEFAULT_TOKENS: DesignTokens = {
  btnRadius: 3,
  btnSize: 'md',
  btnStyle: 'filled',
  btnTransform: 'none',
  btnWeight: 500,

  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 1,
  fontWeight: 400,
  headingWeight: 600,
  letterSpacing: 0.03,
  lineHeight: 1.5,
  paragraphSpacing: 0.75,
  typeScale: 1.2,  // minor third

  accentHue: 220,
  accentSaturation: 14,
  accentLightness: 50,
  successHue: 142,
  successSaturation: 71,
  errorHue: 0,
  errorSaturation: 72,
  warningHue: 38,
  warningSaturation: 92,

  glassBlur: 18,
  glassOpacity: 0.48,
  glassBorderOpacity: 0.07,
  glassSaturation: 145,

  shadowOffsetY: 8,
  shadowBlurRadius: 24,
  shadowSpread: 0,
  shadowOpacity: 0.06,

  spacingBase: 4,
  spacingScale: 1,

  cardRadius: 14,
  inputRadius: 6,
  chipRadius: 999,
  modalRadius: 16,

  animDuration: 180,
  animEasing: 'ease',

  containerWidth: 1140,
  sidebarWidth: 260,
  gridGap: 16,
  gridColumns: 12,

  borderWidth: 1,
  borderStyle: 'solid',

  darkElevation: 6,
  darkSaturation: 50,
}

/* ═══════════════════════════════════════════════════════════
   PRESETS — full design recipes
   ═══════════════════════════════════════════════════════════ */
export interface DesignPreset {
  id: string
  name: string
  description: string
  icon: string
  tokens: Partial<DesignTokens>
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Чистый и лаконичный — как Linear',
    icon: '◻',
    tokens: {
      btnRadius: 4, btnStyle: 'outline', btnTransform: 'none', btnWeight: 400,
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.55, typeScale: 1.15,
      glassBlur: 12, glassOpacity: 0.35, glassBorderOpacity: 0.05, glassSaturation: 120,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowOpacity: 0.04,
      cardRadius: 8, inputRadius: 4, chipRadius: 4, modalRadius: 10,
      animDuration: 140, animEasing: 'ease', borderWidth: 1, gridGap: 14,
      accentHue: 220, accentSaturation: 12, accentLightness: 48,
      darkElevation: 4, darkSaturation: 40,
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Округлый и мягкий — как Notion',
    icon: '◉',
    tokens: {
      btnRadius: 999, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.6, typeScale: 1.2,
      glassBlur: 24, glassOpacity: 0.55, glassBorderOpacity: 0.06, glassSaturation: 160,
      shadowOffsetY: 10, shadowBlurRadius: 32, shadowOpacity: 0.07,
      cardRadius: 20, inputRadius: 12, chipRadius: 999, modalRadius: 22,
      animDuration: 220, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 18,
      accentHue: 280, accentSaturation: 25, accentLightness: 55,
      darkElevation: 8, darkSaturation: 55,
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Резкий и контрастный — без компромиссов',
    icon: '▬',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 700,
      fontWeight: 400, headingWeight: 800, letterSpacing: 0.08, lineHeight: 1.35, typeScale: 1.333,
      glassBlur: 0, glassOpacity: 0.92, glassBorderOpacity: 0.2, glassSaturation: 100,
      shadowOffsetY: 4, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.12,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 60, animEasing: 'linear', borderWidth: 2, gridGap: 12,
      accentHue: 0, accentSaturation: 0, accentLightness: 20,
      darkElevation: 2, darkSaturation: 10,
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Деловой — как Salesforce / Stripe',
    icon: '▣',
    tokens: {
      btnRadius: 6, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.03, lineHeight: 1.5, typeScale: 1.25,
      glassBlur: 14, glassOpacity: 0.62, glassBorderOpacity: 0.09, glassSaturation: 130,
      shadowOffsetY: 6, shadowBlurRadius: 20, shadowOpacity: 0.06,
      cardRadius: 10, inputRadius: 6, chipRadius: 20, modalRadius: 12,
      animDuration: 160, animEasing: 'ease-in-out', borderWidth: 1, gridGap: 16,
      accentHue: 215, accentSaturation: 60, accentLightness: 50,
      darkElevation: 5, darkSaturation: 45,
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Журнальная эстетика — serif, воздух',
    icon: '▤',
    tokens: {
      btnRadius: 2, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 500,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.06, lineHeight: 1.7, typeScale: 1.333,
      paragraphSpacing: 1.0,
      glassBlur: 8, glassOpacity: 0.40, glassBorderOpacity: 0.04, glassSaturation: 110,
      shadowOffsetY: 2, shadowBlurRadius: 12, shadowOpacity: 0.03,
      cardRadius: 4, inputRadius: 2, chipRadius: 2, modalRadius: 6,
      animDuration: 200, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      borderWidth: 1, gridGap: 20,
      accentHue: 20, accentSaturation: 40, accentLightness: 45,
      darkElevation: 5, darkSaturation: 30,
    },
  },
  {
    id: 'neomorphism',
    name: 'Neomorphism',
    description: 'Мягкие тени — 3D эффект без границ',
    icon: '◎',
    tokens: {
      btnRadius: 14, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.55, typeScale: 1.2,
      glassBlur: 0, glassOpacity: 0.01, glassBorderOpacity: 0, glassSaturation: 100,
      shadowOffsetY: 6, shadowBlurRadius: 16, shadowSpread: -2, shadowOpacity: 0.12,
      cardRadius: 18, inputRadius: 10, chipRadius: 14, modalRadius: 20,
      animDuration: 250, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 16,
      accentHue: 220, accentSaturation: 20, accentLightness: 55,
      darkElevation: 10, darkSaturation: 35,
    },
  },
  /* ── New presets ─────────────────────────────────── */
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Матовое стекло — как iOS / macOS',
    icon: '❖',
    tokens: {
      btnRadius: 12, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 32, glassOpacity: 0.30, glassBorderOpacity: 0.12, glassSaturation: 180,
      shadowOffsetY: 12, shadowBlurRadius: 40, shadowSpread: 0, shadowOpacity: 0.08,
      cardRadius: 16, inputRadius: 10, chipRadius: 999, modalRadius: 20,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 16,
      accentHue: 230, accentSaturation: 50, accentLightness: 58,
      darkElevation: 8, darkSaturation: 45,
    },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Премиум — тёмные тона, золотой акцент',
    icon: '♦',
    tokens: {
      btnRadius: 2, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 500,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.1, lineHeight: 1.6, typeScale: 1.25,
      paragraphSpacing: 1.0,
      glassBlur: 10, glassOpacity: 0.55, glassBorderOpacity: 0.08, glassSaturation: 110,
      shadowOffsetY: 4, shadowBlurRadius: 20, shadowSpread: 0, shadowOpacity: 0.06,
      cardRadius: 4, inputRadius: 3, chipRadius: 4, modalRadius: 6,
      animDuration: 240, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 20,
      accentHue: 42, accentSaturation: 70, accentLightness: 50,
      darkElevation: 3, darkSaturation: 25,
    },
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Яркий и весёлый — как Figma / Notion AI',
    icon: '●',
    tokens: {
      btnRadius: 999, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.01, lineHeight: 1.55, typeScale: 1.25,
      glassBlur: 20, glassOpacity: 0.50, glassBorderOpacity: 0.06, glassSaturation: 160,
      shadowOffsetY: 8, shadowBlurRadius: 28, shadowSpread: 0, shadowOpacity: 0.07,
      cardRadius: 22, inputRadius: 14, chipRadius: 999, modalRadius: 24,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 270, accentSaturation: 65, accentLightness: 55,
      darkElevation: 8, darkSaturation: 55,
    },
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: 'Швейцарский стиль — Helvetica, сетка, порядок',
    icon: '▦',
    tokens: {
      btnRadius: 0, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 500,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.04, lineHeight: 1.45, typeScale: 1.333,
      paragraphSpacing: 0.5,
      glassBlur: 0, glassOpacity: 0.95, glassBorderOpacity: 0.0, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 100, animEasing: 'linear',
      borderWidth: 2, borderStyle: 'solid', gridGap: 16, gridColumns: 12,
      accentHue: 0, accentSaturation: 85, accentLightness: 50,
      darkElevation: 2, darkSaturation: 10,
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Чисто чёрно-белый, без лишнего цвета',
    icon: '◒',
    tokens: {
      btnRadius: 4, btnStyle: 'outline', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.03, lineHeight: 1.55, typeScale: 1.2,
      glassBlur: 12, glassOpacity: 0.45, glassBorderOpacity: 0.08, glassSaturation: 100,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowSpread: 0, shadowOpacity: 0.05,
      cardRadius: 8, inputRadius: 4, chipRadius: 6, modalRadius: 10,
      animDuration: 150, animEasing: 'ease',
      borderWidth: 1, borderStyle: 'solid', gridGap: 14,
      accentHue: 0, accentSaturation: 0, accentLightness: 30,
      darkElevation: 5, darkSaturation: 0,
    },
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Воздушный и тёплый — скандинавский уют',
    icon: '◇',
    tokens: {
      btnRadius: 8, btnStyle: 'soft', btnTransform: 'none', btnWeight: 400,
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.65, typeScale: 1.15,
      paragraphSpacing: 1.0,
      glassBlur: 16, glassOpacity: 0.40, glassBorderOpacity: 0.04, glassSaturation: 120,
      shadowOffsetY: 6, shadowBlurRadius: 24, shadowSpread: 0, shadowOpacity: 0.04,
      cardRadius: 14, inputRadius: 8, chipRadius: 10, modalRadius: 16,
      animDuration: 250, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 20,
      accentHue: 30, accentSaturation: 25, accentLightness: 52,
      darkElevation: 7, darkSaturation: 30,
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Компактный — как Grafana / Datadog',
    icon: '▥',
    tokens: {
      btnRadius: 4, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      fontSize: 0.88,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.4, typeScale: 1.125,
      paragraphSpacing: 0.5,
      glassBlur: 10, glassOpacity: 0.60, glassBorderOpacity: 0.1, glassSaturation: 110,
      shadowOffsetY: 2, shadowBlurRadius: 8, shadowSpread: 0, shadowOpacity: 0.04,
      cardRadius: 6, inputRadius: 4, chipRadius: 4, modalRadius: 8,
      animDuration: 120, animEasing: 'ease',
      borderWidth: 1, borderStyle: 'solid', gridGap: 10, gridColumns: 12,
      accentHue: 210, accentSaturation: 55, accentLightness: 50,
      containerWidth: 1320,
      darkElevation: 4, darkSaturation: 40,
    },
  },
  {
    id: 'material3',
    name: 'Material 3',
    description: 'Google Material You — динамичные формы',
    icon: '◐',
    tokens: {
      btnRadius: 20, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 0, glassOpacity: 0.88, glassBorderOpacity: 0, glassSaturation: 100,
      shadowOffsetY: 2, shadowBlurRadius: 6, shadowSpread: 0, shadowOpacity: 0.15,
      cardRadius: 16, inputRadius: 12, chipRadius: 8, modalRadius: 28,
      animDuration: 200, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 260, accentSaturation: 50, accentLightness: 52,
      darkElevation: 8, darkSaturation: 50,
    },
  },
  {
    id: 'apple',
    name: 'Apple HIG',
    description: 'Чистый стиль Apple — SF Pro, мягкость',
    icon: '◆',
    tokens: {
      btnRadius: 10, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.47, typeScale: 1.2,
      glassBlur: 20, glassOpacity: 0.72, glassBorderOpacity: 0.08, glassSaturation: 180,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowSpread: 0, shadowOpacity: 0.06,
      cardRadius: 12, inputRadius: 8, chipRadius: 8, modalRadius: 14,
      animDuration: 180, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 215, accentSaturation: 90, accentLightness: 50,
      darkElevation: 6, darkSaturation: 50,
    },
  },
  {
    id: 'retro',
    name: 'Retro Terminal',
    description: 'Терминал 80-х — моноширинный, зелёный',
    icon: '▮',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 400,
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.06, lineHeight: 1.5, typeScale: 1.125,
      paragraphSpacing: 0.75,
      glassBlur: 0, glassOpacity: 0.92, glassBorderOpacity: 0.15, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 12, shadowSpread: 0, shadowOpacity: 0.15,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 50, animEasing: 'linear',
      borderWidth: 1, borderStyle: 'solid', gridGap: 12,
      accentHue: 120, accentSaturation: 80, accentLightness: 45,
      darkElevation: 2, darkSaturation: 60,
    },
  },
]

/* ═══════════════════════════════════════════════════════════
   FONT CATALOGUE
   ═══════════════════════════════════════════════════════════ */
export const FONT_OPTIONS = [
  { id: 'system',    label: 'System UI',      value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'inter',     label: 'Inter',          value: '"Inter", sans-serif' },
  { id: 'geist',     label: 'Geist',          value: '"Geist", sans-serif' },
  { id: 'dmSans',    label: 'DM Sans',        value: '"DM Sans", sans-serif' },
  { id: 'manrope',   label: 'Manrope',        value: '"Manrope", sans-serif' },
  { id: 'outfit',    label: 'Outfit',         value: '"Outfit", sans-serif' },
  { id: 'satoshi',   label: 'Satoshi',        value: '"Satoshi", sans-serif' },
  { id: 'jetbrains', label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { id: 'georgia',   label: 'Georgia',        value: 'Georgia, "Times New Roman", serif' },
  { id: 'playfair',  label: 'Playfair',       value: '"Playfair Display", serif' },
] as const

/* ═══════════════════════════════════════════════════════════
   BUTTON SIZE MAP
   ═══════════════════════════════════════════════════════════ */
export const BTN_SIZE_MAP = {
  xs: { py: 4,  px: 10, fontSize: 0.68 },
  sm: { py: 6,  px: 14, fontSize: 0.74 },
  md: { py: 9,  px: 22, fontSize: 0.80 },
  lg: { py: 12, px: 28, fontSize: 0.88 },
} as const

/* ═══════════════════════════════════════════════════════════
   EASING OPTIONS
   ═══════════════════════════════════════════════════════════ */
export const EASING_OPTIONS = [
  { id: 'ease',                              label: 'Ease' },
  { id: 'ease-in-out',                       label: 'Ease In-Out' },
  { id: 'cubic-bezier(0.16,1,0.3,1)',        label: 'Spring' },
  { id: 'linear',                            label: 'Linear' },
  { id: 'cubic-bezier(0.33,1,0.68,1)',       label: 'Smooth Out' },
  { id: 'cubic-bezier(0.22,1,0.36,1)',       label: 'Expo Out' },
] as const

/* ═══════════════════════════════════════════════════════════
   TYPE SCALE PRESETS (ratio → name)
   ═══════════════════════════════════════════════════════════ */
export const TYPE_SCALE_OPTIONS = [
  { ratio: 1.067, label: 'Minor Second' },
  { ratio: 1.125, label: 'Major Second' },
  { ratio: 1.150, label: 'Custom 1.15' },
  { ratio: 1.200, label: 'Minor Third' },
  { ratio: 1.250, label: 'Major Third' },
  { ratio: 1.333, label: 'Perfect Fourth' },
  { ratio: 1.414, label: 'Aug. Fourth' },
  { ratio: 1.500, label: 'Perfect Fifth' },
] as const

/* ═══════════════════════════════════════════════════════════
   COMPOSABLE
   ═══════════════════════════════════════════════════════════ */
const LS_KEY = 'design-tokens'
const HISTORY_MAX = 50

export function useDesignSystem() {
  const tokens  = useState<DesignTokens>('designTokens', () => ({ ...DEFAULT_TOKENS }))
  const history = useState<DesignTokens[]>('dsHistory', () => [])
  const future  = useState<DesignTokens[]>('dsFuture', () => [])

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
    } catch { /* corrupt data → just use defaults */ }
  }

  function reset() {
    pushHistory()
    tokens.value = { ...DEFAULT_TOKENS }
    save()
    applyToDOM()
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
    el.style.setProperty('--btn-weight', String(t.btnWeight))

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

    // Dark mode
    el.style.setProperty('--ds-dark-elevation', String(t.darkElevation))
    el.style.setProperty('--ds-dark-saturation', `${t.darkSaturation}%`)
  }

  /* ── Setter (push to history, apply, persist) ──────────── */
  function set<K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) {
    pushHistory()
    tokens.value[key] = value
    applyToDOM()
    save()
  }

  /* ── Batch setter (one undo step for preset switch) ───── */
  function applyPreset(preset: DesignPreset) {
    pushHistory()
    tokens.value = { ...tokens.value, ...preset.tokens }
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
    const lines = [
      ':root {',
      `  /* ── Buttons ── */`,
      `  --btn-radius: ${t.btnRadius}px;`,
      `  --btn-py: ${sz.py}px;`,
      `  --btn-px: ${sz.px}px;`,
      `  --btn-font-size: ${sz.fontSize}rem;`,
      `  --btn-transform: ${t.btnTransform};`,
      `  --btn-weight: ${t.btnWeight};`,
      ``,
      `  /* ── Typography ── */`,
      `  --ds-font-family: ${t.fontFamily};`,
      `  --ds-font-size: ${t.fontSize}rem;`,
      `  --ds-font-weight: ${t.fontWeight};`,
      `  --ds-heading-weight: ${t.headingWeight};`,
      `  --ds-letter-spacing: ${t.letterSpacing}em;`,
      `  --ds-line-height: ${t.lineHeight};`,
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
      `  --ds-success: hsl(${t.successHue}, ${t.successSaturation}%, 45%);`,
      `  --ds-error: hsl(${t.errorHue}, ${t.errorSaturation}%, 50%);`,
      `  --ds-warning: hsl(${t.warningHue}, ${t.warningSaturation}%, 50%);`,
      ``,
      `  /* ── Glass ── */`,
      `  --glass-blur: ${t.glassBlur}px;`,
      `  --glass-bg-alpha: ${t.glassOpacity};`,
      `  --glass-border-alpha: ${t.glassBorderOpacity};`,
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
      `  --ds-grid-gap: ${t.gridGap}px;`,
      `  --ds-grid-columns: ${t.gridColumns};`,
      ``,
      `  /* ── Borders ── */`,
      `  --ds-border-width: ${t.borderWidth}px;`,
      `  --ds-border-style: ${t.borderStyle};`,
      `}`,
    ]
    return lines.join('\n')
  }

  /* ── Init ──────────────────────────────────────────────── */
  function initDesignSystem() {
    load()
    applyToDOM()
  }

  /* ── Preview mode (try preset without committing) ──── */
  const snapshotBeforePreview = useState<DesignTokens | null>('dsSnapshot', () => null)
  const isPreviewActive = computed(() => snapshotBeforePreview.value !== null)

  function previewPreset(preset: DesignPreset) {
    if (!snapshotBeforePreview.value) {
      snapshotBeforePreview.value = { ...tokens.value }
    }
    tokens.value = { ...tokens.value, ...preset.tokens }
    applyToDOM()
  }

  function confirmPreview() {
    if (snapshotBeforePreview.value) {
      pushHistory()
      // tokens already have the preview state — just persist
      // We pushed history with the snapshot so undo goes back correctly
      history.value[history.value.length - 1] = { ...snapshotBeforePreview.value }
      snapshotBeforePreview.value = null
      save()
    }
  }

  function cancelPreview() {
    if (snapshotBeforePreview.value) {
      tokens.value = { ...snapshotBeforePreview.value }
      snapshotBeforePreview.value = null
      applyToDOM()
    }
  }

  return {
    tokens, set, reset, applyPreset,
    undo, redo, canUndo, canRedo,
    exportJSON, importJSON, exportCSS,
    initDesignSystem, applyToDOM, save, load,
    previewPreset, confirmPreview, cancelPreview, isPreviewActive,
  }
}
