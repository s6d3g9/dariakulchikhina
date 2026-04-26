<script setup lang="ts">
import { AGENT_TEMPLATES, type AgentTemplate } from '../../../entities/agents/model/agentTemplates'

const props = defineProps<{
  modelValue: boolean
  projectId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'agent-created': [agentId: string]
  'proposal-applied': []
}>()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const composerDialogOpen = ref(false)

const agentTypes = AGENT_TEMPLATES

function selectType(key: AgentTemplate['key']) {
  dialogOpen.value = false
  if (key === 'composer') {
    composerDialogOpen.value = true
  }
  // Other types: direct create with defaults (future waves)
}

function onAgentCreated(agentId: string) {
  emit('agent-created', agentId)
}

function onProposalApplied() {
  emit('proposal-applied')
}
</script>

<template>
  <VDialog v-model="dialogOpen" max-width="480">
    <VCard class="aidev-dialog">
      <VCardTitle>
        <VIcon start size="20">mdi-plus-circle-outline</VIcon>
        Добавить агента
      </VCardTitle>
      <VCardSubtitle>
        Выберите тип агента для этого проекта
      </VCardSubtitle>

      <VCardText>
        <div
          v-for="type in agentTypes"
          :key="type.key"
          class="agent-picker__item"
          :class="{ 'agent-picker__item--disabled': type.key !== 'composer', 'agent-picker__item--active': type.key === 'composer' }"
          @click="selectType(type.key)"
        >
          <div class="agent-picker__item-content">
            <div class="agent-picker__item-icon">
              <VIcon :color="type.key === 'composer' ? type.color : 'on-surface-variant'" size="28">{{ type.icon }}</VIcon>
            </div>
            <div class="agent-picker__item-text">
              <div class="agent-picker__item-title">
                {{ type.title }}
                <VChip v-if="type.recommended" color="primary" size="x-small" label class="ml-2">Рекомендуется</VChip>
                <VChip v-if="type.key !== 'composer'" size="x-small" color="surface-variant" label class="ml-2">Скоро</VChip>
              </div>
              <div class="agent-picker__item-desc">{{ type.description }}</div>
            </div>
          </div>
        </div>
      </VCardText>

      <VCardActions>
        <VBtn variant="text" density="compact" @click="dialogOpen = false">Отмена</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <ComposerBootstrapDialog
    v-model="composerDialogOpen"
    :project-id="projectId"
    @agent-created="onAgentCreated"
    @proposal-applied="onProposalApplied"
  />
</template>

<style scoped>
.agent-picker__item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface-variant), 0.18);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}

.agent-picker__item:hover:not(.agent-picker__item--disabled) {
  background: rgba(var(--v-theme-secondary-container), 0.4);
  border-color: rgb(var(--v-theme-secondary));
}

.agent-picker__item--disabled {
  cursor: default;
  opacity: 0.55;
  pointer-events: none;
}

.agent-picker__item-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.agent-picker__item-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.agent-picker__item-title {
  font-size: 0.92rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: rgb(var(--v-theme-on-surface));
}

.agent-picker__item-desc {
  font-size: 0.82rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 3px;
  line-height: 1.45;
}
</style>
