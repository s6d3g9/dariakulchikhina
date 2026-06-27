import type { DesignTokens } from '~/composables/useDesignSystem'
import type { Ref, InjectionKey } from 'vue'

type PickerOption = { id: string | number; label: string }

const DP_SEARCH_KEY: InjectionKey<Ref<string>> = Symbol('dpSearch') as InjectionKey<Ref<string>>

export function provideDesignPanelSearch(searchQuery: Ref<string>) {
  provide(DP_SEARCH_KEY, searchQuery)
}

export function useDesignPanelSearch() {
  const searchQuery = inject(DP_SEARCH_KEY, ref(''))
  const trimmedSearchQuery = computed(() => searchQuery.value.trim())
  const normalizedSearchTerms = computed(() =>
    trimmedSearchQuery.value.toLowerCase().split(/\s+/).filter(Boolean),
  )
  const hasSearchQuery = computed(() => normalizedSearchTerms.value.length > 0)

  function matchesPanelSearch(...fields: Array<string | undefined | null>) {
    if (!hasSearchQuery.value) return true
    const haystack = fields.filter((f): f is string => Boolean(f?.trim())).join(' ').toLowerCase()
    return normalizedSearchTerms.value.every(term => haystack.includes(term))
  }

  return { searchQuery, trimmedSearchQuery, hasSearchQuery, matchesPanelSearch }
}

export function useDesignPanelHelpers() {
  const { tokens, set } = useDesignSystem()

  function onRange<K extends keyof DesignTokens>(key: K, e: Event) {
    set(key, Number((e.target as HTMLInputElement).value) as DesignTokens[K])
  }

  function onFloat<K extends keyof DesignTokens>(key: K, e: Event) {
    set(key, parseFloat((e.target as HTMLInputElement).value) as DesignTokens[K])
  }

  function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

  function clrRgb(hex: string): string {
    if (!hex || hex.length < 7) return '128, 128, 128'
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
  }

  function colorInputValue(value: string | undefined, fallback: string) {
    if (!value) return fallback
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
  }

  function selectedDesignOptions<T extends PickerOption>(options: readonly T[], selected: string | number | undefined) {
    return options.filter(option => String(option.id) === String(selected ?? ''))
  }

  function availableDesignOptions<T extends PickerOption>(options: readonly T[], selected: string | number | undefined) {
    return options.filter(option => String(option.id) !== String(selected ?? ''))
  }

  return { tokens, set, onRange, onFloat, pct, clrRgb, colorInputValue, selectedDesignOptions, availableDesignOptions }
}
