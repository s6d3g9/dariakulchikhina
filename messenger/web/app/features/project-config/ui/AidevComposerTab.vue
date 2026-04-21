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
        <VBtn
          size="x-small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-open-in-new"
          @click="conversations.activeConversationId.value && navigation.openConversation(conversations.activeConversationId.value)"
        >
          Открыть чат
        </VBtn>
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
