export type MessengerColorSchemeKey = 'baseline' | 'sand' | 'mist' | 'ocean' | 'graphite'
export type MessengerThemeMode = 'system' | 'light' | 'dark'
export type MessengerThemeContrast = 'standard' | 'high'
export type ResolvedMessengerThemeMode = 'light' | 'dark'
export type LegacyMessengerThemeKey = 'beige' | 'gray' | 'black' | 'void'

export interface MessengerThemeColors {
  primary: string
  'on-primary': string
  'primary-container': string
  'on-primary-container': string
  secondary: string
  'on-secondary': string
  'secondary-container': string
  'on-secondary-container': string
  tertiary: string
  'on-tertiary': string
  'tertiary-container': string
  'on-tertiary-container': string
  error: string
  'on-error': string
  'error-container': string
  'on-error-container': string
  background: string
  'on-background': string
  surface: string
  'on-surface': string
  'surface-variant': string
  'on-surface-variant': string
  outline: string
  'outline-variant': string
  scrim: string
  'inverse-surface': string
  'inverse-on-surface': string
  'inverse-primary': string
  'surface-container-lowest': string
  'surface-container-low': string
  'surface-container': string
  'surface-container-high': string
  'surface-container-highest': string
  success: string
  warning: string
}

interface MessengerColorSchemeDefinition {
  key: MessengerColorSchemeKey
  title: string
  hint: string
  preview: [string, string, string]
  lightThemeName: string
  darkThemeName: string
  lightHighContrastThemeName: string
  darkHighContrastThemeName: string
  light: MessengerThemeColors
  dark: MessengerThemeColors
}

function createScheme(definition: Omit<MessengerColorSchemeDefinition, 'lightThemeName' | 'darkThemeName' | 'lightHighContrastThemeName' | 'darkHighContrastThemeName'>): MessengerColorSchemeDefinition {
  const titleSlug = `${definition.key.charAt(0).toUpperCase()}${definition.key.slice(1)}`

  return {
    ...definition,
    lightThemeName: `messenger${titleSlug}Light`,
    darkThemeName: `messenger${titleSlug}Dark`,
    lightHighContrastThemeName: `messenger${titleSlug}LightHighContrast`,
    darkHighContrastThemeName: `messenger${titleSlug}DarkHighContrast`,
  }
}

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const safeHex = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized

  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16),
    g: Number.parseInt(safeHex.slice(2, 4), 16),
    b: Number.parseInt(safeHex.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(channel => clampColorChannel(channel).toString(16).padStart(2, '0')).join('')}`
}

function mixHex(source: string, target: string, amount: number) {
  const start = hexToRgb(source)
  const end = hexToRgb(target)
  const mix = Math.max(0, Math.min(1, amount))

  return rgbToHex(
    start.r + (end.r - start.r) * mix,
    start.g + (end.g - start.g) * mix,
    start.b + (end.b - start.b) * mix,
  )
}

function createHighContrastTheme(colors: MessengerThemeColors, mode: ResolvedMessengerThemeMode): MessengerThemeColors {
  if (mode === 'light') {
    return {
      ...colors,
      primary: mixHex(colors.primary, '#000000', 0.18),
      secondary: mixHex(colors.secondary, '#000000', 0.14),
      tertiary: mixHex(colors.tertiary, '#000000', 0.14),
      background: mixHex(colors.background, '#FFFFFF', 0.16),
      surface: mixHex(colors.surface, '#FFFFFF', 0.14),
      'on-background': '#111111',
      'on-surface': '#111111',
      'on-surface-variant': mixHex(colors['on-surface-variant'], '#000000', 0.34),
      outline: mixHex(colors.outline, '#000000', 0.48),
      'outline-variant': mixHex(colors['outline-variant'], '#000000', 0.22),
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': mixHex(colors['surface-container-low'], '#FFFFFF', 0.12),
      'surface-container': mixHex(colors['surface-container'], '#000000', 0.05),
      'surface-container-high': mixHex(colors['surface-container-high'], '#000000', 0.1),
      'surface-container-highest': mixHex(colors['surface-container-highest'], '#000000', 0.16),
      success: mixHex(colors.success, '#000000', 0.18),
      warning: mixHex(colors.warning, '#000000', 0.12),
    }
  }

  return {
    ...colors,
    primary: mixHex(colors.primary, '#FFFFFF', 0.18),
    secondary: mixHex(colors.secondary, '#FFFFFF', 0.14),
    tertiary: mixHex(colors.tertiary, '#FFFFFF', 0.14),
    background: mixHex(colors.background, '#000000', 0.18),
    surface: mixHex(colors.surface, '#000000', 0.16),
    'on-background': '#FFFFFF',
    'on-surface': '#FFFFFF',
    'on-surface-variant': mixHex(colors['on-surface-variant'], '#FFFFFF', 0.24),
    outline: mixHex(colors.outline, '#FFFFFF', 0.34),
    'outline-variant': mixHex(colors['outline-variant'], '#FFFFFF', 0.18),
    'surface-container-lowest': mixHex(colors['surface-container-lowest'], '#000000', 0.22),
    'surface-container-low': mixHex(colors['surface-container-low'], '#000000', 0.12),
    'surface-container': mixHex(colors['surface-container'], '#FFFFFF', 0.04),
    'surface-container-high': mixHex(colors['surface-container-high'], '#FFFFFF', 0.08),
    'surface-container-highest': mixHex(colors['surface-container-highest'], '#FFFFFF', 0.14),
    success: mixHex(colors.success, '#FFFFFF', 0.16),
    warning: mixHex(colors.warning, '#FFFFFF', 0.12),
  }
}

const legacyThemeMap: Record<LegacyMessengerThemeKey, { scheme: MessengerColorSchemeKey, mode: ResolvedMessengerThemeMode }> = {
  beige: { scheme: 'sand', mode: 'light' },
  gray: { scheme: 'mist', mode: 'light' },
  black: { scheme: 'graphite', mode: 'dark' },
  void: { scheme: 'graphite', mode: 'dark' },
}

const schemeDefinitions = [
  createScheme({
    key: 'baseline',
    title: 'Baseline',
    hint: 'Референсная Material 3 палитра: чистые tonal-слои, стабильный контраст и нейтральная база.',
    preview: ['#EADDFF', '#6750A4', '#7D5260'],
    light: {
      primary: '#6750A4',
      'on-primary': '#FFFFFF',
      'primary-container': '#EADDFF',
      'on-primary-container': '#21005D',
      secondary: '#625B71',
      'on-secondary': '#FFFFFF',
      'secondary-container': '#E8DEF8',
      'on-secondary-container': '#1D192B',
      tertiary: '#7D5260',
      'on-tertiary': '#FFFFFF',
      'tertiary-container': '#FFD8E4',
      'on-tertiary-container': '#31111D',
      error: '#B3261E',
      'on-error': '#FFFFFF',
      'error-container': '#F9DEDC',
      'on-error-container': '#410E0B',
      background: '#FEF7FF',
      'on-background': '#1C1B1F',
      surface: '#FEF7FF',
      'on-surface': '#1C1B1F',
      'surface-variant': '#E7E0EC',
      'on-surface-variant': '#49454F',
      outline: '#79747E',
      'outline-variant': '#CAC4D0',
      scrim: '#000000',
      'inverse-surface': '#313033',
      'inverse-on-surface': '#F4EFF4',
      'inverse-primary': '#D0BCFF',
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': '#F7F2FA',
      'surface-container': '#F3EDF7',
      'surface-container-high': '#ECE6F0',
      'surface-container-highest': '#E6E0E9',
      success: '#386A20',
      warning: '#7C5800',
    },
    dark: {
      primary: '#D0BCFF',
      'on-primary': '#381E72',
      'primary-container': '#4F378B',
      'on-primary-container': '#EADDFF',
      secondary: '#CCC2DC',
      'on-secondary': '#332D41',
      'secondary-container': '#4A4458',
      'on-secondary-container': '#E8DEF8',
      tertiary: '#EFB8C8',
      'on-tertiary': '#492532',
      'tertiary-container': '#633B48',
      'on-tertiary-container': '#FFD8E4',
      error: '#F2B8B5',
      'on-error': '#601410',
      'error-container': '#8C1D18',
      'on-error-container': '#F9DEDC',
      background: '#141218',
      'on-background': '#E6E1E5',
      surface: '#141218',
      'on-surface': '#E6E1E5',
      'surface-variant': '#49454F',
      'on-surface-variant': '#CAC4D0',
      outline: '#938F99',
      'outline-variant': '#49454F',
      scrim: '#000000',
      'inverse-surface': '#E6E1E5',
      'inverse-on-surface': '#313033',
      'inverse-primary': '#6750A4',
      'surface-container-lowest': '#0F0D13',
      'surface-container-low': '#1D1B20',
      'surface-container': '#211F26',
      'surface-container-high': '#2B2930',
      'surface-container-highest': '#36343B',
      success: '#7EDB5E',
      warning: '#FFBA2C',
    },
  }),
  createScheme({
    key: 'sand',
    title: 'Sand',
    hint: 'Тёплая интерьерная схема с мягкими amber-tones и спокойными бумажными поверхностями.',
    preview: ['#FFDDB5', '#8A5A00', '#5A6237'],
    light: {
      primary: '#8A5A00',
      'on-primary': '#FFFFFF',
      'primary-container': '#FFDDB5',
      'on-primary-container': '#2C1700',
      secondary: '#735943',
      'on-secondary': '#FFFFFF',
      'secondary-container': '#FDDCC1',
      'on-secondary-container': '#291806',
      tertiary: '#5A6237',
      'on-tertiary': '#FFFFFF',
      'tertiary-container': '#DEE7B1',
      'on-tertiary-container': '#171E00',
      error: '#BA1A1A',
      'on-error': '#FFFFFF',
      'error-container': '#FFDAD6',
      'on-error-container': '#410002',
      background: '#FFF8F4',
      'on-background': '#221A14',
      surface: '#FFF8F4',
      'on-surface': '#221A14',
      'surface-variant': '#F2DFD2',
      'on-surface-variant': '#51443A',
      outline: '#83746A',
      'outline-variant': '#D5C3B7',
      scrim: '#000000',
      'inverse-surface': '#382E27',
      'inverse-on-surface': '#FFEDE1',
      'inverse-primary': '#FFB95C',
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': '#FFF1E8',
      'surface-container': '#FCEADF',
      'surface-container-high': '#F7E4D8',
      'surface-container-highest': '#F1DED3',
      success: '#516629',
      warning: '#8A4B00',
    },
    dark: {
      primary: '#FFB95C',
      'on-primary': '#4A2800',
      'primary-container': '#693C00',
      'on-primary-container': '#FFDDB5',
      secondary: '#E1C0A6',
      'on-secondary': '#412C19',
      'secondary-container': '#59422E',
      'on-secondary-container': '#FDDCC1',
      tertiary: '#C2CB97',
      'on-tertiary': '#2D340C',
      'tertiary-container': '#434B21',
      'on-tertiary-container': '#DEE7B1',
      error: '#FFB4AB',
      'on-error': '#690005',
      'error-container': '#93000A',
      'on-error-container': '#FFDAD6',
      background: '#19120D',
      'on-background': '#F0DFD5',
      surface: '#19120D',
      'on-surface': '#F0DFD5',
      'surface-variant': '#51443A',
      'on-surface-variant': '#D5C3B7',
      outline: '#9D8D82',
      'outline-variant': '#51443A',
      scrim: '#000000',
      'inverse-surface': '#F0DFD5',
      'inverse-on-surface': '#382E27',
      'inverse-primary': '#8A5A00',
      'surface-container-lowest': '#130D08',
      'surface-container-low': '#221A14',
      'surface-container': '#261E18',
      'surface-container-high': '#312822',
      'surface-container-highest': '#3D332D',
      success: '#B8D18A',
      warning: '#FFB783',
    },
  }),
  createScheme({
    key: 'mist',
    title: 'Mist',
    hint: 'Сдержанная серо-голубая схема для долгой работы с перепиской без лишнего цветового шума.',
    preview: ['#D9E2FF', '#355CA8', '#705574'],
    light: {
      primary: '#355CA8',
      'on-primary': '#FFFFFF',
      'primary-container': '#D9E2FF',
      'on-primary-container': '#001945',
      secondary: '#565E71',
      'on-secondary': '#FFFFFF',
      'secondary-container': '#DAE2F9',
      'on-secondary-container': '#131C2B',
      tertiary: '#705574',
      'on-tertiary': '#FFFFFF',
      'tertiary-container': '#FAD8FD',
      'on-tertiary-container': '#29132E',
      error: '#BA1A1A',
      'on-error': '#FFFFFF',
      'error-container': '#FFDAD6',
      'on-error-container': '#410002',
      background: '#FAF8FF',
      'on-background': '#1A1B21',
      surface: '#FAF8FF',
      'on-surface': '#1A1B21',
      'surface-variant': '#E1E2EC',
      'on-surface-variant': '#44474F',
      outline: '#757780',
      'outline-variant': '#C5C6D0',
      scrim: '#000000',
      'inverse-surface': '#2F3036',
      'inverse-on-surface': '#F1F0F7',
      'inverse-primary': '#ADC6FF',
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': '#F4F3FA',
      'surface-container': '#EEEFF7',
      'surface-container-high': '#E8E9F1',
      'surface-container-highest': '#E2E3EB',
      success: '#2F6B3D',
      warning: '#8A4D00',
    },
    dark: {
      primary: '#ADC6FF',
      'on-primary': '#002E6C',
      'primary-container': '#18448F',
      'on-primary-container': '#D9E2FF',
      secondary: '#BEC6DC',
      'on-secondary': '#283041',
      'secondary-container': '#3E4759',
      'on-secondary-container': '#DAE2F9',
      tertiary: '#DDBCE0',
      'on-tertiary': '#3F2844',
      'tertiary-container': '#573E5B',
      'on-tertiary-container': '#FAD8FD',
      error: '#FFB4AB',
      'on-error': '#690005',
      'error-container': '#93000A',
      'on-error-container': '#FFDAD6',
      background: '#121318',
      'on-background': '#E3E2E9',
      surface: '#121318',
      'on-surface': '#E3E2E9',
      'surface-variant': '#44474F',
      'on-surface-variant': '#C5C6D0',
      outline: '#8F9099',
      'outline-variant': '#44474F',
      scrim: '#000000',
      'inverse-surface': '#E3E2E9',
      'inverse-on-surface': '#2F3036',
      'inverse-primary': '#355CA8',
      'surface-container-lowest': '#0C0E12',
      'surface-container-low': '#1A1B21',
      'surface-container': '#1E1F25',
      'surface-container-high': '#292A30',
      'surface-container-highest': '#34353B',
      success: '#97D8A3',
      warning: '#FFB779',
    },
  }),
  createScheme({
    key: 'ocean',
    title: 'Ocean',
    hint: 'Свежая teal-blue схема для акцентов действий, статусов и медиа-блоков без кислотных вспышек.',
    preview: ['#A3EEFF', '#006877', '#5A5B8D'],
    light: {
      primary: '#006877',
      'on-primary': '#FFFFFF',
      'primary-container': '#A3EEFF',
      'on-primary-container': '#001F25',
      secondary: '#4B6268',
      'on-secondary': '#FFFFFF',
      'secondary-container': '#CEE7ED',
      'on-secondary-container': '#061F24',
      tertiary: '#5A5B8D',
      'on-tertiary': '#FFFFFF',
      'tertiary-container': '#E0E0FF',
      'on-tertiary-container': '#161948',
      error: '#BA1A1A',
      'on-error': '#FFFFFF',
      'error-container': '#FFDAD6',
      'on-error-container': '#410002',
      background: '#F4FBFD',
      'on-background': '#161D1F',
      surface: '#F4FBFD',
      'on-surface': '#161D1F',
      'surface-variant': '#D9E4E8',
      'on-surface-variant': '#3F494C',
      outline: '#6F797C',
      'outline-variant': '#BFC8CC',
      scrim: '#000000',
      'inverse-surface': '#2B3133',
      'inverse-on-surface': '#ECF2F4',
      'inverse-primary': '#82D2E3',
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': '#EEF5F7',
      'surface-container': '#E8EFF1',
      'surface-container-high': '#E2E9EB',
      'surface-container-highest': '#DCE3E5',
      success: '#146C2E',
      warning: '#8A4C00',
    },
    dark: {
      primary: '#82D2E3',
      'on-primary': '#00363E',
      'primary-container': '#004E59',
      'on-primary-container': '#A3EEFF',
      secondary: '#B2CBD1',
      'on-secondary': '#1D3439',
      'secondary-container': '#344A4F',
      'on-secondary-container': '#CEE7ED',
      tertiary: '#C0C2FF',
      'on-tertiary': '#2B2C5D',
      'tertiary-container': '#424475',
      'on-tertiary-container': '#E0E0FF',
      error: '#FFB4AB',
      'on-error': '#690005',
      'error-container': '#93000A',
      'on-error-container': '#FFDAD6',
      background: '#0E1416',
      'on-background': '#DCE3E5',
      surface: '#0E1416',
      'on-surface': '#DCE3E5',
      'surface-variant': '#3F494C',
      'on-surface-variant': '#BFC8CC',
      outline: '#899295',
      'outline-variant': '#3F494C',
      scrim: '#000000',
      'inverse-surface': '#DCE3E5',
      'inverse-on-surface': '#2B3133',
      'inverse-primary': '#006877',
      'surface-container-lowest': '#081012',
      'surface-container-low': '#161D1F',
      'surface-container': '#1A2123',
      'surface-container-high': '#252B2D',
      'surface-container-highest': '#2F3638',
      success: '#82D995',
      warning: '#FFB77A',
    },
  }),
  createScheme({
    key: 'graphite',
    title: 'Graphite',
    hint: 'Контрастная нейтральная схема с графитовыми поверхностями и чистыми статусными акцентами.',
    preview: ['#BEE9FB', '#3A6373', '#52606E'],
    light: {
      primary: '#3A6373',
      'on-primary': '#FFFFFF',
      'primary-container': '#BEE9FB',
      'on-primary-container': '#001F28',
      secondary: '#52606E',
      'on-secondary': '#FFFFFF',
      'secondary-container': '#D6E4F5',
      'on-secondary-container': '#0E1D29',
      tertiary: '#67587A',
      'on-tertiary': '#FFFFFF',
      'tertiary-container': '#EEDBFF',
      'on-tertiary-container': '#211533',
      error: '#BA1A1A',
      'on-error': '#FFFFFF',
      'error-container': '#FFDAD6',
      'on-error-container': '#410002',
      background: '#F7F9FB',
      'on-background': '#171C20',
      surface: '#F7F9FB',
      'on-surface': '#171C20',
      'surface-variant': '#DCE3E9',
      'on-surface-variant': '#40484D',
      outline: '#70787E',
      'outline-variant': '#C0C7CD',
      scrim: '#000000',
      'inverse-surface': '#2C3135',
      'inverse-on-surface': '#EDF1F5',
      'inverse-primary': '#A2CEDF',
      'surface-container-lowest': '#FFFFFF',
      'surface-container-low': '#F1F3F5',
      'surface-container': '#EBEEF0',
      'surface-container-high': '#E5E8EA',
      'surface-container-highest': '#DFE2E4',
      success: '#1E6A41',
      warning: '#865100',
    },
    dark: {
      primary: '#A2CEDF',
      'on-primary': '#003641',
      'primary-container': '#204C5A',
      'on-primary-container': '#BEE9FB',
      secondary: '#BBC8D9',
      'on-secondary': '#243240',
      'secondary-container': '#3A4856',
      'on-secondary-container': '#D6E4F5',
      tertiary: '#D2BCE7',
      'on-tertiary': '#372A49',
      'tertiary-container': '#4F4061',
      'on-tertiary-container': '#EEDBFF',
      error: '#FFB4AB',
      'on-error': '#690005',
      'error-container': '#93000A',
      'on-error-container': '#FFDAD6',
      background: '#101417',
      'on-background': '#DFE2E4',
      surface: '#101417',
      'on-surface': '#DFE2E4',
      'surface-variant': '#40484D',
      'on-surface-variant': '#C0C7CD',
      outline: '#8A9297',
      'outline-variant': '#40484D',
      scrim: '#000000',
      'inverse-surface': '#DFE2E4',
      'inverse-on-surface': '#2C3135',
      'inverse-primary': '#3A6373',
      'surface-container-lowest': '#0B0F12',
      'surface-container-low': '#171C20',
      'surface-container': '#1B2024',
      'surface-container-high': '#252A2E',
      'surface-container-highest': '#303538',
      success: '#8FD7AB',
      warning: '#FFB95D',
    },
  }),
] as const

export const MESSENGER_COLOR_SCHEME_KEYS = schemeDefinitions.map(scheme => scheme.key) as MessengerColorSchemeKey[]
export const MESSENGER_THEME_CONTRAST_KEYS = ['standard', 'high'] as MessengerThemeContrast[]

export const messengerColorSchemeOptions = schemeDefinitions.map(({
  darkHighContrastThemeName,
  darkThemeName,
  lightHighContrastThemeName,
  lightThemeName,
  ...scheme
}) => scheme)

export const messengerVuetifyThemes = Object.fromEntries(
  schemeDefinitions.flatMap((scheme) => ([
    [scheme.lightThemeName, { dark: false, colors: scheme.light }],
    [scheme.darkThemeName, { dark: true, colors: scheme.dark }],
    [scheme.lightHighContrastThemeName, { dark: false, colors: createHighContrastTheme(scheme.light, 'light') }],
    [scheme.darkHighContrastThemeName, { dark: true, colors: createHighContrastTheme(scheme.dark, 'dark') }],
  ])),
)

export function normalizeMessengerColorSchemeKey(value: string | null | undefined): MessengerColorSchemeKey | null {
  if (!value) {
    return null
  }

  return MESSENGER_COLOR_SCHEME_KEYS.includes(value as MessengerColorSchemeKey)
    ? value as MessengerColorSchemeKey
    : null
}

export function normalizeMessengerThemeMode(value: string | null | undefined): MessengerThemeMode | null {
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value
  }

  return null
}

export function normalizeMessengerThemeContrast(value: string | null | undefined): MessengerThemeContrast | null {
  if (value === 'standard' || value === 'high') {
    return value
  }

  return null
}

export function resolveLegacyMessengerTheme(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (value in legacyThemeMap) {
    return legacyThemeMap[value as LegacyMessengerThemeKey]
  }

  return null
}

export function resolveMessengerColorSchemeSelection(
  schemeKey: MessengerColorSchemeKey,
  mode: MessengerThemeMode,
  contrast: MessengerThemeContrast,
  prefersDark: boolean,
) {
  const scheme = schemeDefinitions.find(item => item.key === schemeKey) ?? schemeDefinitions[0]
  const resolvedMode: ResolvedMessengerThemeMode = mode === 'system'
    ? (prefersDark ? 'dark' : 'light')
    : mode
  const highContrast = contrast === 'high'

  return {
    scheme,
    contrast,
    highContrast,
    resolvedMode,
    themeName: resolvedMode === 'dark'
      ? (highContrast ? scheme.darkHighContrastThemeName : scheme.darkThemeName)
      : (highContrast ? scheme.lightHighContrastThemeName : scheme.lightThemeName),
    colors: resolvedMode === 'dark'
      ? (highContrast ? createHighContrastTheme(scheme.dark, 'dark') : scheme.dark)
      : (highContrast ? createHighContrastTheme(scheme.light, 'light') : scheme.light),
    themeColor: resolvedMode === 'dark'
      ? (highContrast ? createHighContrastTheme(scheme.dark, 'dark').surface : scheme.dark.surface)
      : (highContrast ? createHighContrastTheme(scheme.light, 'light').surface : scheme.light.surface),
  }
}