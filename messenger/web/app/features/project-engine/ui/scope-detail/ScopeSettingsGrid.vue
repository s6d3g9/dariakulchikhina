<script setup lang="ts">
import type { MessengerPlatformScopeDetailItem } from '../../model/useMessengerProjectActions'

type ScopeSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

const props = defineProps<{
  settingItems: MessengerPlatformScopeDetailItem[]
  settings: Record<string, unknown>
  mutationPending: boolean
}>()

const emit = defineEmits<{
  updateSettings: [settings: Record<string, unknown>]
}>()

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

const draft = ref<Record<string, unknown>>({})

watch(() => props.settings, (value) => {
  draft.value = JSON.parse(JSON.stringify(value || {}))
}, { immediate: true })

const editableSettings = computed(() => {
  const labelMap = new Map(props.settingItems.map(item => [item.key, item.label]))
  const knownKeys = governanceSettingOrder.filter(key => key in draft.value)
  const dynamicKeys = Object.keys(draft.value).filter(key => !knownKeys.includes(key as typeof governanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = draft.value[key]

    if (key === 'communicationChannel') {
      return { key, label: labelMap.get(key) || governanceSettingLabels[key] || key, kind: 'select' as const, value: typeof rawValue === 'string' ? rawValue : '', items: governanceChannelItems }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return { key, label: labelMap.get(key) || governanceSettingLabels[key] || key, kind: 'number' as const, value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue) }
    }

    if (key === 'escalateOnBlocked') {
      return { key, label: labelMap.get(key) || governanceSettingLabels[key] || key, kind: 'boolean' as const, value: Boolean(rawValue) }
    }

    if (key === 'requiredResponsibilities') {
      return { key, label: labelMap.get(key) || governanceSettingLabels[key] || key, kind: 'list' as const, value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '' }
    }

    return { key, label: labelMap.get(key) || governanceSettingLabels[key] || key, kind: 'text' as const, value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue) }
  })
})

function formatCount(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} настройка`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} настройки`
  return `${count} настроек`
}

function normalizeValue(kind: ScopeSettingFieldKind, value: unknown): unknown {
  if (kind === 'boolean') return Boolean(value)
  if (kind === 'number') {
    const n = typeof value === 'number' ? value : Number(String(value || '').trim())
    return Number.isFinite(n) ? n : null
  }
  if (kind === 'list') return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
}

function updateDraft(key: string, kind: ScopeSettingFieldKind, value: unknown) {
  draft.value = { ...draft.value, [key]: normalizeValue(kind, value) }
}

function commit() {
  emit('updateSettings', JSON.parse(JSON.stringify(draft.value)))
}
</script>

<template>
  <section v-if="editableSettings.length" class="pa-scope-cluster">
    <div class="pa-scope-cluster__head">
      <span class="pa-pane__title">Настройки</span>
      <span class="pa-pane__value">{{ formatCount(editableSettings.length) }}</span>
    </div>
    <div class="pa-scope-setting-grid">
      <article v-for="field in editableSettings" :key="field.key" class="pa-scope-item">
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
          :disabled="props.mutationPending"
          @update:model-value="updateDraft(field.key, field.kind, $event); commit()"
        />

        <VSwitch
          v-else-if="field.kind === 'boolean'"
          :model-value="Boolean(field.value)"
          inset
          color="primary"
          hide-details
          :disabled="props.mutationPending"
          @update:model-value="updateDraft(field.key, field.kind, $event); commit()"
        />

        <VTextField
          v-else
          :model-value="field.value == null ? '' : String(field.value)"
          :type="field.kind === 'number' ? 'number' : 'text'"
          variant="outlined"
          density="comfortable"
          hide-details
          :disabled="props.mutationPending"
          @update:model-value="updateDraft(field.key, field.kind, $event)"
          @blur="commit()"
        />

        <span class="pa-scope-item__meta">{{ field.kind === 'list' ? 'Укажите роли через запятую' : 'Изменения отправляются сразу' }}</span>
      </article>
    </div>
  </section>
</template>
