<script setup lang="ts">
import type { MessengerKlipyItem } from '../../composables/useMessengerKlipy'

interface KlipyCategoryItem {
  query: string
}

const props = defineProps<{
  visible: boolean
  tab: 'emoji' | 'stickers' | 'gif' | 'photo' | 'file'
  emojiOptions: string[]
  sharedStickers: boolean
  sharedGif: boolean
  klipyQuery: string
  klipySearchPlaceholder: string
  showKlipyCategories: boolean
  loopedKlipyCategories: KlipyCategoryItem[]
  selectedCatalogCategory: string
  primaryKlipyItems: MessengerKlipyItem[]
  activeKlipyKind: 'gif' | 'sticker' | null
  canLoadMoreKlipyItems: boolean
  mediaUploadPending: boolean
  klipyStatusText: string
  formatKlipyCategoryTag: (query: string) => string
  klipyTileStyle: (item: MessengerKlipyItem) => Record<string, string>
  sharedPhotos: Array<{ id: string; previewUrl?: string; title: string }>
  sharedDocuments: Array<{ id: string; title: string; meta: string }>
}>()

const emit = defineEmits<{
  'update:tab': [value: 'emoji' | 'stickers' | 'gif' | 'photo' | 'file']
  'insert-emoji': [emoji: string]
  'update:klipy-query': [value: string]
  'category-scroll': [event: Event]
  'select-category': [query: string]
  'feed-scroll': [event: Event]
  'select-item': [item: MessengerKlipyItem]
  'pick-from-device': []
}>()

const categoryRailEl = ref<HTMLDivElement | null>(null)
const feedEl = ref<HTMLDivElement | null>(null)

defineExpose({
  categoryRailEl,
  feedEl,
})
</script>

<template>
  <Transition name="overlay-rise">
    <div
      v-if="visible"
      class="composer-media-menu"
    >
      <VCard class="composer-media-menu__card" color="surface" variant="tonal">
        <VCardText class="composer-media-menu__body">
          <div v-if="tab === 'emoji'" class="composer-media-menu__emoji-grid">
            <VBtn
              v-for="emoji in emojiOptions"
              :key="emoji"
              class="composer-media-menu__emoji"
              variant="tonal"
              @click="emit('insert-emoji', emoji)"
            >
              {{ emoji }}
            </VBtn>
          </div>

          <div v-else-if="tab === 'photo'" class="composer-media-menu__photo-tab">
            <div class="composer-media-menu__upload-row">
              <VBtn
                type="button"
                variant="tonal"
                size="small"
                prepend-icon="mdi-image-plus"
                @click="emit('pick-from-device')"
              >
                Загрузить с устройства
              </VBtn>
            </div>
            <div v-if="sharedPhotos.length" class="composer-media-menu__photo-grid">
              <div
                v-for="photo in sharedPhotos"
                :key="photo.id"
                class="composer-media-menu__photo-item"
                :style="photo.previewUrl ? `background-image: url(${photo.previewUrl})` : undefined"
                :title="photo.title"
              />
            </div>
            <p v-else class="composer-media-menu__status">Фото из переписки появятся здесь</p>
          </div>

          <div v-else-if="tab === 'file'" class="composer-media-menu__file-tab">
            <div class="composer-media-menu__upload-row">
              <VBtn
                type="button"
                variant="tonal"
                size="small"
                prepend-icon="mdi-paperclip"
                @click="emit('pick-from-device')"
              >
                Загрузить файл
              </VBtn>
            </div>
            <div v-if="sharedDocuments.length" class="composer-media-menu__file-list">
              <div
                v-for="doc in sharedDocuments"
                :key="doc.id"
                class="composer-media-menu__file-item"
              >
                <span class="composer-media-menu__file-name">{{ doc.title }}</span>
                <span class="composer-media-menu__file-meta">{{ doc.meta }}</span>
              </div>
            </div>
            <p v-else class="composer-media-menu__status">Файлы из переписки появятся здесь</p>
          </div>

          <div v-else class="composer-media-menu__catalog">
            <p v-if="klipyStatusText" class="composer-media-menu__status">{{ klipyStatusText }}</p>
            <div class="composer-media-menu__watermark">KLIPY</div>
            
            <div v-if="primaryKlipyItems.length" class="composer-media-menu__feed-wrap">
              <div
                ref="feedEl"
                class="composer-media-menu__feed"
                :class="{ 'composer-media-menu__feed--stickers': activeKlipyKind === 'sticker', 'composer-media-menu__feed--gifs': activeKlipyKind === 'gif' }"
                @scroll="emit('feed-scroll', $event)"
              >
                <button
                  v-for="(item, index) in primaryKlipyItems"
                  :key="`${item.id}-${index}`"
                  type="button"
                  class="composer-media-menu__result"
                  :aria-label="item.title || (item.kind === 'sticker' ? 'Отправить стикер' : 'Отправить GIF')"
                  :title="item.title || (item.kind === 'sticker' ? 'Отправить стикер' : 'Отправить GIF')"
                  :disabled="mediaUploadPending"
                  :style="klipyTileStyle(item)"
                  @click="emit('select-item', item)"
                >
                  <img class="composer-media-menu__result-preview" :class="`composer-media-menu__result-preview--${item.kind}`" :src="item.previewUrl" :alt="item.title" loading="lazy" decoding="async" referrerpolicy="no-referrer">
                </button>
              </div>
            </div>

            <div v-if="showKlipyCategories" class="composer-media-menu__category-rail-wrap">
              <div
                ref="categoryRailEl"
                class="composer-media-menu__category-rail"
                :aria-label="tab === 'stickers' ? 'Категории стикеров KLIPY' : 'Категории GIF KLIPY'"
                @scroll="emit('category-scroll', $event)"
              >
                <button
                  v-for="(category, index) in loopedKlipyCategories"
                  :key="`${tab}-${category.query}-${index}`"
                  type="button"
                  class="composer-media-menu__category-tile"
                  :class="{ 'composer-media-menu__category-tile--active': selectedCatalogCategory === category.query }"
                  @click="emit('select-category', category.query)"
                >
                  <span class="composer-media-menu__category-label">{{ formatKlipyCategoryTag(category.query) }}</span>
                </button>
              </div>
            </div>

            <VTextField
              :model-value="klipyQuery"
              class="composer-media-menu__search-field"
              density="comfortable"
              hide-details
              variant="outlined"
              :placeholder="klipySearchPlaceholder"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @update:model-value="emit('update:klipy-query', String($event ?? ''))"
            />
          </div>

          <VTabs
            :model-value="tab"
            class="composer-media-menu__tabs composer-media-menu__tabs--vuetify"
            align-tabs="start"
            color="primary"
            show-arrows
            @update:model-value="emit('update:tab', $event)"
          >
            <VTab value="emoji" class="composer-media-menu__tab composer-media-menu__tab--vuetify">
              Смайлы
            </VTab>
            <VTab value="stickers" class="composer-media-menu__tab composer-media-menu__tab--vuetify">
              <span>Стикеры</span>
              <span v-if="sharedStickers" class="composer-media-menu__tab-badge">👥</span>
            </VTab>
            <VTab value="gif" class="composer-media-menu__tab composer-media-menu__tab--vuetify">
              <span>GIF</span>
              <span v-if="sharedGif" class="composer-media-menu__tab-badge">👥</span>
            </VTab>
            <VTab value="photo" class="composer-media-menu__tab composer-media-menu__tab--vuetify">
              Фото
            </VTab>
            <VTab value="file" class="composer-media-menu__tab composer-media-menu__tab--vuetify">
              Файл
            </VTab>
          </VTabs>
        </VCardText>
      </VCard>
    </div>
  </Transition>
</template>