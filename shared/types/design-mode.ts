export type DesignMode = 'brutalist' | 'liquid-glass' | 'material3'

export type DesignConceptSlug =
  | 'minale'
  | 'glass'
  | 'brutal'
  | 'm3'
  | 'silence'
  | 'function'
  | 'craft'
  | 'future'
  | 'editorial'
  | 'grand'

export interface DesignModeDescriptor {
  mode: DesignMode
  conceptSlug: DesignConceptSlug
  priority: 'primary' | 'secondary'
  defaultForNewUi: boolean
  description: string
}