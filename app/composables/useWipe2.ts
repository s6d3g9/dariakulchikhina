/**
 * useWipe2 — Data-driven card renderer for wipe2 mode.
 *
 * Uses Nuxt's useState() instead of provide/inject to avoid issues with
 * Vue's currentInstance being null after `await` in <script setup>.
 *
 * ## API
 *  - registerWipe2Data(source)  — called in entity components, writes data to shared state
 *  - useWipe2Cards()            — called in Wipe2Renderer, reads computed cards
 *  - buildWipe2Cards(entity)    — pure packing algorithm (exported for tests)
 *
 * ## Packing rules (2-col × 8-row = 16 slots per card)
 *   section header  → full row = 2 slots
 *   field type:multiline or span:2 → full row = 2 slots
 *   two narrow fields → 1 row = 2 slots (side-by-side)
 *   one leftover narrow field → 1 row = 2 slots
 */

import {
  computed,
  onUnmounted,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import { toValue } from 'vue'
import type { Wipe2Card, Wipe2EntityData, Wipe2Field, Wipe2Row, Wipe2Section } from '~/shared/types/wipe2'

export type { Wipe2Card, Wipe2EntityData, Wipe2Field, Wipe2Row, Wipe2Section }

// ─────────────────────────────────────────────────────────────────────────────
// Shared reactive state via useState (SSR-safe Nuxt singleton)
// ─────────────────────────────────────────────────────────────────────────────

export function useWipe2State() {
  return useState<Wipe2EntityData | null>('wipe2-entity-data', () => null)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGISTER (call from entity components, before any await)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entity components call this in setup() to expose their data in wipe2 mode.
 * Works even after await — uses watchEffect bound to component lifecycle.
 * Automatically clears state when the component unmounts.
 */
export function registerWipe2Data(
  source: MaybeRefOrGetter<Wipe2EntityData | null>
): void {
  const state = useWipe2State()

  watchEffect(() => {
    state.value = toValue(source)
  })

  onUnmounted(() => {
    state.value = null
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. READ CARDS (call from Wipe2Renderer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a ComputedRef<Wipe2Card[]> that reacts to state changes.
 */
export function useWipe2Cards(): ComputedRef<Wipe2Card[]> {
  const state = useWipe2State()
  return computed(() => {
    const data = state.value
    return data ? buildWipe2Cards(data) : []
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy no-op kept so slug.vue compiles without changes
// ─────────────────────────────────────────────────────────────────────────────
export function createWipe2Slot() { /* no-op: state is now global via useState */ }

// ─────────────────────────────────────────────
// 4. PACKING ALGORITHM
// ─────────────────────────────────────────────

/** Maximum field SLOTS per card (2 cols × 8 rows = 16) */
const MAX_SLOTS = 16

export function buildWipe2Cards(entity: Wipe2EntityData, maxSlots = MAX_SLOTS): Wipe2Card[] {
  const cards: Wipe2Card[] = []
  let rows: Wipe2Row[] = []
  let slots = 0

  /** Push the current row buffer as a finished card */
  function pushCard() {
    if (rows.length === 0) return
    cards.push({
      index: cards.length + 1,
      total: 0,           // patched at the end
      title: entity.entityTitle,
      subtitle: entity.entitySubtitle,
      status: entity.entityStatus,
      statusColor: entity.entityStatusColor,
      isContinuation: cards.length > 0,
      rows: [...rows],
    })
    rows = []
    slots = 0
  }

  /**
   * Attempt to add `row` (costing `cost` slots) to the current card.
   * If there is no space, flushes the current card first.
   * Returns true if a flush happened (caller may need to re-add a section header).
   */
  function addRow(row: Wipe2Row, cost = 2): boolean {
    if (slots + cost > maxSlots) {
      pushCard()
      // Row NOT added — caller must add it manually after optional section header
      return true
    }
    rows.push(row)
    slots += cost
    return false
  }

  for (const section of entity.sections) {
    const fields = (section.fields ?? []).filter((f): f is Wipe2Field => !!f)
    if (!fields.length) continue

    // ── section header ────────────────────────────────────────────────────
    const sectionRow: Wipe2Row = { type: 'section', title: section.title, subtitle: section.subtitle }
    const didFlushForHeader = addRow(sectionRow)
    if (didFlushForHeader) {
      // New card opened; add the section header to it
      rows.push(sectionRow)
      slots += 2
    }

    // ── fields ────────────────────────────────────────────────────────────
    let i = 0
    while (i < fields.length) {
      const f = fields[i]!
      const isWide = f.span === 2 || f.type === 'multiline'

      if (isWide) {
        const row: Wipe2Row = { type: 'full', field: f }
        const flushed = addRow(row)
        if (flushed) {
          rows.push({ type: 'section', title: section.title + ' (продолжение)', subtitle: section.subtitle })
          slots += 2
          rows.push(row)
          slots += 2
        }
        i++
      } else {
        const next = fields[i + 1]
        const nextIsNarrow = !!next && next.span !== 2 && next.type !== 'multiline'
        const row: Wipe2Row = nextIsNarrow
          ? { type: 'fields', left: f, right: next }
          : { type: 'fields', left: f }
        const flushed = addRow(row)
        if (flushed) {
          rows.push({ type: 'section', title: section.title + ' (продолжение)', subtitle: section.subtitle })
          slots += 2
          rows.push(row)
          slots += 2
        }
        i += nextIsNarrow ? 2 : 1
      }
    }
  }

  pushCard()

  // Patch total count into every card
  const total = cards.length
  for (const c of cards) c.total = total

  return cards
}
