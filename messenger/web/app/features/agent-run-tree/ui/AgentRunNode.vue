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
  <div class="run-node" :style="{ paddingLeft: `${(depth ?? 0) * 12}px` }">
    <div class="run-node__pill" role="button" tabindex="0" @click="emit('open-run', node.runId)" @keydown.enter="emit('open-run', node.runId)">
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
