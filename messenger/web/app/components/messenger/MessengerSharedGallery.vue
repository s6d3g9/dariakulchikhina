<script setup lang="ts">
type GallerySectionKey = 'photos' | 'documents' | 'links'

interface GalleryItem {
  id: string
  title: string
  meta: string
  href: string
  previewUrl?: string
}

const props = defineProps<{
  title: string
  hint: string
  photos: GalleryItem[]
  documents: GalleryItem[]
  links: GalleryItem[]
}>()

const emit = defineEmits<{
  close: []
  select: [item: GalleryItem]
}>()

const activeSection = ref<GallerySectionKey>('photos')
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)

const sections = computed(() => ([
  {
    key: 'photos' as const,
    title: 'Фото',
    emptyLabel: 'Пока нет фотографий.',
    items: props.photos,
  },
  {
    key: 'documents' as const,
    title: 'Файлы',
    emptyLabel: 'Пока нет файлов.',
    items: props.documents,
  },
  {
    key: 'links' as const,
    title: 'Ссылки',
    emptyLabel: 'Пока нет ссылок.',
    items: props.links,
  },
]))

const activeIndex = computed(() => sections.value.findIndex(section => section.key === activeSection.value))

function openSection(key: GallerySectionKey) {
  activeSection.value = key
}

function moveSection(direction: 1 | -1) {
  const nextIndex = activeIndex.value + direction
  if (nextIndex < 0 || nextIndex >= sections.value.length) {
    return
  }

  activeSection.value = sections.value[nextIndex].key
}

function handleTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  touchStartX.value = touch?.clientX ?? null
  touchStartY.value = touch?.clientY ?? null
}

function handleTouchEnd(event: TouchEvent) {
  if (touchStartX.value === null || touchStartY.value === null) {
    return
  }

  const touch = event.changedTouches[0]
  const deltaX = (touch?.clientX ?? 0) - touchStartX.value
  const deltaY = (touch?.clientY ?? 0) - touchStartY.value

  touchStartX.value = null
  touchStartY.value = null

  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
    return
  }

  moveSection(deltaX < 0 ? 1 : -1)
}
</script>

<template>
  <section class="content-drawer content-drawer--dock content-gallery" aria-label="Shared content gallery">
    <div class="content-drawer__head content-drawer__head--gallery">
      <div class="content-drawer__copy">
        <p class="content-drawer__title">{{ title }}</p>
        <p class="content-drawer__hint">{{ hint }}</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Закрыть галерею" @click="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.7 6.7a1 1 0 0 1 1.4 0L12 10.6l3.9-3.9a1 1 0 1 1 1.4 1.4L13.4 12l3.9 3.9a1 1 0 0 1-1.4 1.4L12 13.4l-3.9 3.9a1 1 0 0 1-1.4-1.4l3.9-3.9-3.9-3.9a1 1 0 0 1 0-1.4Z" fill="currentColor"/>
        </svg>
      </button>
    </div>

    <div class="content-gallery__nav" aria-label="Разделы галереи">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="content-gallery__tab"
        :class="{ 'content-gallery__tab--active': activeSection === section.key }"
        @click="openSection(section.key)"
      >
        <span>{{ section.title }}</span>
        <span class="content-gallery__tab-count">{{ section.items.length }}</span>
      </button>
    </div>

    <div class="content-gallery__viewport" @touchstart.passive="handleTouchStart" @touchend.passive="handleTouchEnd">
      <div class="content-gallery__track" :style="{ transform: `translateX(-${activeIndex * 100}%)` }">
        <section v-for="section in sections" :key="section.key" class="content-gallery__panel">
          <div v-if="section.items.length" class="content-grid content-grid--gallery">
            <button
              v-for="item in section.items"
              :key="item.id"
              type="button"
              class="content-card"
              :class="{
                'content-card--photo': section.key === 'photos',
                'content-card--tile': section.key !== 'photos',
              }"
              @click="emit('select', item)"
            >
              <img
                v-if="section.key === 'photos' && item.previewUrl"
                :src="item.previewUrl"
                :alt="item.title"
                class="content-card__image"
              >
              <span class="content-card__title">{{ item.title }}</span>
              <span class="content-card__meta">{{ item.meta }}</span>
            </button>
          </div>
          <p v-else class="content-empty">{{ section.emptyLabel }}</p>
        </section>
      </div>
    </div>
  </section>
</template>