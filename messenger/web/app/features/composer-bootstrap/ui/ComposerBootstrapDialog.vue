<script setup lang="ts">
import type { BootstrapProposal } from '../model/useComposerBootstrap'

const props = defineProps<{
  modelValue: boolean
  projectId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'agent-created': [agentId: string]
  'proposal-applied': []
}>()

const projectIdRef = computed(() => props.projectId)
const bootstrap = useComposerBootstrap(projectIdRef)
const agentsModel = useMessengerProjectAgents(projectIdRef)

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

watch(dialogOpen, (open) => {
  if (open) bootstrap.reset()
})

async function handleManual() {
  if (!props.projectId) return
  const api = useProjectsApi()
  const res = await api.createProjectAgent(props.projectId, { type: 'composer' })
  await agentsModel.refresh()
  emit('update:modelValue', false)
  emit('agent-created', res.agent.id)
}

async function handleAuto() {
  const agentId = await bootstrap.runAuto()
  if (bootstrap.step.value === 'done' && agentId) {
    await agentsModel.refresh()
    emit('update:modelValue', false)
    emit('agent-created', agentId)
  }
}

async function applyProposal() {
  await bootstrap.applyProposal()
  if (bootstrap.step.value === 'done') {
    await agentsModel.refresh()
    emit('update:modelValue', false)
    emit('proposal-applied')
  }
}

function fallbackToManual() {
  bootstrap.step.value = 'form'
  bootstrap.rawText.value = null
}

function proposalCount(p: BootstrapProposal): number {
  return p.connectors.length + p.skills.length + p.plugins.length + p.mcp.length + p.externalApis.length + p.agents.length
}
</script>

<template>
  <VDialog v-model="dialogOpen" max-width="560" persistent>
    <VCard>
      <VCardTitle class="composer-bootstrap__title">
        <VIcon start size="20">mdi-robot-outline</VIcon>
        Добавить Composer
      </VCardTitle>

      <!-- Step: form — choose path -->
      <template v-if="bootstrap.step.value === 'form'">
        <VCardText>
          <p class="composer-bootstrap__subtitle">
            Composer — главный агент проекта, который координирует остальных. Как вы хотите его настроить?
          </p>

          <VAlert v-if="bootstrap.error.value" type="error" variant="tonal" class="mb-4" density="compact">
            {{ bootstrap.error.value }}
          </VAlert>

          <VTextarea
            v-model="bootstrap.taskDescription.value"
            label="Описание задачи (для автонастройки)"
            placeholder="Например: нужна CRM для студии дизайна — управление проектами, клиентами, счетами"
            rows="3"
            density="compact"
            variant="outlined"
            class="mb-4"
            hide-details
          />
        </VCardText>

        <VCardActions class="composer-bootstrap__actions">
          <VBtn variant="text" @click="dialogOpen = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-account-cog-outline"
            @click="handleManual"
          >
            Добавить и настроить самому
          </VBtn>
          <VBtn
            color="primary"
            variant="flat"
            prepend-icon="mdi-auto-fix"
            :disabled="!bootstrap.taskDescription.value.trim()"
            @click="handleAuto"
          >
            Описать задачу — настроит сам
          </VBtn>
        </VCardActions>
      </template>

      <!-- Step: loading -->
      <template v-else-if="bootstrap.step.value === 'loading'">
        <VCardText class="composer-bootstrap__loading">
          <VProgressCircular indeterminate color="primary" size="48" class="mb-4" />
          <p>Composer анализирует задачу и готовит предложение…</p>
        </VCardText>
      </template>

      <!-- Step: proposal -->
      <template v-else-if="bootstrap.step.value === 'proposal' && bootstrap.proposal.value">
        <VCardText>
          <p class="composer-bootstrap__subtitle mb-3">
            Composer предлагает следующую конфигурацию проекта ({{ proposalCount(bootstrap.proposal.value) }} элементов):
          </p>

          <VList density="compact" bg-color="transparent" class="composer-bootstrap__proposal-list">
            <template v-if="bootstrap.proposal.value.agents.length">
              <VListSubheader>Агенты</VListSubheader>
              <VListItem
                v-for="(agent, i) in bootstrap.proposal.value.agents"
                :key="`agent-${i}`"
                :title="agent.name"
                :subtitle="agent.description || agent.type"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="primary">mdi-robot-outline</VIcon>
                </template>
              </VListItem>
            </template>

            <template v-if="bootstrap.proposal.value.mcp.length">
              <VListSubheader>MCP-серверы</VListSubheader>
              <VListItem
                v-for="(server, i) in bootstrap.proposal.value.mcp"
                :key="`mcp-${i}`"
                :title="server.name"
                :subtitle="`${server.transport} · ${server.endpoint}`"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="info">mdi-api</VIcon>
                </template>
              </VListItem>
            </template>

            <template v-if="bootstrap.proposal.value.externalApis.length">
              <VListSubheader>Внешние API</VListSubheader>
              <VListItem
                v-for="(api, i) in bootstrap.proposal.value.externalApis"
                :key="`ext-${i}`"
                :title="api.name"
                :subtitle="api.baseUrl"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="info">mdi-cloud-outline</VIcon>
                </template>
              </VListItem>
            </template>

            <template v-if="bootstrap.proposal.value.skills.length">
              <VListSubheader>Навыки</VListSubheader>
              <VListItem
                v-for="(skill, i) in bootstrap.proposal.value.skills"
                :key="`skill-${i}`"
                :title="skill"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="secondary">mdi-lightning-bolt-outline</VIcon>
                </template>
              </VListItem>
            </template>

            <template v-if="bootstrap.proposal.value.plugins.length">
              <VListSubheader>Плагины</VListSubheader>
              <VListItem
                v-for="(plugin, i) in bootstrap.proposal.value.plugins"
                :key="`plugin-${i}`"
                :title="plugin"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="secondary">mdi-puzzle-outline</VIcon>
                </template>
              </VListItem>
            </template>

            <template v-if="bootstrap.proposal.value.connectors.length">
              <VListSubheader>Коннекторы</VListSubheader>
              <VListItem
                v-for="(conn, i) in bootstrap.proposal.value.connectors"
                :key="`conn-${i}`"
                :title="conn.label"
                :subtitle="conn.type"
                density="compact"
              >
                <template #prepend>
                  <VIcon size="16" color="secondary">mdi-connection</VIcon>
                </template>
              </VListItem>
            </template>
          </VList>
        </VCardText>

        <VCardActions class="composer-bootstrap__actions">
          <VBtn variant="text" @click="dialogOpen = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="flat"
            prepend-icon="mdi-check"
            :loading="bootstrap.step.value === 'applying'"
            @click="applyProposal"
          >
            Применить
          </VBtn>
        </VCardActions>
      </template>

      <!-- Step: applying -->
      <template v-else-if="bootstrap.step.value === 'applying'">
        <VCardText class="composer-bootstrap__loading">
          <VProgressCircular indeterminate color="primary" size="48" class="mb-4" />
          <p>Применяем конфигурацию…</p>
        </VCardText>
      </template>

      <!-- Step: parse-failure -->
      <template v-else-if="bootstrap.step.value === 'parse-failure'">
        <VCardText>
          <VAlert type="warning" variant="tonal" class="mb-4" density="compact">
            Composer ответил, но формат предложения не удалось разобрать автоматически.
            Ниже — его исходный текст. Вы можете настроить всё вручную.
          </VAlert>
          <VTextarea
            :model-value="bootstrap.rawText.value ?? ''"
            label="Ответ Composer (сырой текст)"
            rows="8"
            density="compact"
            variant="outlined"
            readonly
            class="composer-bootstrap__raw-text"
          />
        </VCardText>
        <VCardActions class="composer-bootstrap__actions">
          <VBtn variant="text" @click="dialogOpen = false">Закрыть</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-account-cog-outline"
            @click="fallbackToManual"
          >
            Поправить вручную
          </VBtn>
        </VCardActions>
      </template>
    </VCard>
  </VDialog>
</template>

<style scoped>
.composer-bootstrap__title {
  padding-top: 20px;
}

.composer-bootstrap__subtitle {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 12px;
}

.composer-bootstrap__actions {
  padding: 12px 20px 20px;
  gap: 8px;
}

.composer-bootstrap__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
  color: rgb(var(--v-theme-on-surface-variant));
}

.composer-bootstrap__proposal-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.composer-bootstrap__raw-text {
  font-family: monospace;
  font-size: 0.8rem;
}
</style>
