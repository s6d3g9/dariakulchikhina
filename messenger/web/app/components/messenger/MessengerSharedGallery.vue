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
  initialSection?: GallerySectionKey
  initialPhotoId?: string | null
  photoOnly?: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [item: GalleryItem]
}>()

const activeSection = ref<GallerySectionKey>(props.initialSection || 'photos')
const activePhotoId = ref<string | null>(props.initialPhotoId || props.photos[0]?.id || null)
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)

const sections = computed(() => {
  if (props.photoOnly) {
    return [
      {
        key: 'photos' as const,
        title: 'Фото',
        emptyLabel: 'Пока нет фотографий.',
        items: props.photos,
      },
    ]
  }

  return [
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
  ]
})

const activeIndex = computed(() => sections.value.findIndex(section => section.key === activeSection.value))
const activePhotoIndex = computed(() => props.photos.findIndex(item => item.id === activePhotoId.value))
const activePhoto = computed(() => props.photos.find(item => item.id === activePhotoId.value) ?? props.photos[0] ?? null)

watch(() => props.initialSection, (nextSection) => {
  if (nextSection) {
    activeSection.value = nextSection
  }
})

watch(() => props.initialPhotoId, (nextPhotoId) => {
  if (nextPhotoId) {
    activeSection.value = 'photos'
    activePhotoId.value = nextPhotoId
    return
  }

  activePhotoId.value = props.photos[0]?.id || null
})

watch(() => props.photos, (nextPhotos) => {
  if (!nextPhotos.length) {
    activePhotoId.value = null
    return
  }

  if (!nextPhotos.some(item => item.id === activePhotoId.value)) {
    activePhotoId.value = nextPhotos[0]?.id || null
  }
}, { deep: true })

function openSection(key: GallerySectionKey) {
  if (props.photoOnly) {
    activeSection.value = 'photos'
    return
  }

  activeSection.value = key
}

function openPhoto(photoId: string) {
  activeSection.value = 'photos'
  activePhotoId.value = photoId
}

function movePhoto(direction: 1 | -1) {
  if (!props.photos.length) {
    return
  }

  const nextIndex = Math.min(props.photos.length - 1, Math.max(0, activePhotoIndex.value + direction))
  activePhotoId.value = props.photos[nextIndex]?.id || activePhotoId.value
}

function moveSection(direction: 1 | -1) {
  if (props.photoOnly) {
    movePhoto(direction)
    return
  }

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
          <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85"/>
        </svg>
      </button>
    </div>

    <div v-if="!photoOnly" class="content-gallery__nav" aria-label="Разделы галереи">
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
          <div v-if="section.key === 'photos' && section.items.length" class="photo-strip-shell">
            <div v-if="activePhoto" class="photo-strip-stage">
              <button type="button" class="photo-strip-nav" :disabled="activePhotoIndex <= 0" @click="movePhoto(-1)">‹</button>
              <img :src="activePhoto.previewUrl || activePhoto.href" :alt="activePhoto.title" class="photo-strip-stage__image">
              <button type="button" class="photo-strip-nav" :disabled="activePhotoIndex >= props.photos.length - 1" @click="movePhoto(1)">›</button>
            </div>
            <div class="photo-strip-rail" aria-label="Лента фотографий">
              <button
                v-for="item in section.items"
                :key="item.id"
                type="button"
                class="photo-strip-thumb"
                :class="{ 'photo-strip-thumb--active': item.id === activePhotoId }"
                @click="openPhoto(item.id)"
              >
                <img
                  :src="item.previewUrl || item.href"
                  :alt="item.title"
                  class="photo-strip-thumb__image"
                >
              </button>
            </div>
          </div>
          <div v-else-if="section.key === 'documents' && section.items.length" class="file-strip-shell">
            <div class="file-strip-rail" aria-label="Лента файлов">
              <button
                v-for="item in section.items"
                :key="item.id"
                type="button"
                class="file-strip-card"
                @click="emit('select', item)"
              >
                <span class="file-strip-card__title">{{ item.title }}</span>
                <span class="file-strip-card__meta">{{ item.meta }}</span>
              </button>
            </div>
          </div>
          <div v-else-if="section.items.length" class="content-grid content-grid--gallery">
            <button
              v-for="item in section.items"
              :key="item.id"
              type="button"
              class="content-card"
              :class="{
                'content-card--photo': section.key === 'photos',
                'content-card--tile': section.key !== 'photos',
              }"
              @click="section.key === 'photos' ? openPhoto(item.id) : emit('select', item)"
            >
              <img
                v-if="section.key === 'photos' && item.previewUrl"
                :src="item.previewUrl"
                :alt="item.title"
                class="content-card__image"
              >
              <span v-if="section.key !== 'photos'" class="content-card__title">{{ item.title }}</span>
              <span v-if="section.key !== 'photos'" class="content-card__meta">{{ item.meta }}</span>
            </button>
          </div>
          <p v-else class="content-empty">{{ section.emptyLabel }}</p>
        </section>
      </div>
    </div>
  </section>
</template>