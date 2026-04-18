/**
 * Shared inline-autosave helpers used across admin cabinet widgets
 * (designer, seller, manager, contractor) for the small "[ СОХРАНЕНО ]"
 * badges next to editable rows.
 *
 * The type and label function are duplicated in five+ cabinet files —
 * this module centralizes them so cabinet giant-file slicing can
 * reference a single source.
 */

export type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

export function autosaveStatusLabel(state: InlineAutosaveState): string {
  if (state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (state === 'saved') return '[ СОХРАНЕНО ]'
  if (state === 'error') return '[ ОШИБКА СОХРАНЕНИЯ ]'
  return '[ AUTOSAVE ]'
}

export function autosaveStatusClass(state: InlineAutosaveState): string {
  return state ? `cab-autosave-status--${state}` : 'cab-autosave-status--idle'
}
