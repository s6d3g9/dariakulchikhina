<script setup lang="ts">
import type { MonitorRow } from '../model/useMonitorTopology'
import { getSessionKindMeta } from '../../../entities/sessions/model/useMessengerCliSessions'

const props = defineProps<{
  row: MonitorRow
  active?: boolean
  inTrace?: boolean
  searchQuery?: string
  nowMs?: number
  pinned?: boolean
}>()

const emit = defineEmits<{
  'open-session': [slug: string]
  'open-chat': [slug: string]
  'toggle-pin': [slug: string]
}>()

function onTogglePin(ev: MouseEvent) {
  ev.stopPropagation()
  emit('toggle-pin', props.row.session.slug)
}

// Cmd/Ctrl+Enter and double-click are shortcuts for "open the chat with this
// agent directly", skipping the trace pane. For awaiting rows this is the
// most frequent next action, and one click is better than two.
function onActivate(ev: MouseEvent | KeyboardEvent) {
  const slug = props.row.session.slug
  if ('detail' in ev && ev.detail >= 2) {
    emit('open-chat', slug)
    return
  }
  if ('key' in ev && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
    ev.preventDefault()
    emit('open-chat', slug)
    return
  }
  if ('key' in ev) {
    ev.preventDefault()
    emit('open-session', slug)
    return
  }
  emit('open-session', slug)
}

const meta = computed(() => getSessionKindMeta(props.row.session.kind, props.row.session.slug))

// "Since X" — the gap between now and lastActivityAt. Drives a tiny chip
// that's the fastest signal for "this session has been silent for hours".
// Re-derives via the parent's 5s clock tick passed as `nowMs`; when the
// prop is absent we still render a snapshot label without ticking.
const sinceLabel = computed<string | null>(() => {
  const last = props.row.session.lastActivityAt
  if (!last) return null
  const t = Date.parse(last)
  if (!Number.isFinite(t)) return null
  const ms = (props.nowMs ?? Date.now()) - t
  if (ms < 5_000) return 'сейчас'
  if (ms < 60_000) return `${Math.floor(ms / 1000)}с`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}м`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}ч`
  return `${Math.floor(ms / 86_400_000)}д`
})

const tokenLabel = computed(() => {
  const inT = props.row.session.tokenInTotal ?? 0
  const outT = props.row.session.tokenOutTotal ?? 0
  if (!inT && !outT) return null
  return `↓ ${(inT / 1000).toFixed(1)}k · ↑ ${(outT / 1000).toFixed(1)}k`
})

const costLabel = computed(() => {
  const c = props.row.session.costUsd
  if (!c) return null
  return c >= 0.01 ? `$${c.toFixed(2)}` : `$${c.toFixed(4)}`
})

const title = computed(() => props.row.session.agentDisplayName || props.row.session.slug)

// Split the title into [match | non-match] segments so the template can
// render <mark> for matches without resorting to v-html. Case-insensitive
// match preserves original casing in the output.
const titleParts = computed<Array<{ text: string, match: boolean }>>(() => {
  const q = props.searchQuery ?? ''
  const t = title.value
  if (!q) return [{ text: t, match: false }]
  const lowerT = t.toLowerCase()
  const lowerQ = q.toLowerCase()
  const out: Array<{ text: string, match: boolean }> = []
  let i = 0
  while (i < t.length) {
    const idx = lowerT.indexOf(lowerQ, i)
    if (idx === -1) {
      out.push({ text: t.slice(i), match: false })
      break
    }
    if (idx > i) out.push({ text: t.slice(i, idx), match: false })
    out.push({ text: t.slice(idx, idx + q.length), match: true })
    i = idx + q.length
  }
  return out
})

// awaiting / crashed are the two states with side-effects on the whole row
// (background tint, weight, tooltip target). Kept as flags so the template
// stays declarative.
const liveness = computed(() => props.row.liveness)
const isAwaiting = computed(() => liveness.value.state === 'awaiting-user')
const isCrashed = computed(() => liveness.value.state === 'crashed')
const isDone = computed(() => liveness.value.state === 'done')

// Accessible label that screen readers get on focus — packs identity + state.
const ariaLabel = computed(() => {
  const parts = [
    `${meta.value.label} ${title.value}`,
    liveness.value.srLabel,
  ]
  if (props.row.session.runError) parts.push(`Ошибка: ${props.row.session.runError}`)
  if (props.row.hasChildren) parts.push(`${props.row.childCount} дочерних сессий`)
  return parts.join('. ')
})

const tooltipText = computed(() => {
  if (isCrashed.value && props.row.session.runError) return props.row.session.runError
  return liveness.value.srLabel
})
</script>

<template>
  <div
    class="monitor-row"
    :class="{
      'monitor-row--active': active,
      'monitor-row--in-trace': inTrace && !active,
      'monitor-row--awaiting': isAwaiting,
      'monitor-row--crashed': isCrashed,
      'monitor-row--done': isDone,
      'monitor-row--pinned': pinned,
      [`monitor-row--state-${liveness.state}`]: true,
    }"
    role="treeitem"
    :aria-level="row.depth + 1"
    :aria-selected="active ?? false"
    :aria-label="ariaLabel"
    :title="tooltipText"
    tabindex="0"
    @click="onActivate($event)"
    @keydown.enter="onActivate($event)"
    @keydown.space.prevent="emit('open-session', row.session.slug)"
  >
    <span
      class="monitor-row__accent"
      :class="`monitor-row__accent--${liveness.color}`"
      :data-animated="liveness.animated || null"
      aria-hidden="true"
    />
    <span
      class="monitor-row__rails"
      :style="{ width: `${row.depth * 18}px` }"
      aria-hidden="true"
    >
      <span
        v-for="d in row.depth"
        :key="d"
        class="monitor-row__rail"
        :class="{ 'monitor-row__rail--last': d === row.depth && row.isLastSibling }"
        :style="{ left: `${(d - 1) * 18 + 9}px` }"
      />
      <span
        v-if="row.depth > 0"
        class="monitor-row__elbow"
        :style="{ left: `${(row.depth - 1) * 18 + 9}px` }"
      />
    </span>
    <span
      class="monitor-row__state"
      :class="`monitor-row__state--${liveness.color}`"
      aria-hidden="true"
    >
      <v-icon
        :icon="liveness.icon"
        size="13"
      />
      <span
        v-if="liveness.animated"
        class="monitor-row__state-pulse"
      />
    </span>
    <v-icon
      class="monitor-row__kind"
      :icon="meta.icon"
      :color="meta.color"
      size="13"
    />
    <span class="monitor-row__title">
      <template
        v-for="(part, idx) in titleParts"
        :key="idx"
      >
        <mark
          v-if="part.match"
          class="monitor-row__title-mark"
        >{{ part.text }}</mark>
        <template v-else>{{ part.text }}</template>
      </template>
    </span>
    <span
      v-if="row.hasChildren"
      class="monitor-row__chip monitor-row__chip--children"
      :title="`${row.childCount} дочерних сессий`"
    >+{{ row.childCount }}</span>
    <span
      class="monitor-row__liveness"
      :class="`monitor-row__liveness--${liveness.color}`"
    >{{ liveness.label }}</span>
    <span
      v-if="row.session.lastTool && liveness.state !== 'tool'"
      class="monitor-row__tool"
    >{{ row.session.lastTool }}</span>
    <span class="monitor-row__spacer" />
    <span
      v-if="sinceLabel"
      class="monitor-row__meta monitor-row__meta--since"
      :title="row.session.lastActivityAt ?? ''"
    >{{ sinceLabel }}</span>
    <span
      v-if="tokenLabel"
      class="monitor-row__meta monitor-row__meta--tokens"
    >{{ tokenLabel }}</span>
    <span
      v-if="costLabel"
      class="monitor-row__meta monitor-row__meta--cost"
    >{{ costLabel }}</span>
    <button
      type="button"
      class="monitor-row__pin"
      :class="{ 'is-pinned': pinned }"
      :aria-pressed="pinned ?? false"
      :aria-label="pinned ? 'Открепить сессию' : 'Закрепить сессию'"
      :title="pinned ? 'Открепить' : 'Закрепить наверху'"
      @click="onTogglePin"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <v-icon
        :icon="pinned ? 'mdi-pin' : 'mdi-pin-outline'"
        size="13"
      />
    </button>
  </div>
</template>

<style scoped>
.monitor-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  transition: background-color 120ms ease;
  min-height: 28px;
}

.monitor-row:hover {
  background: rgb(var(--v-theme-surface-container));
}

.monitor-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.monitor-row--active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
}

.monitor-row--in-trace {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 5%, transparent);
}

.monitor-row--awaiting {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 12%, transparent);
}

.monitor-row--awaiting:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 18%, transparent);
}

.monitor-row--crashed {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 8%, transparent);
}

.monitor-row--done .monitor-row__title,
.monitor-row--state-idle-deep .monitor-row__title {
  color: rgb(var(--v-theme-on-surface-variant));
}

.monitor-row__title-mark {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 32%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

/* ---- Left accent strip — the at-a-glance liveness signal ---- */

.monitor-row__accent {
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: rgb(var(--v-theme-outline));
}

.monitor-row__accent--primary  { background: rgb(var(--v-theme-primary)); }
.monitor-row__accent--secondary{ background: rgb(var(--v-theme-secondary)); }
.monitor-row__accent--warning  { background: rgb(var(--v-theme-warning)); }
.monitor-row__accent--error    { background: rgb(var(--v-theme-error)); }
.monitor-row__accent--success  { background: rgb(var(--v-theme-success)); }
.monitor-row__accent--on-surface-variant {
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 22%, transparent);
}

.monitor-row__accent[data-animated] {
  animation: monitor-accent-pulse 1.8s ease-in-out infinite;
}

@keyframes monitor-accent-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}

/* ---- Tree connectors ---- */

.monitor-row__rails {
  position: relative;
  flex: 0 0 auto;
  align-self: stretch;
}

.monitor-row__rail {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, rgb(var(--v-theme-outline)) 24%, transparent);
}

.monitor-row__rail--last {
  bottom: 50%;
}

.monitor-row__elbow {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 1px;
  background: color-mix(in srgb, rgb(var(--v-theme-outline)) 30%, transparent);
}

/* ---- State icon — semantic, not just a coloured dot ---- */

.monitor-row__state {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.monitor-row__state--primary           { color: rgb(var(--v-theme-primary)); }
.monitor-row__state--secondary         { color: rgb(var(--v-theme-secondary)); }
.monitor-row__state--warning           { color: rgb(var(--v-theme-warning)); }
.monitor-row__state--error             { color: rgb(var(--v-theme-error)); }
.monitor-row__state--success           { color: rgb(var(--v-theme-success)); }
.monitor-row__state--on-surface-variant{ color: rgb(var(--v-theme-on-surface-variant)); }

.monitor-row__state-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  animation: monitor-state-pulse 1.6s ease-in-out infinite;
}

.monitor-row__state--primary   .monitor-row__state-pulse { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent); }
.monitor-row__state--secondary .monitor-row__state-pulse { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-secondary)) 50%, transparent); }
.monitor-row__state--warning   .monitor-row__state-pulse { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-warning)) 55%, transparent); }

@keyframes monitor-state-pulse {
  0%   { box-shadow: 0 0 0 0 currentColor; }
  70%  { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* ---- Identity, title, chips ---- */

.monitor-row__kind {
  flex: 0 0 auto;
}

.monitor-row__chip {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
}

.monitor-row__chip--children {
  background: color-mix(in srgb, rgb(var(--v-theme-secondary)) 18%, transparent);
  color: rgb(var(--v-theme-secondary));
}

.monitor-row__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.monitor-row--awaiting .monitor-row__title {
  font-weight: 600;
}

/* ---- Liveness label — the inline narration of state ---- */

.monitor-row__liveness {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.monitor-row__liveness--primary   { color: rgb(var(--v-theme-primary)); }
.monitor-row__liveness--secondary { color: rgb(var(--v-theme-secondary)); }
.monitor-row__liveness--warning   { color: rgb(var(--v-theme-warning)); font-weight: 600; }
.monitor-row__liveness--error     { color: rgb(var(--v-theme-error)); font-weight: 600; }
.monitor-row__liveness--success   { color: rgb(var(--v-theme-success)); }

.monitor-row__tool {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent);
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

/* ---- Right-side metrics ---- */

.monitor-row__spacer {
  flex: 1 1 auto;
  min-width: 8px;
}

.monitor-row__meta {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.monitor-row__meta--cost {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.monitor-row__meta--since {
  opacity: 0.75;
}

.monitor-row--state-idle-deep .monitor-row__meta--since {
  opacity: 1;
  color: rgb(var(--v-theme-warning));
}

/* ---- Pin button — pinned rows float to the top ---- */

.monitor-row__pin {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease, background 120ms ease, color 120ms ease;
}

.monitor-row:hover .monitor-row__pin,
.monitor-row:focus-within .monitor-row__pin,
.monitor-row__pin.is-pinned,
.monitor-row__pin:focus-visible {
  opacity: 1;
}

.monitor-row__pin:hover {
  background: rgb(var(--v-theme-surface-container));
  color: rgb(var(--v-theme-on-surface));
}

.monitor-row__pin.is-pinned {
  color: rgb(var(--v-theme-primary));
}

.monitor-row--pinned {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent);
}

.monitor-row--pinned.monitor-row--awaiting {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 12%, transparent);
}

.monitor-row--pinned.monitor-row--active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .monitor-row__accent[data-animated],
  .monitor-row__state-pulse {
    animation: none !important;
  }
}
</style>
