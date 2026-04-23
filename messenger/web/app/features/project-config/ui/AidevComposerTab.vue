<script setup lang="ts">
// Composer tab — клиент чата per-project composer agent. Не использует
// тяжеловесный MessengerAgentChatWorkspace (там свой дублирующий dock с
// табами и "Найти раздел"). Открываем agent-conversation через
// useMessengerConversations.openAgentConversation и рендерим минимальный
// список сообщений + input. Полный pipeline доставки (encryption, runs,
// delta-стрим через WS) обеспечивается общим conversation-слоем мессенджера.

import type { MessengerProject } from '../../../entities/projects/model/useMessengerProjects'

const props = defineProps<{ project: MessengerProject }>()

const projectIdRef = computed(() => props.project.id)
const agentsModel = useMessengerProjectAgents(projectIdRef)
const globalAgents = useMessengerAgents()
const cliSessions = useMessengerCliSessions()
const conversations = useMessengerConversations()
const navigation = useMessengerConversationState()
const auth = useMessengerAuth()

const creating = ref(false)
const createError = ref('')
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const scrollerEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

onMounted(async () => {
  await Promise.all([
    agentsModel.refresh(),
    globalAgents.agents.value.length ? Promise.resolve() : globalAgents.refresh(),
    cliSessions.refresh(),
  ])
  await ensureOpen()
})

watch(() => props.project.id, async () => {
  await Promise.all([agentsModel.refresh(), cliSessions.refresh()])
  await ensureOpen()
})

// Find a running CLI session composer for this project by slug name matching.
const sessionComposer = computed(() =>
  cliSessions.runningSessions.value.find((s) => {
    if (s.kind !== 'composer' || !s.agentId) return false
    const projectWords = (props.project.name || '').toLowerCase().split(/\s+/)
    const slugParts = s.slug.replace(/^composer-/, '').split(/[-_]/)
    return projectWords.some(w => w.length >= 4 && slugParts.some(p => p.startsWith(w.slice(0, 4)) || w.startsWith(p.slice(0, 4))))
  }) ?? null,
)

// composerAgentId drives the conversation; composerAgent is for display only.
const composerAgentId = computed<string | null>(() => {
  // 1. Project-specific agent in DB
  const projectComposer = agentsModel.agents.value.find((a) => {
    const x = a as unknown as { type?: string; config?: { kind?: string }; name?: string }
    return x.type === 'composer' || x.config?.kind === 'composer' || (x.name?.startsWith('Composer') ?? false)
  })
  if (projectComposer) return projectComposer.id

  // 2. Running CLI session composer matching project
  if (sessionComposer.value?.agentId) return sessionComposer.value.agentId

  // 3. Global "Composer" agent
  return globalAgents.agents.value.find(a =>
    a.displayName === 'Composer' || a.displayName?.toLowerCase().startsWith('composer'),
  )?.id ?? null
})

// For display name only
const composerAgent = computed(() =>
  composerAgentId.value
    ? (globalAgents.agents.value.find(a => a.id === composerAgentId.value) ?? sessionComposer.value)
    : null,
)

// Messages list is scoped by `state.activeConversationId`. When we open the
// composer's conversation, messages.value reflects that thread.
const messages = computed(() => conversations.messages.value)

// --- Thinking indicator: pulsing bubble while waiting for agent reply -----
const awaitingReply = ref(false)
const lastUserSentAt = ref<number>(0)

// Restore thinking bubble across page reloads: probe active-run for this agent.
const agentsApi = useAgentsApi()
async function probeActiveRun() {
  if (!composerAgentId.value) return
  try {
    const resp = await agentsApi.getAgentActiveRun(composerAgentId.value)
    if (resp.run) {
      awaitingReply.value = true
      lastUserSentAt.value = new Date(resp.run.createdAt).getTime()
    }
  } catch {}
}
watch(composerAgentId, async (newId) => {
  if (newId) await probeActiveRun()
})
onMounted(() => { void probeActiveRun() })

// Model name shown in the mini-caption of the thinking bubble.
const composerModelLabel = computed(() => {
  const a = composerAgent.value as unknown as { model?: string; settings?: { model?: string } } | null
  return a?.settings?.model || a?.model || 'sonnet'
})

// Live reasoning stream (WS-backed). Active only while composerAgentId is set.
const composerAgentIdRef = computed(() => composerAgentId.value || '')
const agentStream = useMessengerAgentStream(composerAgentIdRef as any)
const reasoningExpanded = ref(false)
const { groups: aidevGroups, distinctFiles: aidevDistinctFiles, formatDuration: aidevFormatDuration } = useReasoningGroups(agentStream.toolUses as any)
const aidevRunDuration = computed(() => {
  const start = agentStream.runStartedAt.value
  if (!start) return ''
  return aidevFormatDuration(Date.now() - start)
})

const substateLabel = computed(() => {
  const s = agentStream.substate.value as string
  return ({
    idle: 'Готов',
    thinking: 'Думает…',
    tool_call: 'Запускает инструменты…',
    awaiting_input: 'Ждёт ввод',
    streaming: 'Отвечает…',
    error: 'Ошибка',
  } as Record<string, string>)[s] || 'Работает…'
})

function toggleReasoning() { reasoningExpanded.value = !reasoningExpanded.value }

// When a new agent message arrives after our last send, clear the indicator.
watch(messages, (list) => {
  if (!awaitingReply.value) return
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i] as unknown as { own?: boolean; createdAt?: string }
    const ts = m?.createdAt ? new Date(m.createdAt).getTime() : 0
    if (m?.own === false && ts >= lastUserSentAt.value - 500) {
      awaitingReply.value = false
      return
    }
  }
}, { deep: true })

async function ensureOpen() {
  if (!composerAgentId.value) return
  try {
    await conversations.openAgentConversation(composerAgentId.value)
    await nextTick()
    scrollToBottom(false)
  }
  catch (e) {
    sendError.value = (e as Error).message || 'Не удалось открыть чат composer-а'
  }
}

async function createComposer() {
  creating.value = true
  createError.value = ''
  try {
    await agentsModel.create({ type: 'composer' })
    await agentsModel.refresh()
    await ensureOpen()
  }
  catch (e) {
    createError.value = (e as Error).message || 'Не удалось создать composer'
  }
  finally {
    creating.value = false
  }
}

function onInputKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}

async function send() {
  const body = draft.value.trim()
  if (!body || sending.value) return
  sending.value = true
  sendError.value = ''
  try {
    await conversations.sendMessage(body)
    awaitingReply.value = true
    lastUserSentAt.value = Date.now()
    draft.value = ''
    await nextTick()
    scrollToBottom(true)
  }
  catch (e) {
    sendError.value = (e as Error).message || 'Не удалось отправить'
  }
  finally {
    sending.value = false
  }
}

function scrollToBottom(smooth: boolean) {
  const el = scrollerEl.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

watch(messages, async () => {
  await nextTick()
  scrollToBottom(true)
}, { deep: true })

function isOwnMessage(m: any) {
  return auth.user.value?.id && m.authorUserId === auth.user.value.id
}
function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
</script>

<template>
  <div class="aidev-composer-tab">
    <!-- Loading composer lookup -->
    <div v-if="agentsModel.pending.value && !composerAgentId" class="aidev-composer-tab__loading">
      <MessengerProgressCircular indeterminate four-color size="md" aria-label="Загрузка composer-а" />
    </div>

    <!-- No composer yet: CTA -->
    <div v-else-if="!composerAgentId" class="aidev-composer-tab__empty">
      <VIcon size="48" color="secondary" class="mb-3">mdi-robot-outline</VIcon>
      <p class="aidev-composer-tab__empty-title">У проекта ещё нет composer-а</p>
      <p class="aidev-composer-tab__empty-hint">
        Composer — главный чат проекта. Через него ты обсуждаешь стратегию,
        декомпозируешь задачи и делегируешь orchestrator-у.
      </p>
      <VBtn
        color="primary"
        variant="flat"
        :loading="creating"
        prepend-icon="mdi-plus"
        class="mt-4"
        @click="createComposer"
      >
        Создать composer
      </VBtn>
      <p v-if="createError" class="aidev-composer-tab__error">{{ createError }}</p>
    </div>

    <!-- Composer chat -->
    <template v-else>
      <div class="aidev-composer-tab__chat-header">
        <span class="aidev-composer-tab__chat-title">
          <VIcon size="16" class="mr-1">mdi-robot-outline</VIcon>
          {{ (composerAgent as any)?.displayName || (composerAgent as any)?.name || sessionComposer?.agentDisplayName || 'Composer' }}
        </span>
        <!-- "Открыть чат" removed: navigating to global Chat section unscopes the project view.
             The full chat is rendered inline below this header. -->
      </div>
      <div ref="scrollerEl" class="aidev-composer-tab__scroller">
        <div v-if="messages.length === 0" class="aidev-composer-tab__intro">
          <VAvatar color="primary" variant="tonal" size="40" class="mb-2">
            <VIcon>mdi-robot-outline</VIcon>
          </VAvatar>
          <p class="aidev-composer-tab__intro-title">
            {{ (composerAgent as any)?.displayName || (composerAgent as any)?.name || sessionComposer?.agentDisplayName || 'Composer' }}
          </p>
          <p class="aidev-composer-tab__intro-hint">
            Напиши composer-у задачу. Он декомпозирует и делегирует оркестратору.
          </p>
        </div>

        <div
          v-for="m in messages"
          :key="(m as any).id"
          class="aidev-composer-tab__msg"
          :class="{ 'aidev-composer-tab__msg--own': isOwnMessage(m) }"
        >
          <div class="aidev-composer-tab__msg-bubble">
            <div class="aidev-composer-tab__msg-body">
              {{ (m as any).body || (m as any).encryptedBody?.ciphertext || '' }}
            </div>
            <div class="aidev-composer-tab__msg-time">
              {{ formatTime((m as any).createdAt || (m as any).sentAt) }}
            </div>
          </div>
        </div>

        <!-- Thinking indicator: expandable bubble with live reasoning -->
        <div
          v-if="awaitingReply"
          class="aidev-composer-tab__msg aidev-composer-tab__msg--thinking"
          aria-live="polite"
          aria-label="Агент думает"
        >
          <div class="aidev-composer-tab__msg-bubble aidev-composer-tab__thinking-bubble">
            <button
              type="button"
              class="aidev-composer-tab__thinking-header aidev-composer-tab__thinking-header--btn"
              :aria-expanded="reasoningExpanded"
              @click="toggleReasoning"
            >
              <VIcon size="14" class="aidev-composer-tab__thinking-icon">mdi-robot-outline</VIcon>
              <span class="aidev-composer-tab__thinking-name">
                {{ (composerAgent as any)?.displayName || (composerAgent as any)?.name || 'Composer' }}
              </span>
              <span class="aidev-composer-tab__thinking-model">· {{ composerModelLabel }}</span>
              <span class="aidev-composer-tab__thinking-state">· {{ substateLabel }}</span>
              <VIcon size="14" class="aidev-composer-tab__thinking-chevron">
                {{ reasoningExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </VIcon>
            </button>

            <div v-if="!reasoningExpanded" class="aidev-composer-tab__thinking-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>

            <div v-else class="aidev-composer-tab__thinking-expand">
              <div v-if="aidevRunDuration || agentStream.tokenCount.value.total" class="aidev-composer-tab__thinking-meta">
                <span v-if="aidevRunDuration" class="aidev-composer-tab__thinking-meta-chip" title="Длительность">⏱ {{ aidevRunDuration }}</span>
                <span v-if="agentStream.tokenCount.value.total" class="aidev-composer-tab__thinking-meta-chip" title="Токены in/out">🧠 {{ agentStream.tokenCount.value.input }}↓ / {{ agentStream.tokenCount.value.output }}↑</span>
                <span v-if="agentStream.tokenCount.value.contextPct" class="aidev-composer-tab__thinking-meta-chip" title="Контекст">📊 {{ agentStream.tokenCount.value.contextPct }}%</span>
                <span v-if="aidevDistinctFiles.length" class="aidev-composer-tab__thinking-meta-chip" title="Файлов задействовано">📁 {{ aidevDistinctFiles.length }}</span>
              </div>
              <div v-for="group in aidevGroups" :key="group.key" class="aidev-composer-tab__thinking-group">
                <div class="aidev-composer-tab__thinking-group-title">
                  {{ group.icon }} {{ group.label }}
                  <span class="aidev-composer-tab__thinking-group-count">{{ group.entries.length }}</span>
                </div>
                <div
                  v-for="(t, idx) in group.entries"
                  :key="idx"
                  class="aidev-composer-tab__thinking-plate"
                  :class="{
                    'aidev-composer-tab__thinking-plate--active': agentStream.toolUses.value.length > 0 && t.at === agentStream.toolUses.value[agentStream.toolUses.value.length - 1].at,
                    'aidev-composer-tab__thinking-plate--done':   agentStream.toolUses.value.length > 0 && t.at !== agentStream.toolUses.value[agentStream.toolUses.value.length - 1].at,
                  }"
                >
                  <span class="aidev-composer-tab__thinking-plate-dot" aria-hidden="true"></span>
                  <span class="aidev-composer-tab__thinking-tool-name">{{ t.tool }}</span>
                  <span v-if="t.descriptor" class="aidev-composer-tab__thinking-tool-desc"> {{ t.descriptor }}</span>
                </div>
              </div>
              <div v-if="agentStream.substate.value === 'awaiting_input'" class="aidev-composer-tab__thinking-plate aidev-composer-tab__thinking-plate--awaiting">
                <span class="aidev-composer-tab__thinking-plate-dot" aria-hidden="true"></span>
                <span>⏳ Ждёт ввод</span>
              </div>
              <div v-if="agentStream.streamingDraft.value" class="aidev-composer-tab__thinking-stream">{{ agentStream.streamingDraft.value }}<span class="aidev-composer-tab__thinking-caret">▍</span></div>
              <div v-if="!agentStream.toolUses.value.length && !agentStream.streamingDraft.value" class="aidev-composer-tab__thinking-waiting">
                <span class="aidev-composer-tab__thinking-dots aidev-composer-tab__thinking-dots--inline" aria-hidden="true"><span></span><span></span><span></span></span>
                <span class="aidev-composer-tab__thinking-waiting-text">Ожидание событий стрима…</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VAlert
        v-if="sendError"
        type="error"
        density="compact"
        class="aidev-composer-tab__send-err ma-2"
      >
        {{ sendError }}
      </VAlert>

      <div class="aidev-composer-tab__composer">
        <MessengerDockField>
          <textarea
            ref="inputEl"
            v-model="draft"
            class="composer-input composer-input--dock"
            :placeholder="`Написать composer-у проекта ${project.name}…`"
            :disabled="sending"
            rows="1"
            @keydown="onInputKey"
          />
          <VBtn
            icon
            variant="text"
            size="small"
            :disabled="!draft.trim() || sending"
            :loading="sending"
            aria-label="Отправить"
            title="Отправить"
            class="aidev-composer-tab__send-btn"
            @click="send"
          >
            <VIcon>mdi-send</VIcon>
          </VBtn>
        </MessengerDockField>
      </div>
    </template>
  </div>
</template>

<style scoped>
.aidev-composer-tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.aidev-composer-tab__loading,
.aidev-composer-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 16px;
  flex: 1;
}

.aidev-composer-tab__empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.aidev-composer-tab__empty-hint {
  margin: 6px 0 0;
  max-width: 440px;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
.aidev-composer-tab__error {
  margin-top: 12px;
  font-size: 12px;
  color: rgb(var(--v-theme-error));
}

.aidev-composer-tab__chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgb(var(--v-theme-surface-container));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.aidev-composer-tab__chat-title {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  display: flex;
  align-items: center;
}

.aidev-composer-tab__scroller {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidev-composer-tab__intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
}
.aidev-composer-tab__intro-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.aidev-composer-tab__intro-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  max-width: 420px;
}

/* Expandable thinking bubble additions */
.aidev-composer-tab__thinking-header--btn {
  background: transparent;
  border: 0;
  padding: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: inherit;
  text-align: left;
}
.aidev-composer-tab__thinking-state {
  font-size: 10px;
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.75;
  font-style: italic;
}
.aidev-composer-tab__thinking-chevron { margin-left: auto; opacity: 0.6; }
.aidev-composer-tab__thinking-expand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 0 2px;
  border-top: 1px solid rgba(var(--v-theme-primary), 0.2);
  margin-top: 4px;
}
.aidev-composer-tab__thinking-tool {
  font-size: 11px;
  display: flex;
  gap: 4px;
  align-items: baseline;
  flex-wrap: wrap;
}

/* Inner plate: each tool_use / awaiting op as a mini-card */
.aidev-composer-tab__thinking-plate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 11.5px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
  transition: opacity 300ms ease, background 300ms ease, border-color 300ms ease;
}
.aidev-composer-tab__thinking-plate--active {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.45);
  animation: aidev-inner-plate-pulse 1.4s ease-in-out infinite;
}
.aidev-composer-tab__thinking-plate--done {
  opacity: 0.55;
}
.aidev-composer-tab__thinking-plate--awaiting {
  background: rgba(var(--v-theme-warning, 255 176 32), 0.1);
  border-color: rgba(var(--v-theme-warning, 255 176 32), 0.45);
  animation: aidev-inner-plate-pulse 1.2s ease-in-out infinite;
}
.aidev-composer-tab__thinking-plate-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}
.aidev-composer-tab__thinking-plate--active .aidev-composer-tab__thinking-plate-dot {
  animation: aidev-inner-plate-dot-pulse 0.9s ease-in-out infinite;
}
.aidev-composer-tab__thinking-plate--done .aidev-composer-tab__thinking-plate-dot {
  background: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.5;
}
.aidev-composer-tab__thinking-plate--awaiting .aidev-composer-tab__thinking-plate-dot {
  background: rgb(var(--v-theme-warning, 255 176 32));
  animation: aidev-inner-plate-dot-pulse 0.9s ease-in-out infinite;
}
@keyframes aidev-inner-plate-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.25); }
  50%      { box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.08); }
}
@keyframes aidev-inner-plate-dot-pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.7; }
  50%      { transform: scale(1.15); opacity: 1;   }
}
.aidev-composer-tab__thinking-tool-name {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
.aidev-composer-tab__thinking-tool-desc {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  color: rgb(var(--v-theme-on-surface-variant));
  word-break: break-all;
}
.aidev-composer-tab__thinking-stream {
  font-size: 11.5px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.aidev-composer-tab__thinking-caret {
  display: inline-block;
  animation: aidev-thinking-caret 1s steps(2) infinite;
  color: rgb(var(--v-theme-primary));
}
@keyframes aidev-thinking-caret {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.aidev-composer-tab__thinking-meta { display: flex; gap: 6px; flex-wrap: wrap; padding-bottom: 4px; border-bottom: 1px dashed rgba(var(--v-theme-primary), 0.2); margin-bottom: 4px; }
.aidev-composer-tab__thinking-meta-chip { font-size: 10.5px; padding: 2px 7px; border-radius: 8px; background: rgba(var(--v-theme-primary), 0.08); color: rgb(var(--v-theme-on-surface)); font-weight: 500; }
.aidev-composer-tab__thinking-group { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.aidev-composer-tab__thinking-group-title { font-size: 10.5px; font-weight: 600; color: rgb(var(--v-theme-on-surface-variant)); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 6px; padding-bottom: 2px; }
.aidev-composer-tab__thinking-group-count { font-size: 9.5px; padding: 1px 6px; border-radius: 6px; background: rgba(var(--v-theme-primary), 0.15); color: rgb(var(--v-theme-primary)); font-weight: 600; }
.aidev-composer-tab__thinking-waiting {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.aidev-composer-tab__thinking-dots--inline { height: 8px; }
.aidev-composer-tab__thinking-dots--inline span { width: 4px; height: 4px; }

/* Thinking indicator bubble — pulsing dots while agent is working */
.aidev-composer-tab__msg--thinking .aidev-composer-tab__msg-bubble {
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px dashed rgba(var(--v-theme-primary), 0.35);
  animation: aidev-thinking-pulse 1.6s ease-in-out infinite;
}
.aidev-composer-tab__thinking-bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}
.aidev-composer-tab__thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}
.aidev-composer-tab__thinking-icon { opacity: 0.75; }
.aidev-composer-tab__thinking-name { font-weight: 600; }
.aidev-composer-tab__thinking-model {
  font-size: 10px;
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.85;
}
.aidev-composer-tab__thinking-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 10px;
}
.aidev-composer-tab__thinking-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  opacity: 0.4;
  animation: aidev-thinking-dot 1.2s ease-in-out infinite both;
}
.aidev-composer-tab__thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.aidev-composer-tab__thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes aidev-thinking-dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40%           { opacity: 1;   transform: scale(1.15); }
}
@keyframes aidev-thinking-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.25); }
  50%      { box-shadow: 0 0 0 6px rgba(var(--v-theme-primary), 0.05); }
}

.aidev-composer-tab__msg {
  display: flex;
  max-width: 78%;
  align-self: flex-start;
}
.aidev-composer-tab__msg--own {
  align-self: flex-end;
}
.aidev-composer-tab__msg-bubble {
  background: rgb(var(--v-theme-surface-container-high));
  color: rgb(var(--v-theme-on-surface));
  padding: 8px 12px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  word-break: break-word;
  white-space: pre-wrap;
}
.aidev-composer-tab__msg--own .aidev-composer-tab__msg-bubble {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-radius: 12px;
  border-top-right-radius: 4px;
}
.aidev-composer-tab__msg-body {
  font-size: 13px;
  line-height: 1.45;
}
.aidev-composer-tab__msg-time {
  margin-top: 2px;
  font-size: 10px;
  opacity: 0.65;
  text-align: right;
}

.aidev-composer-tab__send-err {
  flex-shrink: 0;
}

.aidev-composer-tab__composer {
  flex-shrink: 0;
  padding: 6px 8px;
  background: rgb(var(--v-theme-surface-container-low));
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.aidev-composer-tab__send-btn {
  align-self: flex-end;
}
</style>
