<script setup lang="ts">
import { useAgentRunTree } from '../model/useAgentRunTree'

const props = defineProps<{
  rootRunId: string
  agentId: string
}>()

const emit = defineEmits<{
  'open-run': [runId: string]
}>()

const rootRunIdRef = computed(() => props.rootRunId)
const agentIdRef = computed(() => props.agentId)

const { tree, isLoading, cancel } = useAgentRunTree(rootRunIdRef, agentIdRef)
</script>

<template>
  <div class="agent-run-tree">
    <div v-if="isLoading" class="agent-chat-workspace__card-text">[ LOADING... ]</div>
    <template v-else-if="tree.rootIds.length">
      <AgentRunNode
        v-for="rootId in tree.rootIds"
        :key="rootId"
        :node="tree.nodes[rootId]"
        :children="tree.childrenByParent[rootId] ?? []"
        :all-nodes="tree.nodes"
        :children-by-parent="tree.childrenByParent"
        :depth="0"
        @open-run="emit('open-run', $event)"
        @cancel="cancel($event)"
      />
    </template>
    <p v-else class="agent-chat-workspace__card-text">Нет данных о поддереве прогона.</p>
  </div>
</template>
