export interface EntityFieldValue {
  key: string
  label: string
  value: string | number | null
}

export interface EntitySection {
  key: string
  title: string
  role: 'identity' | 'status' | 'timeline' | 'stream' | 'actions' | 'evidence' | 'inversion'
  fields: EntityFieldValue[]
}

export interface PanelDescriptor {
  title: string
  contentKind: string
  items: Array<{ primary: string; secondary?: string }>
}

export interface Entity {
  id: string
  kind: string
  view: 'instance' | 'type'
  title: string
  subtitle?: string
  classId?: string
  axes?: Record<string, string[]>
  sections: EntitySection[]
  panels: {
    top: PanelDescriptor
    left: PanelDescriptor
    right: PanelDescriptor
    bottom: PanelDescriptor
  }
  modes: string[]
  linkedId?: string
}
