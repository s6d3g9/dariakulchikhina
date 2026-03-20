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
    {
      key: 'keys' as const,
      title: 'Ключи',
      emptyLabel: 'Пока нет данных о ключах.',
      items: props.security?.items || [],
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
          <div v-else-if="section.key === 'keys'" class="content-security">
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
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.25 8.5A7.25 7.25 0 0 0 6.6 6.12M4.75 8.25V5.5h2.75M4.75 15.5A7.25 7.25 0 0 0 17.4 17.88M19.25 15.75v2.75H16.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
                </svg>
                <span>{{ props.security?.pending ? 'Обновляем…' : 'Обновить' }}</span>
              </button>
            </div>
            <div v-if="section.items.length" class="content-security__grid">
              <article
                v-for="item in section.items"
                :key="item.id"
                class="content-security__card"
                :class="{ 'content-security__card--ok': item.tone === 'ok' }"
              >
                <div class="content-security__head">
                  <div class="content-security__heading">
                    <span class="content-security__icon" :class="{ 'content-security__icon--ok': item.tone === 'ok' }">
                      <svg v-if="item.icon === 'shield'" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3.75c2.18 1.53 4.7 2.37 7.35 2.45v5.05c0 4.18-2.47 7.94-6.3 9.58l-1.05.45-1.05-.45c-3.83-1.64-6.3-5.4-6.3-9.58V6.2c2.65-.08 5.17-.92 7.35-2.45Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                      </svg>
                      <svg v-else-if="item.icon === 'device'" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="7.25" y="3.75" width="9.5" height="16.5" rx="2.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                        <path d="M10 6.75h4M11.1 17.75h1.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                      </svg>
                      <svg v-else-if="item.icon === 'peer'" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8.25 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.75 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.75 18a4.5 4.5 0 0 1 7 0M12.75 18a3.75 3.75 0 0 1 6 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                      </svg>
                      <svg v-else-if="item.icon === 'key'" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14.5 8.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM11 11.5l7.25 7.25M15.5 15.5h2.25v2.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 6.25v5.75l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"/>
                      </svg>
                    </span>
                    <p class="content-security__title">{{ item.title }}</p>
                  </div>
                  <span class="content-security__state">{{ item.state }}</span>
                </div>
                <p class="content-security__meta">{{ item.meta }}</p>
              </article>
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