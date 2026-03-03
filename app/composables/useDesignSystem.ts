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
  wordSpacing: number          // 0..0.25em — межсловный интервал
  textIndent: number           // 0..3em — отступ первой строки
  headingLetterSpacing: number // -0.05..0.1em — межбуквенный заголовков
  headingLineHeight: number    // 1.0..2.0 — межстрочный заголовков
  paragraphMaxWidth: number    // 0 = без ограничения, 40..100ch
  textAlign: 'left' | 'center' | 'right' | 'justify'
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

  /* ── Input fields ── */
  inputBgOpacity: number        // 0..0.25 — field background fill
  inputBorderOpacity: number    // 0..0.4  — field border/ring
  inputPaddingH: number         // px — horizontal inner padding
  inputPaddingV: number         // px — vertical inner padding
  inputFontSize: number         // 0 = auto (--ds-text-sm), >0 = direct rem

  /* ── Chips / Tags ── */
  chipBgOpacity: number         // 0..0.3  — tag background fill
  chipBorderOpacity: number     // 0..0.4  — tag border
  chipPaddingH: number          // px — horizontal padding
  chipPaddingV: number          // px — vertical padding

  /* ── Navigation sidebar ── */
  navItemRadius: number         // px — nav-item border-radius
  navItemPaddingH: number       // px — nav-item horizontal padding
  navItemPaddingV: number       // px — nav-item vertical padding

  /* ── Button padding override ── */
  btnPaddingH: number           // 0 = auto from btnSize, >0 = direct px
  btnPaddingV: number           // 0 = auto from btnSize, >0 = direct px

  /* ── Status pills / pin bars ── */
  statusBgOpacity: number       // 0..0.5  — base fill for all status badges
  statusPillRadius: number      // px (999 = pill)

  /* ── Popups and overlays ── */
  modalOverlayOpacity: number   // 0..0.9  — backdrop darkness
  dropdownBlur: number          // px — autocomplete/address dropdown blur

  /* ── Scrollbar ── */
  scrollbarWidth: number        // px — custom scrollbar width (3..18)
  scrollbarOpacity: number      // 0..0.8 — scrollbar thumb opacity

  /* ── Tables ── */
  tableHeaderOpacity: number    // 0..0.25 — thead background fill
  tableRowHoverOpacity: number  // 0..0.15 — row hover background
  tableBorderOpacity: number    // 0..0.4  — cell border opacity

  /* ── Badges / Counters ── */
  badgeBgOpacity: number        // 0..0.5  — notification badge fill
  badgeRadius: number           // px (999 = pill)

  /* ── Accessibility / Focus ── */
  focusRingWidth: number        // px — focus outline width (1..5)
  focusRingOffset: number       // px — outline-offset (0..6)
  focusRingStyle: 'solid' | 'dashed' | 'dotted'  // outline-style
  focusRingOpacity: number      // 0..1 — ring visibility

  /* ── Element colour overrides (hex string, '' = auto from theme) ── */
  colorPageBg:  string   // --glass-page-bg  — page / body background
  colorSurface: string   // --glass-bg base  — cards, panels (alpha from glassOpacity)
  colorBorder:  string   // --glass-border base — borders (alpha from glassBorderOpacity)
  colorText:    string   // --glass-text     — all body text
  colorHeading: string   // --ds-heading-color — h1–h6
  colorLink:    string   // --ds-link-color  — links / interactive
  colorBtnBg:   string   // --btn-bg-base    — button background fill
  colorBtnText: string   // --btn-color      — button label text

  /* ── Button & Card hover animation ── */
  btnHoverAnim: 'none' | 'lift' | 'scale' | 'glow' | 'fill' | 'sheen'  // kinetic hover style
  cardHoverAnim: 'none' | 'lift' | 'scale'                               // card hover micromotion
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
  wordSpacing: 0,
  textIndent: 0,
  headingLetterSpacing: -0.01,
  headingLineHeight: 1.2,
  paragraphMaxWidth: 0,
  textAlign: 'left',
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

  inputBgOpacity: 0.05,
  inputBorderOpacity: 0.00,

  chipBgOpacity: 0.07,
  chipBorderOpacity: 0.00,
  chipPaddingH: 9,
  chipPaddingV: 3,

  inputPaddingH: 12,
  inputPaddingV: 8,
  inputFontSize: 0,

  navItemPaddingH: 12,
  navItemPaddingV: 6,

  btnPaddingH: 0,
  btnPaddingV: 0,

  navItemRadius: 9,

  statusBgOpacity: 0.09,
  statusPillRadius: 999,

  modalOverlayOpacity: 0.35,
  dropdownBlur: 18,

  scrollbarWidth: 4,
  scrollbarOpacity: 0.15,

  tableHeaderOpacity: 0.04,
  tableRowHoverOpacity: 0.03,
  tableBorderOpacity: 0.08,

  badgeBgOpacity: 0.12,
  badgeRadius: 999,

  focusRingWidth: 2,
  focusRingOffset: 2,
  focusRingStyle: 'solid',
  focusRingOpacity: 0.7,

  colorPageBg:  '',
  colorSurface: '',
  colorBorder:  '',
  colorText:    '',
  colorHeading: '',
  colorLink:    '',
  colorBtnBg:   '',
  colorBtnText: '',

  btnHoverAnim: 'none',
  cardHoverAnim: 'none',
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
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.55, typeScale: 1.15,
      glassBlur: 12, glassOpacity: 0.35, glassBorderOpacity: 0.05, glassSaturation: 120,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowOpacity: 0.04,
      cardRadius: 8, inputRadius: 4, chipRadius: 4, modalRadius: 10,
      animDuration: 140, animEasing: 'ease', borderWidth: 1, gridGap: 14,
      accentHue: 220, accentSaturation: 12, accentLightness: 48,
      darkElevation: 4, darkSaturation: 40,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.08, inputPaddingH: 10, inputPaddingV: 7, inputFontSize: 0,
      chipBgOpacity: 0.05, chipBorderOpacity: 0.06, chipPaddingH: 8, chipPaddingV: 2,
      navItemRadius: 6, navItemPaddingH: 10, navItemPaddingV: 5,
      statusBgOpacity: 0.07, statusPillRadius: 4,
      modalOverlayOpacity: 0.30, dropdownBlur: 12,
      scrollbarWidth: 3, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.06,
      badgeBgOpacity: 0.10, badgeRadius: 4,
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Округлый и мягкий — как Notion',
    icon: '◉',
    tokens: {
      btnRadius: 999, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.6, typeScale: 1.2,
      glassBlur: 24, glassOpacity: 0.55, glassBorderOpacity: 0.06, glassSaturation: 160,
      shadowOffsetY: 10, shadowBlurRadius: 32, shadowOpacity: 0.07,
      cardRadius: 20, inputRadius: 12, chipRadius: 999, modalRadius: 22,
      animDuration: 220, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 18,
      accentHue: 280, accentSaturation: 25, accentLightness: 55,
      darkElevation: 8, darkSaturation: 55,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.00, inputPaddingH: 14, inputPaddingV: 9, inputFontSize: 0,
      chipBgOpacity: 0.08, chipBorderOpacity: 0.00, chipPaddingH: 11, chipPaddingV: 4,
      navItemRadius: 999, navItemPaddingH: 14, navItemPaddingV: 7,
      statusBgOpacity: 0.10, statusPillRadius: 999,
      modalOverlayOpacity: 0.30, dropdownBlur: 20,
      scrollbarWidth: 5, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.05,
      badgeBgOpacity: 0.14, badgeRadius: 999,
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Резкий и контрастный — без компромиссов',
    icon: '▬',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 700,
      btnPaddingH: 20, btnPaddingV: 10,
      fontWeight: 400, headingWeight: 800, letterSpacing: 0.08, lineHeight: 1.35, typeScale: 1.333,
      glassBlur: 0, glassOpacity: 0.92, glassBorderOpacity: 0.2, glassSaturation: 100,
      shadowOffsetY: 4, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.12,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 60, animEasing: 'linear', borderWidth: 2, gridGap: 12,
      accentHue: 0, accentSaturation: 0, accentLightness: 20,
      darkElevation: 2, darkSaturation: 10,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.20, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.20, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 10, navItemPaddingV: 6,
      statusBgOpacity: 0.12, statusPillRadius: 0,
      modalOverlayOpacity: 0.50, dropdownBlur: 0,
      scrollbarWidth: 6, scrollbarOpacity: 0.25,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.15,
      badgeBgOpacity: 0.15, badgeRadius: 0,
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Деловой — как Salesforce / Stripe',
    icon: '▣',
    tokens: {
      btnRadius: 6, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.03, lineHeight: 1.5, typeScale: 1.25,
      glassBlur: 14, glassOpacity: 0.62, glassBorderOpacity: 0.09, glassSaturation: 130,
      shadowOffsetY: 6, shadowBlurRadius: 20, shadowOpacity: 0.06,
      cardRadius: 10, inputRadius: 6, chipRadius: 20, modalRadius: 12,
      animDuration: 160, animEasing: 'ease-in-out', borderWidth: 1, gridGap: 16,
      accentHue: 215, accentSaturation: 60, accentLightness: 50,
      darkElevation: 5, darkSaturation: 45,
      inputBgOpacity: 0.05, inputBorderOpacity: 0.10, inputPaddingH: 12, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.08, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 6, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.09, statusPillRadius: 20,
      modalOverlayOpacity: 0.35, dropdownBlur: 14,
      scrollbarWidth: 4, scrollbarOpacity: 0.15,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.12, badgeRadius: 999,
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Журнальная эстетика — serif, воздух',
    icon: '▤',
    tokens: {
      btnRadius: 2, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 18, btnPaddingV: 8,
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
      inputBgOpacity: 0.03, inputBorderOpacity: 0.10, inputPaddingH: 12, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.04, chipBorderOpacity: 0.08, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 2, navItemPaddingH: 14, navItemPaddingV: 7,
      statusBgOpacity: 0.08, statusPillRadius: 2,
      modalOverlayOpacity: 0.30, dropdownBlur: 8,
      scrollbarWidth: 3, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.06,
      badgeBgOpacity: 0.10, badgeRadius: 2,
    },
  },
  {
    id: 'neomorphism',
    name: 'Neomorphism',
    description: 'Мягкие тени — 3D эффект без границ',
    icon: '◎',
    tokens: {
      btnRadius: 14, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.55, typeScale: 1.2,
      glassBlur: 0, glassOpacity: 0.01, glassBorderOpacity: 0, glassSaturation: 100,
      shadowOffsetY: 6, shadowBlurRadius: 16, shadowSpread: -2, shadowOpacity: 0.12,
      cardRadius: 18, inputRadius: 10, chipRadius: 14, modalRadius: 20,
      animDuration: 250, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 16,
      accentHue: 220, accentSaturation: 20, accentLightness: 55,
      darkElevation: 10, darkSaturation: 35,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.00, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.07, chipBorderOpacity: 0.00, chipPaddingH: 10, chipPaddingV: 4,
      navItemRadius: 12, navItemPaddingH: 14, navItemPaddingV: 8,
      statusBgOpacity: 0.08, statusPillRadius: 14,
      modalOverlayOpacity: 0.25, dropdownBlur: 0,
      scrollbarWidth: 5, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.00,
      badgeBgOpacity: 0.12, badgeRadius: 14,
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
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 32, glassOpacity: 0.30, glassBorderOpacity: 0.12, glassSaturation: 180,
      shadowOffsetY: 12, shadowBlurRadius: 40, shadowSpread: 0, shadowOpacity: 0.08,
      cardRadius: 16, inputRadius: 10, chipRadius: 999, modalRadius: 20,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 16,
      accentHue: 230, accentSaturation: 50, accentLightness: 58,
      darkElevation: 8, darkSaturation: 45,
      inputBgOpacity: 0.08, inputBorderOpacity: 0.10, inputPaddingH: 12, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.10, chipBorderOpacity: 0.08, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 10, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.12, statusPillRadius: 999,
      modalOverlayOpacity: 0.25, dropdownBlur: 24,
      scrollbarWidth: 4, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.15, badgeRadius: 999,
    },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Премиум — тёмные тона, золотой акцент',
    icon: '♦',
    tokens: {
      btnRadius: 2, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 24, btnPaddingV: 10,
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
      inputBgOpacity: 0.03, inputBorderOpacity: 0.12, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.05, chipBorderOpacity: 0.10, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 2, navItemPaddingH: 16, navItemPaddingV: 8,
      statusBgOpacity: 0.10, statusPillRadius: 2,
      modalOverlayOpacity: 0.45, dropdownBlur: 10,
      scrollbarWidth: 3, scrollbarOpacity: 0.08,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.12, badgeRadius: 2,
    },
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Яркий и весёлый — как Figma / Notion AI',
    icon: '●',
    tokens: {
      btnRadius: 999, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.01, lineHeight: 1.55, typeScale: 1.25,
      glassBlur: 20, glassOpacity: 0.50, glassBorderOpacity: 0.06, glassSaturation: 160,
      shadowOffsetY: 8, shadowBlurRadius: 28, shadowSpread: 0, shadowOpacity: 0.07,
      cardRadius: 22, inputRadius: 14, chipRadius: 999, modalRadius: 24,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 270, accentSaturation: 65, accentLightness: 55,
      darkElevation: 8, darkSaturation: 55,
      inputBgOpacity: 0.07, inputBorderOpacity: 0.00, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.10, chipBorderOpacity: 0.00, chipPaddingH: 12, chipPaddingV: 5,
      navItemRadius: 999, navItemPaddingH: 14, navItemPaddingV: 8,
      statusBgOpacity: 0.12, statusPillRadius: 999,
      modalOverlayOpacity: 0.25, dropdownBlur: 18,
      scrollbarWidth: 6, scrollbarOpacity: 0.15,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.04,
      badgeBgOpacity: 0.18, badgeRadius: 999,
    },
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: 'Швейцарский стиль — Helvetica, сетка, порядок',
    icon: '▦',
    tokens: {
      btnRadius: 0, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 18, btnPaddingV: 9,
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
      inputBgOpacity: 0.00, inputBorderOpacity: 0.18, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.18, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.10, statusPillRadius: 0,
      modalOverlayOpacity: 0.40, dropdownBlur: 0,
      scrollbarWidth: 4, scrollbarOpacity: 0.20,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.12,
      badgeBgOpacity: 0.14, badgeRadius: 0,
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Чисто чёрно-белый, без лишнего цвета',
    icon: '◒',
    tokens: {
      btnRadius: 4, btnStyle: 'outline', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.03, lineHeight: 1.55, typeScale: 1.2,
      glassBlur: 12, glassOpacity: 0.45, glassBorderOpacity: 0.08, glassSaturation: 100,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowSpread: 0, shadowOpacity: 0.05,
      cardRadius: 8, inputRadius: 4, chipRadius: 6, modalRadius: 10,
      animDuration: 150, animEasing: 'ease',
      borderWidth: 1, borderStyle: 'solid', gridGap: 14,
      accentHue: 0, accentSaturation: 0, accentLightness: 30,
      darkElevation: 5, darkSaturation: 0,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.10, inputPaddingH: 10, inputPaddingV: 7, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.08, chipPaddingH: 8, chipPaddingV: 2,
      navItemRadius: 4, navItemPaddingH: 10, navItemPaddingV: 5,
      statusBgOpacity: 0.08, statusPillRadius: 6,
      modalOverlayOpacity: 0.35, dropdownBlur: 10,
      scrollbarWidth: 3, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.10, badgeRadius: 6,
    },
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Воздушный и тёплый — скандинавский уют',
    icon: '◇',
    tokens: {
      btnRadius: 8, btnStyle: 'soft', btnTransform: 'none', btnWeight: 400,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.65, typeScale: 1.15,
      paragraphSpacing: 1.0,
      glassBlur: 16, glassOpacity: 0.40, glassBorderOpacity: 0.04, glassSaturation: 120,
      shadowOffsetY: 6, shadowBlurRadius: 24, shadowSpread: 0, shadowOpacity: 0.04,
      cardRadius: 14, inputRadius: 8, chipRadius: 10, modalRadius: 16,
      animDuration: 250, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 20,
      accentHue: 30, accentSaturation: 25, accentLightness: 52,
      darkElevation: 7, darkSaturation: 30,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.00, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.00, chipPaddingH: 10, chipPaddingV: 4,
      navItemRadius: 8, navItemPaddingH: 14, navItemPaddingV: 7,
      statusBgOpacity: 0.08, statusPillRadius: 10,
      modalOverlayOpacity: 0.25, dropdownBlur: 16,
      scrollbarWidth: 4, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.04,
      badgeBgOpacity: 0.10, badgeRadius: 10,
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Компактный — как Grafana / Datadog',
    icon: '▥',
    tokens: {
      btnRadius: 4, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 12, btnPaddingV: 5,
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
      inputBgOpacity: 0.05, inputBorderOpacity: 0.08, inputPaddingH: 8, inputPaddingV: 5, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.06, chipPaddingH: 6, chipPaddingV: 2,
      navItemRadius: 4, navItemPaddingH: 8, navItemPaddingV: 4,
      statusBgOpacity: 0.10, statusPillRadius: 4,
      modalOverlayOpacity: 0.35, dropdownBlur: 10,
      scrollbarWidth: 3, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.12, badgeRadius: 4,
    },
  },
  {
    id: 'material3',
    name: 'Material 3',
    description: 'Google Material You — динамичные формы',
    icon: '◐',
    tokens: {
      btnRadius: 20, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 24, btnPaddingV: 10,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 0, glassOpacity: 0.88, glassBorderOpacity: 0, glassSaturation: 100,
      shadowOffsetY: 2, shadowBlurRadius: 6, shadowSpread: 0, shadowOpacity: 0.15,
      cardRadius: 16, inputRadius: 12, chipRadius: 8, modalRadius: 28,
      animDuration: 200, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 260, accentSaturation: 50, accentLightness: 52,
      darkElevation: 8, darkSaturation: 50,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.00, inputPaddingH: 16, inputPaddingV: 12, inputFontSize: 0,
      chipBgOpacity: 0.08, chipBorderOpacity: 0.00, chipPaddingH: 12, chipPaddingV: 6,
      navItemRadius: 999, navItemPaddingH: 16, navItemPaddingV: 8,
      statusBgOpacity: 0.12, statusPillRadius: 8,
      modalOverlayOpacity: 0.32, dropdownBlur: 0,
      scrollbarWidth: 4, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.00,
      badgeBgOpacity: 0.16, badgeRadius: 999,
    },
  },
  {
    id: 'apple',
    name: 'Apple HIG',
    description: 'Чистый стиль Apple — SF Pro, мягкость',
    icon: '◆',
    tokens: {
      btnRadius: 10, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 18, btnPaddingV: 8,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.47, typeScale: 1.2,
      glassBlur: 20, glassOpacity: 0.72, glassBorderOpacity: 0.08, glassSaturation: 180,
      shadowOffsetY: 4, shadowBlurRadius: 16, shadowSpread: 0, shadowOpacity: 0.06,
      cardRadius: 12, inputRadius: 8, chipRadius: 8, modalRadius: 14,
      animDuration: 180, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 215, accentSaturation: 90, accentLightness: 50,
      darkElevation: 6, darkSaturation: 50,
      inputBgOpacity: 0.05, inputBorderOpacity: 0.00, inputPaddingH: 12, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.07, chipBorderOpacity: 0.00, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 8, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.10, statusPillRadius: 999,
      modalOverlayOpacity: 0.30, dropdownBlur: 20,
      scrollbarWidth: 4, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.06,
      badgeBgOpacity: 0.12, badgeRadius: 999,
    },
  },
  {
    id: 'retro',
    name: 'Retro Terminal',
    description: 'Терминал 80-х — моноширинный, зелёный',
    icon: '▮',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 16, btnPaddingV: 7,
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
      inputBgOpacity: 0.00, inputBorderOpacity: 0.15, inputPaddingH: 8, inputPaddingV: 6, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.15, chipPaddingH: 6, chipPaddingV: 2,
      navItemRadius: 0, navItemPaddingH: 8, navItemPaddingV: 4,
      statusBgOpacity: 0.10, statusPillRadius: 0,
      modalOverlayOpacity: 0.50, dropdownBlur: 0,
      scrollbarWidth: 6, scrollbarOpacity: 0.25,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.12,
      badgeBgOpacity: 0.14, badgeRadius: 0,
    },
  },
  /* ── Effect-focused presets ─────────────────────────── */
  {
    id: 'glow',
    name: 'Glow',
    description: 'Неоновое свечение — яркие акценты, глубокие тени',
    icon: '✦',
    tokens: {
      btnRadius: 10, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      btnPaddingH: 22, btnPaddingV: 10,
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.01, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 24, glassOpacity: 0.25, glassBorderOpacity: 0.15, glassSaturation: 200,
      shadowOffsetY: 0, shadowBlurRadius: 32, shadowSpread: 0, shadowOpacity: 0.20,
      cardRadius: 14, inputRadius: 8, chipRadius: 999, modalRadius: 18,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 16,
      accentHue: 265, accentSaturation: 80, accentLightness: 60,
      darkElevation: 10, darkSaturation: 70,
      inputBgOpacity: 0.08, inputBorderOpacity: 0.12, inputPaddingH: 14, inputPaddingV: 9, inputFontSize: 0,
      chipBgOpacity: 0.12, chipBorderOpacity: 0.10, chipPaddingH: 10, chipPaddingV: 4,
      navItemRadius: 10, navItemPaddingH: 14, navItemPaddingV: 7,
      statusBgOpacity: 0.15, statusPillRadius: 999,
      modalOverlayOpacity: 0.45, dropdownBlur: 24,
      scrollbarWidth: 4, scrollbarOpacity: 0.18,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.20, badgeRadius: 999,
    },
  },
  {
    id: 'ink',
    name: 'Ink & Paper',
    description: 'Минимализм пера — тонкие линии, ghost-кнопки',
    icon: '✎',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 16, btnPaddingV: 8,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.04, lineHeight: 1.7, typeScale: 1.25,
      paragraphSpacing: 1.0,
      glassBlur: 0, glassOpacity: 0.96, glassBorderOpacity: 0.0, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 150, animEasing: 'ease',
      borderWidth: 1, borderStyle: 'solid', gridGap: 20,
      accentHue: 0, accentSaturation: 0, accentLightness: 15,
      darkElevation: 3, darkSaturation: 0,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.12, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.10, chipPaddingH: 8, chipPaddingV: 2,
      navItemRadius: 0, navItemPaddingH: 10, navItemPaddingV: 6,
      statusBgOpacity: 0.06, statusPillRadius: 0,
      modalOverlayOpacity: 0.30, dropdownBlur: 0,
      scrollbarWidth: 2, scrollbarOpacity: 0.08,
      tableHeaderOpacity: 0.00, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.08, badgeRadius: 0,
    },
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    description: 'Сочный и выпуклый — как детский конструктор',
    icon: '◕',
    tokens: {
      btnRadius: 999, btnStyle: 'filled', btnTransform: 'none', btnWeight: 700,
      btnPaddingH: 26, btnPaddingV: 12,
      fontWeight: 500, headingWeight: 800, letterSpacing: 0.00, lineHeight: 1.5, typeScale: 1.25,
      glassBlur: 18, glassOpacity: 0.50, glassBorderOpacity: 0.06, glassSaturation: 180,
      shadowOffsetY: 8, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.00,
      cardRadius: 24, inputRadius: 999, chipRadius: 999, modalRadius: 28,
      animDuration: 180, animEasing: 'cubic-bezier(0.34,1.56,0.64,1)',
      borderWidth: 2, borderStyle: 'solid', gridGap: 18,
      accentHue: 330, accentSaturation: 80, accentLightness: 55,
      darkElevation: 10, darkSaturation: 65,
      inputBgOpacity: 0.08, inputBorderOpacity: 0.12, inputPaddingH: 18, inputPaddingV: 12, inputFontSize: 0,
      chipBgOpacity: 0.12, chipBorderOpacity: 0.10, chipPaddingH: 14, chipPaddingV: 6,
      navItemRadius: 999, navItemPaddingH: 16, navItemPaddingV: 9,
      statusBgOpacity: 0.15, statusPillRadius: 999,
      modalOverlayOpacity: 0.20, dropdownBlur: 18,
      scrollbarWidth: 8, scrollbarOpacity: 0.20,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.06,
      badgeBgOpacity: 0.20, badgeRadius: 999,
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Чертёжный стиль — тонкие рамки, dashed-линии',
    icon: '⊞',
    tokens: {
      btnRadius: 2, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 16, btnPaddingV: 7,
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.06, lineHeight: 1.5, typeScale: 1.15,
      glassBlur: 0, glassOpacity: 0.95, glassBorderOpacity: 0.10, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 2, inputRadius: 2, chipRadius: 2, modalRadius: 4,
      animDuration: 80, animEasing: 'linear',
      borderWidth: 1, borderStyle: 'dashed', gridGap: 14,
      accentHue: 210, accentSaturation: 70, accentLightness: 50,
      darkElevation: 3, darkSaturation: 45,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.15, inputPaddingH: 8, inputPaddingV: 6, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.15, chipPaddingH: 6, chipPaddingV: 2,
      navItemRadius: 2, navItemPaddingH: 10, navItemPaddingV: 5,
      statusBgOpacity: 0.08, statusPillRadius: 2,
      modalOverlayOpacity: 0.35, dropdownBlur: 0,
      scrollbarWidth: 3, scrollbarOpacity: 0.15,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.12,
      badgeBgOpacity: 0.12, badgeRadius: 2,
    },
  },
  /* ── Architectural / Award-winning site presets ───── */
  {
    id: 'minale',
    name: 'Minale + Mann',
    description: 'Стримлайн-минимализм — свет как материал, кинематографичные переходы',
    icon: '▯',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 24, btnPaddingV: 12,
      fontFamily: '"Helvetica Neue", "Arial", "Segoe UI", sans-serif',
      fontWeight: 300, headingWeight: 300, letterSpacing: 0.10, lineHeight: 1.75, typeScale: 1.333,
      paragraphSpacing: 1.2, wordSpacing: 0.04,
      headingLetterSpacing: 0.08, headingLineHeight: 1.15, textAlign: 'left',
      accentHue: 30, accentSaturation: 6, accentLightness: 22,
      successHue: 160, successSaturation: 20, errorHue: 0, errorSaturation: 35, warningHue: 42, warningSaturation: 30,
      glassBlur: 40, glassOpacity: 0.12, glassBorderOpacity: 0.00, glassSaturation: 105,
      shadowOffsetY: 0, shadowBlurRadius: 48, shadowSpread: 0, shadowOpacity: 0.03,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 600, animEasing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 24,
      darkElevation: 2, darkSaturation: 15,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.06, inputPaddingH: 0, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.03, chipBorderOpacity: 0.00, chipPaddingH: 12, chipPaddingV: 4,
      navItemRadius: 0, navItemPaddingH: 16, navItemPaddingV: 10,
      statusBgOpacity: 0.04, statusPillRadius: 0,
      modalOverlayOpacity: 0.65, dropdownBlur: 40,
      scrollbarWidth: 2, scrollbarOpacity: 0.04,
      tableHeaderOpacity: 0.02, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.03,
      badgeBgOpacity: 0.06, badgeRadius: 0,
    },
  },
  /* ── New wave presets ────────────────────────────── */
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    description: 'Геометрия и функция — первичные цвета, строгая сетка',
    icon: '△',
    tokens: {
      btnRadius: 0, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 700,
      btnPaddingH: 20, btnPaddingV: 10,
      fontFamily: '"DM Sans", "Futura", "Century Gothic", sans-serif',
      fontWeight: 400, headingWeight: 800, letterSpacing: 0.06, lineHeight: 1.4, typeScale: 1.414,
      paragraphSpacing: 0.5,
      headingLetterSpacing: 0.02, headingLineHeight: 1.1,
      accentHue: 4, accentSaturation: 85, accentLightness: 50,
      successHue: 142, successSaturation: 70, errorHue: 0, errorSaturation: 85, warningHue: 48, warningSaturation: 90,
      glassBlur: 0, glassOpacity: 0.95, glassBorderOpacity: 0.0, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 80, animEasing: 'linear',
      borderWidth: 3, borderStyle: 'solid', gridGap: 16, gridColumns: 12,
      darkElevation: 2, darkSaturation: 15,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.20, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.20, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.14, statusPillRadius: 0,
      modalOverlayOpacity: 0.45, dropdownBlur: 0,
      scrollbarWidth: 6, scrollbarOpacity: 0.25,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.15,
      badgeBgOpacity: 0.18, badgeRadius: 0,
    },
  },
  {
    id: 'artdeco',
    name: 'Art Deco',
    description: 'Золотой век — орнаментальный шик, контраст и элегантность',
    icon: '♢',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 28, btnPaddingV: 12,
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.12, lineHeight: 1.6, typeScale: 1.333,
      paragraphSpacing: 1.0,
      headingLetterSpacing: 0.10, headingLineHeight: 1.15,
      accentHue: 42, accentSaturation: 80, accentLightness: 48,
      successHue: 155, successSaturation: 40, errorHue: 350, errorSaturation: 65, warningHue: 38, warningSaturation: 60,
      glassBlur: 6, glassOpacity: 0.65, glassBorderOpacity: 0.12, glassSaturation: 110,
      shadowOffsetY: 2, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 300, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      borderWidth: 2, borderStyle: 'solid', gridGap: 22,
      darkElevation: 3, darkSaturation: 25,
      inputBgOpacity: 0.02, inputBorderOpacity: 0.15, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.04, chipBorderOpacity: 0.12, chipPaddingH: 12, chipPaddingV: 4,
      navItemRadius: 0, navItemPaddingH: 18, navItemPaddingV: 8,
      statusBgOpacity: 0.10, statusPillRadius: 0,
      modalOverlayOpacity: 0.55, dropdownBlur: 6,
      scrollbarWidth: 3, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.05, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.12, badgeRadius: 0,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Неон на тёмном — высокий контраст, кислотные акценты',
    icon: '⚡',
    tokens: {
      btnRadius: 2, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 700,
      btnPaddingH: 20, btnPaddingV: 9,
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontWeight: 400, headingWeight: 800, letterSpacing: 0.04, lineHeight: 1.45, typeScale: 1.25,
      headingLetterSpacing: 0.06, headingLineHeight: 1.1,
      accentHue: 180, accentSaturation: 100, accentLightness: 50,
      successHue: 120, successSaturation: 90, errorHue: 340, errorSaturation: 95, warningHue: 55, warningSaturation: 100,
      glassBlur: 16, glassOpacity: 0.20, glassBorderOpacity: 0.18, glassSaturation: 200,
      shadowOffsetY: 0, shadowBlurRadius: 24, shadowSpread: 0, shadowOpacity: 0.25,
      cardRadius: 2, inputRadius: 2, chipRadius: 2, modalRadius: 4,
      animDuration: 100, animEasing: 'linear',
      borderWidth: 1, borderStyle: 'solid', gridGap: 12,
      darkElevation: 12, darkSaturation: 80,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.18, inputPaddingH: 10, inputPaddingV: 7, inputFontSize: 0,
      chipBgOpacity: 0.10, chipBorderOpacity: 0.15, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 2, navItemPaddingH: 10, navItemPaddingV: 5,
      statusBgOpacity: 0.18, statusPillRadius: 2,
      modalOverlayOpacity: 0.60, dropdownBlur: 16,
      scrollbarWidth: 4, scrollbarOpacity: 0.30,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.06, tableBorderOpacity: 0.14,
      badgeBgOpacity: 0.22, badgeRadius: 2,
    },
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Ваби-саби — органичный, приглушённый, несовершенно прекрасный',
    icon: '☯',
    tokens: {
      btnRadius: 6, btnStyle: 'ghost', btnTransform: 'none', btnWeight: 400,
      btnPaddingH: 16, btnPaddingV: 8,
      fontFamily: '"Manrope", "Noto Sans", sans-serif',
      fontWeight: 300, headingWeight: 400, letterSpacing: 0.03, lineHeight: 1.75, typeScale: 1.15,
      paragraphSpacing: 1.2, wordSpacing: 0.02,
      headingLetterSpacing: 0.04, headingLineHeight: 1.3,
      accentHue: 28, accentSaturation: 18, accentLightness: 45,
      successHue: 140, successSaturation: 25, errorHue: 8, errorSaturation: 40, warningHue: 40, warningSaturation: 35,
      glassBlur: 20, glassOpacity: 0.25, glassBorderOpacity: 0.02, glassSaturation: 95,
      shadowOffsetY: 2, shadowBlurRadius: 32, shadowSpread: 0, shadowOpacity: 0.03,
      cardRadius: 6, inputRadius: 4, chipRadius: 6, modalRadius: 8,
      animDuration: 400, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 24,
      darkElevation: 4, darkSaturation: 20,
      inputBgOpacity: 0.03, inputBorderOpacity: 0.04, inputPaddingH: 12, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.04, chipBorderOpacity: 0.00, chipPaddingH: 10, chipPaddingV: 4,
      navItemRadius: 4, navItemPaddingH: 14, navItemPaddingV: 8,
      statusBgOpacity: 0.05, statusPillRadius: 6,
      modalOverlayOpacity: 0.30, dropdownBlur: 20,
      scrollbarWidth: 2, scrollbarOpacity: 0.06,
      tableHeaderOpacity: 0.02, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.03,
      badgeBgOpacity: 0.08, badgeRadius: 6,
    },
  },
  {
    id: 'y2k',
    name: 'Y2K Futurism',
    description: 'Глянец и градиенты — ретро-будущее 2000-х',
    icon: '✿',
    tokens: {
      btnRadius: 999, btnStyle: 'filled', btnTransform: 'none', btnWeight: 700,
      btnPaddingH: 22, btnPaddingV: 11,
      fontFamily: '"Outfit", "Trebuchet MS", sans-serif',
      fontWeight: 400, headingWeight: 800, letterSpacing: 0.00, lineHeight: 1.45, typeScale: 1.25,
      headingLetterSpacing: -0.02, headingLineHeight: 1.1,
      accentHue: 290, accentSaturation: 75, accentLightness: 58,
      successHue: 150, successSaturation: 70, errorHue: 345, errorSaturation: 80, warningHue: 45, warningSaturation: 85,
      glassBlur: 28, glassOpacity: 0.40, glassBorderOpacity: 0.10, glassSaturation: 190,
      shadowOffsetY: 6, shadowBlurRadius: 20, shadowSpread: 0, shadowOpacity: 0.10,
      cardRadius: 20, inputRadius: 999, chipRadius: 999, modalRadius: 24,
      animDuration: 160, animEasing: 'cubic-bezier(0.34,1.56,0.64,1)',
      borderWidth: 2, borderStyle: 'solid', gridGap: 16,
      darkElevation: 10, darkSaturation: 65,
      inputBgOpacity: 0.08, inputBorderOpacity: 0.10, inputPaddingH: 16, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.12, chipBorderOpacity: 0.08, chipPaddingH: 12, chipPaddingV: 5,
      navItemRadius: 999, navItemPaddingH: 14, navItemPaddingV: 8,
      statusBgOpacity: 0.14, statusPillRadius: 999,
      modalOverlayOpacity: 0.25, dropdownBlur: 24,
      scrollbarWidth: 6, scrollbarOpacity: 0.18,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.06,
      badgeBgOpacity: 0.20, badgeRadius: 999,
    },
  },
  {
    id: 'newspaper',
    name: 'Newspaper',
    description: 'Газетная вёрстка — плотные колонки, чёрная типографика',
    icon: '▧',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 600,
      btnPaddingH: 14, btnPaddingV: 6,
      fontFamily: 'Georgia, "Times New Roman", "Noto Serif", serif',
      fontWeight: 400, headingWeight: 900, letterSpacing: 0.01, lineHeight: 1.55, typeScale: 1.5,
      paragraphSpacing: 0.5, textIndent: 1.5,
      headingLetterSpacing: -0.02, headingLineHeight: 1.05,
      paragraphMaxWidth: 65,
      accentHue: 0, accentSaturation: 0, accentLightness: 10,
      successHue: 142, successSaturation: 30, errorHue: 0, errorSaturation: 50, warningHue: 38, warningSaturation: 40,
      glassBlur: 0, glassOpacity: 0.98, glassBorderOpacity: 0.0, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 80, animEasing: 'linear',
      borderWidth: 1, borderStyle: 'solid', gridGap: 20, gridColumns: 12,
      darkElevation: 3, darkSaturation: 0,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.12, inputPaddingH: 8, inputPaddingV: 6, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.10, chipPaddingH: 6, chipPaddingV: 2,
      navItemRadius: 0, navItemPaddingH: 8, navItemPaddingV: 4,
      statusBgOpacity: 0.06, statusPillRadius: 0,
      modalOverlayOpacity: 0.40, dropdownBlur: 0,
      scrollbarWidth: 3, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.08, badgeRadius: 0,
    },
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    description: 'Нежные тона — воздушный, мечтательный, пастельная палитра',
    icon: '❋',
    tokens: {
      btnRadius: 16, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontFamily: '"DM Sans", "Nunito", sans-serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.6, typeScale: 1.2,
      headingLetterSpacing: 0.00, headingLineHeight: 1.25,
      accentHue: 260, accentSaturation: 45, accentLightness: 72,
      successHue: 150, successSaturation: 40, errorHue: 350, errorSaturation: 50, warningHue: 35, warningSaturation: 50,
      glassBlur: 24, glassOpacity: 0.45, glassBorderOpacity: 0.04, glassSaturation: 150,
      shadowOffsetY: 8, shadowBlurRadius: 28, shadowSpread: 0, shadowOpacity: 0.06,
      cardRadius: 18, inputRadius: 12, chipRadius: 999, modalRadius: 22,
      animDuration: 240, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 0, gridGap: 18,
      darkElevation: 8, darkSaturation: 40,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.00, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.08, chipBorderOpacity: 0.00, chipPaddingH: 10, chipPaddingV: 4,
      navItemRadius: 14, navItemPaddingH: 14, navItemPaddingV: 7,
      statusBgOpacity: 0.10, statusPillRadius: 999,
      modalOverlayOpacity: 0.20, dropdownBlur: 20,
      scrollbarWidth: 5, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.04,
      badgeBgOpacity: 0.14, badgeRadius: 999,
    },
  },
  {
    id: 'tokyonoir',
    name: 'Tokyo Noir',
    description: 'Тёмный токийский UI — насыщенный, контрастный, японский минимализм',
    icon: '◈',
    tokens: {
      btnRadius: 6, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 16, btnPaddingV: 8,
      fontFamily: '"Inter", "Noto Sans JP", sans-serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.02, lineHeight: 1.5, typeScale: 1.2,
      headingLetterSpacing: 0.00, headingLineHeight: 1.2,
      accentHue: 340, accentSaturation: 70, accentLightness: 55,
      successHue: 160, successSaturation: 60, errorHue: 0, errorSaturation: 75, warningHue: 42, warningSaturation: 70,
      glassBlur: 18, glassOpacity: 0.15, glassBorderOpacity: 0.10, glassSaturation: 160,
      shadowOffsetY: 4, shadowBlurRadius: 20, shadowSpread: 0, shadowOpacity: 0.18,
      cardRadius: 8, inputRadius: 6, chipRadius: 6, modalRadius: 12,
      animDuration: 150, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 14,
      darkElevation: 10, darkSaturation: 65,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.12, inputPaddingH: 12, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.08, chipBorderOpacity: 0.10, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 6, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.14, statusPillRadius: 6,
      modalOverlayOpacity: 0.55, dropdownBlur: 16,
      scrollbarWidth: 3, scrollbarOpacity: 0.15,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.16, badgeRadius: 6,
    },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Средиземноморье — тёплая глина, натуральные тона',
    icon: '◖',
    tokens: {
      btnRadius: 8, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 18, btnPaddingV: 9,
      fontFamily: '"Manrope", Georgia, sans-serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.6, typeScale: 1.2,
      paragraphSpacing: 0.8, wordSpacing: 0.01,
      headingLetterSpacing: 0.01, headingLineHeight: 1.2,
      accentHue: 16, accentSaturation: 55, accentLightness: 48,
      successHue: 145, successSaturation: 35, errorHue: 355, errorSaturation: 55, warningHue: 32, warningSaturation: 50,
      glassBlur: 14, glassOpacity: 0.50, glassBorderOpacity: 0.06, glassSaturation: 115,
      shadowOffsetY: 4, shadowBlurRadius: 20, shadowSpread: 0, shadowOpacity: 0.05,
      cardRadius: 10, inputRadius: 6, chipRadius: 10, modalRadius: 14,
      animDuration: 220, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 18,
      darkElevation: 6, darkSaturation: 35,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.08, inputPaddingH: 12, inputPaddingV: 9, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.06, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 8, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.09, statusPillRadius: 10,
      modalOverlayOpacity: 0.35, dropdownBlur: 14,
      scrollbarWidth: 4, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.07,
      badgeBgOpacity: 0.12, badgeRadius: 10,
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Ледяной — чистый, холодный, кристально-голубой',
    icon: '❅',
    tokens: {
      btnRadius: 10, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.55, typeScale: 1.2,
      headingLetterSpacing: 0.00, headingLineHeight: 1.2,
      accentHue: 200, accentSaturation: 65, accentLightness: 55,
      successHue: 170, successSaturation: 50, errorHue: 355, errorSaturation: 60, warningHue: 35, warningSaturation: 55,
      glassBlur: 28, glassOpacity: 0.30, glassBorderOpacity: 0.06, glassSaturation: 170,
      shadowOffsetY: 6, shadowBlurRadius: 24, shadowSpread: 0, shadowOpacity: 0.05,
      cardRadius: 14, inputRadius: 8, chipRadius: 999, modalRadius: 18,
      animDuration: 200, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 16,
      darkElevation: 6, darkSaturation: 50,
      inputBgOpacity: 0.05, inputBorderOpacity: 0.06, inputPaddingH: 12, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.04, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 10, navItemPaddingH: 12, navItemPaddingV: 6,
      statusBgOpacity: 0.09, statusPillRadius: 999,
      modalOverlayOpacity: 0.28, dropdownBlur: 24,
      scrollbarWidth: 4, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.05,
      badgeBgOpacity: 0.12, badgeRadius: 999,
    },
  },
  /* ── Architectural DNA presets ─────────────────────────────
     Inspired by world-class architecture firm identities.
     Each one radically changes motion, colour, spacing & type. */
  {
    id: 'snohetta',
    name: 'Snøhetta',
    description: 'Северное молчание — свет как материал, пространство как тишина',
    icon: '⧆',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 300,
      btnPaddingH: 28, btnPaddingV: 12,
      btnHoverAnim: 'lift',
      fontFamily: '"Manrope", -apple-system, sans-serif',
      fontWeight: 300, headingWeight: 300, letterSpacing: 0.05, lineHeight: 1.80, typeScale: 1.414,
      paragraphSpacing: 1.5, wordSpacing: 0.02,
      headingLetterSpacing: 0.07, headingLineHeight: 1.05,
      accentHue: 185, accentSaturation: 22, accentLightness: 42,
      successHue: 165, successSaturation: 25, errorHue: 5, errorSaturation: 40, warningHue: 38, warningSaturation: 30,
      glassBlur: 52, glassOpacity: 0.07, glassBorderOpacity: 0.00, glassSaturation: 103,
      shadowOffsetY: 0, shadowBlurRadius: 72, shadowSpread: 0, shadowOpacity: 0.025,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 420, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 30,
      cardHoverAnim: 'lift',
      darkElevation: 3, darkSaturation: 12,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.05, inputPaddingH: 0, inputPaddingV: 13, inputFontSize: 0,
      chipBgOpacity: 0.03, chipBorderOpacity: 0.00, chipPaddingH: 14, chipPaddingV: 5,
      navItemRadius: 0, navItemPaddingH: 20, navItemPaddingV: 12,
      statusBgOpacity: 0.04, statusPillRadius: 0,
      modalOverlayOpacity: 0.62, dropdownBlur: 52,
      scrollbarWidth: 1, scrollbarOpacity: 0.04,
      tableHeaderOpacity: 0.02, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.03,
      badgeBgOpacity: 0.06, badgeRadius: 0,
      colorPageBg: '#f7f6f3',
    },
  },
  {
    id: 'olsonkundig',
    name: 'Olson Kundig',
    description: 'Сырой материал — бетон, сталь, камень; руки, которые строят',
    icon: '▮',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 22, btnPaddingV: 10,
      btnHoverAnim: 'lift',
      fontFamily: '"Outfit", "Helvetica Neue", sans-serif',
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.04, lineHeight: 1.5, typeScale: 1.333,
      headingLetterSpacing: -0.01, headingLineHeight: 1.1,
      accentHue: 22, accentSaturation: 52, accentLightness: 44,
      successHue: 150, successSaturation: 30, errorHue: 6, errorSaturation: 55, warningHue: 35, warningSaturation: 45,
      glassBlur: 5, glassOpacity: 0.74, glassBorderOpacity: 0.08, glassSaturation: 100,
      shadowOffsetY: 1, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.22,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 190, animEasing: 'ease-out',
      borderWidth: 1, borderStyle: 'solid', gridGap: 18,
      cardHoverAnim: 'lift',
      darkElevation: 5, darkSaturation: 20,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.14, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.05, chipBorderOpacity: 0.12, chipPaddingH: 9, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 12, navItemPaddingV: 7,
      statusBgOpacity: 0.08, statusPillRadius: 0,
      modalOverlayOpacity: 0.55, dropdownBlur: 5,
      scrollbarWidth: 3, scrollbarOpacity: 0.12,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.10, badgeRadius: 0,
      colorPageBg: '#1c1a16', colorText: '#e2d9cc', colorHeading: '#ede5d8',
    },
  },
  {
    id: 'mvrdv',
    name: 'MVRDV',
    description: 'Данные и форма — параметрические блоки, яркая структура',
    icon: '⬛',
    tokens: {
      btnRadius: 0, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      btnPaddingH: 14, btnPaddingV: 8,
      btnHoverAnim: 'scale',
      fontFamily: '"DM Sans", "Arial", sans-serif',
      fontWeight: 400, headingWeight: 900, letterSpacing: 0.00, lineHeight: 1.35, typeScale: 1.333,
      headingLetterSpacing: -0.03, headingLineHeight: 1.0,
      accentHue: 52, accentSaturation: 100, accentLightness: 48,
      successHue: 135, successSaturation: 80, errorHue: 0, errorSaturation: 92, warningHue: 52, warningSaturation: 100,
      glassBlur: 0, glassOpacity: 0.97, glassBorderOpacity: 0.00, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 80, animEasing: 'linear',
      borderWidth: 2, borderStyle: 'solid', gridGap: 12, gridColumns: 12,
      cardHoverAnim: 'none',
      darkElevation: 2, darkSaturation: 12,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.22, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.22, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 10, navItemPaddingV: 6,
      statusBgOpacity: 0.12, statusPillRadius: 0,
      modalOverlayOpacity: 0.50, dropdownBlur: 0,
      scrollbarWidth: 6, scrollbarOpacity: 0.22,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.14,
      badgeBgOpacity: 0.16, badgeRadius: 0,
      colorPageBg: '#ffffff', colorText: '#0a0a0a',
    },
  },
  {
    id: 'som',
    name: 'SOM',
    description: 'Структурная ясность — инженерная точность, системный порядок',
    icon: '⊟',
    tokens: {
      btnRadius: 3, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 20, btnPaddingV: 9,
      btnHoverAnim: 'lift',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.48, typeScale: 1.25,
      headingLetterSpacing: -0.01, headingLineHeight: 1.2,
      accentHue: 212, accentSaturation: 77, accentLightness: 45,
      successHue: 148, successSaturation: 60, errorHue: 2, errorSaturation: 70, warningHue: 38, warningSaturation: 88,
      glassBlur: 12, glassOpacity: 0.60, glassBorderOpacity: 0.08, glassSaturation: 110,
      shadowOffsetY: 2, shadowBlurRadius: 12, shadowSpread: 0, shadowOpacity: 0.06,
      cardRadius: 4, inputRadius: 3, chipRadius: 4, modalRadius: 6,
      animDuration: 160, animEasing: 'ease',
      borderWidth: 1, borderStyle: 'solid', gridGap: 16, gridColumns: 12,
      cardHoverAnim: 'lift',
      darkElevation: 5, darkSaturation: 42,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.10, inputPaddingH: 11, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.05, chipBorderOpacity: 0.08, chipPaddingH: 9, chipPaddingV: 3,
      navItemRadius: 3, navItemPaddingH: 11, navItemPaddingV: 6,
      statusBgOpacity: 0.09, statusPillRadius: 3,
      modalOverlayOpacity: 0.35, dropdownBlur: 12,
      scrollbarWidth: 3, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.03, tableBorderOpacity: 0.07,
      badgeBgOpacity: 0.11, badgeRadius: 3,
    },
  },
  {
    id: 'mad',
    name: 'MAD Architects',
    description: 'Космическая пустота — органические формы плывут в бесконечности',
    icon: '∞',
    tokens: {
      btnRadius: 999, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 300,
      btnPaddingH: 32, btnPaddingV: 13,
      btnHoverAnim: 'glow',
      fontFamily: '"Manrope", "Inter", sans-serif',
      fontWeight: 300, headingWeight: 200, letterSpacing: 0.20, lineHeight: 1.85, typeScale: 1.25,
      paragraphSpacing: 1.3, wordSpacing: 0.07,
      headingLetterSpacing: 0.14, headingLineHeight: 1.12,
      accentHue: 196, accentSaturation: 55, accentLightness: 68,
      successHue: 170, successSaturation: 45, errorHue: 350, errorSaturation: 50, warningHue: 38, warningSaturation: 55,
      glassBlur: 38, glassOpacity: 0.10, glassBorderOpacity: 0.04, glassSaturation: 185,
      shadowOffsetY: 0, shadowBlurRadius: 60, shadowSpread: 0, shadowOpacity: 0.035,
      cardRadius: 26, inputRadius: 999, chipRadius: 999, modalRadius: 32,
      animDuration: 540, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      borderWidth: 0, borderStyle: 'none', gridGap: 26,
      cardHoverAnim: 'scale',
      darkElevation: 12, darkSaturation: 50,
      inputBgOpacity: 0.05, inputBorderOpacity: 0.04, inputPaddingH: 18, inputPaddingV: 12, inputFontSize: 0,
      chipBgOpacity: 0.07, chipBorderOpacity: 0.00, chipPaddingH: 14, chipPaddingV: 5,
      navItemRadius: 999, navItemPaddingH: 20, navItemPaddingV: 11,
      statusBgOpacity: 0.06, statusPillRadius: 999,
      modalOverlayOpacity: 0.72, dropdownBlur: 38,
      scrollbarWidth: 2, scrollbarOpacity: 0.05,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.03,
      badgeBgOpacity: 0.10, badgeRadius: 999,
      colorPageBg: '#07080c', colorText: '#c5d8e8', colorHeading: '#e0f2ff', colorLink: '#78b8d4',
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
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tokens.value))
    } catch (err) {
      console.warn('Failed to save design tokens:', err)
    }
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
    if (isDark) {
      el.style.setProperty('--dropdown-bg', 'rgba(18, 21, 30, 0.98)')
      el.style.setProperty('--dropdown-border', 'rgba(255,255,255,0.12)')
      el.style.setProperty('--dropdown-shadow', '0 4px 28px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.30)')
    } else {
      el.style.setProperty('--dropdown-bg', 'rgba(255, 255, 255, 0.97)')
      el.style.setProperty('--dropdown-border', 'rgba(0,0,0,0.10)')
      el.style.setProperty('--dropdown-shadow', '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)')
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
    el.setAttribute('data-btn-hover', t.btnHoverAnim)
    el.setAttribute('data-card-hover', t.cardHoverAnim)

    // Re-apply UI theme's CSS vars on top (they set --btn-bg-base, --glass-* etc.
    // which must persist after applyToDOM sets --btn-bg = var(--btn-bg-base))
    try {
      const { refreshThemeVars, themeId, UI_THEMES } = useUITheme()
      refreshThemeVars()

      // Override glass-bg / glass-border / glass-shadow alpha with design-system
      // token values. Theme vars hardcode rgba(…,0.52) etc.; we parse out the RGB
      // and re-apply the alpha from the token so the Glass controls in the panel
      // actually work.
      const theme = UI_THEMES.find(th => th.id === themeId.value)
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
    _setOrDel('--btn-bg-base',       t.colorBtnBg)
    _setOrDel('--btn-color',         t.colorBtnText)
    _setOrDel('--ds-heading-color',  t.colorHeading)
    _setOrDel('--ds-link-color',     t.colorLink)

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
    // Reset colour overrides so each preset starts with a clean colour story
    const colourReset = {
      colorPageBg: '', colorSurface: '', colorBorder: '', colorText: '',
      colorHeading: '', colorLink: '', colorBtnBg: '', colorBtnText: '',
    }
    tokens.value = { ...tokens.value, ...colourReset, ...preset.tokens }
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
    previewPreset, confirmPreview, cancelPreview, isPreviewActive,
    customPresets, loadCustomPresets, saveCustomPreset, deleteCustomPreset, renameCustomPreset,
  }
}
