<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  peerLogin?: string
  messagePending?: boolean
}>()

const emit = defineEmits<{
  action: [actionLabel: string]
}>()

const inferredRole = computed(() => {
  const login = props.peerLogin?.toLowerCase() || ''
  if (login.includes('contractor') || login.includes('builder') || login.includes('podryadchik')) return 'contractor'
  if (login.includes('manager') || login.includes('admin') || login.includes('designer')) return 'manager'
  if (login.includes('client') || login.includes('owner') || login.includes('customer') || login.includes('ivanov')) return 'client'
  
  // Try to define useful quick actions even if role is unmatched
  return 'general'
})

const actions = computed(() => {
  switch (inferredRole.value) {
    case 'contractor':
      return [
        { id: 'c1', label: 'Отчитаться о завершении этапа', icon: 'mdi-check-circle-outline' },
        { id: 'c2', label: 'Прикрепить фотоотчет', icon: 'mdi-camera-plus-outline' },
        { id: 'c3', label: 'Загрузить смету', icon: 'mdi-file-document-outline' },
        { id: 'c4', label: 'Уточнение по чертежам', icon: 'mdi-help-circle-outline' },
      ]
    case 'manager':
      return [
        { id: 'm1', label: 'Назначить задачу', icon: 'mdi-clipboard-list-outline' },
        { id: 'm2', label: 'Запросить отчет', icon: 'mdi-update' },
        { id: 'm3', label: 'Принять этап', icon: 'mdi-check-all' },
        { id: 'm4', label: 'Отправить правки', icon: 'mdi-shape-plus' },
      ]
    case 'client':
      return [
        { id: 'cl1', label: 'Согласовать выбор', icon: 'mdi-thumb-up-outline' },
        { id: 'cl2', label: 'Запросить варианты', icon: 'mdi-comment-edit-outline' },
        { id: 'cl3', label: 'Вопрос дизайнеру', icon: 'mdi-head-question-outline' },
        { id: 'cl4', label: 'Одобрить акт', icon: 'mdi-receipt-text-outline' },
      ]
    default:
      return [
        { id: 'g1', label: 'Поделиться файлом', icon: 'mdi-paperclip' },
        { id: 'g2', label: 'Создать задачу', icon: 'mdi-clipboard-list-outline' },
        { id: 'g3', label: 'Запросить ответ', icon: 'mdi-comment-question-outline' },
      ]
  }
})

function handleAction(actionLabel: string) {
  emit('action', actionLabel)
}
</script>

<template>
  <div class="composer-role-actions">
    <div class="composer-role-actions__scroll">
      <template v-for="action in actions" :key="action.id">
        <button
          type="button"
          class="composer-role-actions__btn"
          :disabled="props.messagePending"
          @click="handleAction(action.label)"
        >
          <VIcon :icon="action.icon" size="16" class="composer-role-actions__icon" />
          <span>{{ action.label }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.composer-role-actions {
  width: 100%;
  padding: 6px 12px;
  background: transparent;
  overflow: hidden;
  position: relative;
  z-index: 10;
  mask-image: linear-gradient(to right, rgba(0,0,0,1) 90%, rgba(0,0,0,0));
  -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 90%, rgba(0,0,0,0));
}

.composer-role-actions__scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px; /* for invisible scrollbar space */
}

.composer-role-actions__scroll::-webkit-scrollbar {
  display: none;
}

.composer-role-actions__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 100px;
  background: var(--sys-color-surface-container-low, rgba(120, 120, 120, 0.1));
  border: 1px solid var(--sys-color-outline-variant, rgba(120, 120, 120, 0.2));
  color: var(--sys-color-on-surface-variant, inherit);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.composer-role-actions__btn:hover:not(:disabled) {
  background: var(--sys-color-surface-container-high, rgba(120, 120, 120, 0.2));
  color: var(--sys-color-on-surface, inherit);
  border-color: var(--sys-color-outline, rgba(120, 120, 120, 0.4));
}

.composer-role-actions__btn:active:not(:disabled) {
  transform: scale(0.98);
}

.composer-role-actions__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer-role-actions__icon {
  opacity: 0.8;
}
</style>
