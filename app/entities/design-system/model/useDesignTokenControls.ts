/**
 * Shared range-input handlers + percentage formatter used by every
 * UIDesignPanel tab sub-component. Thin wrapper around the global
 * `useDesignSystem` store so each tab component just calls
 * `const { tokens, onRange, onFloat, pct } = useDesignTokenControls()`.
 */

import { useDesignSystem, type DesignTokens } from './useDesignSystem'

export function useDesignTokenControls() {
  const { tokens, set } = useDesignSystem()

  function pct(v: number): string {
    return `${(v * 100).toFixed(0)}%`
  }

  function onRange<K extends keyof DesignTokens>(key: K, e: Event) {
    set(key, Number((e.target as HTMLInputElement).value) as DesignTokens[K])
  }

  function onFloat<K extends keyof DesignTokens>(key: K, e: Event) {
    set(key, parseFloat((e.target as HTMLInputElement).value) as DesignTokens[K])
  }

  return { tokens, set, pct, onRange, onFloat }
}
