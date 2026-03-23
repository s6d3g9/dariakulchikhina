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

// Emoji category chips (Layer 2 per M3 spec)
const emojiCategories = [
  { key: 'recent', label: 'Недавние', icon: '🕐' },
  { key: 'smileys', label: 'Смайлы', icon: '😄' },
  { key: 'people', label: 'Люди', icon: '👋' },
  { key: 'animals', label: 'Животные', icon: '🐾' },
  { key: 'food', label: 'Еда', icon: '🍕' },
  { key: 'travel', label: 'Места', icon: '✈️' },
  { key: 'objects', label: 'Объекты', icon: '💡' },
  { key: 'symbols', label: 'Символы', icon: '💜' },
  { key: 'flags', label: 'Флаги', icon: '🏁' },
]
const activeEmojiCategory = ref('recent')

// Photo/File category chips (Layer 2 per M3 spec §4.2.1)
const fileCategoryChips = [
  { key: 'all', label: 'Все' },
  { key: 'photo', label: '🖼 Фото' },
  { key: 'video', label: '🎬 Видео' },
  { key: 'docs', label: '📄 Документы' },
  { key: 'audio', label: '🎵 Аудио' },
  { key: 'archives', label: '📦 Архивы' },
]
const activeFileCategory = ref('all')

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
      <!-- Layer 1+2+3: content → category chips → search, flexible -->
      <div class="composer-media-menu__body">
        <!-- Emoji grid (Layer 1) -->
        <div v-if="tab === 'emoji'" class="composer-media-menu__emoji-grid">
          <VBtn
            v-for="emoji in emojiOptions"
            :key="emoji"
            class="composer-media-menu__emoji"
            variant="text"
            size="small"
            @click="emit('insert-emoji', emoji)"
          >
            {{ emoji }}
          </VBtn>
        </div>

        <!-- Photo tab (Layer 1) -->
        <div v-if="tab === 'photo'" class="composer-media-menu__photo-tab">
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

        <!-- File tab (Layer 1) -->
        <div v-if="tab === 'file'" class="composer-media-menu__file-tab">
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

        <!-- Stickers / GIF (KLIPY) (Layer 1) -->
        <div v-if="tab === 'stickers' || tab === 'gif'" class="composer-media-menu__catalog">
          <p v-if="klipyStatusText" class="composer-media-menu__status">{{ klipyStatusText }}</p>
          <div class="composer-media-menu__watermark">KLIPY</div>

          <div
            ref="feedEl"
            class="composer-media-menu__feed"
            :class="{
              'composer-media-menu__feed--stickers': activeKlipyKind === 'sticker',
              'composer-media-menu__feed--gifs': activeKlipyKind === 'gif',
            }"
            @scroll="emit('feed-scroll', $event)"
          >
            <button
              v-for="(item, index) in primaryKlipyItems"
              :key="`${item.id}-${index}`"
              type="button"
              class="composer-media-menu__result"
              :aria-label="item.title || (item.kind === 'sticker' ? 'Отправить стикер' : 'Отправить GIF')"
              :disabled="mediaUploadPending"
              :style="klipyTileStyle(item)"
              @click="emit('select-item', item)"
            >
              <img
                class="composer-media-menu__result-preview"
                :class="`composer-media-menu__result-preview--${item.kind}`"
                :src="item.previewUrl"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
              >
            </button>
          </div>
        </div>

        <!-- Layer 2: Emoji category chips -->
        <div v-if="tab === 'emoji'" class="composer-media-menu__category-rail">
          <button
            v-for="cat in emojiCategories"
            :key="cat.key"
            type="button"
            class="composer-media-menu__category-tile"
            :class="{ 'composer-media-menu__category-tile--active': activeEmojiCategory === cat.key }"
            @click="activeEmojiCategory = cat.key"
          >
            <span class="composer-media-menu__category-label">{{ cat.icon }} {{ cat.label }}</span>
          </button>
        </div>

        <!-- Layer 2: Photo/File category chips -->
        <div v-if="tab === 'photo' || tab === 'file'" class="composer-media-menu__category-rail">
          <button
            v-for="cat in fileCategoryChips"
            :key="cat.key"
            type="button"
            class="composer-media-menu__category-tile"
            :class="{ 'composer-media-menu__category-tile--active': activeFileCategory === cat.key }"
            @click="activeFileCategory = cat.key"
          >
            <span class="composer-media-menu__category-label">{{ cat.label }}</span>
          </button>
        </div>

        <!-- Layer 2: Klipy category chips -->
        <div
          v-if="showKlipyCategories"
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

        <!-- Layer 3: Search field (all tabs per spec §4.1) -->
        <div class="search-dock">
          <input
            :value="klipyQuery"
            type="text"
            class="composer-input"
            :placeholder="tab === 'emoji' ? 'Поиск смайлов...'
              : tab === 'stickers' ? 'Поиск стикеров...'
              : tab === 'gif' ? 'Поиск GIF...'
              : tab === 'photo' ? 'Поиск фото...'
              : 'Поиск файлов...'"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @input="emit('update:klipy-query', ($event.target as HTMLInputElement).value ?? '')"
          />
        </div>
      </div>

      <!-- Bottom Tab bar (Layer 4 — always at bottom) -->
      <VTabs
        :model-value="tab"
        class="composer-media-menu__tabs"
        align-tabs="start"
        color="primary"
        density="compact"
        @update:model-value="emit('update:tab', $event as typeof tab)"
      >
        <VTab value="emoji">Смайлы</VTab>
        <VTab value="stickers">
          Стикеры
          <span v-if="sharedStickers" class="composer-media-menu__tab-badge ml-1">👥</span>
        </VTab>
        <VTab value="gif">
          GIF
          <span v-if="sharedGif" class="composer-media-menu__tab-badge ml-1">👥</span>
        </VTab>
        <VTab value="photo">Фото</VTab>
        <VTab value="file">Файл</VTab>
      </VTabs>
    </div>
  </Transition>
</template>
