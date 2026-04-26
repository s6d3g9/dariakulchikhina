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
    <VCard class="aidev-dialog">
      <VCardTitle>
        <VIcon start size="20">mdi-robot-outline</VIcon>
        Добавить Composer
      </VCardTitle>

      <!-- Step: form — choose path -->
      <template v-if="bootstrap.step.value === 'form'">
        <VCardText>
          <section class="aidev-dialog__section">
            <div class="aidev-dialog__eyebrow">Что такое composer</div>
            <p class="aidev-dialog__hint">
              Composer — главный агент проекта, который координирует остальных. Как вы хотите его настроить?
            </p>
            <div class="aidev-dialog__chips">
              <VChip size="x-small" color="primary" variant="tonal" label>главный</VChip>
              <VChip size="x-small" color="secondary" variant="outlined" label>координатор</VChip>
            </div>
          </section>

          <section class="aidev-dialog__section">
            <div class="aidev-dialog__eyebrow">Описание задачи</div>
            <VTextarea
              v-model="bootstrap.taskDescription.value"
              label="Описание задачи (для автонастройки)"
              placeholder="Например: нужна CRM для студии дизайна — управление проектами, клиентами, счетами"
              rows="3"
              density="compact"
              variant="outlined"
              hide-details="auto"
            />
            <p class="aidev-dialog__when">
              <strong>Подсказка:</strong> при автонастройке composer сам подберёт MCP-серверы, навыки и connectors под задачу.
            </p>
          </section>

          <VAlert v-if="bootstrap.error.value" type="error" variant="tonal" density="compact">
            {{ bootstrap.error.value }}
          </VAlert>
        </VCardText>

        <VCardActions>
          <VBtn variant="text" density="compact" @click="dialogOpen = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            density="compact"
            prepend-icon="mdi-account-cog-outline"
            @click="handleManual"
          >
            Добавить и настроить самому
          </VBtn>
          <VBtn
            color="primary"
            variant="tonal"
            density="compact"
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
          <p class="aidev-dialog__hint">
            Composer предлагает следующую конфигурацию проекта ({{ proposalCount(bootstrap.proposal.value) }} элементов):
          </p>

          <section v-if="bootstrap.proposal.value.agents.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="primary">mdi-robot-outline</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">Агенты</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.agents.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(agent, i) in bootstrap.proposal.value.agents"
                :key="`agent-${i}`"
                size="x-small"
                color="primary"
                variant="tonal"
                label
              >
                {{ agent.name }}<span v-if="agent.type"> · {{ agent.type }}</span>
              </VChip>
            </div>
          </section>

          <section v-if="bootstrap.proposal.value.mcp.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="info">mdi-api</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">MCP-серверы</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.mcp.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(server, i) in bootstrap.proposal.value.mcp"
                :key="`mcp-${i}`"
                size="x-small"
                color="info"
                variant="tonal"
                label
              >
                {{ server.name }} · {{ server.transport }}
              </VChip>
            </div>
          </section>

          <section v-if="bootstrap.proposal.value.externalApis.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="info">mdi-cloud-outline</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">Внешние API</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.externalApis.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(api, i) in bootstrap.proposal.value.externalApis"
                :key="`ext-${i}`"
                size="x-small"
                color="info"
                variant="outlined"
                label
              >
                {{ api.name }}
              </VChip>
            </div>
          </section>

          <section v-if="bootstrap.proposal.value.skills.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="secondary">mdi-lightning-bolt-outline</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">Навыки</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.skills.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(skill, i) in bootstrap.proposal.value.skills"
                :key="`skill-${i}`"
                size="x-small"
                color="secondary"
                variant="tonal"
                label
              >
                {{ skill }}
              </VChip>
            </div>
          </section>

          <section v-if="bootstrap.proposal.value.plugins.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="secondary">mdi-puzzle-outline</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">Плагины</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.plugins.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(plugin, i) in bootstrap.proposal.value.plugins"
                :key="`plugin-${i}`"
                size="x-small"
                color="secondary"
                variant="outlined"
                label
              >
                {{ plugin }}
              </VChip>
            </div>
          </section>

          <section v-if="bootstrap.proposal.value.connectors.length" class="aidev-dialog__section">
            <div class="aidev-dialog__head">
              <VIcon size="16" color="secondary">mdi-connection</VIcon>
              <div class="aidev-dialog__title-wrap">
                <div class="aidev-dialog__section-title">Коннекторы</div>
                <div class="aidev-dialog__section-id">#{{ bootstrap.proposal.value.connectors.length }}</div>
              </div>
            </div>
            <div class="aidev-dialog__chips">
              <VChip
                v-for="(conn, i) in bootstrap.proposal.value.connectors"
                :key="`conn-${i}`"
                size="x-small"
                color="secondary"
                variant="tonal"
                label
              >
                {{ conn.label }} · {{ conn.type }}
              </VChip>
            </div>
          </section>
        </VCardText>

        <VCardActions>
          <VBtn variant="text" density="compact" @click="dialogOpen = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="tonal"
            density="compact"
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
          <p class="aidev-dialog__hint">Применяем конфигурацию…</p>
        </VCardText>
      </template>

      <!-- Step: parse-failure -->
      <template v-else-if="bootstrap.step.value === 'parse-failure'">
        <VCardText>
          <section class="aidev-dialog__section">
            <div class="aidev-dialog__eyebrow">Не удалось разобрать ответ</div>
            <VAlert type="warning" variant="tonal" density="compact">
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
              hide-details="auto"
              class="composer-bootstrap__raw-text"
            />
          </section>
        </VCardText>
        <VCardActions>
          <VBtn variant="text" density="compact" @click="dialogOpen = false">Закрыть</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="tonal"
            density="compact"
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
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.composer-bootstrap__raw-text {
  font-family: var(--messenger-font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.8rem;
}
</style>
