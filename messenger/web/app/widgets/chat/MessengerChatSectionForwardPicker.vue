<script setup lang="ts">
interface ForwardTargetItem {
  peerUserId: string
  displayName: string
  login: string
  current: boolean
  selectable: boolean
}

const props = defineProps<{
  forwardAuthor: string
  forwardPreview: string
  forwardSearchDraft: string
  selectedForwardTargets: ForwardTargetItem[]
  availableForwardTargets: ForwardTargetItem[]
  contactsPending: boolean
  messagePending: boolean
  forwardSubmitLabel: string
}>()

const emit = defineEmits<{
  forward: []
  close: []
  'update:forward-search-draft': [value: string]
  'toggle-forward-target': [peerUserId: string]
}>()
</script>

<template>
  <VCard class="composer-context composer-context--forward composer-forward-panel" color="surface" variant="tonal">
    <VCardText class="composer-context__body composer-context__body--stacked">
      <div class="composer-forward-panel__head">
        <div class="composer-context__copy">
          <p class="composer-context__eyebrow">Переслать сообщение</p>
          <p class="composer-context__title">{{ forwardAuthor }}</p>
          <p class="composer-context__text">{{ forwardPreview }}</p>
        </div>
        <VBtn type="button" class="message-action-btn composer-forward-panel__close" icon="mdi-close" variant="text" @click="emit('close')" />
      </div>
      <div class="composer-forward-panel__toolbar">
        <VTextField
          :model-value="forwardSearchDraft"
          class="composer-forward-panel__search-field"
          density="comfortable"
          hide-details
          variant="outlined"
          placeholder="Поиск пользователя"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @update:model-value="emit('update:forward-search-draft', String($event ?? ''))"
        />
        <VBtn type="button" class="composer-forward-panel__submit" color="primary" variant="tonal" :disabled="!selectedForwardTargets.length || messagePending" @click="emit('forward')">
          {{ forwardSubmitLabel }}
        </VBtn>
      </div>
      <div v-if="selectedForwardTargets.length" class="composer-forward-panel__selected">
        <VChip
          v-for="target in selectedForwardTargets"
          :key="`selected-${target.peerUserId}`"
          class="composer-forward-chip"
          closable
          size="small"
          variant="tonal"
          @click="emit('toggle-forward-target', target.peerUserId)"
          @click:close="emit('toggle-forward-target', target.peerUserId)"
        >
          {{ target.displayName }}
        </VChip>
      </div>
      <div class="forward-targets forward-targets--minimal">
        <template v-if="contactsPending">
          <div class="composer-context__progress">
            <MessengerProgressLinear aria-label="Поиск пользователей для пересылки" indeterminate four-color compact />
          </div>
          <p class="composer-media-menu__empty">[ ИЩЕМ ПОЛЬЗОВАТЕЛЕЙ... ]</p>
        </template>
        <button
          v-for="target in availableForwardTargets"
          v-else
          :key="target.peerUserId"
          type="button"
          class="forward-target-btn forward-target-btn--minimal"
          :class="{ 'forward-target-btn--active': selectedForwardTargets.some(item => item.peerUserId === target.peerUserId) }"
          :disabled="messagePending || !target.selectable"
          @click="emit('toggle-forward-target', target.peerUserId)"
        >
          <span class="forward-target-btn__title">{{ target.displayName }}</span>
          <span class="forward-target-btn__meta">{{ target.current ? 'Текущий чат' : target.selectable ? `@${target.login}` : 'Не в контактах' }}</span>
        </button>
        <p v-if="!contactsPending && !availableForwardTargets.length" class="composer-context__text">Пользователи не найдены.</p>
      </div>
    </VCardText>
  </VCard>
</template>
