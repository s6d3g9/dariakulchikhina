<script setup lang="ts">
import type { MessengerCliSession } from '../../../entities/sessions/model/useMessengerCliSessions'
import { getSessionKindMeta } from '../../../entities/sessions/model/useMessengerCliSessions'

const props = defineProps<{
  session: MessengerCliSession | null
  ancestry: MessengerCliSession[]
  children: MessengerCliSession[]
  traceMembers: MessengerCliSession[]
}>()

const emit = defineEmits<{
  'open-session': [slug: string]
  'open-chat': [slug: string]
  'close': []
}>()

// Bind run tree to the active session if it has rootRunId + agentId.
const rootRunId = computed(() => props.session?.rootRunId || '')
const agentId = computed(() => props.session?.agentId || '')
const runTreeBound = computed(() => Boolean(rootRunId.value && agentId.value))

const sessionMeta = computed(() => {
  if (!props.session) return null
  return getSessionKindMeta(props.session.kind, props.session.slug)
})

const totalTokens = computed(() => {
  const list = props.traceMembers
  return list.reduce((acc, s) => acc + (s.tokenInTotal ?? 0) + (s.tokenOutTotal ?? 0), 0)
})
const totalCost = computed(() => {
  return props.traceMembers.reduce((acc, s) => acc + (s.costUsd ?? 0), 0)
})

function fmtTokens(n: number) {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

const startedLabel = computed(() => {
  if (!props.session?.created) return null
  try {
    return new Date(props.session.created).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    })
  }
  catch { return null }
})

const finishedLabel = computed(() => {
  if (!props.session?.finishedAt) return null
  try {
    return new Date(props.session.finishedAt).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    })
  }
  catch { return null }
})

</script>

<template>
  <aside class="trace-details" :aria-hidden="!session">
    <header class="trace-details__header">
      <button
        type="button"
        class="trace-details__close"
        aria-label="Закрыть детали"
        @click="emit('close')"
      >
        <v-icon icon="mdi-close" size="18" />
      </button>
      <div v-if="session" class="trace-details__title">
        <v-icon
          v-if="sessionMeta"
          :icon="sessionMeta.icon"
          :color="sessionMeta.color"
          size="20"
        />
        <span class="title-medium">{{ session.agentDisplayName || session.slug }}</span>
      </div>
      <span v-else class="trace-details__title trace-details__title--empty">
        <v-icon icon="mdi-cursor-default-click-outline" size="18" />
        Выберите сессию
      </span>
    </header>

    <div v-if="!session" class="trace-details__placeholder">
      Нажмите на любую строку слева, чтобы увидеть полную трассировку:
      родителя, дочерние сессии и дерево agent-runs.
    </div>

    <div v-else class="trace-details__body">
      <!-- Trace summary bar -->
      <div class="trace-details__summary">
        <div class="trace-details__summary-row">
          <span class="trace-details__chip" :class="`trace-details__chip--tier-${sessionMeta?.tier ?? 2}`">
            {{ sessionMeta?.label ?? session.kind }}
          </span>
          <span v-if="session.model" class="trace-details__chip trace-details__chip--mono">{{ session.model }}</span>
          <span v-if="session.status === 'running'" class="trace-details__chip trace-details__chip--running">running</span>
          <span v-else-if="session.status === 'done'" class="trace-details__chip trace-details__chip--done">done</span>
        </div>
        <div class="trace-details__summary-row trace-details__summary-row--meta">
          <span v-if="startedLabel" title="Начата">↘ {{ startedLabel }}</span>
          <span v-if="finishedLabel" title="Завершена">✓ {{ finishedLabel }}</span>
          <span v-if="session.lastTool" class="trace-details__mono">{{ session.lastTool }}</span>
        </div>
      </div>

      <!-- Trace totals — sum across all sessions sharing rootRunId -->
      <div v-if="traceMembers.length > 1" class="trace-details__trace-totals">
        <div class="trace-details__trace-totals-title">
          <v-icon icon="mdi-call-split" size="14" />
          Трассировка ({{ traceMembers.length }} сессий, общий rootRunId)
        </div>
        <div class="trace-details__trace-totals-row">
          <span class="trace-details__metric"><span class="trace-details__metric-label">всего токенов</span> {{ fmtTokens(totalTokens) }}</span>
          <span class="trace-details__metric"><span class="trace-details__metric-label">стоимость</span> ${{ totalCost.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Ancestry chain -->
      <section v-if="ancestry.length" class="trace-details__section">
        <div class="trace-details__section-title">
          <v-icon icon="mdi-arrow-up-thin-circle-outline" size="14" />
          Родительская цепочка
        </div>
        <div class="trace-details__chain">
          <button
            v-for="(parent, idx) in ancestry"
            :key="parent.slug"
            type="button"
            class="trace-details__chain-item"
            @click="emit('open-session', parent.slug)"
          >
            <v-icon
              :icon="getSessionKindMeta(parent.kind, parent.slug).icon"
              :color="getSessionKindMeta(parent.kind, parent.slug).color"
              size="14"
            />
            <span class="trace-details__chain-label">{{ parent.agentDisplayName || parent.slug }}</span>
            <v-icon
              v-if="idx < ancestry.length - 1"
              icon="mdi-chevron-right"
              size="12"
              class="trace-details__chain-arrow"
            />
          </button>
        </div>
      </section>

      <!-- Direct children -->
      <section v-if="children.length" class="trace-details__section">
        <div class="trace-details__section-title">
          <v-icon icon="mdi-source-branch" size="14" />
          Запущенные сессии ({{ children.length }})
        </div>
        <ul class="trace-details__list">
          <li
            v-for="child in children"
            :key="child.slug"
            class="trace-details__list-item"
          >
            <button
              type="button"
              class="trace-details__list-button"
              @click="emit('open-session', child.slug)"
            >
              <span class="trace-details__list-dot" :class="child.isActive ? 'is-active' : (child.status === 'done' ? 'is-done' : '')" aria-hidden="true" />
              <v-icon
                :icon="getSessionKindMeta(child.kind, child.slug).icon"
                :color="getSessionKindMeta(child.kind, child.slug).color"
                size="14"
              />
              <span class="trace-details__list-label">{{ child.agentDisplayName || child.slug }}</span>
              <span v-if="child.lastTool" class="trace-details__mono">{{ child.lastTool }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Agent run tree (rootRunId scope) -->
      <section v-if="runTreeBound" class="trace-details__section">
        <div class="trace-details__section-title">
          <v-icon icon="mdi-graph-outline" size="14" />
          Дерево agent runs
        </div>
        <AgentRunTree
          :key="`${rootRunId}:${agentId}`"
          :root-run-id="rootRunId"
          :agent-id="agentId"
        />
      </section>

      <!-- Open chat action -->
      <div class="trace-details__actions">
        <v-btn
          variant="tonal"
          color="primary"
          size="small"
          prepend-icon="mdi-message-text-outline"
          @click="emit('open-chat', session.slug)"
        >
          Открыть чат агента
        </v-btn>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.trace-details {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 18%, transparent);
}

.trace-details__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 18%, transparent);
}

.trace-details__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.trace-details__close:hover {
  background: rgb(var(--v-theme-surface-container));
}

.trace-details__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.trace-details__title--empty {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
  font-weight: 400;
}

.trace-details__placeholder {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
  line-height: 1.5;
}

.trace-details__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-details__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trace-details__summary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.trace-details__summary-row--meta {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
}

.trace-details__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent);
  font-size: 11px;
  font-weight: 500;
}

.trace-details__chip--mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 400;
}

.trace-details__chip--tier-0 {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
  color: rgb(var(--v-theme-primary));
}

.trace-details__chip--tier-1 {
  background: color-mix(in srgb, rgb(var(--v-theme-secondary)) 18%, transparent);
  color: rgb(var(--v-theme-secondary));
}

.trace-details__chip--tier-2 {
  background: color-mix(in srgb, rgb(var(--v-theme-info, 33 150 243)) 14%, transparent);
  color: rgb(var(--v-theme-info, 33 150 243));
}

.trace-details__chip--running {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
  color: rgb(var(--v-theme-primary));
}

.trace-details__chip--done {
  background: color-mix(in srgb, rgb(var(--v-theme-success, 76 175 80)) 18%, transparent);
  color: rgb(var(--v-theme-success, 76 175 80));
}

.trace-details__mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}

.trace-details__trace-totals {
  border: 1px dashed color-mix(in srgb, rgb(var(--v-theme-outline)) 35%, transparent);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
}

.trace-details__trace-totals-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 4px;
}

.trace-details__trace-totals-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.trace-details__metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.trace-details__metric-label {
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface-variant));
}

.trace-details__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trace-details__section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.trace-details__hint {
  margin-left: auto;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.trace-details__chain {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.trace-details__chain-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 6%, transparent);
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
}

.trace-details__chain-item:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 12%, transparent);
}

.trace-details__chain-label {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trace-details__chain-arrow {
  color: rgb(var(--v-theme-on-surface-variant));
}

.trace-details__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trace-details__list-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
}

.trace-details__list-button:hover {
  background: rgb(var(--v-theme-surface-container));
}

.trace-details__list-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-outline));
  flex: 0 0 auto;
}

.trace-details__list-dot.is-active {
  background: rgb(var(--v-theme-primary));
}

.trace-details__list-dot.is-done {
  background: rgb(var(--v-theme-success, 76 175 80));
}

.trace-details__list-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trace-details__empty {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 8px;
}

.trace-details__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}
</style>
