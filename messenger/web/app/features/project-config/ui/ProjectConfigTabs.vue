<script setup lang="ts">
import type { MessengerProject } from '../../../entities/projects/model/useMessengerProjects'
import type { MessengerMcpServer } from '../../../entities/mcp/model/useMessengerMcp'
import type { MessengerExternalApi } from '../../../entities/external-apis/model/useMessengerExternalApis'
import type { MessengerConnector } from '../../../entities/connectors/model/useMessengerConnectors'

const props = defineProps<{ project: MessengerProject; hideTabs?: boolean }>()

const projectIdRef = computed(() => props.project.id)
// Shared state: external components (e.g. chat composer aidev bar) can set the
// active tab to jump into a specific section.
const activeTab = useState<string>('aidev-active-tab', () => 'composer')

const tabs = [
  { key: 'composer', label: 'Composer', icon: 'mdi-chat-processing-outline' },
  { key: 'agents', label: 'Агенты', icon: 'mdi-robot-outline' },
  { key: 'connectors', label: 'Коннекторы', icon: 'mdi-connection' },
  { key: 'skills', label: 'Навыки', icon: 'mdi-lightning-bolt-outline' },
  { key: 'plugins', label: 'Плагины', icon: 'mdi-puzzle-outline' },
  { key: 'mcp', label: 'MCP', icon: 'mdi-api' },
  { key: 'external-apis', label: 'Внешние API', icon: 'mdi-cloud-outline' },
  { key: 'balancing', label: 'Балансировка', icon: 'mdi-scale-balance' },
  { key: 'settings', label: 'Настройки', icon: 'mdi-cog-outline' },
] as const

const mcpModel = useMessengerMcp(projectIdRef)
const extApisModel = useMessengerExternalApis(projectIdRef)
const connectorsModel = useMessengerConnectors(projectIdRef)
const skillsModel = useMessengerSkills(projectIdRef)
const pluginsModel = useMessengerPlugins(projectIdRef)
const projectAgentsModel = useMessengerProjectAgents(projectIdRef)

onMounted(async () => {
  await Promise.all([
    mcpModel.refresh(),
    extApisModel.refresh(),
    connectorsModel.refresh(),
    skillsModel.refresh(),
    pluginsModel.refresh(),
    projectAgentsModel.refresh(),
  ])
})

// ── Project Agents form ────────────────────────────────────────────────────

const agentDialogOpen = ref(false)
const agentFormPending = ref(false)
const agentDraft = reactive({
  type: 'worker' as 'composer' | 'orchestrator' | 'worker' | 'custom',
  name: '',
  description: '',
  model: '',
  skillBundleKind: '',
})

const agentTypeOptions = [
  { title: 'Composer', value: 'composer' },
  { title: 'Orchestrator', value: 'orchestrator' },
  { title: 'Worker', value: 'worker' },
  { title: 'Custom', value: 'custom' },
]

const skillBundleOptions = computed(() => [
  { title: '— не выбрано —', value: '' },
  ...skillsModel.bundles.value.map(b => ({ title: b.label, value: b.id })),
])

function openAgentCreate() {
  agentDraft.type = 'worker'
  agentDraft.name = ''
  agentDraft.description = ''
  agentDraft.model = ''
  agentDraft.skillBundleKind = ''
  agentDialogOpen.value = true
}

async function submitAgentForm() {
  if (!agentDraft.name.trim()) return
  agentFormPending.value = true
  try {
    await projectAgentsModel.create({
      type: agentDraft.type,
      name: agentDraft.name.trim(),
      description: agentDraft.description.trim() || undefined,
      model: agentDraft.model.trim() || undefined,
      skillBundleKind: agentDraft.skillBundleKind || undefined,
    })
    agentDialogOpen.value = false
  }
  finally {
    agentFormPending.value = false
  }
}

const AGENT_TYPE_COLORS: Record<string, string> = {
  composer: 'primary',
  orchestrator: 'secondary',
  worker: 'info',
  custom: 'surface-variant',
}

// ── MCP form ───────────────────────────────────────────────────────────────

const mcpDialogOpen = ref(false)
const mcpEditTarget = ref<MessengerMcpServer | null>(null)
const mcpFormPending = ref(false)
const mcpDraft = reactive({
  name: '',
  transport: 'http' as 'http' | 'stdio' | 'sse',
  endpoint: '',
  configRaw: '{}',
  enabled: true,
})
const mcpConfigError = ref<string | null>(null)

const transportOptions = [
  { title: 'HTTP', value: 'http' },
  { title: 'SSE', value: 'sse' },
  { title: 'stdio', value: 'stdio' },
]

function openMcpCreate() {
  mcpEditTarget.value = null
  mcpDraft.name = ''
  mcpDraft.transport = 'http'
  mcpDraft.endpoint = ''
  mcpDraft.configRaw = '{}'
  mcpDraft.enabled = true
  mcpConfigError.value = null
  mcpDialogOpen.value = true
}

function openMcpEdit(server: MessengerMcpServer) {
  mcpEditTarget.value = server
  mcpDraft.name = server.name
  mcpDraft.transport = server.transport
  mcpDraft.endpoint = server.endpoint
  mcpDraft.configRaw = JSON.stringify(server.config, null, 2)
  mcpDraft.enabled = server.enabled
  mcpConfigError.value = null
  mcpDialogOpen.value = true
}

function parseMcpConfig(): Record<string, unknown> | null {
  try {
    return JSON.parse(mcpDraft.configRaw || '{}')
  } catch {
    mcpConfigError.value = 'Некорректный JSON'
    return null
  }
}

async function submitMcpForm() {
  const config = parseMcpConfig()
  if (config === null) return
  mcpFormPending.value = true
  try {
    if (mcpEditTarget.value) {
      await mcpModel.update(mcpEditTarget.value.id, { name: mcpDraft.name, transport: mcpDraft.transport, endpoint: mcpDraft.endpoint, config, enabled: mcpDraft.enabled })
    } else {
      await mcpModel.create({ name: mcpDraft.name, transport: mcpDraft.transport, endpoint: mcpDraft.endpoint, config, enabled: mcpDraft.enabled })
    }
    mcpDialogOpen.value = false
  } finally {
    mcpFormPending.value = false
  }
}

function mcpStatusColor(serverId: string): string {
  const s = mcpModel.healthMap.value[serverId]
  if (s === 'ok') return 'success'
  if (s === 'error') return 'warning'
  if (s === 'unreachable') return 'error'
  if (s === 'pending') return 'info'
  return 'surface-variant'
}

function mcpStatusLabel(serverId: string): string {
  const s = mcpModel.healthMap.value[serverId]
  if (s === 'ok') return 'ok'
  if (s === 'error') return 'error'
  if (s === 'unreachable') return 'unreachable'
  if (s === 'pending') return '...'
  return '—'
}

// ── Connectors form ────────────────────────────────────────────────────────

const connDialogOpen = ref(false)
const connEditTarget = ref<MessengerConnector | null>(null)
const connFormPending = ref(false)
const connDraft = reactive({
  type: 'claude-cli',
  label: '',
  configRaw: '{}',
  enabled: true,
  isDefault: false,
})
const connConfigError = ref<string | null>(null)

const connectorTypeOptions = [
  { title: 'Claude CLI', value: 'claude-cli' },
  { title: 'Claude API', value: 'claude-api' },
  { title: 'OpenAI', value: 'openai' },
  { title: 'Custom', value: 'custom' },
]

function openConnCreate() {
  connEditTarget.value = null
  connDraft.type = 'claude-cli'
  connDraft.label = ''
  connDraft.configRaw = '{}'
  connDraft.enabled = true
  connDraft.isDefault = false
  connConfigError.value = null
  connDialogOpen.value = true
}

function openConnEdit(connector: MessengerConnector) {
  connEditTarget.value = connector
  connDraft.type = connector.type
  connDraft.label = connector.label
  connDraft.configRaw = JSON.stringify(connector.config, null, 2)
  connDraft.enabled = connector.enabled
  connDraft.isDefault = connector.isDefault
  connConfigError.value = null
  connDialogOpen.value = true
}

function parseConnConfig(): Record<string, unknown> | null {
  try {
    return JSON.parse(connDraft.configRaw || '{}')
  }
  catch {
    connConfigError.value = 'Некорректный JSON'
    return null
  }
}

async function submitConnForm() {
  const config = parseConnConfig()
  if (config === null) return
  connFormPending.value = true
  try {
    if (connEditTarget.value) {
      await connectorsModel.update(connEditTarget.value.id, { type: connDraft.type, label: connDraft.label, config, enabled: connDraft.enabled, isDefault: connDraft.isDefault })
    }
    else {
      await connectorsModel.create({ type: connDraft.type, label: connDraft.label, config, enabled: connDraft.enabled, isDefault: connDraft.isDefault })
    }
    connDialogOpen.value = false
  }
  finally {
    connFormPending.value = false
  }
}

// ── External APIs form ─────────────────────────────────────────────────────

const extDialogOpen = ref(false)
const extEditTarget = ref<MessengerExternalApi | null>(null)
const extFormPending = ref(false)
const extDraft = reactive({
  name: '',
  baseUrl: '',
  openapiRef: '',
  authType: 'none' as 'none' | 'bearer' | 'basic' | 'header',
  enabled: true,
})
const extBaseUrlError = ref<string | null>(null)

const authTypeOptions = [
  { title: 'Нет', value: 'none' },
  { title: 'Bearer Token', value: 'bearer' },
  { title: 'Basic Auth', value: 'basic' },
  { title: 'Custom Header', value: 'header' },
]

function openExtCreate() {
  extEditTarget.value = null
  extDraft.name = ''
  extDraft.baseUrl = ''
  extDraft.openapiRef = ''
  extDraft.authType = 'none'
  extDraft.enabled = true
  extBaseUrlError.value = null
  extDialogOpen.value = true
}

function openExtEdit(api: MessengerExternalApi) {
  extEditTarget.value = api
  extDraft.name = api.name
  extDraft.baseUrl = api.baseUrl
  extDraft.openapiRef = api.openapiRef ?? ''
  extDraft.authType = api.authType
  extDraft.enabled = api.enabled
  extBaseUrlError.value = null
  extDialogOpen.value = true
}

function validateExtUrl(): boolean {
  extBaseUrlError.value = validateExternalApiBaseUrl(extDraft.baseUrl)
  return extBaseUrlError.value === null
}

async function submitExtForm() {
  if (!validateExtUrl()) return
  extFormPending.value = true
  try {
    if (extEditTarget.value) {
      await extApisModel.update(extEditTarget.value.id, { name: extDraft.name, baseUrl: extDraft.baseUrl, openapiRef: extDraft.openapiRef || undefined, authType: extDraft.authType, enabled: extDraft.enabled })
    } else {
      await extApisModel.create({ name: extDraft.name, baseUrl: extDraft.baseUrl, openapiRef: extDraft.openapiRef || undefined, authType: extDraft.authType, enabled: extDraft.enabled })
    }
    extDialogOpen.value = false
  } finally {
    extFormPending.value = false
  }
}
</script>

<template>
  <div class="project-config-tabs">
    <!-- Content on top, sub-tabs at bottom — self-similar with Чаты/Контакты/Агенты. -->
    <VTabsWindow v-model="activeTab" class="project-config-tabs__panels">
      <!-- Composer tab (aidev batch 4 — LIVE) -->
      <VTabsWindowItem value="composer" class="project-config-tabs__panel project-config-tabs__panel--flush">
        <AidevComposerTab :project="project" />
      </VTabsWindowItem>

      <!-- Agents tab -->
      <VTabsWindowItem value="agents" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">Агенты ({{ projectAgentsModel.agents.value.length }})</span>
          <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openAgentCreate">
            Добавить
          </VBtn>
        </div>

        <VList v-if="projectAgentsModel.agents.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="agent in projectAgentsModel.agents.value"
            :key="agent.id"
            :title="agent.name"
            :subtitle="agent.description || agent.model || agent.skillBundleKind || ''"
          >
            <template #prepend>
              <VIcon :color="AGENT_TYPE_COLORS[agent.type] || 'on-surface-variant'">mdi-robot-outline</VIcon>
            </template>
            <template #append>
              <VChip :color="AGENT_TYPE_COLORS[agent.type] || 'default'" size="x-small" label class="mr-2">
                {{ agent.type }}
              </VChip>
              <VChip v-if="agent.skillBundleKind" size="x-small" color="secondary" variant="outlined" class="mr-2">
                {{ agent.skillBundleKind }}
              </VChip>
              <VBtn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Удалить" @click="projectAgentsModel.remove(agent.id)" />
            </template>
          </VListItem>
        </VList>

        <div v-else-if="!projectAgentsModel.pending.value" class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-robot-outline</VIcon>
          <p>Нет агентов. Добавьте первого.</p>
        </div>

        <div v-if="projectAgentsModel.pending.value" class="project-config-tabs__empty">
          <VProgressCircular indeterminate size="32" />
        </div>

        <VDialog v-model="agentDialogOpen" max-width="520">
          <VCard>
            <VCardTitle>Добавить агента</VCardTitle>
            <VCardText>
              <VSelect v-model="agentDraft.type" :items="agentTypeOptions" label="Тип" density="compact" class="mb-3" />
              <VTextField v-model="agentDraft.name" label="Название" density="compact" class="mb-3" required />
              <VTextField v-model="agentDraft.description" label="Описание (необязательно)" density="compact" class="mb-3" />
              <VTextField v-model="agentDraft.model" label="Модель (необязательно)" density="compact" placeholder="claude-sonnet-4-6" class="mb-3" />
              <VSelect v-model="agentDraft.skillBundleKind" :items="skillBundleOptions" label="Набор навыков" density="compact" />
            </VCardText>
            <VCardActions>
              <VSpacer />
              <VBtn variant="text" @click="agentDialogOpen = false">Отмена</VBtn>
              <VBtn color="primary" variant="tonal" :loading="agentFormPending" :disabled="!agentDraft.name.trim()" @click="submitAgentForm">
                Добавить
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
      </VTabsWindowItem>

      <!-- Connectors (W4 — LIVE) -->
      <VTabsWindowItem value="connectors" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">Коннекторы ({{ connectorsModel.connectors.value.length }})</span>
          <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openConnCreate">
            Добавить
          </VBtn>
        </div>

        <VList v-if="connectorsModel.connectors.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="conn in connectorsModel.connectors.value"
            :key="conn.id"
            :title="conn.label"
            :subtitle="conn.type"
          >
            <template #append>
              <VChip v-if="conn.isDefault" size="x-small" color="primary" label class="mr-1">default</VChip>
              <VSwitch
                :model-value="conn.enabled"
                density="compact"
                color="primary"
                hide-details
                class="mr-1"
                @update:model-value="connectorsModel.update(conn.id, { enabled: !conn.enabled })"
              />
              <VBtn size="small" variant="text" icon="mdi-pencil-outline" title="Редактировать" @click="openConnEdit(conn)" />
              <VBtn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Удалить" @click="connectorsModel.remove(conn.id)" />
            </template>
          </VListItem>
        </VList>

        <div v-else class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-connection</VIcon>
          <p>Нет коннекторов. Добавьте первый.</p>
        </div>

        <VDialog v-model="connDialogOpen" max-width="520">
          <VCard>
            <VCardTitle>{{ connEditTarget ? 'Редактировать коннектор' : 'Добавить коннектор' }}</VCardTitle>
            <VCardText>
              <VSelect v-model="connDraft.type" :items="connectorTypeOptions" label="Тип" density="compact" class="mb-3" />
              <VTextField v-model="connDraft.label" label="Название" density="compact" class="mb-3" required />
              <VTextarea
                v-model="connDraft.configRaw"
                label="Config (JSON)"
                density="compact"
                rows="4"
                :error-messages="connConfigError ? [connConfigError] : []"
                class="mb-3"
                @input="connConfigError = null"
              />
              <VSwitch v-model="connDraft.enabled" label="Включён" density="compact" color="primary" class="mb-2" />
              <VSwitch v-model="connDraft.isDefault" label="По умолчанию" density="compact" color="secondary" />
            </VCardText>
            <VCardActions>
              <VSpacer />
              <VBtn variant="text" @click="connDialogOpen = false">Отмена</VBtn>
              <VBtn color="primary" variant="tonal" :loading="connFormPending" :disabled="!connDraft.label" @click="submitConnForm">
                {{ connEditTarget ? 'Сохранить' : 'Добавить' }}
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
      </VTabsWindowItem>

      <!-- Skills (W4 — LIVE) -->
      <VTabsWindowItem value="skills" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">
            Навыки ({{ skillsModel.projectSkills.value.filter(s => s.enabled).length }} / {{ skillsModel.bundles.value.length }})
          </span>
        </div>

        <VList v-if="skillsModel.bundles.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="bundle in skillsModel.bundles.value"
            :key="bundle.id"
            :title="bundle.label"
            :subtitle="bundle.purpose"
          >
            <template #append>
              <VSwitch
                :model-value="skillsModel.isEnabled(bundle.id)"
                density="compact"
                color="primary"
                hide-details
                @update:model-value="skillsModel.toggle(bundle.id)"
              />
            </template>
          </VListItem>
        </VList>

        <div v-else-if="!skillsModel.pending.value" class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-lightning-bolt-outline</VIcon>
          <p>Нет доступных навыков.</p>
        </div>

        <div v-if="skillsModel.pending.value" class="project-config-tabs__empty">
          <VProgressCircular indeterminate size="32" />
        </div>
      </VTabsWindowItem>

      <!-- Plugins (W4 — LIVE) -->
      <VTabsWindowItem value="plugins" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">
            Плагины ({{ pluginsModel.enabledPluginIds.value.size }} / {{ pluginsModel.installedPlugins.value.length }})
          </span>
        </div>

        <VList v-if="pluginsModel.installedPlugins.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="plugin in pluginsModel.installedPlugins.value"
            :key="plugin.id"
            :title="plugin.name"
            :subtitle="plugin.description || plugin.id"
          >
            <template #prepend>
              <VIcon color="secondary">mdi-puzzle-outline</VIcon>
            </template>
            <template #append>
              <VSwitch
                :model-value="pluginsModel.isEnabled(plugin.id)"
                density="compact"
                color="primary"
                hide-details
                @update:model-value="pluginsModel.toggle(plugin.id)"
              />
            </template>
          </VListItem>
        </VList>

        <div v-else-if="!pluginsModel.pending.value" class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-puzzle-outline</VIcon>
          <p>Плагины не найдены. Убедитесь, что Claude CLI доступен на сервере.</p>
        </div>

        <div v-if="pluginsModel.pending.value" class="project-config-tabs__empty">
          <VProgressCircular indeterminate size="32" />
        </div>
      </VTabsWindowItem>

      <!-- MCP Servers (W5 — LIVE) -->
      <VTabsWindowItem value="mcp" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">MCP-серверы ({{ mcpModel.servers.value.length }})</span>
          <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openMcpCreate">
            Добавить
          </VBtn>
        </div>

        <VList v-if="mcpModel.servers.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="server in mcpModel.servers.value"
            :key="server.id"
            :title="server.name"
            :subtitle="`${server.transport} · ${server.endpoint}`"
          >
            <template #append>
              <VChip :color="mcpStatusColor(server.id)" size="x-small" label class="mr-1">
                {{ mcpStatusLabel(server.id) }}
              </VChip>
              <VBtn size="small" variant="text" icon="mdi-lightning-bolt" :loading="mcpModel.pingPending.value[server.id]" title="Ping" @click="mcpModel.ping(server.id)" />
              <VBtn size="small" variant="text" icon="mdi-pencil-outline" title="Редактировать" @click="openMcpEdit(server)" />
              <VBtn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Удалить" @click="mcpModel.remove(server.id)" />
            </template>
          </VListItem>
        </VList>

        <div v-else class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-server-network-off</VIcon>
          <p>Нет MCP-серверов. Добавьте первый.</p>
        </div>

        <VDialog v-model="mcpDialogOpen" max-width="520">
          <VCard>
            <VCardTitle>{{ mcpEditTarget ? 'Редактировать MCP' : 'Добавить MCP-сервер' }}</VCardTitle>
            <VCardText>
              <VTextField v-model="mcpDraft.name" label="Название" density="compact" class="mb-3" required />
              <VSelect v-model="mcpDraft.transport" :items="transportOptions" label="Транспорт" density="compact" class="mb-3" />
              <VTextField v-model="mcpDraft.endpoint" label="Endpoint" density="compact" placeholder="http://localhost:3100/mcp" class="mb-3" required />
              <VTextarea
                v-model="mcpDraft.configRaw"
                label="Config (JSON)"
                density="compact"
                rows="4"
                :error-messages="mcpConfigError ? [mcpConfigError] : []"
                class="mb-3"
                @input="mcpConfigError = null"
              />
              <VSwitch v-model="mcpDraft.enabled" label="Включён" density="compact" color="primary" />
            </VCardText>
            <VCardActions>
              <VSpacer />
              <VBtn variant="text" @click="mcpDialogOpen = false">Отмена</VBtn>
              <VBtn color="primary" variant="tonal" :loading="mcpFormPending" :disabled="!mcpDraft.name || !mcpDraft.endpoint" @click="submitMcpForm">
                {{ mcpEditTarget ? 'Сохранить' : 'Добавить' }}
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
      </VTabsWindowItem>

      <!-- External APIs (W5 — LIVE) -->
      <VTabsWindowItem value="external-apis" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">Внешние API ({{ extApisModel.apis.value.length }})</span>
          <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openExtCreate">
            Добавить
          </VBtn>
        </div>

        <VList v-if="extApisModel.apis.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="api in extApisModel.apis.value"
            :key="api.id"
            :title="api.name"
            :subtitle="`${api.baseUrl} · ${api.authType}`"
          >
            <template #append>
              <VChip v-if="api.openapiRef" size="x-small" color="info" label class="mr-1">OpenAPI</VChip>
              <VBtn size="small" variant="text" icon="mdi-pencil-outline" title="Редактировать" @click="openExtEdit(api)" />
              <VBtn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Удалить" @click="extApisModel.remove(api.id)" />
            </template>
          </VListItem>
        </VList>

        <div v-else class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-api</VIcon>
          <p>Нет внешних API. Добавьте первый.</p>
        </div>

        <VDialog v-model="extDialogOpen" max-width="520">
          <VCard>
            <VCardTitle>{{ extEditTarget ? 'Редактировать API' : 'Добавить внешний API' }}</VCardTitle>
            <VCardText>
              <VTextField v-model="extDraft.name" label="Название" density="compact" class="mb-3" required />
              <VTextField
                v-model="extDraft.baseUrl"
                label="Base URL"
                density="compact"
                placeholder="https://api.github.com"
                :error-messages="extBaseUrlError ? [extBaseUrlError] : []"
                class="mb-3"
                required
                @input="extBaseUrlError = null"
              />
              <VTextField v-model="extDraft.openapiRef" label="OpenAPI Spec URL (необязательно)" density="compact" class="mb-3" />
              <VSelect v-model="extDraft.authType" :items="authTypeOptions" label="Тип аутентификации" density="compact" class="mb-3" />
              <VSwitch v-model="extDraft.enabled" label="Включён" density="compact" color="primary" />
            </VCardText>
            <VCardActions>
              <VSpacer />
              <VBtn variant="text" @click="extDialogOpen = false">Отмена</VBtn>
              <VBtn color="primary" variant="tonal" :loading="extFormPending" :disabled="!extDraft.name || !extDraft.baseUrl" @click="submitExtForm">
                {{ extEditTarget ? 'Сохранить' : 'Добавить' }}
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
      </VTabsWindowItem>

      <!-- Balancing tab — Claude agent launch presets -->
      <VTabsWindowItem value="balancing" class="project-config-tabs__panel">
        <AidevBalancingTab />
      </VTabsWindowItem>

      <!-- Settings tab (LIVE — rename + delete + meta) -->
      <VTabsWindowItem value="settings" class="project-config-tabs__panel">
        <AidevProjectSettingsTab :project="project" />
      </VTabsWindowItem>
    </VTabsWindow>

    <!-- Sub-tabs row (icon-only, at bottom, above global bottom-nav).
         Hidden when this component is mounted inside an external tab control
         (e.g. chat composer AIDev overlay) to avoid a duplicate tab bar. -->
    <div v-if="!props.hideTabs" class="section-tabs-row project-config-tabs__nav-row">
      <VTabs
        v-model="activeTab"
        class="section-tabs project-config-tabs__nav"
        bg-color="surface-container"
        color="primary"
        density="compact"
        show-arrows
        grow
      >
        <VTab
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
          :aria-label="tab.label"
          :title="tab.label"
          class="project-config-tabs__tab"
        >
          <VIcon>{{ tab.icon }}</VIcon>
        </VTab>
      </VTabs>
    </div>
  </div>
</template>

<style scoped>
.project-config-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.project-config-tabs__nav-row {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0;
}
.project-config-tabs__nav {
  flex-shrink: 0;
}
.project-config-tabs__tab {
  min-width: 0;
}

.project-config-tabs__panels {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.project-config-tabs__panel {
  padding: 24px 16px;
}

.project-config-tabs__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.project-config-tabs__count {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.project-config-tabs__stub,
.project-config-tabs__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  min-height: 200px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.project-config-tabs__empty-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.project-config-tabs__empty-hint {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 8px 0 0;
  max-width: 320px;
}

.project-config-tabs__coming-label {
  font-size: 0.75rem;
  opacity: 0.45;
}
</style>
