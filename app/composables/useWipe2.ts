/**
 * useWipe2 — Data-driven card renderer for wipe2 mode.
 *
 * ## Provide / inject "slot" pattern
 *
 *  1. slug.vue calls createWipe2Slot() once in setup().
 *     This creates a shared Ref<Wipe2EntityData | null> and provides it to all
 *     descendants via Vue's provide().
 *
 *  2. Entity components (AdminSpacePlanning, etc.) call registerWipe2Data(computed(...))
 *     in their setup(). This injects the slot from the ancestor and writes
 *     their data into it. On unmount it clears the slot.
 *
 *  3. Wipe2Renderer.vue calls useWipe2Cards() to get a ComputedRef<Wipe2Card[]>
 *     derived from the same slot.
 *
 * ## Packing rules (2-col × 8-row = 16 slots per card)
 *   section header  → full row = 2 slots
 *   field span:2 or type:multiline → full row = 2 slots
 *   two narrow fields → 1 row = 2 slots (packed side-by-side)
 *   one leftover narrow field → 1 row = 2 slots
 *
 * When a card is full, a new card starts. If the overflow happened mid-section,
 * the new card gets a "(продолжение)" section header.
 */

import {
  computed,
  inject,
  onUnmounted,
  provide,
  ref,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { toValue } from 'vue'
import type { Wipe2Card, Wipe2EntityData, Wipe2Field, Wipe2Row, Wipe2Section } from '~/shared/types/wipe2'

export type { Wipe2Card, Wipe2EntityData, Wipe2Field, Wipe2Row, Wipe2Section }

const WIPE2_SLOT = Symbol('wipe2-slot')

// ─────────────────────────────────────────────
// 1. CREATE SLOT (call from ancestor, e.g. slug.vue)
// ─────────────────────────────────────────────

/**
 * Creates a reactive entity data slot and provides it to all descendants.
 * Call once in setup() of the page that owns the Wipe2Renderer.
 * Returns the raw ref so the page can inspect it if needed.
 */
export function createWipe2Slot(): Ref<Wipe2EntityData | null> {
  const slot = ref<Wipe2EntityData | null>(null)
  provide(WIPE2_SLOT, slot)
  return slot
}

// ─────────────────────────────────────────────
// 2. REGISTER DATA (call from entity components)
// ─────────────────────────────────────────────

/**
 * Entity components call this in setup() to expose their data in wipe2 mode.
 * Automatically clears the slot when the component unmounts.
 */
export function registerWipe2Data(
  source: MaybeRefOrGetter<Wipe2EntityData | null>
): void {
  const slot = inject<Ref<Wipe2EntityData | null>>(WIPE2_SLOT)
  if (!slot) return

  watchEffect(() => {
    slot.value = toValue(source)
  })

  onUnmounted(() => {
    slot.value = null
  })
}

// ─────────────────────────────────────────────
// 3. READ CARDS (call from Wipe2Renderer)
// ─────────────────────────────────────────────

/**
 * Returns a ComputedRef<Wipe2Card[]> derived from the slot.
 * Call in setup() of Wipe2Renderer.vue.
 */
export function useWipe2Cards(): ComputedRef<Wipe2Card[]> {
  const slot = inject<Ref<Wipe2EntityData | null>>(WIPE2_SLOT, null as any)
  return computed(() => {
    const data = slot?.value ?? null
    return data ? buildWipe2Cards(data) : []
  })
}

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
