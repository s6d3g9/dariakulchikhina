<script setup lang="ts">
import { computed } from 'vue'
import type {
  MessengerPlatformActionCatalog,
  MessengerPlatformSubjectOption,
  ProjectActionDefinition,
  ProjectActionId,
  ProjectActionCategoryGroup,
} from '../model/useMessengerProjectActions'

type SubjectFabulaPreset = {
  title: string
  summary: string
  icon: string
  actionIds: ProjectActionId[]
}

const props = defineProps<{
  catalog: MessengerPlatformActionCatalog | null
  groups: ProjectActionCategoryGroup[]
  pendingAction: ProjectActionId | null
  selectedProjectSlug: string
  catalogPending: boolean
  catalogError: string
  activeSubjectContextId: string
}>()

const emit = defineEmits<{
  selectAction: [actionId: ProjectActionId | null]
  updateActiveSubject: [subjectId: string]
}>()

const subjectFabulaPresets: Record<MessengerPlatformSubjectOption['kind'], SubjectFabulaPreset> = {
  client: {
    title: 'Клиентский контур',
    summary: 'Согласования, запросы на варианты, акты и доп. услуги.',
    icon: 'mdi-account-heart-outline',
    actionIds: ['approve_selection', 'request_variants', 'order_extra_service', 'approve_act', 'ask_designer', 'create_invoice', 'request_response', 'share_file'],
  },
  contractor: {
    title: 'Подрядный контур',
    summary: 'Задачи, правки, фотоотчёты и отчётность по выполнению.',
    icon: 'mdi-hammer-wrench',
    actionIds: ['assign_task', 'request_report', 'send_corrections', 'update_work_status', 'report_completion', 'upload_photo_report', 'request_clarification', 'create_task', 'share_file'],
  },
  designer: {
    title: 'Дизайнерский контур',
    summary: 'Проектные решения, варианты, правки и быстрая обратная связь.',
    icon: 'mdi-pencil-ruler',
    actionIds: ['ask_designer', 'request_variants', 'send_corrections', 'request_response', 'share_file', 'create_task'],
  },
  seller: {
    title: 'Контур поставки',
    summary: 'Позиции, документы, ответы по поставке и счётные сценарии.',
    icon: 'mdi-package-variant-closed',
    actionIds: ['create_invoice', 'request_response', 'share_file', 'create_task', 'send_corrections'],
  },
  manager: {
    title: 'Контур координации',
    summary: 'Переключение фаз, поручения и управленческие ответы по проекту.',
    icon: 'mdi-briefcase-account-outline',
    actionIds: ['assign_task', 'create_task', 'change_phase', 'accept_stage', 'create_invoice', 'request_response', 'share_file'],
  },
  custom: {
    title: 'Спецконтур',
    summary: 'Точечные поручения, файлы и адресные запросы по роли участника.',
    icon: 'mdi-account-cog-outline',
    actionIds: ['create_task', 'request_response', 'share_file', 'assign_task'],
  },
}

const fallbackSubjectActionCategoryOrder = ['communication', 'documents', 'tasks', 'finance', 'stages'] as const

const allActions = computed(() => props.groups.flatMap(group => group.actions))
const subjectItems = computed(() => props.catalog?.subjects || [])

const subjectActionMenus = computed(() => {
  return subjectItems.value.map((subject) => {
    const preset = subjectFabulaPresets[subject.kind] || subjectFabulaPresets.custom
    const preferredActions = preset.actionIds
      .map(actionId => allActions.value.find(action => action.id === actionId) || null)
      .filter(Boolean) as ProjectActionDefinition[]

    const fallbackActions = fallbackSubjectActionCategoryOrder
      .flatMap(category => allActions.value.filter(action => action.category === category))
      .filter(action => !preferredActions.some(preferred => preferred.id === action.id))

    return {
      subject,
      fabulaTitle: preset.title,
      fabulaSummary: preset.summary,
      fabulaIcon: preset.icon,
      actions: [...preferredActions, ...fallbackActions].slice(0, 4),
    }
  })
})

function formatCountLabel(count: number, singular: string, paucal: string, plural: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${singular}`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${paucal}`
  }

  return `${count} ${plural}`
}

function openSubjectAction(subjectId: string, action: ProjectActionDefinition) {
  emit('updateActiveSubject', subjectId)
  emit('selectAction', action.id)
}
</script>

<template>
  <section class="pa-pane pa-pane--subjects">
    <div class="pa-pane__head">
      <span class="pa-pane__title">Субъекты</span>
      <span class="pa-pane__value">{{ formatCountLabel(subjectActionMenus.length, 'субъект', 'субъекта', 'субъектов') }}</span>
    </div>

    <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
      Сначала выберите проект.
    </div>

    <div v-else-if="props.catalogPending" class="pa-empty-state">
      Подготавливаю субъектный контур проекта…
    </div>

    <div v-else-if="catalogError" class="pa-state pa-state--error">
      {{ catalogError }}
    </div>

    <div v-else-if="subjectActionMenus.length" class="pa-subject-list">
      <article
        v-for="entry in subjectActionMenus"
        :key="entry.subject.id"
        class="pa-subject-card"
        :class="{ 'pa-subject-card--active': props.activeSubjectContextId === entry.subject.id }"
      >
        <div class="pa-subject-card__head">
          <div class="pa-subject-card__title-wrap">
            <span class="pa-subject-card__title">{{ entry.subject.label }}</span>
            <span class="pa-subject-card__meta">{{ entry.subject.secondary || entry.fabulaSummary }}</span>
          </div>
          <span class="pa-subject-card__badge">
            <VIcon :icon="entry.fabulaIcon" size="14" />
            <span>{{ entry.fabulaTitle }}</span>
          </span>
        </div>

        <p class="pa-subject-card__fabula">{{ entry.fabulaSummary }}</p>

        <div v-if="entry.actions.length" class="pa-subject-card__actions">
          <VBtn
            v-for="action in entry.actions"
            :key="`${entry.subject.id}:${action.id}`"
            color="primary"
            variant="tonal"
            size="small"
            :prepend-icon="action.icon"
            @click="openSubjectAction(entry.subject.id, action)"
          >
            {{ action.label }}
          </VBtn>
        </div>

        <p v-else class="pa-empty-state">Для этого субъекта пока нет релевантных сценариев в текущем чате.</p>
      </article>
    </div>

    <div v-else class="pa-empty-state">
      В проекте пока нет субъектов для адресных сценариев.
    </div>
  </section>
</template>

<style scoped>
.pa-pane {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pa-pane__head {
  display: grid;
  gap: 2px;
}

.pa-pane__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-pane__value {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-subject-list {
  display: grid;
  gap: 10px;
}

.pa-subject-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-subject-card--active {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-subject-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-subject-card__title-wrap {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.pa-subject-card__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-subject-card__meta,
.pa-subject-card__fabula {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-subject-card__fabula {
  margin: 0;
}

.pa-subject-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.pa-subject-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-empty-state,
.pa-state {
  font-size: 13px;
  line-height: 1.5;
}

.pa-state--muted,
.pa-empty-state {
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-state--error {
  color: rgb(var(--v-theme-error));
}
</style>
