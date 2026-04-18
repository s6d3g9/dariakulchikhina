<template>
  <div>
    <div class="u-form-section">
      <h3>Аккаунт</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>ID</label>
          <div class="cab-field-static">{{ contractorId }}</div>
        </div>
        <div class="u-field">
          <label>Slug (ссылка для входа)</label>
          <div class="cab-field-static cab-field-slug">{{ contractor?.slug }}</div>
        </div>
        <div class="u-field">
          <label>Тип</label>
          <div class="cab-field-static">{{ contractor?.contractorType === 'company' ? 'Компания-подрядчик' : 'Мастер' }}</div>
        </div>
        <div class="u-field">
          <label>Зарегистрирован</label>
          <div class="cab-field-static">{{ contractor?.createdAt ? new Date(contractor.createdAt).toLocaleDateString('ru-RU') : '—' }}</div>
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Уведомления</h3>
      <div class="cab-settings-toggles">
        <label class="cab-toggle-row">
          <input v-model="notifSettings.newTasks" type="checkbox" class="cab-toggle-checkbox" />
          <span class="cab-toggle-label">Новые задачи</span>
          <span class="cab-toggle-hint">Уведомлять о назначении новых задач</span>
        </label>
        <label class="cab-toggle-row">
          <input v-model="notifSettings.deadlines" type="checkbox" class="cab-toggle-checkbox" />
          <span class="cab-toggle-label">Дедлайны</span>
          <span class="cab-toggle-hint">Напоминание за 1 день до срока</span>
        </label>
        <label class="cab-toggle-row">
          <input v-model="notifSettings.comments" type="checkbox" class="cab-toggle-checkbox" />
          <span class="cab-toggle-label">Комментарии</span>
          <span class="cab-toggle-hint">Новые комментарии к задачам</span>
        </label>
        <label class="cab-toggle-row">
          <input v-model="notifSettings.statusChanges" type="checkbox" class="cab-toggle-checkbox" />
          <span class="cab-toggle-label">Смена статуса</span>
          <span class="cab-toggle-hint">Изменение статуса задач дизайнером</span>
        </label>
      </div>
      <GlassButton variant="secondary" density="compact" style="margin-top:12px" @click="$emit('save-notifications')">Сохранить настройки</GlassButton>
    </div>

    <div class="u-form-section">
      <h3>Безопасность</h3>
      <p class="cab-settings-hint">
        Для входа в кабинет используйте ваш ID <b>({{ contractorId }})</b> и slug <b>({{ contractor?.slug }})</b>.
        Если нужно сменить slug — обратитесь к администратору.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ContractorInfo {
  slug?: string | null
  contractorType?: string | null
  createdAt?: string | null
}

interface NotifSettings {
  newTasks: boolean
  deadlines: boolean
  comments: boolean
  statusChanges: boolean
}

defineProps<{
  contractorId: number | string
  contractor: ContractorInfo | null | undefined
  notifSettings: NotifSettings
}>()

defineEmits<{
  'save-notifications': []
}>()
</script>
