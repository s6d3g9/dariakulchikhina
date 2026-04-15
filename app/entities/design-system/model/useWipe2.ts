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

export function useWipe2State() {
	return useState<Wipe2EntityData | null>('wipe2-entity-data', () => null)
}

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

export function useWipe2Cards(): ComputedRef<Wipe2Card[]> {
	const state = useWipe2State()
	return computed(() => {
		const data = state.value
		return data ? buildWipe2Cards(data) : []
	})
}

export function createWipe2Slot() { }

const MAX_SLOTS = 16

export function buildWipe2Cards(entity: Wipe2EntityData, maxSlots = MAX_SLOTS): Wipe2Card[] {
	const cards: Wipe2Card[] = []
	let rows: Wipe2Row[] = []
	let slots = 0

	function pushCard() {
		if (rows.length === 0) return
		cards.push({
			index: cards.length + 1,
			total: 0,
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

	function addRow(row: Wipe2Row, cost = 2): boolean {
		if (slots + cost > maxSlots) {
			pushCard()
			return true
		}
		rows.push(row)
		slots += cost
		return false
	}

	for (const section of entity.sections) {
		const fields = (section.fields ?? []).filter((field): field is Wipe2Field => !!field)
		if (!fields.length) continue

		const sectionRow: Wipe2Row = { type: 'section', title: section.title, subtitle: section.subtitle }
		const didFlushForHeader = addRow(sectionRow)
		if (didFlushForHeader) {
			rows.push(sectionRow)
			slots += 2
		}

		let index = 0
		while (index < fields.length) {
			const field = fields[index]!
			const isWide = field.span === 2 || field.type === 'multiline'

			if (isWide) {
				const row: Wipe2Row = { type: 'full', field }
				const flushed = addRow(row)
				if (flushed) {
					rows.push({ type: 'section', title: section.title + ' (продолжение)', subtitle: section.subtitle })
					slots += 2
					rows.push(row)
					slots += 2
				}
				index++
				continue
			}

			const nextField = fields[index + 1]
			const nextIsNarrow = !!nextField && nextField.span !== 2 && nextField.type !== 'multiline'
			const row: Wipe2Row = nextIsNarrow
				? { type: 'fields', left: field, right: nextField }
				: { type: 'fields', left: field }
			const flushed = addRow(row)
			if (flushed) {
				rows.push({ type: 'section', title: section.title + ' (продолжение)', subtitle: section.subtitle })
				slots += 2
				rows.push(row)
				slots += 2
			}
			index += nextIsNarrow ? 2 : 1
		}
	}

	pushCard()

	const total = cards.length
	for (const card of cards) card.total = total

	return cards
}
