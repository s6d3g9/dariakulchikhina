import type { DesignConceptSlug, DesignMode, DesignModeDescriptor } from '../types/design-mode'

export const DESIGN_MODES = ['brutalist', 'liquid-glass', 'material3'] as const satisfies readonly DesignMode[]

export const DEFAULT_DESIGN_MODE: DesignMode = 'brutalist'
export const DEFAULT_DESIGN_CONCEPT: DesignConceptSlug = 'minale'

export const DESIGN_TOKENS_STORAGE_KEY = 'design-tokens'
export const LEGACY_DESIGN_TOKENS_STORAGE_KEYS = ['design-tokens-minale'] as const
export const DESIGN_MODE_STORAGE_KEY = 'design-mode'
export const DESIGN_CONCEPT_STORAGE_KEY = 'design-concept'

export const DESIGN_MODE_TO_CONCEPT: Record<DesignMode, DesignConceptSlug> = {
  brutalist: 'minale',
  'liquid-glass': 'glass',
  material3: 'm3',
}

export const CONCEPT_TO_DESIGN_MODE: Partial<Record<DesignConceptSlug, DesignMode>> = {
  minale: 'brutalist',
  brutal: 'brutalist',
  glass: 'liquid-glass',
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