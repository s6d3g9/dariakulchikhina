export type DesignMode = 'brutalist' | 'liquid-glass' | 'material3'

export type DesignConceptSlug = 'minale' | 'glass' | 'brutal' | 'm3'

export interface DesignModeDescriptor {
  mode: DesignMode
  conceptSlug: DesignConceptSlug
  priority: 'primary' | 'secondary'
  defaultForNewUi: boolean
  description: string
}