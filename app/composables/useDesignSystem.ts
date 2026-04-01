import {
  CONCEPT_TO_DESIGN_MODE,
  DEFAULT_DESIGN_MODE,
  DEFAULT_DESIGN_CONCEPT,
  DESIGN_CONCEPT_STORAGE_KEY,
  DESIGN_MODE_STORAGE_KEY,
  DESIGN_MODE_TO_CONCEPT,
  DESIGN_TOKENS_STORAGE_KEY,
  LEGACY_DESIGN_TOKENS_STORAGE_KEYS,
} from '~~/shared/constants/design-modes'
import type { DesignConceptSlug, DesignMode } from '~~/shared/types/design-mode'

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
  navPanelGap: number           // px — vertical gap between sidebar blocks
  navListGap: number            // px — gap between menu items
  navLayoutPreset: 'compact' | 'balanced' | 'showcase' | 'rail' // menu object layout preset

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
  colorNavBg:   string   // --ds-nav-bg      — navigation / sidebar background
  colorMuted:   string   // --ds-muted       — secondary / muted text
  colorInputBg: string   // --ds-input-bg-custom — input / field background
  colorTagBg:   string   // --ds-tag-bg      — tag / chip background
  colorTagText: string   // --ds-tag-color   — tag / chip text
  colorCardBg:  string   // --ds-card-bg     — card / modal background override

  /* ── Button & Card hover animation ── */
  btnHoverAnim: 'none' | 'lift' | 'scale' | 'glow' | 'fill' | 'sheen' | 'pulse' | 'shutter' | 'magnet' | 'scan' | 'ripple'  // kinetic hover style
  cardHoverAnim: 'none' | 'lift' | 'scale' | 'dim' | 'border' | 'reveal' // card hover micromotion

  /* ── Design Architecture tokens ── */
  archDensity:        'dense' | 'normal' | 'airy' | 'grand'              // spatial density preset
  archHeadingTracking: number                                             // ×0.01em, range -5..30
  archHeadingCase:    'none' | 'uppercase' | 'lowercase' | 'capitalize'  // heading text-transform
  archDivider:        'none' | 'line' | 'gradient'                       // section divider style
  archPageEnter:      'none' | 'fade' | 'slide' | 'slide-l' | 'slide-r' | 'slide-t' | 'slide-b' | 'curtain' | 'curtain-b' | 'zoom' | 'flip' | 'blur' | 'scale-fade' | 'drift-r' | 'drift-l' | 'clip-x' | 'clip-y' | 'skew' // page-enter transition
  pageTransitDuration: number                                             // ms, 0..10000 — speed of page transition
  contentViewMode:    'scroll' | 'paged' | 'flow' | 'wipe' | 'wipe2'     // content viewport behavior
  archLinkAnim:       'none' | 'underline' | 'arrow'                     // link hover animation
  archSectionStyle:   'flat' | 'card' | 'striped'                        // section background style
  archNavStyle:       'full' | 'minimal' | 'hidden'                      // nav chrome level
  archCardChrome:     'visible' | 'subtle' | 'ghost'                     // card border / shadow visibility
  archHeroScale:      'compact' | 'normal' | 'large' | 'cinematic'       // page title scale
  archVerticalRhythm: number                                             // 0.5..3.0 — vertical spacing multiplier
  archContentReveal:  'none' | 'fade-up' | 'fade' | 'slide-up' | 'blur'  // section enter animation
  archTextReveal:     'none' | 'clip' | 'blur-in' | 'letter-fade'         // text reveal animation style
  archNavTransition:  'none' | 'fade' | 'slide' | 'push' | 'stack' | 'blur' // sidebar drill-down transition
  navTransitDuration: number                                             // ms, 80..700 — sidebar transition speed
  navTransitDistance: number                                             // px, 0..56 — sidebar transition amplitude
  navItemStagger:     number                                             // ms, 0..60 — per-item cascade delay

  /* ── Wipe mode settings ── */
  wipeTopInset:       number    // px, 24..120 — top padding of the card from viewport edge
  wipeBottomInset:    number    // px, 24..200 — bottom padding (includes pager rail)
  wipeSideMargin:     number    // px, 0..80  — horizontal margin of the card
  wipeContentPadding: number    // px, 0..48  — internal content padding inside the card
  wipeCardRadius:     number    // px, 0..32  — card border-radius
  wipeCardBorder:     number    // px, 0..4   — card border width
  wipeCardShadow:     number    // 0..1       — card shadow intensity
  wipePageFill:       number    // 0.3..1.0   — page fill ratio (lower = less content per card)
  wipeTransition:     'slide' | 'fade' | 'curtain' | 'blur'  // transition effect between cards
}

/* ═══════════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════════ */
export const DEFAULT_TOKENS: DesignTokens = {
  btnRadius: 0,
  btnSize: 'md',
  btnStyle: 'filled',
  btnTransform: 'none',
  btnWeight: 400,

  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 1,
  fontWeight: 400,
  headingWeight: 400,
  letterSpacing: 0,
  lineHeight: 1.6,
  paragraphSpacing: 1.5,
  wordSpacing: 0,
  textIndent: 0,
  headingLetterSpacing: -0.02,
  headingLineHeight: 1.1,
  paragraphMaxWidth: 0,
  textAlign: 'left',
  typeScale: 1.25,

  accentHue: 0,
  accentSaturation: 0,
  accentLightness: 10,
  successHue: 142,
  successSaturation: 30,
  errorHue: 0,
  errorSaturation: 50,
  warningHue: 38,
  warningSaturation: 30,

  glassBlur: 0,
  glassOpacity: 1,
  glassBorderOpacity: 0.1,
  glassSaturation: 100,

  shadowOffsetY: 0,
  shadowBlurRadius: 0,
  shadowSpread: 0,
  shadowOpacity: 0,

  spacingBase: 6,
  spacingScale: 1,

  cardRadius: 0,
  inputRadius: 0,
  chipRadius: 0,
  modalRadius: 0,

  animDuration: 180,
  animEasing: 'ease',

  containerWidth: 1140,
  sidebarWidth: 260,
  gridGap: 16,
  gridColumns: 12,

  borderWidth: 1,
  borderStyle: 'solid',

  darkElevation: 0,
  darkSaturation: 100,

  inputBgOpacity: 0.1,
  inputBorderOpacity: 0.2,

  chipBgOpacity: 0.1,
  chipBorderOpacity: 0.2,
  chipPaddingH: 14,
  chipPaddingV: 6,

  inputPaddingH: 16,
  inputPaddingV: 12,
  inputFontSize: 0,

  navItemPaddingH: 16,
  navItemPaddingV: 12,
  navPanelGap: 8,
  navListGap: 2,
  navLayoutPreset: 'balanced',

  btnPaddingH: 0,
  btnPaddingV: 0,

  navItemRadius: 0,

  statusBgOpacity: 0.1,
  statusPillRadius: 0,

  modalOverlayOpacity: 0.8,
  dropdownBlur: 0,

  scrollbarWidth: 8,
  scrollbarOpacity: 0.3,

  tableHeaderOpacity: 0.05,
  tableRowHoverOpacity: 0.05,
  tableBorderOpacity: 0.1,

  badgeBgOpacity: 0.1,
  badgeRadius: 0,

  focusRingWidth: 1,
  focusRingOffset: 2,
  focusRingStyle: 'solid',
  focusRingOpacity: 0.5,

  colorPageBg: '#f6f6f6',
  colorSurface: '#ffffff',
  colorBorder: '#000000',
  colorText:    '#111111',
  colorHeading: '#000000',
  colorLink:    '#111111',
  colorBtnBg:   '#111111',
  colorBtnText: '#ffffff',
  colorNavBg:   '#ffffff',
  colorMuted:   '#666666',
  colorInputBg: '#f9f9f9',
  colorTagBg:   '#f5f5f5',
  colorTagText: '#111111',
  colorCardBg:  '#ffffff',

  btnHoverAnim: 'none',
  cardHoverAnim: 'none',

  archDensity:         'airy',
  archHeadingTracking: -2,
  archHeadingCase:     'none',
  archDivider:         'line',
  archPageEnter:       'fade',
  pageTransitDuration: 280,
  contentViewMode:     'scroll',
  archLinkAnim:        'underline',
  archSectionStyle:    'flat',
  archNavStyle:        'minimal',
  archCardChrome:      'visible',
  archHeroScale:       'normal',
  archVerticalRhythm:  1,
  archNavTransition:  'slide',
  navTransitDuration: 220,
  navTransitDistance: 18,
  navItemStagger: 12,

  wipeTopInset: 48,
  wipeBottomInset: 106,
  wipeSideMargin: 20,
  wipeContentPadding: 20,
  wipeCardRadius: 14,
  wipeCardBorder: 1,
  wipeCardShadow: 0.4,
  wipePageFill: 0.85,
  wipeTransition: 'slide',
  archContentReveal: 'none',
  archTextReveal: 'none',
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
    name: 'Минимализм',
    description: 'Чистый и лаконичный — как Linear',
    icon: '◻',
    tokens: {
      btnRadius: 4, btnStyle: 'outline', btnTransform: 'none', btnWeight: 400,
      btnPaddingH: 0, btnPaddingV: 0,
      btnHoverAnim: 'none', cardHoverAnim: 'dim',
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
      archDensity: 'normal', archHeadingTracking: 2, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'flat',
    },
  },
  {
    id: 'soft',
    name: 'Мягкость',
    description: 'Округлый и мягкий — как Notion',
    icon: '◉',
    tokens: {
      btnRadius: 999, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
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
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
    },
  },
  {
    id: 'brutalist',
    name: 'Брутализм',
    description: 'Резкий и контрастный — без компромиссов',
    icon: '▬',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 700,
      btnPaddingH: 20, btnPaddingV: 10,
      btnHoverAnim: 'fill', cardHoverAnim: 'border',
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
      archDensity: 'dense', archHeadingTracking: -3, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'none', archSectionStyle: 'striped',
    },
  },
  {
    id: 'corporate',
    name: 'Корпоративный',
    description: 'Деловой — как Salesforce / Stripe',
    icon: '▣',
    tokens: {
      btnRadius: 100, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
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
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
      archDensity: 'normal', archHeadingTracking: 1, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'card',
    },
  },
  {
    id: 'editorial',
    name: 'Редакционный',
    description: 'Журнальная эстетика — serif, воздух',
    icon: '▤',
    tokens: {
      btnRadius: 2, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 500,
      btnPaddingH: 18, btnPaddingV: 8,
      btnHoverAnim: 'fill', cardHoverAnim: 'dim',
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
      archDensity: 'airy', archHeadingTracking: 6, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
    },
  },
  {
    id: 'neomorphism',
    name: 'Неоморфизм',
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
      btnHoverAnim: 'scale', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  /* ── New presets ─────────────────────────────────── */
  {
    id: 'glassmorphism',
    name: 'Стекло',
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
      btnHoverAnim: 'sheen', cardHoverAnim: 'reveal',
      archDensity: 'normal', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  {
    id: 'luxury',
    name: 'Люкс',
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
      btnHoverAnim: 'fill', cardHoverAnim: 'dim',
      archDensity: 'grand', archHeadingTracking: 4, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
    },
  },
  {
    id: 'playful',
    name: 'Игровой',
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
      btnHoverAnim: 'scale', cardHoverAnim: 'lift',
      archDensity: 'normal', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  {
    id: 'swiss',
    name: 'Швейцарский',
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
      btnHoverAnim: 'fill', cardHoverAnim: 'border',
      archDensity: 'normal', archHeadingTracking: 4, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'arrow', archSectionStyle: 'flat',
    },
  },
  {
    id: 'monochrome',
    name: 'Монохром',
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
      btnHoverAnim: 'none', cardHoverAnim: 'dim',
      archDensity: 'normal', archHeadingTracking: 2, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'flat',
    },
  },
  {
    id: 'scandinavian',
    name: 'Скандинавский',
    description: 'Воздушный и тёплый — скандинавский уют',
    icon: '◇',
    tokens: {
      btnRadius: 8, btnStyle: 'soft', btnTransform: 'none', btnWeight: 400,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.65, typeScale: 1.15,
      paragraphSpacing: 1.0,
      glassBlur: 16, glassOpacity: 0.40, glassBorderOpacity: 0.04, glassSaturation: 120,
      shadowOffsetY: 6, shadowBlurRadius: 24, shadowSpread: 0, shadowOpacity: 0.04,
      cardRadius: 16, inputRadius: 8, chipRadius: 10, modalRadius: 16,
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
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
    },
  },
  {
    id: 'dashboard',
    name: 'Дашборд',
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
      btnHoverAnim: 'none', cardHoverAnim: 'border',
      archDensity: 'dense', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'none', archSectionStyle: 'card',
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
      btnHoverAnim: 'scale', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: -1, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
    },
  },
  {
    id: 'retro',
    name: 'Ретро-терминал',
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
      btnHoverAnim: 'none', cardHoverAnim: 'border',
      archDensity: 'dense', archHeadingTracking: 3, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'none', archSectionStyle: 'striped',
    },
  },
  /* ── Effect-focused presets ─────────────────────────── */
  {
    id: 'liquid-glass',
    name: 'Жидкое стекло',
    description: 'Жидкое стекло — объёмные блики, высокая насыщенность, экстремальный блюр',
    icon: '💧',
    tokens: {
      btnRadius: 24, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 0, btnPaddingV: 0,
      fontWeight: 400, headingWeight: 600, letterSpacing: 0.02, lineHeight: 1.5, typeScale: 1.25,
      glassBlur: 48, glassOpacity: 0.15, glassBorderOpacity: 0.3, glassSaturation: 200,
      shadowOffsetY: 12, shadowBlurRadius: 32, shadowSpread: 0, shadowOpacity: 0.1,
      cardRadius: 24, inputRadius: 16, chipRadius: 999, modalRadius: 32,
      animDuration: 300, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      borderWidth: 1, borderStyle: 'solid', gridGap: 24,
      accentHue: 210, accentSaturation: 80, accentLightness: 60,
      darkElevation: 12, darkSaturation: 60,
      inputBgOpacity: 0.10, inputBorderOpacity: 0.15, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.12, chipBorderOpacity: 0.15, chipPaddingH: 12, chipPaddingV: 6,
      navItemRadius: 16, navItemPaddingH: 14, navItemPaddingV: 10,
      statusBgOpacity: 0.15, statusPillRadius: 999,
      modalOverlayOpacity: 0.35, dropdownBlur: 32,
      scrollbarWidth: 6, scrollbarOpacity: 0.15,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.05, tableBorderOpacity: 0.1,
      badgeBgOpacity: 0.2, badgeRadius: 999,
      btnHoverAnim: 'sheen', cardHoverAnim: 'reveal',
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  {
    id: 'glow',
    name: 'Свечение',
    description: 'Неоновое свечение — яркие акценты, глубокие тени',
    icon: '✦',
    tokens: {
      btnRadius: 10, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      btnPaddingH: 22, btnPaddingV: 10,
      fontWeight: 400, headingWeight: 700, letterSpacing: 0.01, lineHeight: 1.5, typeScale: 1.2,
      glassBlur: 24, glassOpacity: 0.25, glassBorderOpacity: 0.15, glassSaturation: 200,
      shadowOffsetY: 0, shadowBlurRadius: 32, shadowSpread: 0, shadowOpacity: 0.20,
      cardRadius: 16, inputRadius: 8, chipRadius: 999, modalRadius: 18,
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
      btnHoverAnim: 'glow', cardHoverAnim: 'reveal',
      archDensity: 'normal', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
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
      btnHoverAnim: 'none', cardHoverAnim: 'none',
      archDensity: 'airy', archHeadingTracking: 4, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      btnHoverAnim: 'scale', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: -2, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
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
      btnHoverAnim: 'none', cardHoverAnim: 'border',
      archDensity: 'dense', archHeadingTracking: 3, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'arrow', archSectionStyle: 'striped',
    },
  },
  /* ── Architectural / Award-winning site presets ───── */
  {
    id: 'minale',
    name: 'Minale + Mann',
    description: 'minaleandmann.com — чёрный фон, белый текст, weight 400, ultra-wide трекинг, ghost-кнопки, монументальная типографика',
    icon: '▯',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 24, btnPaddingV: 10, btnSize: 'lg',
      btnHoverAnim: 'lift', cardHoverAnim: 'dim',
      fontFamily: '"Helvetica Neue", "Arial", "Segoe UI", sans-serif',
      fontSize: 1, fontWeight: 400, headingWeight: 400, letterSpacing: 0.12, lineHeight: 1.8, typeScale: 1.414,
      paragraphSpacing: 2.0, wordSpacing: 0.06, textIndent: 0,
      headingLetterSpacing: 0.22, headingLineHeight: 1.05, paragraphMaxWidth: 50, textAlign: 'left',
      /* ── TRUE BLACK + pure white — Minale+Mann ── */
      colorPageBg: '#000000', colorSurface: '#0a0a0a', colorBorder: '#ffffff',
      colorText: '#ffffff', colorHeading: '#ffffff', colorLink: '#ffffff',
      colorBtnBg: 'transparent', colorBtnText: '#ffffff',
      colorNavBg: '#000000', colorMuted: '#888888',
      colorInputBg: 'transparent', colorTagBg: 'transparent', colorTagText: '#ffffff',
      colorCardBg: '#0a0a0a',
      accentHue: 0, accentSaturation: 0, accentLightness: 100,
      successHue: 160, successSaturation: 10, errorHue: 0, errorSaturation: 20, warningHue: 42, warningSaturation: 15,
      glassBlur: 0, glassOpacity: 0.00, glassBorderOpacity: 0.05, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.00,
      spacingBase: 8, spacingScale: 1.4,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 300, animEasing: 'ease',
      containerWidth: 860, sidebarWidth: 200, gridGap: 48, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 0, darkSaturation: 0,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.20, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.15, chipPaddingH: 16, chipPaddingV: 6,
      navItemRadius: 0, navItemPaddingH: 24, navItemPaddingV: 14,
      statusBgOpacity: 0.04, statusPillRadius: 0,
      modalOverlayOpacity: 0.45, dropdownBlur: 2,
      scrollbarWidth: 0, scrollbarOpacity: 0.00,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.05, badgeRadius: 0,
      focusRingWidth: 1, focusRingOffset: 4, focusRingStyle: 'solid', focusRingOpacity: 0.30,
      archDensity: 'grand', archHeadingTracking: 18, archHeadingCase: 'uppercase',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'flat',
      archNavStyle: 'minimal', archCardChrome: 'ghost', archHeroScale: 'cinematic', archVerticalRhythm: 2.4,
      archContentReveal: 'fade-up', archTextReveal: 'none',
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
      btnHoverAnim: 'fill', cardHoverAnim: 'border',
      archDensity: 'normal', archHeadingTracking: 2, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'arrow', archSectionStyle: 'striped',
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
      btnHoverAnim: 'fill', cardHoverAnim: 'dim',
      archDensity: 'grand', archHeadingTracking: 10, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      btnHoverAnim: 'glow', cardHoverAnim: 'reveal',
      archDensity: 'dense', archHeadingTracking: 3, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  {
    id: 'zen',
    name: 'Zen',
    description: 'Ваби-саби — органичный, приглушённый, несовершенно прекрасный',
    icon: '☯',
    tokens: {
      btnRadius: 100, btnStyle: 'ghost', btnTransform: 'none', btnWeight: 400,
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
      btnHoverAnim: 'none', cardHoverAnim: 'dim',
      archDensity: 'airy', archHeadingTracking: 2, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      btnHoverAnim: 'scale', cardHoverAnim: 'lift',
      archDensity: 'normal', archHeadingTracking: -2, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
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
      btnHoverAnim: 'none', cardHoverAnim: 'none',
      archDensity: 'dense', archHeadingTracking: -2, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'card',
    },
  },
  {
    id: 'tokyonoir',
    name: 'Tokyo Noir',
    description: 'Тёмный токийский UI — насыщенный, контрастный, японский минимализм',
    icon: '◈',
    tokens: {
      btnRadius: 100, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
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
      btnHoverAnim: 'glow', cardHoverAnim: 'reveal',
      archDensity: 'dense', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'slide', archLinkAnim: 'none', archSectionStyle: 'card',
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
      btnHoverAnim: 'lift', cardHoverAnim: 'dim',
      archDensity: 'airy', archHeadingTracking: 1, archHeadingCase: 'none',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      cardRadius: 16, inputRadius: 8, chipRadius: 999, modalRadius: 18,
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
      btnHoverAnim: 'sheen', cardHoverAnim: 'lift',
      archDensity: 'normal', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'card',
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
      archDensity: 'grand', archHeadingTracking: 7, archHeadingCase: 'uppercase',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'arrow', archSectionStyle: 'flat',
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
      archDensity: 'normal', archHeadingTracking: -1, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'underline', archSectionStyle: 'flat',
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
      archDensity: 'dense', archHeadingTracking: -3, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'none', archSectionStyle: 'striped',
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
      archDensity: 'normal', archHeadingTracking: -1, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'card',
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
      archDensity: 'grand', archHeadingTracking: 14, archHeadingCase: 'uppercase',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'arrow', archSectionStyle: 'flat',
    },
  },
]

/* ═══════════════════════════════════════════════════════════
   DESIGN CONCEPTS — holistic UI/UX + architecture + behaviour
   Each concept provides a COMPLETE token set covering:
   visual (colors, typography, glass) + structural (arch*) + kinetic (hover, anim)
   ═══════════════════════════════════════════════════════════ */
export const DESIGN_CONCEPTS: DesignPreset[] = [
  {
    id: 'concept-m3',
    name: 'Material 3',
    description: 'Material You: тональная элевация, плавная анимация (M3 Motion), четкая типографика (Roboto)',
    icon: '⨁',
    tokens: {
      navLayoutPreset: 'rail',
      btnRadius: 999, btnStyle: 'filled', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 24, btnPaddingV: 10,
      fontFamily: 'Roboto, "Roboto Flex", system-ui, sans-serif',
      fontWeight: 400, headingWeight: 400, letterSpacing: 0, lineHeight: 1.5, typeScale: 1.25,
      glassBlur: 0, glassOpacity: 1, glassBorderOpacity: 0, glassSaturation: 100,
      shadowOffsetY: 1, shadowBlurRadius: 3, shadowSpread: 0, shadowOpacity: 0.1,
      cardRadius: 16, inputRadius: 4, chipRadius: 8, modalRadius: 28,
      animDuration: 250, animEasing: 'cubic-bezier(0.2, 0, 0, 1)',
      borderWidth: 0, gridGap: 16,
      accentHue: 250, accentSaturation: 40, accentLightness: 40,
      darkElevation: 4, darkSaturation: 40,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.3, inputPaddingH: 16, inputPaddingV: 16, inputFontSize: 1,
      chipBgOpacity: 0.1, chipBorderOpacity: 0, chipPaddingH: 12, chipPaddingV: 6,
      navItemRadius: 999, navItemPaddingH: 12, navItemPaddingV: 10,
      sidebarWidth: 216, navPanelGap: 10, navListGap: 6, navTransitDistance: 14, navItemStagger: 10,
      statusBgOpacity: 0.12, statusPillRadius: 8,
      modalOverlayOpacity: 0.4, dropdownBlur: 0,
      scrollbarWidth: 4, scrollbarOpacity: 0.1,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0,
      badgeBgOpacity: 0.16, badgeRadius: 999,
      btnHoverAnim: 'ripple', cardHoverAnim: 'lift',
      archDensity: 'airy', archHeadingTracking: 0, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'slide-b', archLinkAnim: 'none', archSectionStyle: 'flat',
      colorSurface: '#F4EFF4', 
      colorPageBg: '#FEF7FF', 
      colorCardBg: '#FFFFFF',
      colorBtnBg: '#6750A4', 
      colorBtnText: '#FFFFFF', 
      colorNavBg: '#F3EDF7', 
      colorText: '#1D1B20', 
      colorHeading: '#1D1B20', 
      colorMuted: '#49454F',
    },
  },
  /* ─── 1. Тишина — inspired by Minale+Mann: absolute void, content floats ── */
  {
    id: 'concept-silence',
    name: 'Тишина',
    description: 'Minale+Mann: пустота как форма. Невидимая навигация, ghost-карточки, кинематографичный масштаб, ритм ×2.5. Вес 200, спейсинг 0.12em, анимация 800ms.',
    icon: '○',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 200,
      btnPaddingH: 32, btnPaddingV: 14, btnSize: 'lg',
      btnHoverAnim: 'lift', cardHoverAnim: 'dim',
      fontFamily: '"Manrope", -apple-system, sans-serif',
      fontSize: 1, fontWeight: 200, headingWeight: 200, letterSpacing: 0.12, lineHeight: 2.0, typeScale: 1.414,
      paragraphSpacing: 2.0, wordSpacing: 0.05, textIndent: 0,
      headingLetterSpacing: 0.20, headingLineHeight: 1.05, paragraphMaxWidth: 55, textAlign: 'left',
      accentHue: 35, accentSaturation: 6, accentLightness: 55,
      successHue: 160, successSaturation: 12, errorHue: 0, errorSaturation: 20, warningHue: 40, warningSaturation: 15,
      glassBlur: 64, glassOpacity: 0.03, glassBorderOpacity: 0.00, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.00,
      spacingBase: 8, spacingScale: 1.4,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 800, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      containerWidth: 880, sidebarWidth: 200, gridGap: 48, gridColumns: 12,
      borderWidth: 0, borderStyle: 'none',
      darkElevation: 1, darkSaturation: 5,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.00, inputPaddingH: 0, inputPaddingV: 16, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.00, chipPaddingH: 16, chipPaddingV: 6,
      navItemRadius: 0, navItemPaddingH: 24, navItemPaddingV: 14,
      statusBgOpacity: 0.02, statusPillRadius: 0,
      modalOverlayOpacity: 0.70, dropdownBlur: 64,
      scrollbarWidth: 0, scrollbarOpacity: 0.00,
      tableHeaderOpacity: 0.01, tableRowHoverOpacity: 0.01, tableBorderOpacity: 0.01,
      badgeBgOpacity: 0.03, badgeRadius: 0,
      focusRingWidth: 1, focusRingOffset: 6, focusRingStyle: 'solid', focusRingOpacity: 0.15,
      archDensity: 'grand', archHeadingTracking: 20, archHeadingCase: 'uppercase',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'flat',
      archNavStyle: 'minimal', archCardChrome: 'ghost', archHeroScale: 'cinematic', archVerticalRhythm: 2.5,
      archContentReveal: 'fade-up', archTextReveal: 'blur-in',
      /* ── Dark charcoal palette — deep void ── */
      colorPageBg: '#080808', colorSurface: '#0e0e0e', colorBorder: '#ffffff',
      colorText: '#c8c8c8', colorHeading: '#f0f0f0', colorLink: '#e0e0e0',
      colorBtnBg: '#080808', colorBtnText: '#e0e0e0',
      colorNavBg: '#050505', colorMuted: '#666666',
      colorInputBg: '#080808', colorTagBg: '#0e0e0e', colorTagText: '#c8c8c8',
      colorCardBg: '#0e0e0e',
    },
  },
  /* ─── 2. Функция — mission control dashboard: ultra-dense, zero waste ──── */
  {
    id: 'concept-function',
    name: 'Функция',
    description: 'Центр управления: максимальная плотность, ритм ×0.5, компактный масштаб, мгновенные переходы 30ms. Видимый хром, острые углы.',
    icon: '▦',
    tokens: {
      btnRadius: 2, btnStyle: 'filled', btnTransform: 'none', btnWeight: 600,
      btnPaddingH: 8, btnPaddingV: 3, btnSize: 'xs',
      btnHoverAnim: 'none', cardHoverAnim: 'border',
      fontFamily: '"JetBrains Mono", "SF Mono", monospace',
      fontSize: 0.78, fontWeight: 400, headingWeight: 700, letterSpacing: 0.00, lineHeight: 1.25, typeScale: 1.067,
      paragraphSpacing: 0.2, wordSpacing: 0, textIndent: 0,
      headingLetterSpacing: -0.02, headingLineHeight: 1.1, paragraphMaxWidth: 0, textAlign: 'left',
      accentHue: 210, accentSaturation: 80, accentLightness: 55,
      successHue: 142, successSaturation: 80, errorHue: 0, errorSaturation: 80, warningHue: 38, warningSaturation: 95,
      glassBlur: 4, glassOpacity: 0.80, glassBorderOpacity: 0.14, glassSaturation: 100,
      shadowOffsetY: 1, shadowBlurRadius: 2, shadowSpread: 0, shadowOpacity: 0.06,
      spacingBase: 2, spacingScale: 1,
      cardRadius: 2, inputRadius: 2, chipRadius: 2, modalRadius: 4,
      animDuration: 30, animEasing: 'linear',
      containerWidth: 1600, sidebarWidth: 180, gridGap: 4, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 6, darkSaturation: 50,
      inputBgOpacity: 0.06, inputBorderOpacity: 0.14, inputPaddingH: 6, inputPaddingV: 3, inputFontSize: -1,
      chipBgOpacity: 0.08, chipBorderOpacity: 0.12, chipPaddingH: 5, chipPaddingV: 1,
      navItemRadius: 2, navItemPaddingH: 6, navItemPaddingV: 3,
      statusBgOpacity: 0.14, statusPillRadius: 2,
      modalOverlayOpacity: 0.25, dropdownBlur: 4,
      scrollbarWidth: 4, scrollbarOpacity: 0.25,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.06, tableBorderOpacity: 0.14,
      badgeBgOpacity: 0.18, badgeRadius: 2,
      focusRingWidth: 2, focusRingOffset: 0, focusRingStyle: 'solid', focusRingOpacity: 1,
      archDensity: 'dense', archHeadingTracking: -3, archHeadingCase: 'none',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'underline', archSectionStyle: 'flat',
      archNavStyle: 'full', archCardChrome: 'visible', archHeroScale: 'compact', archVerticalRhythm: 0.5,
      archContentReveal: 'none', archTextReveal: 'none',
    },
  },
  /* ─── 3. Ремесло — Scandinavian warmth: organic, tactile, round ────────── */
  {
    id: 'concept-craft',
    name: 'Ремесло',
    description: 'Скандинавский уют: крупный ритм ×1.8, мягкий хром, тёплый акцент, organic скругления 24px, медленные пружинные анимации 450ms.',
    icon: '◇',
    tokens: {
      btnRadius: 16, btnStyle: 'soft', btnTransform: 'none', btnWeight: 400,
      btnPaddingH: 22, btnPaddingV: 11, btnSize: 'md',
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
      fontFamily: '"Manrope", Georgia, sans-serif',
      fontSize: 1.02, fontWeight: 350, headingWeight: 500, letterSpacing: 0.02, lineHeight: 1.8, typeScale: 1.25,
      paragraphSpacing: 1.4, wordSpacing: 0.02, textIndent: 0,
      headingLetterSpacing: 0.01, headingLineHeight: 1.2, paragraphMaxWidth: 60, textAlign: 'left',
      accentHue: 28, accentSaturation: 40, accentLightness: 52,
      successHue: 145, successSaturation: 30, errorHue: 12, errorSaturation: 40, warningHue: 35, warningSaturation: 40,
      glassBlur: 28, glassOpacity: 0.35, glassBorderOpacity: 0.02, glassSaturation: 125,
      shadowOffsetY: 8, shadowBlurRadius: 36, shadowSpread: 0, shadowOpacity: 0.04,
      spacingBase: 6, spacingScale: 1.2,
      cardRadius: 24, inputRadius: 12, chipRadius: 14, modalRadius: 28,
      animDuration: 450, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      containerWidth: 1040, sidebarWidth: 250, gridGap: 28, gridColumns: 12,
      borderWidth: 0, borderStyle: 'none',
      darkElevation: 6, darkSaturation: 25,
      inputBgOpacity: 0.04, inputBorderOpacity: 0.00, inputPaddingH: 16, inputPaddingV: 12, inputFontSize: 0,
      chipBgOpacity: 0.06, chipBorderOpacity: 0.00, chipPaddingH: 14, chipPaddingV: 5,
      navItemRadius: 12, navItemPaddingH: 16, navItemPaddingV: 10,
      statusBgOpacity: 0.08, statusPillRadius: 14,
      modalOverlayOpacity: 0.20, dropdownBlur: 24,
      scrollbarWidth: 5, scrollbarOpacity: 0.08,
      tableHeaderOpacity: 0.03, tableRowHoverOpacity: 0.02, tableBorderOpacity: 0.03,
      badgeBgOpacity: 0.08, badgeRadius: 14,
      focusRingWidth: 2, focusRingOffset: 4, focusRingStyle: 'solid', focusRingOpacity: 0.4,
      archDensity: 'airy', archHeadingTracking: 2, archHeadingCase: 'none',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
      archNavStyle: 'full', archCardChrome: 'subtle', archHeroScale: 'large', archVerticalRhythm: 1.8,
      archContentReveal: 'fade', archTextReveal: 'none',
      /* ── Warm parchment palette ── */
      colorPageBg: '#f8f4ee', colorSurface: '#ede8e0', colorBorder: '#c4b8a4',
      colorText: '#3a352c', colorHeading: '#2a2520', colorLink: '#7a6848',
      colorBtnBg: '#3a352c', colorBtnText: '#f8f4ee',
      colorNavBg: '#ede8e0', colorMuted: '#8a7e6e',
      colorInputBg: '#f8f4ee', colorTagBg: '#ede8e0', colorTagText: '#3a352c',
      colorCardBg: '#ede8e0',
    },
  },
  /* ─── 4. Футуризм — cyberpunk neon: glass, glow, deep black ───────────── */
  {
    id: 'concept-future',
    name: 'Футуризм',
    description: 'Киберпанк: минимальная навигация, стеклянные карточки, крупный масштаб, неон 185°/95%, глубокие тени 0.35, glow-кнопки, тёмный фон.',
    icon: '◈',
    tokens: {
      btnRadius: 100, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 600,
      btnPaddingH: 24, btnPaddingV: 11, btnSize: 'md',
      btnHoverAnim: 'glow', cardHoverAnim: 'scale',
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontSize: 0.95, fontWeight: 400, headingWeight: 700, letterSpacing: 0.04, lineHeight: 1.45, typeScale: 1.333,
      paragraphSpacing: 0.8, wordSpacing: 0, textIndent: 0,
      headingLetterSpacing: 0.08, headingLineHeight: 1.05, paragraphMaxWidth: 0, textAlign: 'left',
      accentHue: 185, accentSaturation: 95, accentLightness: 55,
      successHue: 160, successSaturation: 90, errorHue: 340, errorSaturation: 95, warningHue: 50, warningSaturation: 100,
      glassBlur: 48, glassOpacity: 0.12, glassBorderOpacity: 0.18, glassSaturation: 260,
      shadowOffsetY: 0, shadowBlurRadius: 56, shadowSpread: 4, shadowOpacity: 0.35,
      spacingBase: 4, spacingScale: 1.1,
      cardRadius: 8, inputRadius: 6, chipRadius: 999, modalRadius: 12,
      animDuration: 200, animEasing: 'cubic-bezier(0.22,1,0.36,1)',
      containerWidth: 1200, sidebarWidth: 220, gridGap: 16, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 16, darkSaturation: 90,
      inputBgOpacity: 0.08, inputBorderOpacity: 0.18, inputPaddingH: 12, inputPaddingV: 9, inputFontSize: 0,
      chipBgOpacity: 0.14, chipBorderOpacity: 0.16, chipPaddingH: 10, chipPaddingV: 3,
      navItemRadius: 4, navItemPaddingH: 12, navItemPaddingV: 7,
      statusBgOpacity: 0.20, statusPillRadius: 999,
      modalOverlayOpacity: 0.65, dropdownBlur: 40,
      scrollbarWidth: 2, scrollbarOpacity: 0.25,
      tableHeaderOpacity: 0.08, tableRowHoverOpacity: 0.06, tableBorderOpacity: 0.16,
      badgeBgOpacity: 0.24, badgeRadius: 999,
      focusRingWidth: 2, focusRingOffset: 2, focusRingStyle: 'solid', focusRingOpacity: 1,
      archDensity: 'normal', archHeadingTracking: 6, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'slide', archLinkAnim: 'arrow', archSectionStyle: 'card',
      archNavStyle: 'minimal', archCardChrome: 'subtle', archHeroScale: 'large', archVerticalRhythm: 1.2,
      archContentReveal: 'slide-up', archTextReveal: 'none',
      colorPageBg: '#06090f', colorSurface: '#0c1018', colorText: '#94c8e0', colorHeading: '#d8f0ff',
      colorLink: '#6090ff', colorBtnBg: '#6090ff', colorBtnText: '#ffffff',
      colorNavBg: '#040608', colorMuted: '#4a6878', colorCardBg: '#0c1018',
      colorInputBg: '#06090f', colorTagBg: '#0c1018', colorTagText: '#6090ff',
    },
  },
  /* ─── 5. Классика — haute editorial: serif, vast whitespace ────────────── */
  {
    id: 'concept-editorial',
    name: 'Классика',
    description: 'Haute editorial: призрачные карточки, кинематограф-масштаб, ритм ×2.2, serif, трекинг 0.15em, paragraphMaxWidth 50ch, text indent, fade 550ms.',
    icon: '▤',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 28, btnPaddingV: 12, btnSize: 'md',
      btnHoverAnim: 'fill', cardHoverAnim: 'dim',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 1.05, fontWeight: 400, headingWeight: 700, letterSpacing: 0.06, lineHeight: 1.95, typeScale: 1.414,
      paragraphSpacing: 1.8, wordSpacing: 0.01, textIndent: 2.5,
      headingLetterSpacing: 0.15, headingLineHeight: 1.05, paragraphMaxWidth: 50, textAlign: 'left',
      accentHue: 18, accentSaturation: 50, accentLightness: 40,
      successHue: 150, successSaturation: 30, errorHue: 355, errorSaturation: 50, warningHue: 35, warningSaturation: 45,
      glassBlur: 4, glassOpacity: 0.40, glassBorderOpacity: 0.02, glassSaturation: 102,
      shadowOffsetY: 2, shadowBlurRadius: 8, shadowSpread: 0, shadowOpacity: 0.02,
      spacingBase: 7, spacingScale: 1.2,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 2,
      animDuration: 550, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      containerWidth: 860, sidebarWidth: 200, gridGap: 36, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 3, darkSaturation: 18,
      inputBgOpacity: 0.01, inputBorderOpacity: 0.08, inputPaddingH: 14, inputPaddingV: 12, inputFontSize: 0,
      chipBgOpacity: 0.02, chipBorderOpacity: 0.06, chipPaddingH: 12, chipPaddingV: 4,
      navItemRadius: 0, navItemPaddingH: 18, navItemPaddingV: 10,
      statusBgOpacity: 0.05, statusPillRadius: 0,
      modalOverlayOpacity: 0.40, dropdownBlur: 4,
      scrollbarWidth: 1, scrollbarOpacity: 0.06,
      tableHeaderOpacity: 0.02, tableRowHoverOpacity: 0.01, tableBorderOpacity: 0.04,
      badgeBgOpacity: 0.06, badgeRadius: 0,
      focusRingWidth: 1, focusRingOffset: 4, focusRingStyle: 'dotted', focusRingOpacity: 0.35,
      archDensity: 'grand', archHeadingTracking: 15, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
      archNavStyle: 'minimal', archCardChrome: 'ghost', archHeroScale: 'cinematic', archVerticalRhythm: 2.2,
      archContentReveal: 'fade-up', archTextReveal: 'clip',
      /* ── Cream editorial palette — aged paper ── */
      colorPageBg: '#f5f0e8', colorSurface: '#ebe5da', colorBorder: '#1a1a1a',
      colorText: '#2c2820', colorHeading: '#1a1610', colorLink: '#5a4830',
      colorBtnBg: '#1a1610', colorBtnText: '#f5f0e8',
      colorNavBg: '#ebe5da', colorMuted: '#8a8070',
      colorInputBg: '#f5f0e8', colorTagBg: '#ebe5da', colorTagText: '#2c2820',
      colorCardBg: '#ebe5da',
    },
  },
  /* ─── 6. Манифест — brutalist expressive: raw, aggressive, zero decor ──── */
  {
    id: 'concept-brutal',
    name: 'Манифест',
    description: 'Брутализм: скрытая навигация, ghost-карточки, компактный масштаб, ритм ×0.6, borderWidth 4, вес 900, typeScale 1.5, анимация 0ms.',
    icon: '▬',
    tokens: {
      btnRadius: 0, btnStyle: 'outline', btnTransform: 'uppercase', btnWeight: 900,
      btnPaddingH: 24, btnPaddingV: 12, btnSize: 'md',
      btnHoverAnim: 'fill', cardHoverAnim: 'border',
      fontFamily: '"DM Sans", "Arial Black", sans-serif',
      fontSize: 1.05, fontWeight: 500, headingWeight: 900, letterSpacing: 0.10, lineHeight: 1.2, typeScale: 1.5,
      paragraphSpacing: 0.3, wordSpacing: 0, textIndent: 0,
      headingLetterSpacing: -0.03, headingLineHeight: 0.92, paragraphMaxWidth: 0, textAlign: 'left',
      accentHue: 0, accentSaturation: 100, accentLightness: 50,
      successHue: 120, successSaturation: 90, errorHue: 0, errorSaturation: 100, warningHue: 50, warningSaturation: 100,
      glassBlur: 0, glassOpacity: 1.00, glassBorderOpacity: 0.30, glassSaturation: 100,
      shadowOffsetY: 6, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.25,
      spacingBase: 3, spacingScale: 1,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 0, animEasing: 'linear',
      containerWidth: 1400, sidebarWidth: 200, gridGap: 6, gridColumns: 12,
      borderWidth: 4, borderStyle: 'solid',
      darkElevation: 1, darkSaturation: 5,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.30, inputPaddingH: 10, inputPaddingV: 8, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.30, chipPaddingH: 8, chipPaddingV: 3,
      navItemRadius: 0, navItemPaddingH: 10, navItemPaddingV: 6,
      statusBgOpacity: 0.18, statusPillRadius: 0,
      modalOverlayOpacity: 0.70, dropdownBlur: 0,
      scrollbarWidth: 8, scrollbarOpacity: 0.40,
      tableHeaderOpacity: 0.14, tableRowHoverOpacity: 0.08, tableBorderOpacity: 0.25,
      badgeBgOpacity: 0.22, badgeRadius: 0,
      focusRingWidth: 4, focusRingOffset: 0, focusRingStyle: 'solid', focusRingOpacity: 1,
      archDensity: 'dense', archHeadingTracking: -5, archHeadingCase: 'uppercase',
      archDivider: 'line', archPageEnter: 'none', archLinkAnim: 'arrow', archSectionStyle: 'striped',
      archNavStyle: 'hidden', archCardChrome: 'ghost', archHeroScale: 'compact', archVerticalRhythm: 0.6,
      archContentReveal: 'none', archTextReveal: 'none',
      /* ── Stark B&W — no middle ground ── */
      colorPageBg: '#ffffff', colorSurface: '#ffffff', colorBorder: '#000000',
      colorText: '#000000', colorHeading: '#000000', colorLink: '#000000',
      colorBtnBg: '#000000', colorBtnText: '#ffffff',
      colorNavBg: '#000000', colorMuted: '#555555',
      colorInputBg: '#ffffff', colorTagBg: '#000000', colorTagText: '#ffffff',
      colorCardBg: '#ffffff',
    },
  },
  /* ─── 7. Витрина — deep glass morphism: blurred layers, translucent ────── */
  {
    id: 'concept-glass',
    name: 'Витрина',
    description: 'Glass morphism: blur 64px, saturation 280, pill-формы 999px, полупрозрачный хром, slide-переходы, ритм ×1.4, scale-hover.',
    icon: '❖',
    tokens: {
      btnRadius: 999, btnStyle: 'soft', btnTransform: 'none', btnWeight: 500,
      btnPaddingH: 22, btnPaddingV: 10, btnSize: 'md',
      btnHoverAnim: 'sheen', cardHoverAnim: 'scale',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      fontSize: 0.98, fontWeight: 400, headingWeight: 600, letterSpacing: 0.01, lineHeight: 1.55, typeScale: 1.2,
      paragraphSpacing: 0.9, wordSpacing: 0, textIndent: 0,
      headingLetterSpacing: 0.02, headingLineHeight: 1.15, paragraphMaxWidth: 0, textAlign: 'left',
      accentHue: 230, accentSaturation: 65, accentLightness: 62,
      successHue: 160, successSaturation: 60, errorHue: 350, errorSaturation: 70, warningHue: 38, warningSaturation: 75,
      glassBlur: 64, glassOpacity: 0.18, glassBorderOpacity: 0.16, glassSaturation: 280,
      shadowOffsetY: 12, shadowBlurRadius: 56, shadowSpread: 0, shadowOpacity: 0.12,
      spacingBase: 5, spacingScale: 1.1,
      cardRadius: 28, inputRadius: 18, chipRadius: 999, modalRadius: 32,
      animDuration: 280, animEasing: 'cubic-bezier(0.16,1,0.3,1)',
      containerWidth: 1140, sidebarWidth: 240, gridGap: 18, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 10, darkSaturation: 60,
      inputBgOpacity: 0.10, inputBorderOpacity: 0.12, inputPaddingH: 16, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.14, chipBorderOpacity: 0.10, chipPaddingH: 14, chipPaddingV: 5,
      navItemRadius: 999, navItemPaddingH: 16, navItemPaddingV: 8,
      statusBgOpacity: 0.16, statusPillRadius: 999,
      modalOverlayOpacity: 0.22, dropdownBlur: 48,
      scrollbarWidth: 4, scrollbarOpacity: 0.10,
      tableHeaderOpacity: 0.06, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.08,
      badgeBgOpacity: 0.20, badgeRadius: 999,
      focusRingWidth: 2, focusRingOffset: 3, focusRingStyle: 'solid', focusRingOpacity: 0.6,
      archDensity: 'airy', archHeadingTracking: 1, archHeadingCase: 'none',
      archDivider: 'none', archPageEnter: 'slide', archLinkAnim: 'underline', archSectionStyle: 'card',
      archNavStyle: 'full', archCardChrome: 'visible', archHeroScale: 'large', archVerticalRhythm: 1.4,
      archContentReveal: 'slide-up', archTextReveal: 'none',
    },
  },
  /* ─── 8. Грандиозность — cinematic luxury: gold, serif, vast spacing ───── */
  {
    id: 'concept-grand',
    name: 'Грандиозность',
    description: 'Кинематографичный люкс: минимальная навигация, ghost-карточки, кинематограф, ритм ×2.4, золото 42°, serif, трекинг 0.12em, fade 700ms.',
    icon: '♦',
    tokens: {
      btnRadius: 0, btnStyle: 'filled', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 36, btnPaddingV: 14, btnSize: 'lg',
      btnHoverAnim: 'lift', cardHoverAnim: 'lift',
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: 1.1, fontWeight: 300, headingWeight: 700, letterSpacing: 0.08, lineHeight: 1.85, typeScale: 1.414,
      paragraphSpacing: 1.8, wordSpacing: 0.03, textIndent: 0,
      headingLetterSpacing: 0.12, headingLineHeight: 1.02, paragraphMaxWidth: 50, textAlign: 'left',
      accentHue: 42, accentSaturation: 80, accentLightness: 50,
      successHue: 155, successSaturation: 35, errorHue: 350, errorSaturation: 55, warningHue: 38, warningSaturation: 50,
      glassBlur: 8, glassOpacity: 0.50, glassBorderOpacity: 0.04, glassSaturation: 108,
      shadowOffsetY: 4, shadowBlurRadius: 32, shadowSpread: 0, shadowOpacity: 0.05,
      spacingBase: 8, spacingScale: 1.3,
      cardRadius: 2, inputRadius: 0, chipRadius: 2, modalRadius: 4,
      animDuration: 700, animEasing: 'cubic-bezier(0.33,1,0.68,1)',
      containerWidth: 920, sidebarWidth: 240, gridGap: 40, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 3, darkSaturation: 20,
      inputBgOpacity: 0.02, inputBorderOpacity: 0.08, inputPaddingH: 18, inputPaddingV: 13, inputFontSize: 0,
      chipBgOpacity: 0.03, chipBorderOpacity: 0.06, chipPaddingH: 14, chipPaddingV: 5,
      navItemRadius: 0, navItemPaddingH: 22, navItemPaddingV: 12,
      statusBgOpacity: 0.06, statusPillRadius: 0,
      modalOverlayOpacity: 0.55, dropdownBlur: 8,
      scrollbarWidth: 2, scrollbarOpacity: 0.05,
      tableHeaderOpacity: 0.02, tableRowHoverOpacity: 0.01, tableBorderOpacity: 0.04,
      badgeBgOpacity: 0.08, badgeRadius: 2,
      focusRingWidth: 1, focusRingOffset: 5, focusRingStyle: 'solid', focusRingOpacity: 0.3,
      archDensity: 'grand', archHeadingTracking: 12, archHeadingCase: 'uppercase',
      archDivider: 'gradient', archPageEnter: 'fade', archLinkAnim: 'underline', archSectionStyle: 'flat',
      archNavStyle: 'minimal', archCardChrome: 'ghost', archHeroScale: 'cinematic', archVerticalRhythm: 2.4,
      archContentReveal: 'fade-up', archTextReveal: 'clip',
      /* ── Dark gold luxury palette ── */
      colorPageBg: '#0a0908', colorSurface: '#12100e', colorBorder: '#c8a96e',
      colorText: '#bfb7a8', colorHeading: '#e8dcc8', colorLink: '#c8a96e',
      colorBtnBg: '#0a0908', colorBtnText: '#c8a96e',
      colorNavBg: '#080706', colorMuted: '#6e6558',
      colorInputBg: '#0a0908', colorTagBg: '#12100e', colorTagText: '#c8a96e',
      colorCardBg: '#12100e',
    },
  },
  /* ─── 9. Minale + Mann — the definitive minaleandmann.com style ─────── */
  {
    id: 'concept-minale',
    name: 'Minale + Mann',
    description: 'minaleandmann.com: чёрный фон #000, белый текст, вес 400, спейсинг 0.22em, 300ms переходы, ghost-кнопки, минималистичные инпуты',
    icon: '▯',
    tokens: {
      btnRadius: 0, btnStyle: 'ghost', btnTransform: 'uppercase', btnWeight: 400,
      btnPaddingH: 24, btnPaddingV: 10, btnSize: 'lg',
      btnHoverAnim: 'lift', cardHoverAnim: 'dim',
      fontFamily: '"Helvetica Neue", "Arial", "Segoe UI", sans-serif',
      fontSize: 1, fontWeight: 400, headingWeight: 400, letterSpacing: 0.12, lineHeight: 1.8, typeScale: 1.414,
      paragraphSpacing: 2.0, wordSpacing: 0.06, textIndent: 0,
      headingLetterSpacing: 0.22, headingLineHeight: 1.05, paragraphMaxWidth: 50, textAlign: 'left',
      /* ── TRUE BLACK + pure white — Minale+Mann ── */
      colorPageBg: '#000000', colorSurface: '#0a0a0a', colorBorder: '#ffffff',
      colorText: '#ffffff', colorHeading: '#ffffff', colorLink: '#ffffff',
      colorBtnBg: 'transparent', colorBtnText: '#ffffff',
      colorNavBg: '#000000', colorMuted: '#888888',
      colorInputBg: 'transparent', colorTagBg: 'transparent', colorTagText: '#ffffff',
      colorCardBg: '#0a0a0a',
      accentHue: 0, accentSaturation: 0, accentLightness: 100,
      successHue: 160, successSaturation: 10, errorHue: 0, errorSaturation: 20, warningHue: 42, warningSaturation: 15,
      glassBlur: 0, glassOpacity: 0.00, glassBorderOpacity: 0.10, glassSaturation: 100,
      shadowOffsetY: 0, shadowBlurRadius: 0, shadowSpread: 0, shadowOpacity: 0.00,
      spacingBase: 8, spacingScale: 1.4,
      cardRadius: 0, inputRadius: 0, chipRadius: 0, modalRadius: 0,
      animDuration: 300, animEasing: 'ease',
      containerWidth: 860, sidebarWidth: 200, gridGap: 48, gridColumns: 12,
      borderWidth: 1, borderStyle: 'solid',
      darkElevation: 0, darkSaturation: 0,
      inputBgOpacity: 0.00, inputBorderOpacity: 0.20, inputPaddingH: 14, inputPaddingV: 10, inputFontSize: 0,
      chipBgOpacity: 0.00, chipBorderOpacity: 0.15, chipPaddingH: 16, chipPaddingV: 6,
      navItemRadius: 0, navItemPaddingH: 24, navItemPaddingV: 14,
      statusBgOpacity: 0.04, statusPillRadius: 0,
      modalOverlayOpacity: 0.45, dropdownBlur: 2,
      scrollbarWidth: 0, scrollbarOpacity: 0.00,
      tableHeaderOpacity: 0.04, tableRowHoverOpacity: 0.04, tableBorderOpacity: 0.10,
      badgeBgOpacity: 0.05, badgeRadius: 0,
      focusRingWidth: 1, focusRingOffset: 4, focusRingStyle: 'solid', focusRingOpacity: 0.30,
      archDensity: 'grand', archHeadingTracking: 18, archHeadingCase: 'uppercase',
      archDivider: 'none', archPageEnter: 'fade', archLinkAnim: 'none', archSectionStyle: 'flat',
      archNavStyle: 'minimal', archCardChrome: 'ghost', archHeroScale: 'cinematic', archVerticalRhythm: 2.4,
      archContentReveal: 'fade-up', archTextReveal: 'none',
    },
  },
]

/* ═══════════════════════════════════════════════════════════
   FONT CATALOGUE
   ═══════════════════════════════════════════════════════════ */
export const FONT_OPTIONS = [
  { id: 'system',    label: 'System UI',      value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'roboto',    label: 'Roboto (M3)',    value: 'Roboto, "Roboto Flex", system-ui, sans-serif' },
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
const HISTORY_MAX = 50

export function useDesignSystem() {
  const tokens  = useState<DesignTokens>('designTokens', () => ({ ...DEFAULT_TOKENS }))
  const history = useState<DesignTokens[]>('dsHistory', () => [])
  const future  = useState<DesignTokens[]>('dsFuture', () => [])
  const activeConceptSlug = useState<string>('dsConceptSlug', () => DEFAULT_DESIGN_CONCEPT)
  const isHydrated = useState<boolean>('dsHydrated', () => false)
  const currentDesignMode = computed<DesignMode>(() => {
    if (!isHydrated.value) {
      return DEFAULT_DESIGN_MODE
    }

    const conceptSlug = activeConceptSlug.value as DesignConceptSlug
    return CONCEPT_TO_DESIGN_MODE[conceptSlug] || DEFAULT_DESIGN_MODE
  })

  /* ── Persist / restore ─────────────────────────────────── */
  function save() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(DESIGN_TOKENS_STORAGE_KEY, JSON.stringify(tokens.value))

      const conceptSlug = activeConceptSlug.value.trim()
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
      const savedConcept = localStorage.getItem(DESIGN_CONCEPT_STORAGE_KEY)?.trim() || ''
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
    let sysSlug = '';
    if (preset.id.startsWith('concept-')) {
      sysSlug = preset.id.replace('concept-', '');
    } else if (preset.id.includes('glass')) {
      sysSlug = 'glass';
    } else if (preset.id.includes('brutal')) {
      sysSlug = 'brutal';
    } else if (preset.id === 'minale' || preset.id === 'neomorphism') {
      sysSlug = 'minale';
    }
    activeConceptSlug.value = sysSlug;
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
    const slug = activeConceptSlug.value
    if (slug) {
      el.setAttribute('data-concept', slug)
    } else {
      el.removeAttribute('data-concept')
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
    let sysSlug = '';
    if (preset.id.startsWith('concept-')) {
      sysSlug = preset.id.replace('concept-', '');
    } else if (preset.id.includes('glass')) {
      sysSlug = 'glass';
    } else if (preset.id.includes('brutal')) {
      sysSlug = 'brutal';
    } else if (preset.id === 'minale' || preset.id === 'neomorphism') {
      sysSlug = 'minale';
    }
    activeConceptSlug.value = sysSlug;
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
