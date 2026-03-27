<script setup lang="ts">
const agentsModel = useMessengerAgents()
const conversations = useMessengerConversations()
const navigation = useMessengerConversationState()
const actionError = ref('')
const settingsDialogOpen = ref(false)
const editingAgentId = ref<string | null>(null)
const settingsDraft = reactive({
  model: 'GPT-5.4',
  apiKey: '',
  connections: [] as Array<{ targetAgentId: string; mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route' }>,
})

const editingAgent = computed(() => agentsModel.agents.value.find(agent => agent.id === editingAgentId.value) ?? null)
const availableLinkedAgents = computed(() => agentsModel.agents.value.filter(agent => agent.id !== editingAgentId.value))

onMounted(async () => {
  await agentsModel.refresh()
})

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

  editingAgentId.value = agentId
  settingsDraft.model = agent.settings.model
  settingsDraft.apiKey = agent.settings.apiKey
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
      model: settingsDraft.model,
      apiKey: settingsDraft.apiKey,
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
  <section class="section-block section-block--contacts" aria-label="Agents section">
    <VAlert v-if="actionError" type="error" class="ma-2">{{ actionError }}</VAlert>
    <div v-if="agentsModel.pending.value" class="section-progress section-progress--floating">
      <MessengerProgressLinear aria-label="Загрузка агентов" indeterminate four-color />
    </div>

    <MessengerAgentGraphEditor
      :agents="agentsModel.agents.value"
      :saving="agentsModel.settingsPending.value"
      @save-graph="saveGraph"
      @open-settings="openSettings"
      @open-agent="openAgent"
    />

    <VList class="section-list" bg-color="transparent" lines="three">
      <VListItem
        v-for="agent in agentsModel.agents.value"
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

      <div v-if="!agentsModel.agents.value.length && !agentsModel.pending.value" class="empty-state">
        <VIcon size="48" color="on-surface-variant">mdi-robot-outline</VIcon>
        <p class="empty-state__title">Агенты пока недоступны</p>
      </div>
    </VList>

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
              <div class="title-small mb-2">Выбор модели</div>
              <VSelect
                v-model="settingsDraft.model"
                :items="editingAgent.modelOptions"
                label="Модель ответа"
                variant="outlined"
                hide-details="auto"
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