<script setup lang="ts">
// Monitor — full-screen view of all live agent CLI sessions arranged as a
// composer → orchestrator → worker tree, with live token / cost counters
// and a right-side trace details pane showing parents, children and the
// rootRunId-scoped agent run tree for the selected session.

import { provideMonitorTopology, type MonitorMode } from '../../features/monitor-topology/model/useMonitorTopology'
import { useMonitorPersistence } from '../../features/monitor-topology/model/useMonitorPersistence'

const props = withDefaults(defineProps<{
  // When set, the monitor is scoped to a single project — only sessions whose
  // `agentProjectId` matches are shown. When null (the default), the global
  // monitor view applies the persisted "hide orphans" toggle instead.
  projectScopeId?: string | null
}>(), {
  projectScopeId: null,
})

const sessionsModel = useMessengerCliSessions()
const conversations = useMessengerConversations()
const route = useRoute()
const router = useRouter()

// `?session=<slug>` makes the trace pane deep-linkable: opening such a URL
// auto-selects the row, scrolls it into view (slice M), and reveals the
// trace details. We hydrate from the URL once on mount and replace (not
// push) the query as the selection changes so the back button stays usable.
const initialSlug = (() => {
  const v = route.query.session
  return typeof v === 'string' && v ? v : null
})()
const activeSlug = ref<string | null>(initialSlug)
const mode = ref<MonitorMode>('live')

watch(activeSlug, (slug) => {
  const current = route.query.session
  const same = slug ? current === slug : !current
  if (same) return
  const next = { ...route.query }
  if (slug) next.session = slug
  else delete next.session
  void router.replace({ query: next })
})

const sessionsRef = computed(() => sessionsModel.sessions.value)
const activeSlugRef = computed(() => activeSlug.value)
const projectScopeIdRef = computed(() => props.projectScopeId ?? null)

// `hideOrphans` is parent-owned (this section) so the topology composable can
// react to it; the tree component reads the same singleton via
// `useMonitorPersistence`. Without the singleton, section + tree would each
// own a private ref and the toggle wouldn't reach the topology filter.
const { hideOrphans } = useMonitorPersistence({ mode })

const { bySlug, ancestryFor, childrenFor, byRootRunId, counters } = provideMonitorTopology(
  sessionsRef,
  mode,
  activeSlugRef,
  { projectScopeId: projectScopeIdRef, hideOrphans },
)

// Drop a stale `?session=ghost` slug once sessions have loaded — otherwise
// the trace pane shows the empty placeholder while the URL still claims a
// selection. We only run this once after the first refresh so the watcher
// doesn't fight live deletions (those should keep the pane open until the
// user closes it manually).
const initialSessionResolved = ref(false)
watch([sessionsRef, () => sessionsModel.lastFetchedAt.value], ([sessions, fetchedAt]) => {
  if (initialSessionResolved.value || !fetchedAt || !sessions.length) return
  initialSessionResolved.value = true
  if (activeSlug.value && !bySlug.value.has(activeSlug.value)) {
    activeSlug.value = null
  }
})

// Slack-style unread badge in the browser tab title. Shows total count of
// rows that demand attention (awaiting + crashed) so the user notices new
// "ждёт ответа" sessions even when this tab is not focused.
useHead(() => {
  const pending = counters.value.awaiting + counters.value.crashed
  return {
    title: pending > 0 ? `(${pending}) Daria Messenger` : 'Daria Messenger',
  }
})

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
        :project-scoped="props.projectScopeId !== null"
        @open-session="selectSession"
        @open-chat="openChatForSession"
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
