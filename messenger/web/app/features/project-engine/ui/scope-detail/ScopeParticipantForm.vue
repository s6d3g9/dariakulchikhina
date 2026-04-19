<script setup lang="ts">
type GovernanceRoleKey = 'client' | 'manager' | 'designer' | 'lawyer' | 'contractor' | 'seller' | 'engineer' | 'consultant' | 'service' | 'other'
type GovernanceResponsibilityKey = 'lead' | 'owner' | 'executor' | 'reviewer' | 'approver' | 'observer' | 'consultant'

const props = defineProps<{
  disabled: boolean
  mutationNotice: string
}>()

const emit = defineEmits<{
  submit: [payload: { displayName: string; roleKey: GovernanceRoleKey; responsibility: GovernanceResponsibilityKey }]
}>()

const name = ref('')
const role = ref<GovernanceRoleKey>('manager')
const responsibility = ref<GovernanceResponsibilityKey>('owner')

const canSubmit = computed(() => Boolean(name.value.trim() && !props.disabled))

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

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    displayName: name.value.trim(),
    roleKey: role.value,
    responsibility: responsibility.value,
  })
}

watch(() => props.mutationNotice, (value) => {
  if (value.includes('Участник добавлен')) {
    name.value = ''
  }
})
</script>

<template>
  <div class="pa-scope-manage-grid">
    <VTextField
      v-model="name"
      variant="outlined"
      density="comfortable"
      label="Новый участник"
      placeholder="Например: Юрист проекта"
      hide-details
      :disabled="props.disabled"
    />
    <VSelect
      v-model="role"
      :items="governanceRoleItems"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="comfortable"
      label="Роль"
      hide-details
      :disabled="props.disabled"
    />
    <VSelect
      v-model="responsibility"
      :items="governanceResponsibilityItems"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="comfortable"
      label="Ответственность"
      hide-details
      :disabled="props.disabled"
    />
    <VBtn color="primary" variant="flat" :disabled="!canSubmit" @click="handleSubmit">
      Добавить в контур
    </VBtn>
  </div>
</template>
