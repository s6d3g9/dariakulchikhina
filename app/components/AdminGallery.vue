<template>
  <div class="agal-wrap">

    <!-- ─── Header ─────────────────────────────────────── -->
    <div class="agal-header glass-surface glass-card">
      <div class="agal-header-left">
        <span class="agal-title">{{ title }}</span>
        <span v-if="gallery.items.value.length" class="agal-badge">{{ gallery.items.value.length }}</span>
        <span v-if="gallery.filtered.value.length !== gallery.items.value.length" class="agal-badge agal-badge--filter">
          {{ gallery.filtered.value.length }} из {{ gallery.items.value.length }}
        </span>
      </div>
      <div class="agal-header-right">
        <!-- Batch mode toggle -->
        <button
          class="agal-batch-btn"
          :class="{ 'agal-batch-btn--active': gallery.batchMode.value }"
          @click="gallery.toggleBatchMode()"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          {{ gallery.batchMode.value ? 'отмена' : 'выбрать' }}
        </button>
        <button class="agal-add-btn" aria-label="добавить" title="добавить" @click="openAdd">+</button>
      </div>
    </div>

    <!-- ─── Batch toolbar ──────────────────────────────── -->
    <Transition name="agal-slide">
      <div v-if="gallery.batchMode.value" class="agal-batch-bar glass-surface glass-card">
        <span class="agal-batch-count">{{ gallery.selectedCount.value }} выбрано</span>
        <button class="agal-batch-action" @click="gallery.selectAll()">выбрать все</button>
        <button class="agal-batch-action" @click="gallery.deselectAll()">снять</button>
        <button class="agal-batch-action" @click="batchFeature(true)">★ избранные</button>
        <button class="agal-batch-action" @click="batchFeature(false)">снять ★</button>
        <button class="agal-batch-action agal-batch-action--del" @click="batchDel">удалить</button>
      </div>
    </Transition>

    <!-- ─── Filter bar ─────────────────────────────────── -->
    <GalleryFilterBar
      :model-value="filterState"
      :tags="gallery.allTags.value"
      @update:model-value="onFilterUpdate"
    />

    <!-- ─── Empty state ────────────────────────────────── -->
    <div v-if="!gallery.loading.value && !gallery.filtered.value.length" class="agal-empty glass-card glass-surface">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
      <span v-if="gallery.items.value.length">ничего не найдено по текущим фильтрам</span>
      <span v-else>пока пусто — добавьте первый объект</span>
    </div>

    <!-- ─── Loading ────────────────────────────────────── -->
    <div v-else-if="gallery.loading.value" class="agal-loading">
      <div class="agal-spinner" />
    </div>

    <!-- ─── Masonry view ───────────────────────────────── -->
    <GalleryMasonry
      v-else-if="gallery.viewMode.value === 'masonry'"
      :items="gallery.filtered.value"
      :min-column-width="280"
      @click="onCardClick"
    >
      <template #default="{ item, index }">
        <div class="msn-card glass-card" :class="{ 'msn-card--selected': gallery.selectedIds.value.has(item.id) }" @click="onCardClick(index)">
          <div class="msn-img-wrap" :style="{ aspectRatio: getAspectRatio(item) }">
            <img v-if="item.image" :src="`/uploads/${item.image}`" :alt="item.title" class="msn-img" loading="lazy" decoding="async" @load="($event.target as HTMLImageElement)?.classList.add('msn-img--loaded')">
            <div v-else class="msn-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>

            <!-- Batch checkbox overlay -->
            <div v-if="gallery.batchMode.value" class="agal-checkbox-overlay" @click.stop="gallery.toggleSelect(item.id)">
              <div class="agal-round-check" :class="{ 'agal-round-check--on': gallery.selectedIds.value.has(item.id) }">
                <svg v-if="gallery.selectedIds.value.has(item.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            <!-- Overlay badges + admin actions -->
            <div class="msn-overlay msn-overlay--always">
              <button class="agal-icon-btn agal-icon-btn--star" :class="{ 'agal-icon-btn--starred': item.featured }" title="Избранное" @click.stop="gallery.toggleFeatured(item.id)">★</button>
            </div>
            <div class="msn-overlay">
              <span v-if="getAllImages(item).length > 1" class="msn-multi">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="15" height="15" rx="2"/><path d="M22 2H9a2 2 0 0 0-2 2"/><path d="M22 2v13a2 2 0 0 1-2 2"/></svg>
                {{ getAllImages(item).length }}
              </span>
            </div>
            <div class="agal-btns">
              <button class="agal-icon-btn" title="Редактировать" @click.stop="openEdit(item)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
              </button>
              <button class="agal-icon-btn agal-icon-btn--del" title="Удалить" @click.stop="del(item.id)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
          <div class="msn-info">
            <p class="msn-title">{{ item.title }}</p>
            <!-- Material quick info -->
            <div v-if="item.properties?.commercial?.manufacturer" class="msn-material-info">
              <span class="msn-manufacturer">{{ item.properties.commercial.manufacturer }}</span>
              <span v-if="item.properties.commercial.pricePerUnit" class="msn-price">{{ item.properties.commercial.pricePerUnit }}</span>
            </div>
            <div v-if="item.properties?.physical?.material" class="msn-material-type">
              {{ item.properties.physical.material }}
              <template v-if="item.properties.physical.dimensions"> · {{ item.properties.physical.dimensions }}</template>
            </div>
            <p v-if="item.description" class="msn-desc">{{ item.description }}</p>
            <div v-if="item.tags?.length" class="msn-tags">
              <span v-for="t in item.tags" :key="t" class="msn-tag">{{ t }}</span>
            </div>
          </div>
        </div>
      </template>
    </GalleryMasonry>

    <!-- ─── Grid view ──────────────────────────────────── -->
    <div v-else-if="gallery.viewMode.value === 'grid'" class="agal-grid">
      <div
        v-for="(item, index) in gallery.filtered.value"
        :key="item.id"
        class="agal-card glass-card"
        :class="{ 'agal-card--selected': gallery.selectedIds.value.has(item.id) }"
        draggable="true"
        @click="onCardClick(index)"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <div class="agal-img-zone">
          <img v-if="item.image" :src="`/uploads/${item.image}`" class="agal-img" :alt="item.title" loading="lazy">
          <div v-else class="agal-no-img">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>

          <!-- Batch checkbox -->
          <div v-if="gallery.batchMode.value" class="agal-checkbox-overlay" @click.stop="gallery.toggleSelect(item.id)">
            <div class="agal-round-check" :class="{ 'agal-round-check--on': gallery.selectedIds.value.has(item.id) }">
              <svg v-if="gallery.selectedIds.value.has(item.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>

          <!-- Drag handle indicator -->
          <div v-if="dragActive" class="agal-drop-zone" :class="{ 'agal-drop-zone--over': dragOverIndex === index }" />

          <div class="agal-btns">
            <button class="agal-icon-btn agal-icon-btn--star" :class="{ 'agal-icon-btn--starred': item.featured }" title="Избранное" @click.stop="gallery.toggleFeatured(item.id)">★</button>
            <button class="agal-icon-btn" title="Редактировать" @click.stop="openEdit(item)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            </button>
            <button class="agal-icon-btn agal-icon-btn--del" title="Удалить" @click.stop="del(item.id)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
        <div class="agal-info">
          <p class="agal-name">{{ item.title }}</p>
          <!-- Material quick info (grid) -->
          <div v-if="item.properties?.commercial?.manufacturer" class="agal-material-info">
            <span>{{ item.properties.commercial.manufacturer }}</span>
            <span v-if="item.properties.commercial.pricePerUnit" class="agal-price">{{ item.properties.commercial.pricePerUnit }}</span>
          </div>
          <p v-if="item.description" class="agal-desc">{{ item.description }}</p>
          <div v-if="item.tags?.length" class="agal-tags">
            <span v-for="t in item.tags" :key="t" class="agal-tag">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── List view ──────────────────────────────────── -->
    <div v-else class="agal-list">
      <div
        v-for="(item, index) in gallery.filtered.value"
        :key="item.id"
        class="agal-list-row glass-card"
        :class="{ 'agal-list-row--selected': gallery.selectedIds.value.has(item.id) }"
        draggable="true"
        @click="onCardClick(index)"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <!-- Batch checkbox -->
        <div v-if="gallery.batchMode.value" class="agal-list-check" @click.stop="gallery.toggleSelect(item.id)">
          <div class="agal-round-check agal-round-check--sm" :class="{ 'agal-round-check--on': gallery.selectedIds.value.has(item.id) }">
            <svg v-if="gallery.selectedIds.value.has(item.id)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>

        <div class="agal-list-thumb">
          <img v-if="item.image" :src="`/uploads/${item.image}`" :alt="item.title" loading="lazy">
          <div v-else class="agal-list-no-img">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        </div>
        <div class="agal-list-body">
          <div class="agal-list-top">
            <p class="agal-list-name">{{ item.title }}</p>
            <span v-if="item.featured" class="agal-list-star">★</span>
          </div>
          <p v-if="item.description" class="agal-list-desc">{{ item.description }}</p>
          <div v-if="item.tags?.length" class="agal-list-tags">
            <span v-for="t in item.tags" :key="t" class="agal-tag">{{ t }}</span>
          </div>
        </div>
        <div class="agal-list-actions">
          <button class="agal-icon-btn agal-icon-btn--star" :class="{ 'agal-icon-btn--starred': item.featured }" title="Избранное" @click.stop="gallery.toggleFeatured(item.id)">★</button>
          <button class="agal-icon-btn" title="Редактировать" @click.stop="openEdit(item)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
          </button>
          <button class="agal-icon-btn agal-icon-btn--del" title="Удалить" @click.stop="del(item.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Lightbox ───────────────────────────────────── -->
    <GalleryLightbox
      :open="gallery.lightboxOpen.value"
      :item="gallery.lightboxItem.value"
      :index="gallery.lightboxIndex.value"
      :total="gallery.filtered.value.length"
      @close="gallery.closeLightbox()"
      @prev="gallery.lightboxPrev()"
      @next="gallery.lightboxNext()"
    />

    <!-- ─── Add / Edit Modal ───────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showModal" class="agal-backdrop" @click.self="closeModal">
          <div class="agal-modal glass-surface glass-card">
            <div class="agal-modal-head">
              <span>{{ editingId ? 'редактировать' : 'добавить' }}</span>
              <button class="agal-close" @click="closeModal">×</button>
            </div>

            <form @submit.prevent="save" class="agal-form">
              <!-- Title -->
              <div class="agal-field">
                <label>Название *</label>
                <input v-model="form.title" class="glass-input agal-finput" required autofocus placeholder="введите название">
              </div>

              <!-- Main image -->
              <div class="agal-field">
                <label>Основное изображение</label>
                <div class="agal-upload-row">
                  <input v-model="form.image" class="glass-input agal-finput" placeholder="имя файла или загрузите →">
                  <label class="agal-upload-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    загрузить
                    <input type="file" accept="image/*" style="display:none" @change="uploadMainImage">
                  </label>
                </div>
                <div v-if="form.image" class="agal-preview">
                  <img :src="`/uploads/${form.image}`" :alt="form.title || ''">
                  <button type="button" class="agal-preview-del" @click="form.image = ''" title="Удалить">×</button>
                </div>
              </div>

              <!-- Additional images -->
              <div class="agal-field">
                <label>Дополнительные изображения</label>
                <div class="agal-multi-images">
                  <div v-for="(img, i) in formImages" :key="i" class="agal-multi-thumb">
                    <img :src="`/uploads/${img}`" :alt="`доп. ${i + 1}`">
                    <button type="button" class="agal-multi-del" @click="removeExtraImage(i)">×</button>
                  </div>
                  <label class="agal-multi-add">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <input type="file" accept="image/*" multiple style="display:none" @change="uploadExtraImages">
                  </label>
                </div>
              </div>

              <!-- Tags -->
              <div class="agal-field">
                <label>Теги <span style="opacity:.5;font-weight:400">через запятую</span></label>
                <input v-model="tagsStr" class="glass-input agal-finput" placeholder="минимализм, дерево, нейтральный...">
              </div>

              <!-- Description -->
              <div class="agal-field">
                <label>Описание</label>
                <textarea v-model="form.description" class="glass-input agal-finput agal-fta" rows="3" placeholder="краткое описание..."></textarea>
              </div>

              <!-- Featured toggle -->
              <div class="agal-field agal-field--row">
                <label class="agal-toggle-label">
                  <input type="checkbox" v-model="form.featured" class="agal-checkbox">
                  <span>Избранное ★</span>
                </label>
              </div>

              <!-- Material Properties Editor -->
              <MaterialPropertyEditor
                v-model="formProperties"
              />

              <p v-if="formError" class="agal-error">{{ formError }}</p>

              <div class="agal-modal-foot">
                <button type="button" class="agal-cancel-btn" @click="closeModal">отмена</button>
                <button type="submit" class="agal-save-btn" :disabled="saving">
                  {{ saving ? 'сохранение...' : 'сохранить' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import type { GalleryItem, GalleryFilterState } from '~~/shared/types/gallery'
import type { GalleryFilterStateExtended } from './GalleryFilterBar.vue'
import type { MaterialProperties } from '~~/shared/types/material'

const props = defineProps<{ category: string; title: string }>()

// ── Composable (единый источник truth) ────────────────────
const categoryRef = computed(() => props.category)
const gallery = useGallery(categoryRef)
await gallery.load()

// ── Filter bar → composable bridge ───────────────────────
const filterState = computed<GalleryFilterStateExtended>(() => ({
  search: gallery.search.value,
  activeTag: gallery.activeTag.value,
  showFeatured: gallery.showFeaturedOnly.value,
  viewMode: gallery.viewMode.value,
  sortField: gallery.sortField.value,
  sortDir: gallery.sortDir.value,
}))

function onFilterUpdate(f: GalleryFilterStateExtended) {
  gallery.search.value = f.search
  gallery.activeTag.value = f.activeTag
  gallery.showFeaturedOnly.value = f.showFeatured
  gallery.viewMode.value = f.viewMode
  if (f.sortField) gallery.sortField.value = f.sortField as any
  if (f.sortDir) gallery.sortDir.value = f.sortDir as any
}

// ── Lightbox ─────────────────────────────────────────────
function onCardClick(index: number) {
  if (gallery.batchMode.value) {
    const item = gallery.filtered.value[index]
    if (item) gallery.toggleSelect(item.id)
    return
  }
  gallery.openLightbox(index)
}

// ── Batch operations ─────────────────────────────────────
async function batchFeature(featured: boolean) {
  await gallery.batchToggleFeatured(featured)
}

async function batchDel() {
  if (!confirm(`Удалить ${gallery.selectedCount.value} элементов?`)) return
  await gallery.batchDelete()
}

// ── Drag and drop reorder ────────────────────────────────
const dragActive = ref(false)
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(e: DragEvent, index: number) {
  dragActive.value = true
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(_e: DragEvent, index: number) {
  dragOverIndex.value = index
}

async function onDrop(_e: DragEvent, targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const items = [...gallery.filtered.value]
  const [moved] = items.splice(dragIndex.value, 1)
  if (!moved) return
  items.splice(targetIndex, 0, moved)

  // Update sort orders
  const reorderPayload = items.map((item: GalleryItem, i: number) => ({
    id: item.id,
    sortOrder: i,
  }))

  // Optimistic local reorder
  items.forEach((item: GalleryItem, i: number) => {
    item.sortOrder = i
  })
  gallery.items.value = [...gallery.items.value]

  await gallery.reorder(reorderPayload)
  onDragEnd()
}

function onDragEnd() {
  dragActive.value = false
  dragIndex.value = null
  dragOverIndex.value = null
}

// ── Helpers ──────────────────────────────────────────────
function getAllImages(item: GalleryItem): string[] {
  const imgs: string[] = []
  if (item.image) imgs.push(item.image)
  if (item.images?.length) {
    item.images.forEach((img: string) => { if (!imgs.includes(img)) imgs.push(img) })
  }
  return imgs
}

function getAspectRatio(item: GalleryItem): string {
  if (item.width && item.height) {
    const ratio = item.width / item.height
    if (ratio > 2.2) return '2.2 / 1'
    if (ratio < 0.5) return '1 / 2'
    return `${item.width} / ${item.height}`
  }
  const patterns = ['4/3', '3/4', '1/1', '16/9', '3/2']
  return patterns[item.id % patterns.length] ?? '4/3'
}

// ── Modal form state ─────────────────────────────────────
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)

const form = reactive({
  title: '',
  image: '',
  description: '',
  tags: [] as string[],
  featured: false,
  width: null as number | null,
  height: null as number | null,
})
const formImages = ref<string[]>([])
const formProperties = ref<MaterialProperties>({})

const tagsStr = computed({
  get: () => form.tags.join(', '),
  set: (v: string) => { form.tags = v.split(',').map(s => s.trim()).filter(Boolean) },
})

function openAdd() {
  editingId.value = null
  Object.assign(form, { title: '', image: '', description: '', tags: [], featured: false, width: null, height: null })
  formImages.value = []
  formProperties.value = {}
  formError.value = ''
  showModal.value = true
}

function openEdit(item: GalleryItem) {
  editingId.value = item.id
  Object.assign(form, {
    title: item.title,
    image: item.image || '',
    description: item.description || '',
    tags: [...(item.tags || [])],
    featured: item.featured ?? false,
    width: item.width ?? null,
    height: item.height ?? null,
  })
  formImages.value = [...(item.images || [])]
  formProperties.value = item.properties ? JSON.parse(JSON.stringify(item.properties)) : {}
  formError.value = ''
  showModal.value = true
}

function closeModal() { showModal.value = false }

// ── Image upload helpers ─────────────────────────────────
async function doUpload(file: File): Promise<{ filename: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
}

/** Загрузка основного изображения + автодетект размеров */
async function uploadMainImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await doUpload(file)
    form.image = res.filename
    // Detect image dimensions
    const img = new Image()
    img.src = `/uploads/${res.filename}`
    img.onload = () => {
      form.width = img.naturalWidth
      form.height = img.naturalHeight
    }
  } catch {
    formError.value = 'ошибка загрузки фото'
  }
}

/** Загрузка дополнительных изображений (multiple) */
async function uploadExtraImages(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  for (const file of Array.from(files)) {
    try {
      const res = await doUpload(file)
      formImages.value.push(res.filename)
    } catch {
      formError.value = `ошибка загрузки ${file.name}`
    }
  }
  // Reset input so same files can be selected again
  ;(e.target as HTMLInputElement).value = ''
}

function removeExtraImage(index: number) {
  formImages.value.splice(index, 1)
}

// ── Save ─────────────────────────────────────────────────
async function save() {
  if (!form.title) return
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      title: form.title,
      image: form.image || null,
      images: formImages.value,
      tags: form.tags,
      description: form.description || null,
      featured: form.featured,
      width: form.width,
      height: form.height,
      category: props.category,
      properties: Object.keys(formProperties.value).length ? formProperties.value : null,
    }
    if (editingId.value) {
      await gallery.update(editingId.value, payload)
    } else {
      await gallery.create(payload)
    }
    closeModal()
  } catch (e: any) {
    formError.value = e?.data?.message || 'ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('Удалить элемент?')) return
  await gallery.remove(id)
}
</script>

<style scoped>
/* ─── Wrap ─────────────────────────────────────────────── */
.agal-wrap { padding-bottom: 64px; }

/* ─── Header ───────────────────────────────────────────── */
.agal-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  padding: 14px 20px; margin-bottom: 12px;
  border-radius: 14px;
}
.agal-header-left { display: flex; align-items: center; gap: 8px; }
.agal-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.agal-title {
  font-size: .72rem; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--glass-text, #1a1a1a); opacity: .55;
}
.agal-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px;
  border-radius: 999px; font-size: .62rem;
  background: rgba(0,0,0,.09); color: var(--glass-text, #1a1a1a);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.agal-badge--filter { background: rgba(59,130,246,.15); color: #2563eb; }
html.dark .agal-badge { background: rgba(255,255,255,.12); color: #e5e5e5; }
html.dark .agal-badge--filter { background: rgba(96,165,250,.18); color: #93bbfc; }

.agal-add-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  padding: 0;
  font-size: 1rem; line-height: 1;
  font-family: inherit; cursor: pointer;
  border-radius: 8px; white-space: nowrap;
  border: none;
  background: rgba(0,0,0,.78); color: #fff;
  transition: opacity .15s;
}
.agal-add-btn:hover { opacity: .82; }
html.dark .agal-add-btn { background: rgba(255,255,255,.9); color: #111; }

/* ─── Batch mode button ────────────────────────────────── */
.agal-batch-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 12px; border-radius: 8px;
  border: none; cursor: pointer;
  font-family: inherit; font-size: .72rem;
  background: rgba(0,0,0,.06); color: var(--glass-text, #1a1a1a);
  transition: background .13s, opacity .13s;
}
.agal-batch-btn:hover { background: rgba(0,0,0,.1); }
.agal-batch-btn--active { background: rgba(59,130,246,.12); color: #2563eb; }
html.dark .agal-batch-btn { background: rgba(255,255,255,.08); }
html.dark .agal-batch-btn--active { background: rgba(96,165,250,.18); color: #93bbfc; }

/* ─── Batch toolbar ────────────────────────────────────── */
.agal-batch-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px; margin-bottom: 8px;
  border-radius: 12px;
}
.agal-batch-count {
  font-size: .72rem; font-weight: 600;
  color: var(--glass-text, #1a1a1a); opacity: .7;
  margin-right: 4px;
}
.agal-batch-action {
  padding: 5px 10px; border-radius: 6px;
  border: none; cursor: pointer;
  font-family: inherit; font-size: .7rem;
  background: rgba(0,0,0,.06); color: var(--glass-text, #1a1a1a);
  transition: background .13s;
}
.agal-batch-action:hover { background: rgba(0,0,0,.12); }
.agal-batch-action--del { background: rgba(220,38,38,.1); color: #dc2626; }
.agal-batch-action--del:hover { background: rgba(220,38,38,.2); }
html.dark .agal-batch-action { background: rgba(255,255,255,.08); }
html.dark .agal-batch-action--del { background: rgba(220,38,38,.15); }

.agal-slide-enter-active,
.agal-slide-leave-active { transition: opacity .2s ease, transform .2s ease, max-height .2s ease; }
.agal-slide-enter-from,
.agal-slide-leave-to { opacity: 0; transform: translateY(-8px); max-height: 0; }

/* ─── Round checkbox (batch select) ────────────────────── */
.agal-checkbox-overlay {
  position: absolute; top: 8px; left: 8px; z-index: 5;
  cursor: pointer;
}
.agal-round-check {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.6);
  background: rgba(0,0,0,.2);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, border-color .15s, transform .15s;
}
.agal-round-check--sm { width: 20px; height: 20px; }
.agal-round-check--on {
  background: #3b82f6; border-color: #3b82f6; color: #fff;
  transform: scale(1.05);
}
.agal-list-check { flex-shrink: 0; cursor: pointer; }

/* ─── Selection highlight ──────────────────────────────── */
.agal-card--selected,
.agal-list-row--selected,
.msn-card--selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ─── Drag and drop ────────────────────────────────────── */
.agal-drop-zone {
  position: absolute; inset: 0;
  border: 2px dashed transparent;
  border-radius: 12px;
  pointer-events: none;
  transition: border-color .15s;
}
.agal-drop-zone--over {
  border-color: #3b82f6;
  background: rgba(59,130,246,.08);
}

/* ─── Loading ──────────────────────────────────────────── */
.agal-loading {
  display: flex; justify-content: center; padding: 80px 0;
}
.agal-spinner {
  width: 32px; height: 32px;
  border: 2px solid rgba(0,0,0,.1);
  border-top-color: rgba(0,0,0,.5);
  border-radius: 50%;
  animation: agalSpin .7s linear infinite;
}
html.dark .agal-spinner { border-color: rgba(255,255,255,.1); border-top-color: rgba(255,255,255,.5); }
@keyframes agalSpin { to { transform: rotate(360deg); } }

/* ─── Empty ─────────────────────────────────────────────── */
.agal-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 80px 24px;
  text-align: center; color: var(--glass-text, #1a1a1a); opacity: .3;
  font-size: .82rem; letter-spacing: .4px;
  border-radius: 14px;
}

/* ─── Grid view ─────────────────────────────────────────── */
.agal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.agal-card {
  background: var(--glass-bg, rgba(255,255,255,.48));
  border: none;
  box-shadow: var(--glass-shadow, 0 10px 28px rgba(18,18,18,.08));
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  border-radius: 14px;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform .18s ease, box-shadow .18s ease;
  cursor: pointer;
}
.agal-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(18,18,18,.13);
}
html.dark .agal-card {
  background: linear-gradient(160deg, rgba(22,23,28,.92) 0%, rgba(14,15,18,.96) 100%);
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
}

.agal-img-zone {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(0,0,0,.05);
  flex-shrink: 0;
}
html.dark .agal-img-zone { background: rgba(255,255,255,.04); }

.agal-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform .35s ease;
}
.agal-card:hover .agal-img { transform: scale(1.04); }

.agal-no-img {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--glass-text, #1a1a1a); opacity: .18;
}

/* ─── Card action buttons ──────────────────────────────── */
.agal-btns {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 5px;
  opacity: 0; transform: translateY(-4px);
  transition: opacity .16s ease, transform .16s ease;
  z-index: 2;
}
.agal-card:hover .agal-btns,
.msn-card:hover .agal-btns {
  opacity: 1; transform: translateY(0);
}

.agal-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer;
  background: rgba(255,255,255,.82);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0,0,0,.18);
  transition: background .13s, transform .13s, color .13s;
}
.agal-icon-btn:hover { background: #fff; transform: scale(1.08); }
.agal-icon-btn--del { background: rgba(220,38,38,.8); color: #fff; }
.agal-icon-btn--del:hover { background: rgba(220,38,38,.97); }

.agal-icon-btn--star {
  font-size: .72rem; color: rgba(0,0,0,.25);
  background: rgba(255,255,255,.7);
}
.agal-icon-btn--starred {
  color: #fbbf24 !important;
  background: rgba(251,191,36,.15);
}
.agal-icon-btn--star:hover { color: #f59e0b; }

/* ─── Info zone ────────────────────────────────────────── */
.agal-info {
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 6px;
  min-height: 0;
}
.agal-name {
  font-size: .88rem; font-weight: 500; line-height: 1.35;
  color: var(--glass-text, #1a1a1a);
  word-break: break-word; margin: 0;
}
.agal-desc {
  font-size: .75rem; color: var(--glass-text, #1a1a1a); opacity: .5;
  line-height: 1.45; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.agal-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.agal-tag {
  font-size: .65rem; padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0,0,0,.07); color: var(--glass-text, #1a1a1a); opacity: .7;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  letter-spacing: .1px; white-space: nowrap;
}
html.dark .agal-tag { background: rgba(255,255,255,.1); opacity: .8; }

/* ─── List view ─────────────────────────────────────────── */
.agal-list {
  display: flex; flex-direction: column; gap: 8px;
}
.agal-list-row {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: 12px;
  cursor: pointer;
  transition: transform .13s, box-shadow .13s;
}
.agal-list-row:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
}
.agal-list-thumb {
  width: 64px; height: 48px; flex-shrink: 0;
  border-radius: 8px; overflow: hidden;
  background: rgba(0,0,0,.04);
}
.agal-list-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.agal-list-no-img {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--glass-text, #1a1a1a); opacity: .15;
}
.agal-list-body { flex: 1; min-width: 0; }
.agal-list-top { display: flex; align-items: center; gap: 6px; }
.agal-list-name {
  font-size: .86rem; font-weight: 500; margin: 0;
  color: var(--glass-text, #1a1a1a);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agal-list-star { color: #fbbf24; font-size: .74rem; }
.agal-list-desc {
  font-size: .72rem; opacity: .45; margin: 2px 0 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agal-list-tags { display: flex; gap: 3px; margin-top: 4px; }
.agal-list-actions {
  display: flex; gap: 4px; flex-shrink: 0;
}

/* ─── Masonry card overrides (inside slot) ──────────────── */
.msn-card {
  background: var(--glass-bg, rgba(255,255,255,.48));
  border: none;
  box-shadow: var(--glass-shadow, 0 10px 28px rgba(18,18,18,.08));
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  border-radius: 14px;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
  cursor: pointer;
}
.msn-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px rgba(18,18,18,.14);
}
html.dark .msn-card {
  background: linear-gradient(160deg, rgba(22,23,28,.92) 0%, rgba(14,15,18,.96) 100%);
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
}

.msn-img-wrap {
  position: relative; overflow: hidden;
  background: rgba(0,0,0,.04);
}
html.dark .msn-img-wrap { background: rgba(255,255,255,.04); }

.msn-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  opacity: 0;
  transition: opacity .4s ease, transform .35s ease;
}
.msn-img--loaded { opacity: 1; }
.msn-card:hover .msn-img { transform: scale(1.03); }

.msn-placeholder {
  width: 100%; aspect-ratio: 4/3;
  display: flex; align-items: center; justify-content: center;
  color: var(--glass-text, #1a1a1a); opacity: .16;
}

.msn-overlay {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 5px;
  opacity: 0; transform: translateY(-4px);
  transition: opacity .18s ease, transform .18s ease;
}
.msn-card:hover .msn-overlay { opacity: 1; transform: translateY(0); }

.msn-overlay--always {
  top: 8px; left: 8px; right: auto;
  opacity: 1; transform: none;
}

.msn-multi {
  display: flex; align-items: center; gap: 3px;
  padding: 4px 8px; border-radius: 8px;
  background: rgba(255,255,255,.82);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: #1a1a1a; font-size: .64rem; font-weight: 600;
}

.msn-info {
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 5px;
}
.msn-title {
  font-size: .86rem; font-weight: 500; line-height: 1.35;
  color: var(--glass-text, #1a1a1a);
  word-break: break-word; margin: 0;
}
.msn-desc {
  font-size: .74rem; color: var(--glass-text, #1a1a1a); opacity: .48;
  line-height: 1.45; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.msn-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.msn-tag {
  font-size: .62rem; padding: 2px 7px; border-radius: 5px;
  background: rgba(0,0,0,.06); color: var(--glass-text, #1a1a1a); opacity: .65;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  letter-spacing: .1px; white-space: nowrap;
}
html.dark .msn-tag { background: rgba(255,255,255,.09); opacity: .75; }

/* ─── Modal ─────────────────────────────────────────────── */
.agal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.38);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.agal-modal {
  width: 100%; max-width: 560px; max-height: 90vh;
  overflow-y: auto; border-radius: 18px;
  padding: 24px 26px;
}
.agal-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px;
}
.agal-modal-head span {
  font-size: .72rem; letter-spacing: 1.2px;
  text-transform: uppercase; opacity: .5;
}
.agal-close {
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: rgba(0,0,0,.08); color: var(--glass-text, #1a1a1a);
  cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center;
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.agal-close:hover { background: rgba(0,0,0,.15); }
html.dark .agal-close { background: rgba(255,255,255,.1); color: #eee; }

/* ─── Form ──────────────────────────────────────────────── */
.agal-form { display: flex; flex-direction: column; gap: 16px; }
.agal-field { display: flex; flex-direction: column; gap: 6px; }
.agal-field--row { flex-direction: row; align-items: center; }
.agal-field label {
  font-size: .72rem; letter-spacing: .4px; text-transform: uppercase;
  opacity: .45; font-weight: 500;
}
.agal-finput {
  padding: 9px 12px; border-radius: 9px;
  font-size: .88rem; font-family: inherit; width: 100%; box-sizing: border-box;
}
.agal-fta { resize: vertical; min-height: 72px; }

.agal-upload-row { display: flex; gap: 8px; align-items: center; }
.agal-upload-row .agal-finput { flex: 1; }
.agal-upload-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 9px 14px; border-radius: 9px; cursor: pointer; white-space: nowrap;
  font-size: .78rem; font-family: inherit;
  border: none;
  background: var(--glass-bg, rgba(255,255,255,.48));
  color: var(--glass-text, #1a1a1a);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  transition: background .13s;
}
.agal-upload-btn:hover { background: rgba(255,255,255,.72); }
html.dark .agal-upload-btn { color: #e5e5e5; }

.agal-preview {
  margin-top: 4px; border-radius: 10px; overflow: hidden;
  max-height: 160px; position: relative;
}
.agal-preview img {
  width: 100%; max-height: 160px; object-fit: cover; display: block;
}
.agal-preview-del {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px; border-radius: 6px;
  border: none; cursor: pointer;
  background: rgba(220,38,38,.85); color: #fff;
  font-size: .8rem; display: flex; align-items: center; justify-content: center;
  transition: background .13s;
}
.agal-preview-del:hover { background: rgba(220,38,38,1); }

/* ─── Multi-image upload grid ──────────────────────────── */
.agal-multi-images {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.agal-multi-thumb {
  position: relative; width: 72px; height: 54px;
  border-radius: 8px; overflow: hidden;
  background: rgba(0,0,0,.04);
}
.agal-multi-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.agal-multi-del {
  position: absolute; top: 3px; right: 3px;
  width: 18px; height: 18px; border-radius: 5px;
  border: none; cursor: pointer;
  background: rgba(220,38,38,.85); color: #fff;
  font-size: .65rem; display: flex; align-items: center; justify-content: center;
}
.agal-multi-add {
  width: 72px; height: 54px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; cursor: pointer;
  border: 1.5px dashed rgba(0,0,0,.15);
  background: transparent;
  color: var(--glass-text, #1a1a1a); opacity: .3;
  transition: opacity .13s, border-color .13s;
}
.agal-multi-add:hover { opacity: .6; border-color: rgba(0,0,0,.3); }
html.dark .agal-multi-add { border-color: rgba(255,255,255,.15); }

/* ─── Toggle / Checkbox ────────────────────────────────── */
.agal-toggle-label {
  display: flex; align-items: center; gap: 8px;
  font-size: .82rem !important; text-transform: none !important;
  opacity: .75 !important; cursor: pointer;
}
.agal-checkbox {
  width: 16px; height: 16px; accent-color: #fbbf24;
  cursor: pointer;
}

.agal-error { font-size: .78rem; color: #dc2626; margin: 0; }

.agal-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 4px;
}
.agal-cancel-btn {
  padding: 9px 18px; border-radius: 9px; cursor: pointer;
  font-family: inherit; font-size: .82rem;
  border: none;
  background: transparent; color: var(--glass-text, #1a1a1a);
  transition: background .13s;
}
.agal-cancel-btn:hover { background: rgba(0,0,0,.06); }
.agal-save-btn {
  padding: 9px 22px; border-radius: 9px; cursor: pointer;
  font-family: inherit; font-size: .82rem; letter-spacing: .2px;
  border: none;
  background: rgba(0,0,0,.82); color: #fff;
  transition: opacity .15s;
}
.agal-save-btn:hover:not(:disabled) { opacity: .8; }
.agal-save-btn:disabled { opacity: .45; cursor: default; }
html.dark .agal-save-btn { background: rgba(255,255,255,.88); color: #111; }

/* ─── Modal transition ─────────────────────────────────── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity .2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ─── Mobile ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .agal-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
  .agal-list-row { gap: 10px; padding: 8px 10px; }
  .agal-list-thumb { width: 48px; height: 36px; }
  .agal-modal { padding: 18px 16px; }
}

/* ─── Material info (masonry cards) ────────────────────── */
.msn-material-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .74rem;
  margin-top: 2px;
}
.msn-manufacturer {
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 65%, transparent);
  font-weight: 500;
}
.msn-price {
  font-weight: 600;
  color: var(--glass-text, #e0e0e0);
  margin-left: auto;
}
.msn-material-type {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 50%, transparent);
  margin-top: 1px;
}

/* ─── Material info (grid cards) ───────────────────────── */
.agal-material-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 60%, transparent);
  margin-top: 2px;
}
.agal-price {
  font-weight: 600;
  color: var(--glass-text, #e0e0e0);
  margin-left: auto;
}
</style>
