export type DesignMode = 'brutalist' | 'liquid-glass'

export type DesignConceptSlug = 'minale' | 'glass'

export interface DesignModeDescriptor {
  mode: DesignMode
  conceptSlug: DesignConceptSlug
  priority: 'primary' | 'secondary'
  defaultForNewUi: boolean
  description: string
}