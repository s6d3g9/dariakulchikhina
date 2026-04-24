<script setup lang="ts">
import type { RunNode } from '../model/useAgentRunTree'

const props = defineProps<{
  node: RunNode
  children: string[]
  allNodes: Record<string, RunNode>
  childrenByParent: Record<string, string[]>
  depth?: number
}>()

const emit = defineEmits<{
  'open-run': [runId: string]
  'cancel': [runId: string]
}>()

const CONTEXT_WINDOW = 200_000

const isCancelable = computed(() => props.node.status === 'running')

const tokenLabel = computed(() => {
  const inT = props.node.tokenInTotal ?? 0
  const outT = props.node.tokenOutTotal ?? 0
  const total = inT + outT
  if (!total) return null
  const pct = Math.min(100, Math.round((total / CONTEXT_WINDOW) * 100))
  return `${Math.round(total / 1000)}k / 200k — ${pct}%`
})

const costLabel = computed(() => {
  const c = props.node.costUsd
  if (!c) return null
  return `$${c.toFixed(4)}`
})

const statusDotClass = computed(() => {
  switch (props.node.status) {
    case 'running': return 'run-node__dot--running'
    case 'completed': return 'run-node__dot--completed'
    case 'failed': return 'run-node__dot--failed'
    default: return ''
  }
})
</script>

<template>
  <div class="run-node" :class="{ 'run-node--child': (depth ?? 0) > 0 }" :style="{ paddingLeft: `${(depth ?? 0) * 14}px` }">
    <div
      class="run-node__pill"
      :class="[`run-node__pill--${node.status}`]"
      role="button"
      tabindex="0"
      @click="emit('open-run', node.runId)"
      @keydown.enter="emit('open-run', node.runId)"
    >
      <span class="run-node__dot" :class="statusDotClass" aria-hidden="true" />
      <span v-if="node.model" class="run-node__badge">{{ node.model }}</span>
      <span v-if="tokenLabel" class="run-node__meta">{{ tokenLabel }}</span>
      <span v-if="costLabel" class="run-node__meta">{{ costLabel }}</span>
      <span v-if="node.substate" class="run-node__meta run-node__meta--substate">{{ node.substate }}</span>
      <button
        v-if="isCancelable"
        type="button"
        class="run-node__cancel"
        @click.stop="emit('cancel', node.runId)"
      >
        Стоп
      </button>
    </div>
    <AgentRunNode
      v-for="childId in children"
      :key="childId"
      :node="allNodes[childId]"
      :children="childrenByParent[childId] ?? []"
      :all-nodes="allNodes"
      :children-by-parent="childrenByParent"
      :depth="(depth ?? 0) + 1"
      @open-run="emit('open-run', $event)"
      @cancel="emit('cancel', $event)"
    />
  </div>
</template>

<style scoped>
.run-node {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.run-node--child::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 12%, transparent);
}

.run-node__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-container));
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 28%, transparent);
  cursor: pointer;
  font-size: 12px;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
  transition: background-color 120ms ease, border-color 120ms ease, transform 120ms ease;
}

.run-node__pill:hover {
  background: rgb(var(--v-theme-surface-container-high));
  border-color: color-mix(in srgb, rgb(var(--v-theme-outline)) 55%, transparent);
}

.run-node__pill:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.run-node__pill--running {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 45%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, rgb(var(--v-theme-surface-container)));
}

.run-node__pill--failed {
  border-color: color-mix(in srgb, rgb(var(--v-theme-error)) 50%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 7%, rgb(var(--v-theme-surface-container)));
}

.run-node__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-outline));
}

.run-node__dot--running {
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent);
  animation: run-node-pulse 1.6s ease-in-out infinite;
}

.run-node__dot--completed {
  background: rgb(var(--v-theme-success, 76 175 80));
}

.run-node__dot--failed {
  background: rgb(var(--v-theme-error));
}

@keyframes run-node-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent); }
  70%  { box-shadow: 0 0 0 6px color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, rgb(var(--v-theme-primary)) 0%, transparent); }
}

.run-node__badge {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
  color: rgb(var(--v-theme-on-surface-variant));
}

.run-node__meta {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

.run-node__meta--substate {
  font-style: italic;
}

.run-node__cancel {
  margin-left: 4px;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-error)) 50%, transparent);
  background: transparent;
  color: rgb(var(--v-theme-error));
  font-size: 11px;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.run-node__cancel:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 12%, transparent);
}
</style>
