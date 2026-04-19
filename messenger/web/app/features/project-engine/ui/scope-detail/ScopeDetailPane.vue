<script setup lang="ts">
import type {
  MessengerPlatformScopeDetailBundle,
  MessengerPlatformScopeParticipant,
  MessengerPlatformScopeType,
} from '../../model/useMessengerProjectActions'

type GovernanceRoleKey = 'client' | 'manager' | 'designer' | 'lawyer' | 'contractor' | 'seller' | 'engineer' | 'consultant' | 'service' | 'other'
type GovernanceResponsibilityKey = 'lead' | 'owner' | 'executor' | 'reviewer' | 'approver' | 'observer' | 'consultant'
type ScopeSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

const props = defineProps<{
  scopeDetail: MessengerPlatformScopeDetailBundle | null
  scopeDetailPending: boolean
  scopeDetailError: string
  governanceMutationPending: boolean
  governanceMutationError: string
  governanceMutationNotice: string
  fallbackSubtitle: string
}>()

const emit = defineEmits<{
  openScopeDetail: [target: { scopeType: MessengerPlatformScopeType; scopeId: string }]
  createScopeParticipant: [payload: { displayName: string; roleKey: GovernanceRoleKey; responsibility: GovernanceResponsibilityKey }]
  updateScopeAssignment: [payload: { assignmentId: string; responsibility: GovernanceResponsibilityKey }]
  deleteScopeAssignment: [payload: { assignmentId: string }]
  updateScopeSettings: [payload: { settings: Record<string, unknown> }]
}>()

const governanceRoleItems = [
  { title: 'Клиент', value: 'client' },
  { title: 'Менеджер', value: 'manager' },
  { title: 'Дизайнер', value: 'designer' },
  { title: 'Юрист', value: 'lawyer' },
  { title: 'Подрядчик', value: 'contractor' },
  { title: 'Поставщик', value: 'seller' },
  { title: 'Инженер', value: 'engineer' },
  { title: 'Консультант', value: 'consultant' },
  { title: 'Сервис', value: 'service' },
  { title: 'Другая роль', value: 'other' },
] as const satisfies ReadonlyArray<{ title: string; value: GovernanceRoleKey }>

const governanceResponsibilityItems = [
  { title: 'Лидирует', value: 'lead' },
  { title: 'Владелец', value: 'owner' },
  { title: 'Исполняет', value: 'executor' },
  { title: 'Проверяет', value: 'reviewer' },
  { title: 'Согласует', value: 'approver' },
  { title: 'Наблюдает', value: 'observer' },
  { title: 'Консультирует', value: 'consultant' },
] as const satisfies ReadonlyArray<{ title: string; value: GovernanceResponsibilityKey }>

const governanceChannelItems = [
  { title: 'Проектный room', value: 'project-room' },
  { title: 'Прямой тред', value: 'direct-thread' },
  { title: 'Передача', value: 'handoff' },
  { title: 'Согласование', value: 'approval' },
  { title: 'Дайджест', value: 'daily-digest' },
]

const governanceSettingOrder = [
  'communicationChannel',
  'approvalMode',
  'visibility',
  'requiredResponsibilities',
  'reviewCadenceDays',
  'reminderCadenceDays',
  'slaHours',
  'escalateOnBlocked',
] as const

const governanceSettingLabels: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  requiredResponsibilities: 'Обязательные роли',
  reviewCadenceDays: 'Ревью, дней',
  reminderCadenceDays: 'Напоминание, дней',
  slaHours: 'SLA, часов',
  escalateOnBlocked: 'Эскалация при блокере',
}

const governanceOriginLabels: Record<MessengerPlatformScopeParticipant['origin'], string> = {
  direct: 'контур',
  project: 'проект',
  derived: 'legacy',
}

const scopeParticipantName = ref('')
const scopeParticipantRole = ref<GovernanceRoleKey>('manager')
const scopeParticipantResponsibility = ref<GovernanceResponsibilityKey>('owner')
const scopeSettingsDraft = ref<Record<string, unknown>>({})

const canCreateScopeParticipant = computed(() => {
  return Boolean(props.scopeDetail && scopeParticipantName.value.trim() && !props.governanceMutationPending)
})

const editableScopeSettings = computed(() => {
  const detail = props.scopeDetail
  if (!detail) {
    return [] as Array<{
      key: string
      label: string
      kind: ScopeSettingFieldKind
      value: string | number | boolean | null
      items?: ReadonlyArray<{ title: string; value: string }>
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const knownKeys = governanceSettingOrder.filter(key => key in scopeSettingsDraft.value)
  const dynamicKeys = Object.keys(scopeSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof governanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = scopeSettingsDraft.value[key]

    if (key === 'communicationChannel') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'select' as const,
        value: typeof rawValue === 'string' ? rawValue : '',
        items: governanceChannelItems,
      }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'number' as const,
        value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
      }
    }

    if (key === 'escalateOnBlocked') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'boolean' as const,
        value: Boolean(rawValue),
      }
    }

    if (key === 'requiredResponsibilities') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'list' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
      }
    }

    return {
      key,
      label: labelMap.get(key) || governanceSettingLabels[key] || key,
      kind: 'text' as const,
      value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
    }
  })
})

function cloneScopeSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeScopeSettingValue(kind: ScopeSettingFieldKind, value: unknown) {
  if (kind === 'boolean') {
    return Boolean(value)
  }

  if (kind === 'number') {
    const normalized = typeof value === 'number' ? value : Number(String(value || '').trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  if (kind === 'list') {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
}

function updateScopeSettingDraft(key: string, kind: ScopeSettingFieldKind, value: unknown) {
  scopeSettingsDraft.value = {
    ...scopeSettingsDraft.value,
    [key]: normalizeScopeSettingValue(kind, value),
  }
}

function commitScopeSettings() {
  emit('updateScopeSettings', { settings: cloneScopeSettings(scopeSettingsDraft.value) })
}

function submitScopeParticipant() {
  if (!canCreateScopeParticipant.value) {
    return
  }

  emit('createScopeParticipant', {
    displayName: scopeParticipantName.value.trim(),
    roleKey: scopeParticipantRole.value,
    responsibility: scopeParticipantResponsibility.value,
  })
}

function updateParticipantResponsibility(assignmentId: string, responsibility: GovernanceResponsibilityKey) {
  emit('updateScopeAssignment', {
    assignmentId,
    responsibility,
  })
}

function removeParticipantAssignment(assignmentId: string) {
  emit('deleteScopeAssignment', { assignmentId })
}

function relayOpenScopeDetail(scopeType: MessengerPlatformScopeType, scopeId: string) {
  emit('openScopeDetail', { scopeType, scopeId })
}

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

watch(() => props.scopeDetail, (detail) => {
  if (detail) {
    scopeSettingsDraft.value = cloneScopeSettings(detail.settings)
  }
}, { immediate: true })

watch(() => props.governanceMutationNotice, (value) => {
  if (value.includes('Участник добавлен')) {
    scopeParticipantName.value = ''
  }
})
</script>

<template>
  <section class="pa-pane pa-pane--scope-detail">
    <div class="pa-pane__head">
      <span class="pa-pane__title">{{ props.scopeDetail?.scope.title || 'Детали контура' }}</span>
      <span class="pa-pane__value">{{ props.scopeDetail?.scope.subtitle || props.fallbackSubtitle }}</span>
    </div>

    <div v-if="props.scopeDetailPending" class="pa-empty-state">
      Загружаю детали контура…
    </div>

    <div v-else-if="props.scopeDetailError" class="pa-state pa-state--error">
      {{ props.scopeDetailError }}
    </div>

    <template v-else-if="props.scopeDetail">
      <div class="pa-scope-hero">
        <span class="pa-scope-hero__status">{{ props.scopeDetail.scope.statusLabel || props.scopeDetail.scope.status || 'Контур проекта' }}</span>
        <span class="pa-scope-hero__revision">{{ props.scopeDetail.revision }}</span>
      </div>

      <section class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Участники и роли</span>
          <span class="pa-pane__value">{{ formatCountLabel(props.scopeDetail.participants.length, 'участник', 'участника', 'участников') }}</span>
        </div>

        <div v-if="props.scopeDetail.participants.length" class="pa-scope-list">
          <article v-for="participant in props.scopeDetail.participants" :key="participant.assignmentId" class="pa-scope-item">
            <div class="pa-scope-item__head">
              <span class="pa-scope-item__title">{{ participant.displayName }}</span>
              <span class="pa-scope-item__badge">{{ governanceOriginLabels[participant.origin] }}</span>
            </div>
            <span class="pa-scope-item__meta">{{ participant.roleLabel }} · {{ participant.responsibilityLabel }}</span>
            <span v-if="participant.secondary" class="pa-scope-item__meta">{{ participant.secondary }}</span>
            <div v-if="participant.origin === 'direct'" class="pa-scope-item__controls">
              <VSelect
                :model-value="participant.responsibility"
                :items="governanceResponsibilityItems"
                item-title="title"
                item-value="value"
                density="comfortable"
                variant="outlined"
                label="Роль в контуре"
                hide-details
                :disabled="props.governanceMutationPending"
                @update:model-value="updateParticipantResponsibility(participant.assignmentId, $event as GovernanceResponsibilityKey)"
              />
              <VBtn
                color="error"
                variant="tonal"
                :disabled="props.governanceMutationPending"
                @click="removeParticipantAssignment(participant.assignmentId)"
              >
                Убрать
              </VBtn>
            </div>
          </article>
        </div>
        <p v-else class="pa-empty-state">Для этого контура пока нет прямых назначений.</p>

        <div class="pa-scope-manage-grid">
          <VTextField
            v-model="scopeParticipantName"
            variant="outlined"
            density="comfortable"
            label="Новый участник"
            placeholder="Например: Юрист проекта"
            hide-details
            :disabled="props.governanceMutationPending"
          />
          <VSelect
            v-model="scopeParticipantRole"
            :items="governanceRoleItems"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            label="Роль"
            hide-details
            :disabled="props.governanceMutationPending"
          />
          <VSelect
            v-model="scopeParticipantResponsibility"
            :items="governanceResponsibilityItems"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            label="Ответственность"
            hide-details
            :disabled="props.governanceMutationPending"
          />
          <VBtn color="primary" variant="flat" :disabled="!canCreateScopeParticipant" @click="submitScopeParticipant">
            Добавить в контур
          </VBtn>
        </div>

        <p v-if="props.governanceMutationError" class="pa-state pa-state--error">{{ props.governanceMutationError }}</p>
        <p v-else-if="props.governanceMutationNotice" class="pa-state pa-state--muted">{{ props.governanceMutationNotice }}</p>
      </section>

      <section v-if="editableScopeSettings.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Настройки</span>
          <span class="pa-pane__value">{{ formatCountLabel(editableScopeSettings.length, 'настройка', 'настройки', 'настроек') }}</span>
        </div>
        <div class="pa-scope-setting-grid">
          <article v-for="field in editableScopeSettings" :key="field.key" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ field.label }}</span>

            <VSelect
              v-if="field.kind === 'select'"
              :model-value="field.value as string"
              :items="field.items || []"
              item-title="title"
              item-value="value"
              density="comfortable"
              variant="outlined"
              hide-details
              :disabled="props.governanceMutationPending"
              @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event); commitScopeSettings()"
            />

            <VSwitch
              v-else-if="field.kind === 'boolean'"
              :model-value="Boolean(field.value)"
              inset
              color="primary"
              hide-details
              :disabled="props.governanceMutationPending"
              @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event); commitScopeSettings()"
            />

            <VTextField
              v-else
              :model-value="field.value == null ? '' : String(field.value)"
              :type="field.kind === 'number' ? 'number' : 'text'"
              variant="outlined"
              density="comfortable"
              hide-details
              :disabled="props.governanceMutationPending"
              @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event)"
              @blur="commitScopeSettings()"
            />

            <span class="pa-scope-item__meta">{{ field.kind === 'list' ? 'Укажите роли через запятую' : 'Изменения отправляются сразу' }}</span>
          </article>
        </div>
      </section>

      <section v-if="props.scopeDetail.objectItems.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Объекты</span>
          <span class="pa-pane__value">{{ props.scopeDetail.objectItems.length }}</span>
        </div>
        <div class="pa-scope-list">
          <article v-for="item in props.scopeDetail.objectItems" :key="item.key" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ item.label }}</span>
            <span class="pa-scope-item__meta">{{ item.value }}</span>
          </article>
        </div>
      </section>

      <section v-if="props.scopeDetail.actionItems.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Действия и статусы</span>
          <span class="pa-pane__value">{{ props.scopeDetail.actionItems.length }}</span>
        </div>
        <div class="pa-scope-list">
          <article v-for="item in props.scopeDetail.actionItems" :key="item.key" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ item.label }}</span>
            <span class="pa-scope-item__meta">{{ item.value }}</span>
          </article>
        </div>
      </section>

      <section v-if="props.scopeDetail.tasks.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Задачи</span>
          <span class="pa-pane__value">{{ props.scopeDetail.tasks.length }}</span>
        </div>
        <div class="pa-scope-list">
          <article v-for="task in props.scopeDetail.tasks" :key="task.id" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ task.title }}</span>
            <span class="pa-scope-item__meta">{{ task.statusLabel }}{{ task.assigneeLabels.length ? ` · ${task.assigneeLabels.join(', ')}` : '' }}</span>
            <span v-if="task.secondary" class="pa-scope-item__meta">{{ task.secondary }}</span>
            <div class="pa-scope-item__actions">
              <VBtn color="primary" variant="text" size="small" @click="relayOpenScopeDetail('task', task.id)">Открыть контур</VBtn>
            </div>
          </article>
        </div>
      </section>

      <section v-if="props.scopeDetail.linkedScopes.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Связанные контуры</span>
          <span class="pa-pane__value">{{ props.scopeDetail.linkedScopes.length }}</span>
        </div>
        <div class="pa-scope-list">
          <article v-for="linkedScope in props.scopeDetail.linkedScopes" :key="`${linkedScope.scopeType}:${linkedScope.scopeId}`" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ linkedScope.title }}</span>
            <span class="pa-scope-item__meta">{{ linkedScope.statusLabel || linkedScope.status || linkedScope.scopeType }}</span>
            <div class="pa-scope-item__actions">
              <VBtn color="primary" variant="text" size="small" @click="relayOpenScopeDetail(linkedScope.scopeType, linkedScope.scopeId)">Открыть контур</VBtn>
            </div>
          </article>
        </div>
      </section>

      <section v-if="props.scopeDetail.ruleItems.length" class="pa-scope-cluster">
        <div class="pa-scope-cluster__head">
          <span class="pa-pane__title">Контур коммуникации</span>
          <span class="pa-pane__value">{{ props.scopeDetail.ruleItems.length }}</span>
        </div>
        <div class="pa-scope-list">
          <article v-for="rule in props.scopeDetail.ruleItems" :key="rule.id" class="pa-scope-item">
            <span class="pa-scope-item__title">{{ rule.title }}</span>
            <span class="pa-scope-item__meta">{{ rule.channel }} · {{ rule.audience }}</span>
            <span class="pa-scope-item__meta">{{ rule.trigger }}</span>
          </article>
        </div>
      </section>
    </template>

    <div v-else class="pa-empty-state">
      Выберите фазу или другой контур проекта.
    </div>
  </section>
</template>

<style scoped>
.pa-pane {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(var(--v-theme-surface-container-low), 0.92);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.pa-pane__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-pane__title {
  font-size: 14px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-pane__value {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-scope-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-hero__status,
.pa-scope-hero__revision,
.pa-scope-item__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-scope-hero__status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.pa-scope-cluster {
  display: grid;
  gap: 10px;
}

.pa-scope-cluster__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-list {
  display: grid;
  gap: 8px;
}

.pa-scope-item {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-scope-item__head,
.pa-scope-item__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-scope-item__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pa-scope-item__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-scope-manage-grid,
.pa-scope-setting-grid {
  display: grid;
  gap: 10px;
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
