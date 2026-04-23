<script setup lang="ts">
import { VIcon } from 'vuetify/components'
import type { AgentToolUseEntry } from '../../../entities/agents/model/useMessengerAgentStream'
import { useReasoningGroups } from '../../../entities/agents/model/useReasoningGroups'

const props = defineProps<{
  agentId: string
  runId: string
}>()

const api = useAgentsApi()

const expanded = ref(false)
const groupExpanded = ref<Record<string, boolean>>({})
const loaded = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const toolUses = ref<AgentToolUseEntry[]>([])
const tokenIn = ref(0)
const tokenOut = ref(0)
const costUsd = ref(0)
const runDurationMs = ref(0)

const { groups, distinctFiles, formatDuration } = useReasoningGroups(toolUses)

async function ensureLoaded() {
  if (loaded.value || loading.value) return
  loading.value = true
  try {
    let cursor: string | undefined
    const collected: AgentToolUseEntry[] = []
    let firstTs: number | undefined
    let lastTs: number | undefined
    for (let page = 0; page < 10; page++) {
      const res = await api.getAgentRunEvents(props.agentId, props.runId, cursor, 200)
      for (const ev of res.items) {
        const payload = (ev.payload ?? {}) as Record<string, unknown>
        const occurred = Date.parse(ev.occurredAt)
        if (!Number.isNaN(occurred)) {
          firstTs ??= occurred
          lastTs = occurred
        }
        if (payload.type === 'tool_use' && typeof payload.tool === 'string') {
          const input = payload.input as Record<string, unknown> | undefined
          const descriptor =
            typeof input?.command === 'string' ? String(input.command).slice(0, 140) :
            typeof input?.file_path === 'string' ? String(input.file_path) :
            typeof input?.pattern === 'string' ? String(input.pattern).slice(0, 100) :
            ''
          collected.push({ tool: String(payload.tool), descriptor, at: occurred || 0, input })
        } else if (payload.type === 'tokens') {
          tokenIn.value = Number(payload.tokenIn ?? 0)
          tokenOut.value = Number(payload.tokenOut ?? 0)
          costUsd.value = Number(payload.costUsd ?? 0)
        }
      }
      if (!res.nextCursor) break
      cursor = res.nextCursor
    }
    toolUses.value = collected
    if (firstTs != null && lastTs != null) runDurationMs.value = Math.max(0, lastTs - firstTs)
    loaded.value = true
  } catch (err) {
    errorMessage.value = 'Не удалось загрузить трассировку рассуждений.'
  } finally {
    loading.value = false
  }
}

function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) void ensureLoaded()
}

function toggleGroup(key: string) {
  groupExpanded.value[key] = !groupExpanded.value[key]
}

const durationLabel = computed(() => runDurationMs.value > 0 ? formatDuration(runDurationMs.value) : '')
const totalTokens = computed(() => tokenIn.value + tokenOut.value)
const contextPct = computed(() => totalTokens.value > 0 ? Math.round((tokenIn.value / 200_000) * 100) : 0)
const hasAnyTrace = computed(() => toolUses.value.length > 0 || totalTokens.value > 0)

function formatTime(at: number): string {
  if (!at) return ''
  return new Date(at).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <div class="chat-thinking-bubble-row chat-thinking-bubble-row--done msg-reasoning-inline">
    <div class="chat-thinking-bubble">
      <button
        type="button"
        class="chat-thinking-bubble__header chat-thinking-bubble__header--btn"
        :aria-expanded="expanded"
        @click.stop="toggle"
      >
        <VIcon size="14" class="chat-thinking-bubble__icon">mdi-brain</VIcon>
        <span class="chat-thinking-bubble__name">Рассуждения</span>
        <span class="chat-thinking-bubble__state">· завершено<template v-if="durationLabel"> · {{ durationLabel }}</template></span>
        <VIcon size="14" class="chat-thinking-bubble__chevron">
          {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </VIcon>
      </button>

      <div v-if="!expanded" class="chat-thinking-bubble__dots chat-thinking-bubble__dots--static" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>

      <div v-else class="chat-thinking-bubble__expand">
        <div v-if="loading && !loaded" class="chat-thinking-bubble__waiting">
          <span class="chat-thinking-bubble__dots chat-thinking-bubble__dots--inline" aria-hidden="true"><span></span><span></span><span></span></span>
          <span>Загрузка…</span>
        </div>
        <div v-else-if="errorMessage" class="chat-thinking-bubble__waiting">
          <span>{{ errorMessage }}</span>
        </div>
        <template v-else-if="loaded">
          <div v-if="hasAnyTrace" class="chat-thinking-meta">
            <span v-if="durationLabel" class="chat-thinking-meta-chip" title="Длительность">⏱ {{ durationLabel }}</span>
            <span v-if="totalTokens" class="chat-thinking-meta-chip" title="Токены in/out">🧠 {{ tokenIn }}↓ / {{ tokenOut }}↑</span>
            <span v-if="contextPct" class="chat-thinking-meta-chip" title="Контекст">📊 {{ contextPct }}%</span>
            <span v-if="distinctFiles.length" class="chat-thinking-meta-chip" title="Файлы">📁 {{ distinctFiles.length }}</span>
            <span v-if="costUsd" class="chat-thinking-meta-chip" title="Стоимость">💲 {{ costUsd.toFixed(4) }}</span>
          </div>
          <div
            v-for="group in groups"
            :key="group.key"
            class="chat-thinking-group"
          >
            <button
              type="button"
              class="chat-thinking-group-title chat-thinking-group-title--btn"
              :aria-expanded="groupExpanded[group.key]"
              @click.stop="toggleGroup(group.key)"
            >
              <span class="chat-thinking-bubble__icon">{{ group.icon }}</span>
              <span class="chat-thinking-bubble__name">{{ group.label }}</span>
              <span class="chat-thinking-group-count">{{ group.entries.length }}</span>
              <VIcon size="12" class="chat-thinking-bubble__chevron">
                {{ groupExpanded[group.key] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </VIcon>
            </button>
            <template v-if="groupExpanded[group.key]">
              <div
                v-for="(t, idx) in group.entries"
                :key="idx"
                class="chat-thinking-plate chat-thinking-plate--done"
              >
                <span class="chat-thinking-plate__dot" aria-hidden="true"></span>
                <span class="chat-thinking-bubble__tool-name">{{ t.tool }}</span>
                <span v-if="t.descriptor" class="chat-thinking-bubble__tool-desc"> {{ t.descriptor }}</span>
                <span v-if="t.at" class="chat-thinking-plate__time">{{ formatTime(t.at) }}</span>
              </div>
            </template>
          </div>
          <div v-if="!hasAnyTrace" class="chat-thinking-bubble__waiting">
            <span>Трассировка пуста.</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Inline variant: sits inside a message bubble, not as a full-width row.
   Trim the row padding and let the done-state styles from main.css handle visuals. */
.msg-reasoning-inline {
  display: block;
  padding: 0;
  margin-top: 6px;
}
.msg-reasoning-inline :deep(.chat-thinking-bubble) {
  display: flex;
  width: 100%;
  min-width: 0;
}
/* The dots animation is visually "active" — when the run is DONE and the
   plate is collapsed, freeze them as subtle static dots so nothing pulses. */
.msg-reasoning-inline :deep(.chat-thinking-bubble__dots--static span) {
  animation: none;
  opacity: 0.45;
}
</style>
