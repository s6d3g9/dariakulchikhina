<script setup lang="ts">
type GallerySectionKey = 'photos' | 'stickers' | 'documents' | 'links' | 'keys'

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
  stickers: GalleryItem[]
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

function resolveDefaultSection(): GallerySectionKey {
  if (props.initialSection) {
    return props.initialSection
  }

  if (props.photos.length) {
    return 'photos'
  }

  if (props.stickers.length) {
    return 'stickers'
  }

  if (props.documents.length) {
    return 'documents'
  }

  if (props.links.length) {
    return 'links'
  }

  if (props.security?.items.length) {
    return 'keys'
  }

  return 'photos'
}

const activeSection = ref<GallerySectionKey>(resolveDefaultSection())
const activePhotoId = ref<string | null>(props.initialPhotoId || props.photos[0]?.id || null)
const activeSectionModel = computed<GallerySectionKey>({
  get: () => activeSection.value,
  set: value => openSection(value),
})

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
      key: 'stickers' as const,
      title: 'Стикеры',
      emptyLabel: 'Пока нет стикеров.',
      items: props.stickers,
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

const gallerySearch = ref('')
</script>

<template>
  <section class="content-drawer content-drawer--dock content-gallery" aria-label="Shared content gallery">
    <!-- Close button (minimal, top-right) -->
    <div class="content-gallery__close-row">
      <div style="flex: 1;"></div>
      <VBtn type="button" icon="mdi-close" variant="text" size="small" aria-label="Закрыть галерею" @click="emit('close')" />
    </div>

    <!-- Content viewport (flex: 1, scrollable) -->
    <div class="content-gallery__viewport">
      <Transition name="gallery-panel" mode="out-in">
        <section v-if="activeSectionData" :key="activeSectionData.key" class="content-gallery__panel content-gallery__panel--active">
          <div v-if="activeSectionData.key === 'photos' && activeSectionData.items.length" class="content-grid content-grid--photos-gallery" aria-label="Лента фотографий">
              <VCard
                v-for="item in activeSectionData.items"
                :key="item.id"
                class="content-card content-card--photo content-card--photo-gallery"
                :class="{ 'content-card--photo-active': item.id === activePhotoId }"
                color="surface"
                variant="tonal"
                @click="openPhoto(item.id)"
              >
                <img
                  :src="item.previewUrl || item.href"
                  :alt="item.title"
                  class="content-card__image"
                >
                <VCardText class="content-card__body content-card__body--vuetify">
                  <span class="content-card__title">{{ item.title }}</span>
                  <span class="content-card__meta">{{ item.meta }}</span>
                </VCardText>
              </VCard>
          </div>
          <div v-else-if="activeSectionData.key === 'stickers' && activeSectionData.items.length" class="content-grid content-grid--photos-gallery" aria-label="Лента стикеров">
            <VCard
              v-for="item in activeSectionData.items"
              :key="item.id"
              class="content-card content-card--photo content-card--photo-gallery content-card--sticker-gallery"
              color="surface"
              variant="tonal"
            >
              <img
                :src="item.previewUrl || item.href"
                :alt="item.title"
                class="content-card__image content-card__image--sticker"
              >
              <VCardText class="content-card__body content-card__body--vuetify">
                <span class="content-card__title">{{ item.title }}</span>
                <span class="content-card__meta">{{ item.meta }}</span>
              </VCardText>
            </VCard>
          </div>
          <div v-else-if="activeSectionData.key === 'documents' && activeSectionData.items.length" class="file-strip-shell">
            <div class="file-strip-rail" aria-label="Лента файлов">
              <VCard
                v-for="item in activeSectionData.items"
                :key="item.id"
                class="file-strip-card"
                color="surface"
                variant="tonal"
                @click="emit('select', item)"
              >
                <VCardText class="file-strip-card__body">
                  <span class="file-strip-card__title">{{ item.title }}</span>
                  <span class="file-strip-card__meta">{{ item.meta }}</span>
                </VCardText>
              </VCard>
            </div>
          </div>
          <div v-else-if="activeSectionData.key === 'keys'" class="content-security">
            <VCard class="content-security__toolbar content-security__toolbar--vuetify" color="surface" variant="tonal">
              <VCardText class="content-security__toolbar-body">
                <div class="content-security__toolbar-copy">
                  <p v-if="props.security?.summary" class="content-security__summary">{{ props.security.summary }}</p>
                  <p v-if="formattedSecurityUpdatedAt" class="content-security__timestamp">Обновлено: {{ formattedSecurityUpdatedAt }}</p>
                </div>
                <VBtn
                  type="button"
                  class="content-security__refresh"
                  color="secondary"
                  variant="tonal"
                  :loading="props.security?.pending"
                  @click="emit('refresh-security')"
                >
                  {{ props.security?.pending ? 'Обновляем…' : 'Обновить' }}
                </VBtn>
              </VCardText>
            </VCard>
            <div v-if="activeSectionData.items.length" class="content-security__grid">
              <VCard
                v-for="item in activeSectionData.items"
                :key="item.id"
                class="content-security__card"
                :class="{ 'content-security__card--ok': item.tone === 'ok' }"
                color="surface"
                variant="tonal"
              >
                <VCardText class="content-security__card-body">
                  <div class="content-security__head">
                    <div class="content-security__heading">
                      <span class="content-security__icon" :class="{ 'content-security__icon--ok': item.tone === 'ok' }">
                        <MessengerIcon :name="item.icon" :size="18" />
                      </span>
                      <p class="content-security__title">{{ item.title }}</p>
                    </div>
                    <VChip class="content-security__state" size="x-small" variant="tonal">{{ item.state }}</VChip>
                  </div>
                  <p class="content-security__meta">{{ item.meta }}</p>
                </VCardText>
              </VCard>
            </div>
          </div>
          <div v-else-if="activeSectionData.items.length" class="content-grid content-grid--gallery">
            <VCard
              v-for="item in activeSectionData.items"
              :key="item.id"
              class="content-card"
              :class="{
                'content-card--photo': activeSectionData.key === 'photos',
                'content-card--tile': activeSectionData.key !== 'photos',
              }"
              color="surface"
              variant="tonal"
              @click="activeSectionData.key === 'photos' ? openPhoto(item.id) : emit('select', item)"
            >
              <img
                v-if="activeSectionData.key === 'photos' && item.previewUrl"
                :src="item.previewUrl"
                :alt="item.title"
                class="content-card__image"
              >
              <VCardText v-if="activeSectionData.key !== 'photos'" class="content-card__body content-card__body--vuetify">
                <span class="content-card__title">{{ item.title }}</span>
                <span class="content-card__meta">{{ item.meta }}</span>
              </VCardText>
            </VCard>
          </div>
          <VAlert v-else type="info" variant="tonal">{{ activeSectionData.emptyLabel }}</VAlert>
        </section>
      </Transition>
    </div>

    <!-- Section tabs (bottom, above search dock) -->
    <VTabs
      v-if="!photoOnly"
      v-model="activeSectionModel"
      class="content-gallery__nav content-gallery__nav--vuetify"
      align-tabs="start"
      color="primary"
      show-arrows
      density="compact"
      aria-label="Разделы галереи"
    >
      <VTab
        v-for="section in sections"
        :key="section.key"
        :value="section.key"
        class="content-gallery__tab content-gallery__tab--vuetify"
      >
        <span>{{ section.title }}</span>
        <VChip class="content-gallery__tab-count" size="x-small" variant="tonal">{{ section.items.length }}</VChip>
      </VTab>
    </VTabs>

    <!-- Search dock (bottom) -->
    <div class="search-dock">
      <input
        v-model="gallerySearch"
        type="text"
        class="composer-input"
        placeholder="Поиск в галерее"
        autocomplete="off"
      />
    </div>
  </section>
</template>