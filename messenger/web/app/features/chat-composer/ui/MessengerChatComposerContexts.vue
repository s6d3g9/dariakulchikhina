<script setup lang="ts">
import type { MessengerKlipyItem } from '../../../entities/messages/model/useMessengerKlipy'

const props = defineProps<{
  showSecretIntro: boolean
  showRelationPanel: boolean
  relationTitle: string
  relationAuthor: string
  relationPreview: string
  showKlipyPill: boolean
  selectedKlipyItem: MessengerKlipyItem | null
  mediaUploadPending: boolean
}>()

const emit = defineEmits<{
  'clear-relation': []
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