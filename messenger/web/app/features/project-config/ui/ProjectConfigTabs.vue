<script setup lang="ts">
import type { MessengerProject } from '../../../entities/projects/model/useMessengerProjects'
import type { MessengerMcpServer } from '../../../entities/mcp/model/useMessengerMcp'
import type { MessengerExternalApi } from '../../../entities/external-apis/model/useMessengerExternalApis'

const props = defineProps<{ project: MessengerProject }>()

const projectIdRef = computed(() => props.project.id)
const activeTab = ref('mcp')

const tabs = [
  { key: 'agents', label: 'Агенты', icon: 'mdi-robot-outline' },
  { key: 'cli-sessions', label: 'Сессии CLI', icon: 'mdi-console' },
  { key: 'connectors', label: 'Коннекторы', icon: 'mdi-connection' },
  { key: 'skills', label: 'Навыки', icon: 'mdi-lightning-bolt-outline' },
  { key: 'plugins', label: 'Плагины', icon: 'mdi-puzzle-outline' },
  { key: 'mcp', label: 'MCP', icon: 'mdi-api' },
  { key: 'external-apis', label: 'Внешние API', icon: 'mdi-cloud-outline' },
  { key: 'settings', label: 'Настройки', icon: 'mdi-cog-outline' },
] as const

const mcpModel = useMessengerMcp(projectIdRef)
const extApisModel = useMessengerExternalApis(projectIdRef)
const agentsModel = useMessengerProjectAgents(projectIdRef)
const projectSlugRef = computed(() => props.project.slug)
const cliSessionsModel = useMessengerCliSessions(projectSlugRef)

const agentPickerOpen = ref(false)
const bootstrapOnFirstProject = useState('messenger-bootstrap-on-arrival', () => false)

onMounted(async () => {
  await Promise.all([
    mcpModel.refresh(),
    extApisModel.refresh(),
    agentsModel.refresh(),
    cliSessionsModel.refresh(),
  ])
  if (bootstrapOnFirstProject.value && !agentsModel.agents.value.length) {
    bootstrapOnFirstProject.value = false
    agentPickerOpen.value = true
  }
})

// Auto-refresh CLI sessions every 5s while the user is on the tab — the
// registry lives on disk and gets new rows whenever `claude-session create`
// runs, which is not directly observable from the web side.
let cliSessionsTimer: ReturnType<typeof setInterval> | null = null
watch(activeTab, (tab) => {
  if (tab === 'cli-sessions' && !cliSessionsTimer) {
    cliSessionsTimer = setInterval(() => cliSessionsModel.refresh(), 5000)
    cliSessionsModel.refresh()
  } else if (tab !== 'cli-sessions' && cliSessionsTimer) {
    clearInterval(cliSessionsTimer)
    cliSessionsTimer = null
  }
}, { immediate: true })
onBeforeUnmount(() => {
  if (cliSessionsTimer) clearInterval(cliSessionsTimer)
})

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
    <VTabs v-model="activeTab" class="project-config-tabs__nav" density="compact" show-arrows>
      <VTab v-for="tab in tabs" :key="tab.key" :value="tab.key" class="project-config-tabs__tab">
        <VIcon start size="16">{{ tab.icon }}</VIcon>
        {{ tab.label }}
      </VTab>
    </VTabs>

    <VTabsWindow v-model="activeTab" class="project-config-tabs__panels">
      <!-- Agents tab (W6 — LIVE) -->
      <VTabsWindowItem value="agents" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">Агенты ({{ agentsModel.agents.value.length }})</span>
          <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="agentPickerOpen = true">
            Добавить
          </VBtn>
        </div>

        <VList v-if="agentsModel.agents.value.length" bg-color="transparent" density="comfortable">
          <VListItem
            v-for="agent in agentsModel.agents.value"
            :key="agent.id"
            :title="agent.name"
            :subtitle="agent.description || agent.type"
          >
            <template #prepend>
              <VIcon size="20" color="primary">mdi-robot-outline</VIcon>
            </template>
            <template #append>
              <VChip :color="agent.type === 'composer' ? 'primary' : 'secondary'" size="x-small" label class="mr-2">
                {{ agent.type }}
              </VChip>
              <VBtn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Удалить" @click="agentsModel.remove(agent.id)" />
            </template>
          </VListItem>
        </VList>

        <div v-else class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-robot-off-outline</VIcon>
          <p>Нет агентов. Добавьте первого — начните с Composer.</p>
        </div>

        <AgentPicker
          v-model="agentPickerOpen"
          :project-id="props.project.id"
          @agent-created="agentsModel.refresh()"
          @proposal-applied="agentsModel.refresh()"
        />
      </VTabsWindowItem>

      <!-- CLI sessions tab — tmux Claude-CLI sessions owned by the current
           messenger user, scoped to this project by workroom slug. Same
           source of truth the dashboard (9090) reads. -->
      <VTabsWindowItem value="cli-sessions" class="project-config-tabs__panel">
        <div class="project-config-tabs__toolbar">
          <span class="project-config-tabs__count">
            Сессии CLI ({{ cliSessionsModel.sessions.value.length }})
            <span v-if="cliSessionsModel.pending.value" style="opacity:.6">· обновление…</span>
          </span>
          <VBtn
            size="small"
            variant="text"
            prepend-icon="mdi-refresh"
            :loading="cliSessionsModel.pending.value"
            @click="cliSessionsModel.refresh()"
          >
            Обновить
          </VBtn>
        </div>

        <div
          v-if="cliSessionsModel.error.value"
          class="project-config-tabs__error"
        >
          Не удалось загрузить сессии: {{ cliSessionsModel.error.value }}
        </div>

        <VList
          v-else-if="cliSessionsModel.sessions.value.length"
          bg-color="transparent"
          density="comfortable"
        >
          <VListItem
            v-for="s in cliSessionsModel.sessions.value"
            :key="s.slug"
            :title="s.slug"
            :subtitle="`${s.model || '?'} · ${s.kind || 'default'} · log ${cliSessionsModel.fmtSize(s.logSize)} · ${cliSessionsModel.fmtAge(s.logMtimeMs)}`"
          >
            <template #prepend>
              <VIcon
                size="20"
                :color="s.archived ? 'on-surface-variant' : 'primary'"
              >
                {{ s.archived ? 'mdi-archive-outline' : 'mdi-console' }}
              </VIcon>
            </template>
            <template #append>
              <VChip
                v-if="s.workroom"
                size="x-small"
                label
                color="secondary"
                class="mr-1"
              >
                {{ s.workroom }}
              </VChip>
              <VChip
                v-if="s.archived"
                size="x-small"
                label
                color="surface-variant"
              >
                archive
              </VChip>
            </template>
          </VListItem>
        </VList>

        <div v-else class="project-config-tabs__empty">
          <VIcon size="36" color="on-surface-variant">mdi-console-line</VIcon>
          <p class="project-config-tabs__empty-title">Нет сессий</p>
          <p class="project-config-tabs__empty-hint">
            Запусти на сервере:
            <code>
              claude-session create my-slug --workroom {{ props.project.slug }} --model sonnet --prompt "..."
            </code>
            Сессия появится здесь и в дашборде на порту 9090 автоматически.
          </p>
        </div>
      </VTabsWindowItem>

      <!-- Connectors stub (W4) -->
      <VTabsWindowItem value="connectors" class="project-config-tabs__panel">
        <div class="project-config-tabs__stub">
          <VIcon size="48" class="mb-3" color="secondary">mdi-connection</VIcon>
          <p class="project-config-tabs__empty-title">Коннекторы</p>
          <VChip color="warning" size="small" class="mt-2">Coming in W4</VChip>
        </div>
      </VTabsWindowItem>

      <!-- Skills stub (W4) -->
      <VTabsWindowItem value="skills" class="project-config-tabs__panel">
        <div class="project-config-tabs__stub">
          <VIcon size="48" class="mb-3" color="secondary">mdi-lightning-bolt-outline</VIcon>
          <p class="project-config-tabs__empty-title">Навыки</p>
          <VChip color="warning" size="small" class="mt-2">Coming in W4</VChip>
        </div>
      </VTabsWindowItem>

      <!-- Plugins stub (W4) -->
      <VTabsWindowItem value="plugins" class="project-config-tabs__panel">
        <div class="project-config-tabs__stub">
          <VIcon size="48" class="mb-3" color="secondary">mdi-puzzle-outline</VIcon>
          <p class="project-config-tabs__empty-title">Плагины</p>
          <VChip color="warning" size="small" class="mt-2">Coming in W4</VChip>
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

      <!-- Settings stub -->
      <VTabsWindowItem value="settings" class="project-config-tabs__panel">
        <div class="project-config-tabs__stub">
          <VIcon size="48" class="mb-3" color="secondary">mdi-cog-outline</VIcon>
          <p class="project-config-tabs__empty-title">Настройки проекта</p>
          <VChip color="warning" size="small" class="mt-2">Coming later</VChip>
        </div>
      </VTabsWindowItem>
    </VTabsWindow>
  </div>
</template>

<style scoped>
.project-config-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-config-tabs__nav {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.project-config-tabs__panels {
  flex: 1;
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

.project-config-tabs__error {
  background: rgba(255, 100, 100, 0.08);
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: rgb(var(--v-theme-error));
  border-radius: 6px;
  padding: 10px 12px;
  margin: 8px 0 12px;
  font-size: 0.85rem;
}

.project-config-tabs__empty code {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
  color: rgb(var(--v-theme-on-surface));
  word-break: break-all;
  max-width: 100%;
}
</style>
