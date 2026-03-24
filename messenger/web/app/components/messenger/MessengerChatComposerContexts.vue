<script setup lang="ts">
import type { MessengerKlipyItem } from '../../composables/useMessengerKlipy'

interface ForwardTargetItem {
  peerUserId: string
  displayName: string
  login: string
  current: boolean
  selectable: boolean
}

const props = defineProps<{
  showSecretIntro: boolean
  showRelationPanel: boolean
  relationTitle: string
  relationAuthor: string
  relationPreview: string
  showForwardPanel: boolean
  forwardAuthor: string
  forwardPreview: string
  forwardSearchDraft: string
  selectedForwardTargets: ForwardTargetItem[]
  availableForwardTargets: ForwardTargetItem[]
  contactsPending: boolean
  messagePending: boolean
  forwardSubmitLabel: string
  showKlipyPill: boolean
  selectedKlipyItem: MessengerKlipyItem | null
  mediaUploadPending: boolean
}>()

const emit = defineEmits<{
  'clear-relation': []
  'close-forward-picker': []
  'update:forward-search-draft': [value: string]
  'forward-message': []
  'toggle-forward-target': [peerUserId: string]
  'clear-selected-klipy-item': []
}>()
</script>

<template>
  <Transition name="chrome-reveal">
    <VCard v-if="showSecretIntro" class="composer-context composer-context--secret-intro" color="surface" variant="tonal">
      <VCardText class="composer-context__body">
        <div class="composer-context__copy">
          <p class="composer-context__eyebrow composer-context__eyebrow--icon">
            <MessengerIcon name="shield" :size="14" />
            <span>Защищённый чат</span>
          </p>
          <p class="composer-context__title">Первое сообщение запустит защищённый диалог</p>
          <p class="composer-context__text">Текст, вложения и голосовые в этом чате шифруются end-to-end. Пересылка отключена, а любой участник может удалить любое сообщение.</p>
        </div>
      </VCardText>
    </VCard>
  </Transition>

  <Transition name="chrome-reveal">
    <VCard v-if="showRelationPanel" class="composer-context composer-context--active" color="surface" variant="tonal">
      <VCardText class="composer-context__body composer-context__body--actionable">
        <div class="composer-context__copy">
          <p class="composer-context__eyebrow">{{ relationTitle }}</p>
          <p class="composer-context__title">{{ relationAuthor }}</p>
          <p class="composer-context__text">{{ relationPreview }}</p>
        </div>
        <VBtn type="button" class="message-action-btn" variant="tonal" @click="emit('clear-relation')">Отмена</VBtn>
      </VCardText>
    </VCard>
  </Transition>

  <Transition name="chrome-reveal">
    <VCard v-if="showForwardPanel" class="composer-context composer-context--forward composer-forward-panel" color="surface" variant="tonal">
      <VCardText class="composer-context__body composer-context__body--stacked">
        <div class="composer-forward-panel__head">
          <div class="composer-context__copy">
            <p class="composer-context__eyebrow">Переслать сообщение</p>
            <p class="composer-context__title">{{ forwardAuthor }}</p>
            <p class="composer-context__text">{{ forwardPreview }}</p>
          </div>
          <VBtn type="button" class="message-action-btn composer-forward-panel__close" icon="mdi-close" variant="text" @click="emit('close-forward-picker')" />
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
          <VBtn type="button" class="composer-forward-panel__submit" color="primary" variant="tonal" :disabled="!selectedForwardTargets.length || messagePending" @click="emit('forward-message')">
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
  </Transition>

  <Transition name="overlay-rise">
    <div v-if="showKlipyPill && selectedKlipyItem" class="composer-context composer-context--klipy">
      <VCard class="composer-klipy-pill" color="surface" variant="tonal">
        <VBtn type="button" class="message-action-btn composer-klipy-pill__dismiss" icon="mdi-close" variant="tonal" :disabled="mediaUploadPending" @click="emit('clear-selected-klipy-item')" />
        <img
          class="composer-klipy-pill__preview"
          :class="`composer-klipy-pill__preview--${selectedKlipyItem.kind}`"
          :src="selectedKlipyItem.previewUrl"
          :alt="selectedKlipyItem.title"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        >
      </VCard>
    </div>
  </Transition>
</template>