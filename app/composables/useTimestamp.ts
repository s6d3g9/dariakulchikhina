/**
 * app/composables/useTimestamp.ts
 * Composable для отображения метки «сохранено в HH:MM».
 * Заменяет 8+ дублированных паттернов savedAt в компонентах.
 */

export function useTimestamp() {
  const savedAt = ref('')

  function touch() {
    const now = new Date()
    savedAt.value = now.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  }

  function clear() {
    savedAt.value = ''
  }

  return { savedAt, touch, clear }
}
