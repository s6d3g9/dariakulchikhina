<script setup lang="ts">
import { injectMonitorTopology, type MonitorMode } from '../model/useMonitorTopology'
import { useMonitorPersistence } from '../model/useMonitorPersistence'

const props = defineProps<{
  activeSlug?: string | null
  modelValue?: MonitorMode
  streamConnected?: boolean
  lastDeltaAt?: number
}>()

const emit = defineEmits<{
  'open-session': [slug: string]
  'open-chat': [slug: string]
  'update:modelValue': [mode: MonitorMode]
}>()

const mode = computed<MonitorMode>({
  get: () => props.modelValue ?? 'live',
  set: (v) => emit('update:modelValue', v),
})

// Section owns the topology instance; we just read its slices here.
const { flatSorted, counters, activeTrace, awaitingSlugs, crashedSlugs } = injectMonitorTopology()

// Filter chips. Awaiting + crashed reset to 'all' when their pool empties so
// the user is never stuck looking at an empty tree. Filter / mode / search
// state is hydrated from + persisted to localStorage by useMonitorPersistence.
const { filter, search, pinnedSlugs, togglePin } = useMonitorPersistence({ mode })

watchEffect(() => {
  if (filter.value === 'awaiting' && counters.value.awaiting === 0) filter.value = 'all'
  if (filter.value === 'crashed' && counters.value.crashed === 0) filter.value = 'all'
})

// `/` shortcut focuses the search input — same convention as GitHub, GitLab,
// Slack. Skipped when the user is already typing into a form field so we
// don't steal their keystroke. Inside the search input, Esc clears the
// query if any (else blurs so the parent's Esc handler can close the trace
// pane on the next press).
const searchInputRef = ref<HTMLInputElement | null>(null)

// Number-key filter shortcuts pair with `/` for keyboard-first triage:
// 1 → all, 2 → awaiting (no-op when pool empty so we don't strand the
// user on a blank tree), 3 → crashed. Re-pressing the active filter's
// key snaps back to "all" — same toggle semantics as the chip click.
function applyFilterShortcut(key: string): boolean {
  if (key === '1') {
    filter.value = 'all'
    return true
  }
  if (key === '2' && counters.value.awaiting > 0) {
    filter.value = filter.value === 'awaiting' ? 'all' : 'awaiting'
    return true
  }
  if (key === '3' && counters.value.crashed > 0) {
    filter.value = filter.value === 'crashed' ? 'all' : 'crashed'
    return true
  }
  return false
}

function onGlobalKeydown(ev: KeyboardEvent) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return
  const target = ev.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (ev.key === '/') {
    ev.preventDefault()
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
    return
  }
  // j/k mirror ArrowDown/Up (vim, gmail, discord). When nothing in the tree
  // is focused, j enters the tree at row 0 — the only entry point that
  // doesn't require a mouse click first.
  if (ev.key === 'j' || ev.key === 'k') {
    const inTree = target?.matches('[role="treeitem"]')
    if (inTree && target instanceof HTMLElement) {
      ev.preventDefault()
      focusRowByOffset(target, ev.key === 'j' ? 1 : -1)
      return
    }
    const first = scrollerRef.value?.querySelector<HTMLElement>('[role="treeitem"]')
    if (first) {
      ev.preventDefault()
      first.focus()
      first.scrollIntoView({ block: 'nearest' })
    }
    return
  }
  if (applyFilterShortcut(ev.key)) ev.preventDefault()
}

function onSearchKeydown(ev: KeyboardEvent) {
  if (ev.key !== 'Escape') return
  if (search.value) {
    ev.preventDefault()
    ev.stopPropagation()
    search.value = ''
  } else {
    searchInputRef.value?.blur()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onGlobalKeydown)
})

const normalizedSearch = computed(() => search.value.trim().toLowerCase())
function rowMatchesSearch(row: typeof flatSorted.value[number], q: string): boolean {
  if (!q) return true
  const s = row.session
  return (
    s.slug.toLowerCase().includes(q)
    || (s.agentDisplayName ?? '').toLowerCase().includes(q)
    || (s.kind ?? '').toLowerCase().includes(q)
    || (s.lastMessagePreview ?? '').toLowerCase().includes(q)
  )
}

// In awaiting/crashed filters the tree shape stops being useful (parent rows
// are hidden, so the indentation rails dangle). We flatten to depth=0 and
// resort: awaiting → longest-waiting first (idleForMs desc), crashed → most
// recently failed first (finishedAt desc). This makes the filter act as a
// priority queue rather than a partial tree.
const visibleRows = computed(() => {
  const q = normalizedSearch.value
  let rows = flatSorted.value
  if (filter.value === 'awaiting') {
    rows = flatSorted.value
      .filter(r => awaitingSlugs.value.has(r.session.slug))
      .map(r => ({ ...r, depth: 0, isLastSibling: true }))
      .sort((a, b) => (b.session.idleForMs ?? 0) - (a.session.idleForMs ?? 0))
  } else if (filter.value === 'crashed') {
    const finishedMs = (s: typeof rows[0]['session']) => s.finishedAt ? Date.parse(s.finishedAt) : 0
    rows = flatSorted.value
      .filter(r => crashedSlugs.value.has(r.session.slug))
      .map(r => ({ ...r, depth: 0, isLastSibling: true }))
      .sort((a, b) => finishedMs(b.session) - finishedMs(a.session))
  }
  if (q) rows = rows.filter(r => rowMatchesSearch(r, q))
  // Pinned sessions float to the top as a flat depth=0 group, preserving the
  // current sort within each partition. We don't dedupe — a pinned row is
  // hidden from its tree position so it doesn't appear twice.
  const pinned = pinnedSlugs.value
  if (pinned.size === 0) return rows
  const top: typeof rows = []
  const rest: typeof rows = []
  for (const r of rows) {
    if (pinned.has(r.session.slug)) top.push({ ...r, depth: 0, isLastSibling: true })
    else rest.push(r)
  }
  return [...top, ...rest]
})

// Stale-overlay: SSE went silent. We treat "no delta for ≥45 s after we lost
// the connection" as stale — short-lived blips during reconnect don't trip it.
const STALE_AFTER_MS = 45_000
const now = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tickHandle = setInterval(() => { now.value = Date.now() }, 5000)
})
onBeforeUnmount(() => {
  if (tickHandle) clearInterval(tickHandle)
})

const isStale = computed(() => {
  if (props.streamConnected) return false
  const last = props.lastDeltaAt ?? 0
  if (!last) return false
  return now.value - last > STALE_AFTER_MS
})

const staleLabel = computed(() => {
  const last = props.lastDeltaAt ?? 0
  if (!last) return 'нет данных'
  const ms = now.value - last
  if (ms < 60_000) return `${Math.floor(ms / 1000)} с без обновлений`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} мин без обновлений`
  return `${Math.floor(ms / 3_600_000)} ч без обновлений`
})

// Keyboard navigation across virtual-scroll rows. We move focus among rendered
// items via arrow keys; v-virtual-scroll handles the scrolling once focus
// crosses the viewport edge thanks to scrollIntoView({block:'nearest'}).
const scrollerRef = ref<HTMLElement | null>(null)
const virtualScrollRef = ref<{ scrollToIndex: (idx: number) => void } | null>(null)

// When the parent selects a session (click in tree, deep link, or trace pane
// follow-up), make sure that row is visible. v-virtual-scroll only renders
// items inside its viewport, so we ask it to scroll the selected index into
// view. Wait one tick because filter changes can shift indexes the same frame.
watch(() => props.activeSlug, (slug) => {
  if (!slug) return
  void nextTick(() => {
    const idx = visibleRows.value.findIndex(r => r.session.slug === slug)
    if (idx >= 0) virtualScrollRef.value?.scrollToIndex(idx)
  })
})

function focusRowByOffset(currentEl: HTMLElement, offset: number) {
  const root = scrollerRef.value
  if (!root) return
  const items = Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]'))
  const idx = items.indexOf(currentEl)
  if (idx === -1) return
  const next = items[idx + offset]
  if (next) {
    next.focus()
    next.scrollIntoView({ block: 'nearest' })
  }
}

function onTreeKeydown(ev: KeyboardEvent) {
  const target = ev.target as HTMLElement | null
  if (!target?.matches('[role="treeitem"]')) return
  if (ev.key === 'ArrowDown') {
    ev.preventDefault()
    focusRowByOffset(target, 1)
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault()
    focusRowByOffset(target, -1)
  } else if (ev.key === 'Home') {
    ev.preventDefault()
    const first = scrollerRef.value?.querySelector<HTMLElement>('[role="treeitem"]')
    first?.focus()
  } else if (ev.key === 'End') {
    ev.preventDefault()
    const all = scrollerRef.value?.querySelectorAll<HTMLElement>('[role="treeitem"]')
    if (all && all.length) all[all.length - 1]?.focus()
  }
}
</script>

<template>
  <div class="monitor-tree">
    <div
      class="monitor-tree__toolbar"
      role="toolbar"
      aria-label="Фильтры монитора"
    >
      <v-btn-toggle
        v-model="mode"
        density="compact"
        mandatory
        rounded="xl"
        color="primary"
        variant="outlined"
      >
        <v-btn
          value="live"
          size="small"
        >
          <v-icon
            icon="mdi-lightning-bolt"
            size="14"
            class="me-1"
          />
          Live
        </v-btn>
        <v-btn
          value="today"
          size="small"
        >
          <v-icon
            icon="mdi-calendar-today"
            size="14"
            class="me-1"
          />
          За сегодня
        </v-btn>
      </v-btn-toggle>

      <span
        class="monitor-tree__filters"
        role="group"
        aria-label="Фильтры по состоянию"
      >
        <button
          type="button"
          class="monitor-tree__filter-chip"
          :class="{ 'is-active': filter === 'all' }"
          :aria-pressed="filter === 'all'"
          title="Показать все сессии (1)"
          @click="filter = 'all'"
        >все · {{ counters.total }}</button>
        <button
          type="button"
          class="monitor-tree__filter-chip monitor-tree__filter-chip--awaiting"
          :class="{ 'is-active': filter === 'awaiting', 'is-empty': counters.awaiting === 0 }"
          :disabled="counters.awaiting === 0"
          :aria-pressed="filter === 'awaiting'"
          :aria-label="`Сессий, ждущих ответа: ${counters.awaiting}`"
          title="Только ждущие ответа (2)"
          @click="filter = filter === 'awaiting' ? 'all' : 'awaiting'"
        >
          <v-icon
            icon="mdi-hand-back-right-outline"
            size="13"
            class="me-1"
          />
          ждут вас · {{ counters.awaiting }}
        </button>
        <button
          v-if="counters.crashed > 0"
          type="button"
          class="monitor-tree__filter-chip monitor-tree__filter-chip--crashed"
          :class="{ 'is-active': filter === 'crashed' }"
          :aria-pressed="filter === 'crashed'"
          :aria-label="`Сессий с ошибкой: ${counters.crashed}`"
          title="Только упавшие (3)"
          @click="filter = filter === 'crashed' ? 'all' : 'crashed'"
        >
          <v-icon
            icon="mdi-alert-circle-outline"
            size="13"
            class="me-1"
          />
          с ошибкой · {{ counters.crashed }}
        </button>
      </span>

      <span class="monitor-tree__counters">
        <span class="monitor-tree__counter">
          <v-icon
            icon="mdi-brain"
            size="12"
            color="primary"
          />
          {{ counters.composers }}
        </span>
        <span class="monitor-tree__counter">
          <v-icon
            icon="mdi-sitemap-outline"
            size="12"
            color="secondary"
          />
          {{ counters.orchestrators }}
        </span>
        <span class="monitor-tree__counter">
          <v-icon
            icon="mdi-cog-outline"
            size="12"
            color="info"
          />
          {{ counters.workers }}
        </span>
        <span
          class="monitor-tree__counter monitor-tree__counter--active"
          :class="{ 'is-zero': counters.active === 0 }"
        >
          <span class="monitor-tree__pulse" />
          активных {{ counters.active }}
        </span>
      </span>
    </div>

    <div class="monitor-tree__search">
      <v-icon
        icon="mdi-magnify"
        size="16"
        class="monitor-tree__search-icon"
      />
      <input
        ref="searchInputRef"
        v-model="search"
        type="search"
        class="monitor-tree__search-input"
        placeholder="Поиск (/) по имени, slug, kind…"
        aria-label="Поиск по сессиям"
        @keydown="onSearchKeydown"
      >
      <button
        v-if="search"
        type="button"
        class="monitor-tree__search-clear"
        aria-label="Очистить поиск"
        @click="search = ''"
      >
        <v-icon
          icon="mdi-close-circle"
          size="14"
        />
      </button>
      <span
        v-if="search"
        class="monitor-tree__search-count"
        aria-live="polite"
      >{{ visibleRows.length }} из {{ flatSorted.length }}</span>
    </div>

    <div
      ref="scrollerRef"
      class="monitor-tree__scroller-wrap"
      :class="{ 'monitor-tree__scroller-wrap--stale': isStale }"
      role="tree"
      aria-label="Дерево сессий агентов"
      @keydown="onTreeKeydown"
    >
      <v-virtual-scroll
        v-if="visibleRows.length"
        ref="virtualScrollRef"
        :items="visibleRows"
        :item-height="32"
        class="monitor-tree__scroller"
      >
        <template #default="{ item }">
          <MonitorSessionRow
            :key="item.session.slug"
            :row="item"
            :active="activeSlug === item.session.slug"
            :in-trace="activeTrace.has(item.session.slug)"
            :search-query="normalizedSearch"
            :now-ms="now"
            :pinned="pinnedSlugs.has(item.session.slug)"
            @open-session="(slug: string) => emit('open-session', slug)"
            @open-chat="(slug: string) => emit('open-chat', slug)"
            @toggle-pin="(slug: string) => togglePin(slug)"
          />
        </template>
      </v-virtual-scroll>

      <div
        v-else
        class="monitor-tree__empty"
      >
        <v-icon
          :icon="search ? 'mdi-magnify-close' : filter === 'awaiting' ? 'mdi-hand-back-right-outline' : filter === 'crashed' ? 'mdi-alert-circle-outline' : 'mdi-monitor-off'"
          size="32"
          class="mb-2"
        />
        <div v-if="search">
          Ничего не нашлось по «{{ search }}»
        </div>
        <div v-else-if="filter === 'awaiting'">
          Никто не ждёт ответа
        </div>
        <div v-else-if="filter === 'crashed'">
          Сессий с ошибкой нет
        </div>
        <div v-else>
          {{ mode === 'live' ? 'Нет активных сессий' : 'Сегодня сессий ещё не было' }}
        </div>
      </div>

      <div
        v-if="isStale && visibleRows.length"
        class="monitor-tree__stale-banner"
        role="status"
      >
        <v-icon
          icon="mdi-wifi-off"
          size="14"
          class="me-2"
        />
        Соединение потеряно — {{ staleLabel }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitor-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.monitor-tree__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 18%, transparent);
  background: rgb(var(--v-theme-surface));
  flex-wrap: wrap;
}

.monitor-tree__filters {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.monitor-tree__filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 24%, transparent);
  background: transparent;
  font-size: 11px;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.monitor-tree__filter-chip:hover:not(:disabled) {
  background: rgb(var(--v-theme-surface-container));
}

.monitor-tree__filter-chip.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.monitor-tree__filter-chip--awaiting:not(.is-empty) {
  border-color: color-mix(in srgb, rgb(var(--v-theme-warning)) 50%, transparent);
  color: rgb(var(--v-theme-warning));
}

.monitor-tree__filter-chip--awaiting.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 18%, transparent);
  border-color: rgb(var(--v-theme-warning));
}

.monitor-tree__filter-chip--awaiting:not(.is-empty):not(.is-active) {
  animation: monitor-awaiting-pulse 2.4s ease-in-out infinite;
}

.monitor-tree__filter-chip--crashed {
  border-color: color-mix(in srgb, rgb(var(--v-theme-error)) 50%, transparent);
  color: rgb(var(--v-theme-error));
}

.monitor-tree__filter-chip--crashed.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 14%, transparent);
  border-color: rgb(var(--v-theme-error));
}

.monitor-tree__filter-chip.is-empty {
  opacity: 0.55;
  cursor: not-allowed;
}

@keyframes monitor-awaiting-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%      { box-shadow: 0 0 0 3px color-mix(in srgb, rgb(var(--v-theme-warning)) 24%, transparent); }
}

.monitor-tree__counters {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-left: auto;
}

.monitor-tree__counter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.monitor-tree__counter--active {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.monitor-tree__counter--active.is-zero {
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 400;
}

.monitor-tree__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent);
  animation: monitor-tree-pulse 1.6s ease-in-out infinite;
}

.monitor-tree__counter--active.is-zero .monitor-tree__pulse {
  background: rgb(var(--v-theme-outline));
  animation: none;
}

@keyframes monitor-tree-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent); }
  70%  { box-shadow: 0 0 0 5px color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
}

/* ---- Search ---- */

.monitor-tree__search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 14%, transparent);
  background: rgb(var(--v-theme-surface));
}

.monitor-tree__search-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  flex: 0 0 auto;
}

.monitor-tree__search-input {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
  padding: 4px 0;
}

.monitor-tree__search-input::placeholder {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

/* Hide native search clear (we render our own button). */
.monitor-tree__search-input::-webkit-search-cancel-button {
  appearance: none;
}

.monitor-tree__search-clear {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: background 120ms ease, color 120ms ease;
}

.monitor-tree__search-clear:hover {
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface-container));
}

.monitor-tree__search-count {
  flex: 0 0 auto;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ---- Scroller + stale overlay ---- */

.monitor-tree__scroller-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.monitor-tree__scroller {
  height: 100%;
  overflow-y: auto;
  transition: opacity 200ms ease, filter 200ms ease;
}

.monitor-tree__scroller-wrap--stale .monitor-tree__scroller {
  opacity: 0.55;
  filter: grayscale(0.4);
}

.monitor-tree__stale-banner {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-on-warning, 0 0 0));
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 4px 14px color-mix(in srgb, rgb(var(--v-theme-warning)) 30%, transparent);
  pointer-events: none;
}

.monitor-tree__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
  padding: 32px 16px;
}
</style>
