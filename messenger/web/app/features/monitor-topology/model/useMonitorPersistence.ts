import type { MonitorMode, MonitorFilter } from './useMonitorTopology'

// localStorage-backed monitor preferences. The composable returns refs for
// filter chip / mode toggle / search query, hydrated once on mount and
// persisted via shallow watchers. Kept SSR-safe (`typeof window` guards) so
// it doesn't crash during Nuxt's server render.

const FILTER_STORAGE_KEY = 'daria.monitor.filter'
const MODE_STORAGE_KEY = 'daria.monitor.mode'
const SEARCH_STORAGE_KEY = 'daria.monitor.search'
const PINNED_STORAGE_KEY = 'daria.monitor.pinned'
const HIDE_ORPHANS_STORAGE_KEY = 'daria.monitor.hideOrphans'

const FILTERS = ['all', 'awaiting', 'crashed', 'active', 'archived', 'host'] as const
const MODES = ['live', 'today'] as const
const BOOL_VALUES = ['1', '0'] as const

function readPinned(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const raw = window.localStorage.getItem(PINNED_STORAGE_KEY)
  if (!raw) return new Set()
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.filter(v => typeof v === 'string')) : new Set()
  }
  catch {
    return new Set()
  }
}

function writePinned(set: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...set]))
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const v = window.localStorage.getItem(key)
  return (v && (allowed as readonly string[]).includes(v)) ? v as T : fallback
}

function writeStored(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

export interface UseMonitorPersistenceOptions {
  // Mode is owned by the parent (v-model on MonitorTopologyTree), so we don't
  // create the ref here — we hydrate the existing one and persist its writes.
  mode: Ref<MonitorMode>
}

// Refs are exposed via `useState` so the section and the tree can each call
// `useMonitorPersistence` and share the same singletons — needed because the
// section threads `hideOrphans` into `provideMonitorTopology` while the tree
// renders the toggle bound to that ref.
export function useMonitorPersistence(opts: UseMonitorPersistenceOptions) {
  const filter = useState<MonitorFilter>(
    'daria.monitor.filter',
    () => readStored(FILTER_STORAGE_KEY, FILTERS, 'all'),
  )
  const search = useState<string>(
    'daria.monitor.search',
    () => (typeof window !== 'undefined' ? window.localStorage.getItem(SEARCH_STORAGE_KEY) ?? '' : ''),
  )
  const pinnedSlugs = useState<Set<string>>('daria.monitor.pinned', () => readPinned())
  // Default `true` enforces the "project-only by default" invariant — first-time
  // visitors see a tree without host-session orphans even before they touch
  // any toggle. Stored as '1'/'0' for symmetry with the other string-keyed
  // localStorage entries.
  const hideOrphans = useState<boolean>(
    'daria.monitor.hideOrphans',
    () => readStored(HIDE_ORPHANS_STORAGE_KEY, BOOL_VALUES, '1') === '1',
  )

  function togglePin(slug: string) {
    const next = new Set(pinnedSlugs.value)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    pinnedSlugs.value = next
  }

  // Mode hydration happens once on mount: we can't read it via readStored at
  // setup time because `mode` is parent-owned and the parent's initial value
  // would clobber our write. Emit a single update if the stored value differs.
  onMounted(() => {
    const stored = readStored(MODE_STORAGE_KEY, MODES, opts.mode.value)
    if (stored !== opts.mode.value) opts.mode.value = stored
  })

  watch(filter, v => writeStored(FILTER_STORAGE_KEY, v))
  watch(opts.mode, v => writeStored(MODE_STORAGE_KEY, v))
  watch(search, v => writeStored(SEARCH_STORAGE_KEY, v))
  watch(pinnedSlugs, v => writePinned(v))
  watch(hideOrphans, v => writeStored(HIDE_ORPHANS_STORAGE_KEY, v ? '1' : '0'))

  return { filter, search, pinnedSlugs, togglePin, hideOrphans }
}
