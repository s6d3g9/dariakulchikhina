import type { DesignConceptSlug, DesignMode, DesignModeDescriptor } from '../types/design-mode'

export const DESIGN_MODES = ['brutalist', 'liquid-glass', 'material3'] as const satisfies readonly DesignMode[]
export const DESIGN_CONCEPT_SLUGS = [
  'minale',
  'glass',
  'brutal',
  'm3',
  'silence',
  'function',
  'craft',
  'future',
  'editorial',
  'grand',
] as const satisfies readonly DesignConceptSlug[]

export const DEFAULT_DESIGN_MODE: DesignMode = 'brutalist'
export const DEFAULT_DESIGN_CONCEPT: DesignConceptSlug = 'minale'
export const DESIGN_MODE_DATA_ATTRIBUTE = 'data-design-mode'
export const UI_THEME_STORAGE_KEY = 'ui-theme'

export const DESIGN_TOKENS_STORAGE_KEY = 'design-tokens'
export const LEGACY_DESIGN_TOKENS_STORAGE_KEYS = ['design-tokens-minale'] as const
export const DESIGN_MODE_STORAGE_KEY = 'design-mode'
export const DESIGN_CONCEPT_STORAGE_KEY = 'design-concept'

export function getUiThemeStorageKey(mode?: DesignMode | '' | null) {
  const resolvedMode = mode && DESIGN_MODES.includes(mode as DesignMode)
    ? mode
    : DEFAULT_DESIGN_MODE

  return `${UI_THEME_STORAGE_KEY}:${resolvedMode}`
}

export const DESIGN_MODE_TO_CONCEPT: Record<DesignMode, DesignConceptSlug> = {
  brutalist: 'minale',
  'liquid-glass': 'glass',
  material3: 'm3',
}

export function isDesignConceptSlug(value: string): value is DesignConceptSlug {
  return (DESIGN_CONCEPT_SLUGS as readonly string[]).includes(value)
}

export function normalizeDesignConceptSlug(value?: string | null): DesignConceptSlug | '' {
  const normalized = (value || '').trim()
  if (!normalized) {
    return ''
  }

  const withoutLegacyPrefix = normalized.startsWith('concept-')
    ? normalized.slice('concept-'.length)
    : normalized

  return isDesignConceptSlug(withoutLegacyPrefix) ? withoutLegacyPrefix : ''
}

export function resolveDesignModeFromConceptSlug(value?: string | null): DesignMode | '' {
  const conceptSlug = normalizeDesignConceptSlug(value)
  if (!conceptSlug) {
    return ''
  }

  return CONCEPT_TO_DESIGN_MODE[conceptSlug]
}

export const CONCEPT_TO_DESIGN_MODE: Record<DesignConceptSlug, DesignMode> = {
  minale: 'brutalist',
  brutal: 'brutalist',
  silence: 'brutalist',
  function: 'brutalist',
  editorial: 'brutalist',
  grand: 'brutalist',
  glass: 'liquid-glass',
  craft: 'liquid-glass',
  future: 'liquid-glass',
  m3: 'material3',
}

export const DESIGN_MODE_DESCRIPTORS: Record<DesignMode, DesignModeDescriptor> = {
  brutalist: {
    mode: 'brutalist',
    conceptSlug: 'minale',
    priority: 'primary',
    defaultForNewUi: true,
    description: 'Основной режим для новых экранов, новых layout и крупных UI-перестроений в духе Minale + Mann.',
  },
  'liquid-glass': {
    mode: 'liquid-glass',
    conceptSlug: 'glass',
    priority: 'secondary',
    defaultForNewUi: false,
    description: 'Режим Liquid Glass в стиле Apple macOS / iOS для витринных и мягких интерфейсных сценариев.',
  },
  material3: {
    mode: 'material3',
    conceptSlug: 'm3',
    priority: 'secondary',
    defaultForNewUi: false,
    description: 'Режим Material 3 для тональных поверхностей, pill-навигации и системных Google-паттернов.',
  },
}