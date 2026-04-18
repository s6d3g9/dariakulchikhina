/**
 * Document category catalog for the designer cabinet. Used both by the
 * upload form dropdown and by `getDesignerDocCategoryLabel` to render
 * the category tag on existing document cards.
 */

export interface DesignerDocCategory {
  value: string
  label: string
}

export const DESIGNER_DOC_CATEGORIES: readonly DesignerDocCategory[] = [
  { value: 'contract', label: 'Договор' },
  { value: 'tz', label: 'ТЗ' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'act', label: 'Акт' },
  { value: 'reference', label: 'Референс' },
  { value: 'other', label: 'Другое' },
] as const

export function getDesignerDocCategoryLabel(category: string): string {
  return DESIGNER_DOC_CATEGORIES.find(c => c.value === category)?.label ?? category
}
