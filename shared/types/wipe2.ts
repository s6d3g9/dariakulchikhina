/**
 * Wipe 2 — Data-driven card layout
 *
 * Components expose structured data via provideWipe2Data().
 * The algorithm packs fields into cards following the 2×8 grid rule:
 *   - 2 columns × 8 rows = 16 field slots per card
 *   - span:2 items occupy a full row (count as 2 slots)
 *   - section headers occupy a full row (count as 2 slots)
 *
 * Each card is fully self-contained and labeled.
 */

/** A single data field displayed in a 2-col grid */
export interface Wipe2Field {
  /** Column label */
  label: string
  /** Display value — pass null/'' for empty state */
  value: string | number | boolean | null | undefined
  /** Field type controls rendering */
  type?: 'text' | 'status' | 'date' | 'currency' | 'badge' | 'boolean' | 'multiline' | 'link' | 'number'
  /** Span both columns (counts as 2 slots) */
  span?: 2
  /** Empty-state placeholder */
  empty?: string
  /** Short explanatory line shown in card/grid modes */
  description?: string
  /** Small badge shown on mini cards */
  badge?: string
  /** Secondary compact metric or unit */
  caption?: string
  /** Optional eyebrow for spotlight mode */
  eyebrow?: string
  /** Visual tone for value emphasis */
  tone?: 'default' | 'accent' | 'success' | 'muted'
  /** Optional semantic type used to reopen native editor from wipe2 */
  itemType?: 'service' | 'package' | 'subscription' | 'project' | 'document' | 'custom'
  /** Stable item key for native editor */
  itemKey?: string
  /** Related entities, for example services inside a package */
  relatedItemKeys?: string[]
}

/** A named group of fields (appears as a section header inside a card) */
export interface Wipe2Section {
  /** Section heading — rendered as a full-width separator row */
  title: string
  subtitle?: string
  fields: Wipe2Field[]
}

/** Top-level data contract that a component exposes to wipe2 */
export interface Wipe2EntityData {
  /** Main card title (entity name, section name, etc.) */
  entityTitle: string
  /** Subtitle / kicker shown below the title */
  entitySubtitle?: string
  /** Status badge (e.g. 'в работе', 'согласовано') */
  entityStatus?: string
  /** Color for the status dot: 'green' | 'amber' | 'red' | 'blue' | 'muted' */
  entityStatusColor?: string
  sections: Wipe2Section[]
}

/** One generated card — output of the packing algorithm */
export interface Wipe2Card {
  /** Unique card index starting at 1 */
  index: number
  /** Total number of cards for this entity */
  total: number
  /** Card heading — entity title (+ "продолжение" for page 2+) */
  title: string
  subtitle?: string
  status?: string
  statusColor?: string
  /** Whether this is a continuation card (same section, page 2+) */
  isContinuation: boolean
  /** Rows to render — either a section header or a group of 1-2 fields */
  rows: Wipe2Row[]
}

/** A row inside a card: either a section separator or a field pair */
export type Wipe2Row =
  | { type: 'section'; title: string; subtitle?: string }
  | { type: 'fields'; left: Wipe2Field; right?: Wipe2Field }
  | { type: 'full'; field: Wipe2Field }
