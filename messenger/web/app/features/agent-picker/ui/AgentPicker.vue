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
    <VCard>
      <VCardTitle class="agent-picker__title">
        <VIcon start size="20">mdi-plus-circle-outline</VIcon>
        Добавить агента
      </VCardTitle>
      <VCardSubtitle class="agent-picker__subtitle">
        Выберите тип агента для этого проекта
      </VCardSubtitle>

      <VCardText class="agent-picker__list">
        <VCard
          v-for="type in agentTypes"
          :key="type.key"
          :ripple="type.key === 'composer'"
          class="agent-picker__item mb-2"
          :class="{ 'agent-picker__item--disabled': type.key !== 'composer' }"
          variant="outlined"
          :color="type.key === 'composer' ? type.color : undefined"
          @click="selectType(type.key)"
        >
          <VCardText class="agent-picker__item-content">
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
          </VCardText>
        </VCard>
      </VCardText>

      <VCardActions>
        <VBtn variant="text" @click="dialogOpen = false">Отмена</VBtn>
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
.agent-picker__title {
  padding-top: 20px;
}

.agent-picker__subtitle {
  padding-bottom: 4px;
}

.agent-picker__list {
  padding-top: 8px;
}

.agent-picker__item {
  cursor: pointer;
  transition: background-color 0.15s;
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
  padding: 12px;
}

.agent-picker__item-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.agent-picker__item-title {
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.agent-picker__item-desc {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 3px;
  line-height: 1.4;
}
</style>
