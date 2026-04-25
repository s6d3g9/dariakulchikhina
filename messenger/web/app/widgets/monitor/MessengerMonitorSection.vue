<script setup lang="ts">
// Monitor — full-screen view of all live agent CLI sessions arranged as a
// composer → orchestrator → worker tree, with live token / cost counters
// and a right-side trace details pane showing parents, children and the
// rootRunId-scoped agent run tree for the selected session.

import { provideMonitorTopology, type MonitorMode } from '../../features/monitor-topology/model/useMonitorTopology'

const sessionsModel = useMessengerCliSessions()
const conversations = useMessengerConversations()

const activeSlug = ref<string | null>(null)
const mode = ref<MonitorMode>('live')

const sessionsRef = computed(() => sessionsModel.sessions.value)
const activeSlugRef = computed(() => activeSlug.value)
const { bySlug, ancestryFor, childrenFor, byRootRunId } = provideMonitorTopology(
  sessionsRef,
  mode,
  activeSlugRef,
)

const activeSession = computed(() => activeSlug.value ? bySlug.value.get(activeSlug.value) ?? null : null)
const activeAncestry = computed(() => activeSlug.value ? ancestryFor(activeSlug.value) : [])
const activeChildren = computed(() => activeSlug.value ? childrenFor(activeSlug.value) : [])
const activeTraceMembers = computed(() => {
  const sess = activeSession.value
  if (!sess?.rootRunId) return sess ? [sess] : []
  return byRootRunId.value.get(sess.rootRunId) ?? [sess]
})

onMounted(() => {
  sessionsModel.connectStream()
  if (sessionsModel.sessions.value.length === 0) {
    void sessionsModel.refresh()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeydown)
  }
})

function onGlobalKeydown(ev: KeyboardEvent) {
  // Esc closes the trace pane; ignore when typing into form fields so we
  // don't fight other components for the same key.
  if (ev.key !== 'Escape') return
  const target = ev.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (activeSlug.value) {
    ev.preventDefault()
    activeSlug.value = null
  }
}

function selectSession(slug: string) {
  activeSlug.value = slug
}

async function openChatForSession(slug: string) {
  const session = sessionsModel.sessions.value.find(s => s.slug === slug)
  if (!session?.agentId) return
  try {
    await conversations.openAgentConversation(session.agentId)
  }
  catch {
    // agents disabled — no-op
  }
}

function closeDetails() {
  activeSlug.value = null
}

const lastFetchedLabel = computed(() => {
  if (!sessionsModel.lastFetchedAt.value) return null
  const ms = Date.now() - sessionsModel.lastFetchedAt.value
  if (ms < 60_000) return 'обновлено только что'
  if (ms < 3_600_000) return `обновлено ${Math.floor(ms / 60_000)} мин назад`
  return `обновлено ${Math.floor(ms / 3_600_000)} ч назад`
})
</script>

<template>
  <section
    class="section-block section-block--monitor"
    aria-label="Monitor section"
  >
    <header class="monitor-section__header">
      <div class="monitor-section__title">
        <v-icon
          icon="mdi-monitor-dashboard"
          size="20"
        />
        <span class="title-medium">Монитор сессий</span>
        <v-chip
          v-if="sessionsModel.streamConnected.value"
          size="x-small"
          color="success"
          variant="tonal"
          class="monitor-section__chip"
        >
          <v-icon
            icon="mdi-circle"
            size="6"
            class="me-1"
          />
          live
        </v-chip>
        <v-chip
          v-else
          size="x-small"
          color="warning"
          variant="tonal"
          class="monitor-section__chip"
        >
          offline
        </v-chip>
      </div>
      <div class="monitor-section__meta">
        <span
          v-if="lastFetchedLabel"
          class="monitor-section__hint"
        >{{ lastFetchedLabel }}</span>
        <v-btn
          variant="text"
          size="small"
          icon="mdi-refresh"
          :loading="sessionsModel.pending.value"
          aria-label="Обновить"
          @click="sessionsModel.refresh()"
        />
      </div>
    </header>

    <div
      class="monitor-section__split"
      :class="{ 'monitor-section__split--has-active': !!activeSlug }"
    >
      <MonitorTopologyTree
        v-model="mode"
        class="monitor-section__tree"
        :active-slug="activeSlug"
        :stream-connected="sessionsModel.streamConnected.value"
        :last-delta-at="sessionsModel.lastDeltaAt.value"
        @open-session="selectSession"
      />
      <MonitorTraceDetails
        class="monitor-section__details"
        :session="activeSession"
        :ancestry="activeAncestry"
        :children="activeChildren"
        :trace-members="activeTraceMembers"
        @open-session="selectSession"
        @open-chat="openChatForSession"
        @close="closeDetails"
      />
    </div>
  </section>
</template>

<style scoped>
.section-block--monitor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: rgb(var(--v-theme-background));
}

.monitor-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-outline)) 18%, transparent);
}

.monitor-section__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.monitor-section__chip {
  margin-left: 4px;
}

.monitor-section__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.monitor-section__hint {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.monitor-section__split {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 0;
  transition: grid-template-columns 220ms ease;
  overflow: hidden;
}

.monitor-section__split--has-active {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
}

.monitor-section__tree {
  min-width: 0;
  min-height: 0;
}

.monitor-section__details {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .monitor-section__split--has-active {
    grid-template-columns: 0 minmax(0, 1fr);
  }

  .monitor-section__split--has-active .monitor-section__tree {
    visibility: hidden;
  }
}
</style>
