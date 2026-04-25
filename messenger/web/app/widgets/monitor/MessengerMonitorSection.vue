<script setup lang="ts">
// Monitor — full-screen view of all live agent CLI sessions arranged as a
// composer → orchestrator → worker tree, with live token / cost counters.
// Built on top of useMessengerCliSessions (SSE + delta merge), so the tree
// is always in sync with the existing session stream.

const sessionsModel = useMessengerCliSessions()
const conversations = useMessengerConversations()

const activeSlug = ref<string | null>(null)

onMounted(() => {
  sessionsModel.connectStream()
  if (sessionsModel.sessions.value.length === 0) {
    void sessionsModel.refresh()
  }
})

async function openSession(slug: string) {
  activeSlug.value = slug
  const session = sessionsModel.sessions.value.find(s => s.slug === slug)
  if (!session?.agentId) return
  try {
    await conversations.openAgentConversation(session.agentId)
  }
  catch {
    // agents disabled — silently ignore; row click is a no-op in that case
  }
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
  <section class="section-block section-block--monitor" aria-label="Monitor section">
    <header class="monitor-section__header">
      <div class="monitor-section__title">
        <v-icon icon="mdi-monitor-dashboard" size="20" />
        <span class="title-medium">Монитор сессий</span>
        <v-chip
          v-if="sessionsModel.streamConnected.value"
          size="x-small"
          color="success"
          variant="tonal"
          class="monitor-section__chip"
        >
          <v-icon icon="mdi-circle" size="6" class="me-1" />
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
        <span v-if="lastFetchedLabel" class="monitor-section__hint">{{ lastFetchedLabel }}</span>
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

    <MonitorTopologyTree
      class="monitor-section__tree"
      :sessions="sessionsModel.sessions.value"
      :active-slug="activeSlug"
      @open-session="openSession"
    />
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

.monitor-section__tree {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
