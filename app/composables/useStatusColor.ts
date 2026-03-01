/**
 * app/composables/useStatusColor.ts
 * Composable для вычисления цвета по статусу.
 * Заменяет 5+ локальных statusColor computed в Admin*-фазных компонентах.
 *
 * Использование:
 *   const statusColor = useStatusColor(form, 'lead_status', {
 *     contacted: 'blue', meeting: 'yellow', qualified: 'green', declined: 'red'
 *   })
 */

type ColorMap = Record<string, string>

export function useStatusColor(
  form: Record<string, any> | Ref<Record<string, any>>,
  field: string,
  customMap?: ColorMap,
): ComputedRef<string> {
  // Стандартная палитра (перекрывается customMap)
  const DEFAULT_MAP: ColorMap = {
    '': 'gray',
    new: 'gray',
    draft: 'gray',
    pending: 'gray',
    planned: 'blue',
    contacted: 'blue',
    in_work: 'blue',
    in_progress: 'blue',
    collecting: 'blue',
    sent: 'yellow',
    sent_to_client: 'yellow',
    review: 'yellow',
    meeting: 'yellow',
    partial: 'yellow',
    revision: 'red',
    declined: 'red',
    rejected: 'red',
    approved: 'green',
    qualified: 'green',
    completed: 'green',
    signed: 'green',
    done: 'green',
    paid: 'green',
  }

  const merged = { ...DEFAULT_MAP, ...customMap }

  return computed(() => {
    const raw = unref(form)
    const value = raw?.[field] ?? ''
    return merged[value] || 'gray'
  })
}
