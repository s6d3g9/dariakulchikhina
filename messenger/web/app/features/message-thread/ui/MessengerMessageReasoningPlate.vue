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
</script>

<template>
  <div class="msg-reasoning-plate">
    <button
      type="button"
      class="msg-reasoning-plate__header"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <VIcon size="12" class="msg-reasoning-plate__icon">mdi-brain</VIcon>
      <span class="msg-reasoning-plate__label">Рассуждения</span>
      <VIcon size="12" class="msg-reasoning-plate__chevron">
        {{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
      </VIcon>
    </button>

    <div v-if="expanded" class="msg-reasoning-plate__body">
      <div v-if="loading && !loaded" class="msg-reasoning-plate__loading">Загрузка…</div>
      <div v-else-if="errorMessage" class="msg-reasoning-plate__error">{{ errorMessage }}</div>
      <template v-else-if="loaded">
        <div v-if="hasAnyTrace" class="msg-reasoning-plate__meta">
          <span v-if="durationLabel" class="msg-reasoning-plate__chip" title="Длительность">⏱ {{ durationLabel }}</span>
          <span v-if="totalTokens" class="msg-reasoning-plate__chip" title="Токены in/out">🧠 {{ tokenIn }}↓ / {{ tokenOut }}↑</span>
          <span v-if="contextPct" class="msg-reasoning-plate__chip" title="Контекст">📊 {{ contextPct }}%</span>
          <span v-if="distinctFiles.length" class="msg-reasoning-plate__chip" title="Файлы">📁 {{ distinctFiles.length }}</span>
          <span v-if="costUsd" class="msg-reasoning-plate__chip" title="Стоимость">💲 {{ costUsd.toFixed(4) }}</span>
        </div>
        <div
          v-for="group in groups"
          :key="group.key"
          class="msg-reasoning-plate__group"
        >
          <button
            type="button"
            class="msg-reasoning-plate__group-title"
            :aria-expanded="groupExpanded[group.key]"
            @click="toggleGroup(group.key)"
          >
            <span class="msg-reasoning-plate__group-icon">{{ group.icon }}</span>
            <span class="msg-reasoning-plate__group-label">{{ group.label }}</span>
            <span class="msg-reasoning-plate__group-count">{{ group.entries.length }}</span>
            <VIcon size="10" class="msg-reasoning-plate__chevron">
              {{ groupExpanded[group.key] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </VIcon>
          </button>
          <template v-if="groupExpanded[group.key]">
            <div
              v-for="(t, idx) in group.entries"
              :key="idx"
              class="msg-reasoning-plate__step"
            >
              <span class="msg-reasoning-plate__dot" aria-hidden="true"></span>
              <span class="msg-reasoning-plate__tool">{{ t.tool }}</span>
              <span v-if="t.descriptor" class="msg-reasoning-plate__desc"> {{ t.descriptor }}</span>
            </div>
          </template>
        </div>
        <div v-if="!hasAnyTrace" class="msg-reasoning-plate__empty">Трассировка пуста.</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.msg-reasoning-plate {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.58);
  max-width: 100%;
}
.msg-reasoning-plate__header {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  line-height: 1;
  transition: background 0.15s ease;
}
.msg-reasoning-plate__header:hover {
  background: rgba(255, 255, 255, 0.09);
}
.msg-reasoning-plate__icon {
  opacity: 0.7;
}
.msg-reasoning-plate__label {
  font-weight: 500;
}
.msg-reasoning-plate__chevron {
  opacity: 0.6;
}
.msg-reasoning-plate__body {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.msg-reasoning-plate__loading,
.msg-reasoning-plate__error,
.msg-reasoning-plate__empty {
  font-style: italic;
  opacity: 0.6;
}
.msg-reasoning-plate__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.msg-reasoning-plate__chip {
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 10px;
  white-space: nowrap;
}
.msg-reasoning-plate__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.msg-reasoning-plate__group-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: inherit;
  cursor: pointer;
  text-align: left;
}
.msg-reasoning-plate__group-title:hover {
  color: rgba(255, 255, 255, 0.9);
}
.msg-reasoning-plate__group-icon {
  width: 14px;
  text-align: center;
}
.msg-reasoning-plate__group-label {
  font-weight: 500;
}
.msg-reasoning-plate__group-count {
  opacity: 0.5;
  font-size: 10px;
  margin-left: 2px;
}
.msg-reasoning-plate__step {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 4px 2px 22px;
  font-size: 10.5px;
  line-height: 1.4;
  border-radius: 4px;
}
.msg-reasoning-plate__step:hover {
  background: rgba(255, 255, 255, 0.03);
}
.msg-reasoning-plate__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  margin-top: 2px;
}
.msg-reasoning-plate__tool {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}
.msg-reasoning-plate__desc {
  font-family: var(--code-font, monospace);
  font-size: 10px;
  opacity: 0.65;
  word-break: break-all;
}
</style>
