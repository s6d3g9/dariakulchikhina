<script setup lang="ts">
import type { MonitorRow } from '../model/useMonitorTopology'
import { getSessionKindMeta } from '../../../entities/sessions/model/useMessengerCliSessions'

const props = defineProps<{
  row: MonitorRow
  active?: boolean
}>()

const emit = defineEmits<{
  'open-session': [slug: string]
}>()

const meta = computed(() => getSessionKindMeta(props.row.session.kind, props.row.session.slug))

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

const elapsedLabel = computed(() => {
  const ms = props.row.session.idleForMs
  if (ms == null || ms < 0) return null
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  return `${Math.floor(ms / 3_600_000)}h`
})

const dotClass = computed(() => {
  const s = props.row.session
  if (s.status === 'done') return 'monitor-row__dot--done'
  if (s.isActive) return 'monitor-row__dot--active'
  if (s.isIdle) return 'monitor-row__dot--idle'
  return 'monitor-row__dot--running'
})

const title = computed(() => {
  return props.row.session.agentDisplayName || props.row.session.slug
})
</script>

<template>
  <div
    class="monitor-row"
    :class="{ 'monitor-row--active': active }"
    :style="{ '--depth': row.depth }"
    role="button"
    tabindex="0"
    @click="emit('open-session', row.session.slug)"
    @keydown.enter="emit('open-session', row.session.slug)"
  >
    <span class="monitor-row__indent" :style="{ width: `${row.depth * 18}px` }" aria-hidden="true">
      <span v-if="row.depth > 0" class="monitor-row__elbow" />
    </span>
    <span class="monitor-row__dot" :class="dotClass" aria-hidden="true" />
    <v-icon class="monitor-row__icon" :icon="meta.icon" :color="meta.color" size="14" />
    <span class="monitor-row__title">{{ title }}</span>
    <span v-if="row.session.lastTool" class="monitor-row__meta monitor-row__meta--tool">{{ row.session.lastTool }}</span>
    <span v-if="row.session.lastSubstate" class="monitor-row__meta monitor-row__meta--substate">{{ row.session.lastSubstate }}</span>
    <span class="monitor-row__spacer" />
    <span v-if="elapsedLabel" class="monitor-row__meta monitor-row__meta--elapsed">{{ elapsedLabel }}</span>
    <span v-if="tokenLabel" class="monitor-row__meta monitor-row__meta--tokens">{{ tokenLabel }}</span>
    <span v-if="costLabel" class="monitor-row__meta monitor-row__meta--cost">{{ costLabel }}</span>
  </div>
</template>

<style scoped>
.monitor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
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
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
}

.monitor-row__indent {
  position: relative;
  flex: 0 0 auto;
  height: 100%;
}

.monitor-row__elbow {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 50%;
  width: 1px;
  background: color-mix(in srgb, rgb(var(--v-theme-outline)) 30%, transparent);
}

.monitor-row__elbow::after {
  content: '';
  position: absolute;
  left: 0;
  top: 100%;
  width: 8px;
  height: 1px;
  background: color-mix(in srgb, rgb(var(--v-theme-outline)) 30%, transparent);
}

.monitor-row__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-outline));
}

.monitor-row__dot--running {
  background: rgb(var(--v-theme-primary));
}

.monitor-row__dot--active {
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent);
  animation: monitor-row-pulse 1.6s ease-in-out infinite;
}

.monitor-row__dot--idle {
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 30%, transparent);
}

.monitor-row__dot--done {
  background: rgb(var(--v-theme-success, 76 175 80));
}

@keyframes monitor-row-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent); }
  70%  { box-shadow: 0 0 0 5px color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
}

.monitor-row__icon {
  flex: 0 0 auto;
}

.monitor-row__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.monitor-row__meta {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

.monitor-row__meta--tool {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent);
}

.monitor-row__meta--substate {
  font-style: italic;
}

.monitor-row__meta--cost {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.monitor-row__meta--tokens {
  font-variant-numeric: tabular-nums;
}

.monitor-row__meta--elapsed {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.monitor-row__spacer {
  flex: 1 1 auto;
  min-width: 8px;
}
</style>
