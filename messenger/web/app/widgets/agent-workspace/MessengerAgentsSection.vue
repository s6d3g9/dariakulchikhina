<script setup lang="ts">
import { SUBSCRIPTION_PROVIDERS } from '../../entities/settings/model/useMessengerSubscriptions'
const agentsModel = useMessengerAgents()
const conversations = useMessengerConversations()
const navigation = useMessengerConversationState()
const subscriptionsModel = useMessengerSubscriptions()
const actionError = ref('')
const agentsTab = ref<'directory' | 'graph'>('directory')
const graphTab = ref<'agents' | 'project'>('project')
const searchDraft = ref('')
const searchOpen = ref(false)
const settingsDialogOpen = ref(false)
const editingAgentId = ref<string | null>(null)
const EFFORT_OPTIONS = [
  { title: 'Low — быстро, экономно', value: 'low' },
  { title: 'Medium — баланс (по умолчанию)', value: 'medium' },
  { title: 'High — глубокое мышление', value: 'high' },
  { title: 'XHigh — очень глубокое', value: 'xhigh' },
  { title: 'Max — максимум', value: 'max' },
]
const settingsDraft = reactive({
  subscriptionId: 'builtin-claude-code-cli',
  model: 'claude-sonnet-4-6',
  effort: 'medium' as 'low' | 'medium' | 'high' | 'xhigh' | 'max',
  apiKey: '',
  ssh: {
    host: '',
    login: '',
    port: 22,
    privateKey: '',
    workspacePath: '',
    repositories: [] as Array<{ id: string; label: string; path: string }>,
    activeRepositoryId: '',
  },
  connections: [] as Array<{ targetAgentId: string; mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route' }>,
})

const editingAgent = computed(() => agentsModel.agents.value.find(agent => agent.id === editingAgentId.value) ?? null)
const subscriptionOptions = computed(() =>
  subscriptionsModel.subscriptions.value.map(sub => ({ title: sub.label, value: sub.id, subtitle: sub.account }))
)
const activeSubscription = computed(() =>
  subscriptionsModel.subscriptions.value.find(s => s.id === settingsDraft.subscriptionId)
  ?? subscriptionsModel.defaultSubscription.value
)
const activeModelOptions = computed(() => {
  const provider = SUBSCRIPTION_PROVIDERS.find(p => p.key === activeSubscription.value?.provider)
  return provider?.models?.map(m => ({ title: m.label, value: m.id })) ?? []
})
const activeModelMeta = computed(() => {
  const provider = SUBSCRIPTION_PROVIDERS.find(p => p.key === activeSubscription.value?.provider)
  return provider?.models?.find(m => m.id === settingsDraft.model)
})
const showEffortSelector = computed(() => {
  const provider = SUBSCRIPTION_PROVIDERS.find(p => p.key === activeSubscription.value?.provider)
  return provider?.supportsEffort && (activeModelMeta.value?.supportsEffort ?? true)
})
const availableLinkedAgents = computed(() => agentsModel.agents.value.filter(agent => agent.id !== editingAgentId.value))
const normalizedSearchQuery = computed(() => searchDraft.value.trim().toLowerCase())
const filteredAgents = computed(() => {
  if (!normalizedSearchQuery.value) {
    return agentsModel.agents.value
  }

  return agentsModel.agents.value.filter(agent => [
    agent.displayName,
    agent.login,
    agent.description,
    agent.settings.model,
  ].some(value => value.toLowerCase().includes(normalizedSearchQuery.value)))
})
const searchSuggestions = computed(() => filteredAgents.value.slice(0, normalizedSearchQuery.value ? 8 : 5))

onMounted(async () => {
  await agentsModel.refresh()
})

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  setTimeout(() => {
    searchOpen.value = false
  }, 120)
}

function selectSuggestion(agentId: string) {
  const found = agentsModel.agents.value.find(agent => agent.id === agentId)
  if (!found) {
    return
  }

  searchDraft.value = found.displayName
  agentsTab.value = 'directory'
  searchOpen.value = false
}

async function saveGraph(graph: Record<string, { connections: Array<{ targetAgentId: string; mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route' }>; graphPosition: { x: number; y: number } }>) {
  actionError.value = ''

  try {
    await agentsModel.saveGraph(graph)
  } catch {
    actionError.value = 'Не удалось сохранить схему связей агентов.'
  }
}

async function openAgent(agentId: string) {
  actionError.value = ''

  try {
    await conversations.openAgentConversation(agentId)
    navigation.openSection('chat')
  } catch {
    actionError.value = 'Не удалось открыть чат с агентом.'
  }
}

function resolveAvatar(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'AI'
}

function openSettings(agentId: string) {
  const agent = agentsModel.agents.value.find(item => item.id === agentId)
  if (!agent) {
    return
  }

  subscriptionsModel.hydrate()
  editingAgentId.value = agentId
  settingsDraft.subscriptionId = agent.settings.subscriptionId || 'builtin-claude-code-cli'
  settingsDraft.model = agent.settings.model
  settingsDraft.effort = (agent.settings.effort as any) || 'medium'
  settingsDraft.apiKey = agent.settings.apiKey
  settingsDraft.ssh.host = agent.settings.ssh.host
  settingsDraft.ssh.login = agent.settings.ssh.login
  settingsDraft.ssh.port = agent.settings.ssh.port
  settingsDraft.ssh.privateKey = agent.settings.ssh.privateKey
  settingsDraft.ssh.workspacePath = agent.settings.ssh.workspacePath
  settingsDraft.ssh.repositories = agent.settings.ssh.repositories.map(repo => ({ ...repo }))
  settingsDraft.ssh.activeRepositoryId = agent.settings.ssh.activeRepositoryId
  settingsDraft.connections = agent.settings.connections.map(connection => ({ ...connection }))
  settingsDialogOpen.value = true
}

function closeSettings() {
  settingsDialogOpen.value = false
  editingAgentId.value = null
}

function toggleLinkedAgent(agentId: string) {
  if (settingsDraft.connections.some(item => item.targetAgentId === agentId)) {
    settingsDraft.connections = settingsDraft.connections.filter(item => item.targetAgentId !== agentId)
    return
  }

  settingsDraft.connections = [...settingsDraft.connections, { targetAgentId: agentId, mode: 'review' }]
}

function updateLinkedAgentMode(agentId: string, mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route') {
  settingsDraft.connections = settingsDraft.connections.map(item => item.targetAgentId === agentId
    ? {
        ...item,
        mode,
      }
    : item)
}

async function saveSettings() {
  if (!editingAgent.value) {
    return
  }

  actionError.value = ''

  try {
    await agentsModel.saveSettings(editingAgent.value.id, {
      subscriptionId: settingsDraft.subscriptionId,
      model: settingsDraft.model,
      effort: settingsDraft.effort,
      apiKey: settingsDraft.apiKey,
      ssh: settingsDraft.ssh,
      knowledge: editingAgent.value.settings.knowledge,
      connections: settingsDraft.connections,
      graphPosition: editingAgent.value.settings.graphPosition,
    })
    closeSettings()
  } catch {
    actionError.value = 'Не удалось сохранить меню агента.'
  }
}
</script>

<template>
  <section class="section-block section-block--agents" aria-label="Agents section">
    <VAlert v-if="actionError" type="error" class="ma-2">{{ actionError }}</VAlert>
    <div v-if="agentsModel.pending.value" class="section-progress section-progress--floating">
      <MessengerProgressLinear aria-label="Загрузка агентов" indeterminate four-color />
    </div>

    <VWindow v-model="agentsTab" class="section-list agents-section__window">
      <VWindowItem value="directory" class="agents-section__pane">
        <VList class="section-list" bg-color="transparent" lines="three">
          <VListItem
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="chat-row"
            lines="three"
            @click="openAgent(agent.id)"
          >
            <template #prepend>
              <VAvatar color="secondary" variant="tonal" size="48">
                {{ resolveAvatar(agent.displayName) }}
              </VAvatar>
            </template>
            <template #title>
              <div class="chat-row__titlebar">
                <div class="chat-row__titlemain">
                  <span class="title-small">{{ agent.displayName }}</span>
                </div>
              </div>
            </template>
            <template #subtitle>
              <span class="on-surface-variant">
                @{{ agent.login }} · {{ agent.description }} · модель: {{ agent.settings.model }}
                <template v-if="agent.settings.connections.length"> · связей: {{ agent.settings.connections.length }}</template>
                <template v-if="agent.settings.apiKeyConfigured"> · API key задан</template>
                <template v-else> · API key не задан</template>
                <template v-if="agent.settings.sshConfigured"> · SSH задан</template>
                <template v-else> · SSH не задан</template>
              </span>
            </template>
            <template #append>
              <div class="d-flex ga-2 align-center">
                <VBtn size="small" color="secondary" variant="text" @click.stop="openSettings(agent.id)">
                  Меню
                </VBtn>
                <VBtn size="small" color="primary" variant="tonal" @click.stop="openAgent(agent.id)">
                  {{ agent.conversationId ? 'Открыть' : 'Начать' }}
                </VBtn>
              </div>
            </template>
          </VListItem>

          <div v-if="!filteredAgents.length && !agentsModel.pending.value" class="empty-state">
            <VIcon size="48" color="on-surface-variant">mdi-robot-outline</VIcon>
            <p class="empty-state__title">Агенты не найдены</p>
            <p class="empty-state__text">Сбросьте поиск или измените запрос.</p>
          </div>
        </VList>
      </VWindowItem>

      <VWindowItem value="graph" class="agents-section__pane">
        <div class="agents-section__graph-mode-tabs">
          <VTabs v-model="graphTab" class="section-tabs" bg-color="surface-container" color="primary" density="compact" grow>
            <VTab value="project">Project nodes</VTab>
            <VTab value="agents">Agent nodes</VTab>
          </VTabs>
        </div>

        <div v-if="graphTab === 'project'" class="agents-section__graph-shell">
          <MessengerProjectEngineGraph />
        </div>

        <div v-else-if="filteredAgents.length" class="agents-section__graph-shell">
          <MessengerAgentGraphEditor
            :agents="filteredAgents"
            :saving="agentsModel.settingsPending.value"
            @save-graph="saveGraph"
            @open-settings="openSettings"
            @open-agent="openAgent"
          />
        </div>

        <div v-else class="empty-state">
          <VIcon size="48" color="on-surface-variant">mdi-graph-outline</VIcon>
          <p class="empty-state__title">Agent graph пуст для этого фильтра</p>
          <p class="empty-state__text">Сбросьте поиск или переключитесь в Project nodes для работы с кабинетами и договорённостями.</p>
        </div>
      </VWindowItem>
    </VWindow>

    <div class="section-tabs-row agents-section__tabs-row">
      <VTabs v-model="agentsTab" class="section-tabs" bg-color="surface-container" color="primary" density="compact" grow>
        <VTab value="directory" aria-label="Список агентов" title="Список агентов">
          <VIcon>mdi-format-list-bulleted</VIcon>
        </VTab>
        <VTab value="graph" aria-label="Граф агентов" title="Граф агентов">
          <VIcon>mdi-graph-outline</VIcon>
        </VTab>
      </VTabs>
    </div>

    <div class="search-dock search-dock--bottom-dock agents-section__search-dock">
      <div class="search-dock__field">
        <MessengerDockField>
          <input
            v-model="searchDraft"
            type="text"
            class="composer-input composer-input--dock"
            placeholder="Найти агента"
            autocomplete="off"
            @focus="openSearch"
            @blur="closeSearch"
          />
        </MessengerDockField>
        <Transition name="chrome-reveal">
          <div v-if="searchOpen && searchSuggestions.length" class="search-dropdown" @mousedown.prevent>
            <VList bg-color="transparent" density="comfortable">
              <VListItem
                v-for="agent in searchSuggestions"
                :key="agent.id"
                @click="selectSuggestion(agent.id)"
              >
                <template #title>{{ agent.displayName }}</template>
                <template #subtitle>@{{ agent.login }} · {{ agent.settings.model }}</template>
              </VListItem>
            </VList>
          </div>
        </Transition>
      </div>
    </div>

    <VDialog v-model="settingsDialogOpen" max-width="620">
      <VCard v-if="editingAgent">
        <VCardTitle>Меню агента: {{ editingAgent.displayName }}</VCardTitle>
        <VCardText>
          <div class="d-flex flex-column ga-4">
            <div>
              <div class="title-small mb-2">Связь с другими агентами</div>
              <p class="on-surface-variant mb-3">Выберите агентов, чью экспертизу этот агент должен учитывать при ответе.</p>
              <div class="d-flex flex-wrap ga-2">
                <VChip
                  v-for="linkedAgent in availableLinkedAgents"
                  :key="linkedAgent.id"
                  :color="settingsDraft.connections.some(item => item.targetAgentId === linkedAgent.id) ? 'secondary' : undefined"
                  :variant="settingsDraft.connections.some(item => item.targetAgentId === linkedAgent.id) ? 'flat' : 'outlined'"
                  @click="toggleLinkedAgent(linkedAgent.id)"
                >
                  {{ linkedAgent.displayName }}
                </VChip>
              </div>
              <div v-if="settingsDraft.connections.length" class="d-flex flex-column ga-3 mt-3">
                <div v-for="connection in settingsDraft.connections" :key="connection.targetAgentId" class="d-flex flex-wrap ga-3 align-center">
                  <span class="on-surface-variant">{{ agentsModel.agents.value.find(item => item.id === connection.targetAgentId)?.displayName || connection.targetAgentId }}</span>
                  <VSelect
                    :model-value="connection.mode"
                    :items="[
                      { title: 'Review', value: 'review' },
                      { title: 'Enrich', value: 'enrich' },
                      { title: 'Validate', value: 'validate' },
                      { title: 'Summarize', value: 'summarize' },
                      { title: 'Route', value: 'route' },
                    ]"
                    label="Режим связи"
                    variant="outlined"
                    hide-details="auto"
                    density="comfortable"
                    class="flex-grow-1"
                    @update:model-value="updateLinkedAgentMode(connection.targetAgentId, $event)"
                  />
                </div>
              </div>
            </div>

            <div>
              <div class="title-small mb-2">Подписка и модель</div>
              <VSelect
                v-model="settingsDraft.subscriptionId"
                :items="subscriptionOptions"
                item-title="title"
                item-value="value"
                label="Подписка"
                variant="outlined"
                hide-details="auto"
                prepend-inner-icon="mdi-star-circle-outline"
                @update:model-value="val => { const p = SUBSCRIPTION_PROVIDERS.find(pr => pr.key === subscriptionsModel.subscriptions.value.find(s => s.id === val)?.provider); const models = p?.models ?? []; if (models.length && !models.find(m => m.id === settingsDraft.model)) { settingsDraft.model = models.find(m => m.tier === 'balanced')?.id || models[0]?.id || settingsDraft.model } }"
              />
              <VSelect
                v-model="settingsDraft.model"
                :items="activeModelOptions.length ? activeModelOptions : (editingAgent?.modelOptions?.map(m => ({ title: m, value: m })) ?? [])"
                item-title="title"
                item-value="value"
                label="Модель ответа"
                variant="outlined"
                hide-details="auto"
                class="mt-3"
              />
              <div v-if="activeModelMeta" class="d-flex gap-2 mt-2">
                <VChip size="x-small" :color="activeModelMeta.tier === 'fast' ? 'success' : activeModelMeta.tier === 'powerful' ? 'warning' : 'primary'" variant="tonal">
                  {{ activeModelMeta.tier === 'fast' ? 'Быстрый' : activeModelMeta.tier === 'powerful' ? 'Мощный' : 'Баланс' }}
                </VChip>
                <VChip size="x-small" variant="tonal" color="secondary">{{ activeModelMeta.contextK }}K контекст</VChip>
              </div>
              <VSelect
                v-if="showEffortSelector"
                v-model="settingsDraft.effort"
                :items="EFFORT_OPTIONS"
                item-title="title"
                item-value="value"
                label="Уровень усилия (effort)"
                variant="outlined"
                hide-details="auto"
                class="mt-3"
              />
            </div>

            <div>
              <div class="title-small mb-2">API key меню</div>
              <p class="on-surface-variant mb-3">Локальный режим отключён. Агент работает только через внешний API key.</p>
              <VTextField
                v-model="settingsDraft.apiKey"
                label="API key"
                type="password"
                variant="outlined"
                hide-details="auto"
              />
            </div>

            <div>
              <div class="title-small mb-2">SSH и сервер</div>
              <p class="on-surface-variant mb-3">У каждого агента может быть свой SSH-доступ и своя рабочая папка для проводника и серверного контекста.</p>
              <div class="d-flex flex-column ga-3">
                <VTextField
                  v-model="settingsDraft.ssh.host"
                  label="IP или host сервера"
                  variant="outlined"
                  hide-details="auto"
                />
                <VTextField
                  v-model="settingsDraft.ssh.login"
                  label="Логин SSH"
                  variant="outlined"
                  hide-details="auto"
                />
                <VTextField
                  :model-value="String(settingsDraft.ssh.port)"
                  label="Порт SSH"
                  type="number"
                  variant="outlined"
                  hide-details="auto"
                  @update:model-value="settingsDraft.ssh.port = Number($event) || 22"
                />
                <VTextField
                  v-model="settingsDraft.ssh.workspacePath"
                  label="Рабочая папка"
                  variant="outlined"
                  hide-details="auto"
                />
                <VTextarea
                  v-model="settingsDraft.ssh.privateKey"
                  label="SSH private key"
                  variant="outlined"
                  rows="5"
                  auto-grow
                  hide-details="auto"
                />
              </div>
            </div>
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="closeSettings">Закрыть</VBtn>
          <VBtn color="primary" variant="tonal" :loading="agentsModel.settingsPending.value" @click="saveSettings">Сохранить</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>