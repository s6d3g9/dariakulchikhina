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

const SYSTEM_UI_FONT_STACK = '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif'

/* ═══════════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════════ */
export const DEFAULT_TOKENS: DesignTokens = {
  btnRadius: 0,
  btnSize: 'md',
  btnStyle: 'filled',
  btnTransform: 'none',
  btnWeight: 400,

  fontFamily: SYSTEM_UI_FONT_STACK,
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

/* ═══════════════════════════════════════════════════════════
   BUTTON SIZE MAP
   ═══════════════════════════════════════════════════════════ */
export const BTN_SIZE_MAP = {
  xs: { py: 4,  px: 10, fontSize: 0.68 },
  sm: { py: 6,  px: 14, fontSize: 0.74 },
  md: { py: 9,  px: 22, fontSize: 0.80 },
  lg: { py: 12, px: 28, fontSize: 0.88 },
} as const
