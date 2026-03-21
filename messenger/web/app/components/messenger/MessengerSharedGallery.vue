<script setup lang="ts">
type GallerySectionKey = 'photos' | 'documents' | 'links' | 'keys'

interface GalleryItem {
  id: string
  title: string
  meta: string
  href: string
  previewUrl?: string
}

interface SecurityItem {
  id: string
  title: string
  meta: string
  state: string
  icon: 'shield' | 'device' | 'peer' | 'key' | 'clock'
  tone?: 'ok' | 'neutral'
}

const props = defineProps<{
  title: string
  hint: string
  photos: GalleryItem[]
  documents: GalleryItem[]
  links: GalleryItem[]
  security?: {
    summary: string
    items: SecurityItem[]
    pending?: boolean
    updatedAt?: string | null
  }
  initialSection?: GallerySectionKey
  initialPhotoId?: string | null
  photoOnly?: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [item: GalleryItem]
  'refresh-security': []
}>()

const formattedSecurityUpdatedAt = computed(() => {
  if (!props.security?.updatedAt) {
    return ''
  }

  return new Date(props.security.updatedAt).toLocaleString('ru-RU')
})

const activeSection = ref<GallerySectionKey>(props.initialSection || 'photos')
const activePhotoId = ref<string | null>(props.initialPhotoId || props.photos[0]?.id || null)

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
    {
      key: 'keys' as const,
      title: 'Ключи',
      emptyLabel: 'Пока нет данных о ключах.',
      items: props.security?.items || [],
    },
  ]
})

const activeSectionData = computed(() => sections.value.find(section => section.key === activeSection.value) ?? sections.value[0] ?? null)
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

watch(sections, (nextSections) => {
  if (!nextSections.some(section => section.key === activeSection.value)) {
    activeSection.value = nextSections[0]?.key || 'photos'
  }
}, { deep: true, immediate: true })

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

    <div v-if="!photoOnly" class="content-gallery__nav messenger-menu-grid" aria-label="Разделы галереи">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="content-gallery__tab messenger-menu-grid__button"
        :class="{ 'content-gallery__tab--active': activeSection === section.key }"
        @click="openSection(section.key)"
      >
        <span>{{ section.title }}</span>
        <span class="content-gallery__tab-count">{{ section.items.length }}</span>
      </button>
    </div>

    <div class="content-gallery__viewport">
      <Transition name="gallery-panel" mode="out-in">
        <section v-if="activeSectionData" :key="activeSectionData.key" class="content-gallery__panel content-gallery__panel--active">
          <div v-if="activeSectionData.key === 'photos' && activeSectionData.items.length" class="photo-strip-shell">
            <div v-if="activePhoto" class="photo-strip-stage">
              <button type="button" class="photo-strip-nav" :disabled="activePhotoIndex <= 0" @click="movePhoto(-1)">‹</button>
              <img :src="activePhoto.previewUrl || activePhoto.href" :alt="activePhoto.title" class="photo-strip-stage__image">
              <button type="button" class="photo-strip-nav" :disabled="activePhotoIndex >= props.photos.length - 1" @click="movePhoto(1)">›</button>
            </div>
            <div class="photo-strip-rail" aria-label="Лента фотографий">
              <button
                v-for="item in activeSectionData.items"
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
          <div v-else-if="activeSectionData.key === 'documents' && activeSectionData.items.length" class="file-strip-shell">
            <div class="file-strip-rail" aria-label="Лента файлов">
              <button
                v-for="item in activeSectionData.items"
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
          <div v-else-if="activeSectionData.key === 'keys'" class="content-security">
            <div class="content-security__toolbar">
              <div class="content-security__toolbar-copy">
                <p v-if="props.security?.summary" class="content-security__summary">{{ props.security.summary }}</p>
                <p v-if="formattedSecurityUpdatedAt" class="content-security__timestamp">Обновлено: {{ formattedSecurityUpdatedAt }}</p>
              </div>
              <button
                type="button"
                class="content-security__refresh"
                :disabled="props.security?.pending"
                @click="emit('refresh-security')"
              >
                <MessengerIcon name="refresh" :size="15" />
                <span>{{ props.security?.pending ? 'Обновляем…' : 'Обновить' }}</span>
              </button>
            </div>
            <div v-if="activeSectionData.items.length" class="content-security__grid">
              <article
                v-for="item in activeSectionData.items"
                :key="item.id"
                class="content-security__card"
                :class="{ 'content-security__card--ok': item.tone === 'ok' }"
              >
                <div class="content-security__head">
                  <div class="content-security__heading">
                    <span class="content-security__icon" :class="{ 'content-security__icon--ok': item.tone === 'ok' }">
                      <MessengerIcon :name="item.icon" :size="18" />
                    </span>
                    <p class="content-security__title">{{ item.title }}</p>
                  </div>
                  <span class="content-security__state">{{ item.state }}</span>
                </div>
                <p class="content-security__meta">{{ item.meta }}</p>
              </article>
            </div>
          </div>
          <div v-else-if="activeSectionData.items.length" class="content-grid content-grid--gallery">
            <button
              v-for="item in activeSectionData.items"
              :key="item.id"
              type="button"
              class="content-card"
              :class="{
                'content-card--photo': activeSectionData.key === 'photos',
                'content-card--tile': activeSectionData.key !== 'photos',
              }"
              @click="activeSectionData.key === 'photos' ? openPhoto(item.id) : emit('select', item)"
            >
              <img
                v-if="activeSectionData.key === 'photos' && item.previewUrl"
                :src="item.previewUrl"
                :alt="item.title"
                class="content-card__image"
              >
              <span v-if="activeSectionData.key !== 'photos'" class="content-card__title">{{ item.title }}</span>
              <span v-if="activeSectionData.key !== 'photos'" class="content-card__meta">{{ item.meta }}</span>
            </button>
          </div>
          <p v-else class="content-empty">{{ activeSectionData.emptyLabel }}</p>
        </section>
      </Transition>
    </div>
  </section>
</template>