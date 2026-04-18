<template>
  <div
    ref="viewportRef"
    class="agal-wrap"
    :class="{ 'cv-viewport--paged': isPaged }"
    :tabindex="isPaged ? 0 : undefined"
    @wheel="handleWheel"
    @keydown="handleKeydown"
    @scroll="syncPager"
  >
    <div class="cv-wipe-inner">
    <!-- ─── Header ─────────────────────────────────────── -->
    <GlassSurface  class="agal-header glass-surface ">
      <div class="agal-header-left">
        <CabSectionHeader
          :title="title"
          eyebrow="gallery"
          note="Реестр объектов и материалов сохраняет текущие фильтры и режим просмотра в общей правой зоне."
        />
        <div class="agal-header-stats">
          <span v-if="gallery.items.value.length" class="agal-badge">{{ gallery.items.value.length }}</span>
          <span v-if="gallery.filtered.value.length !== gallery.items.value.length" class="agal-badge agal-badge--filter">
            {{ gallery.filtered.value.length }} из {{ gallery.items.value.length }}
          </span>
        </div>
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
    </GlassSurface>

    <!-- ─── Batch toolbar ──────────────────────────────── -->
    <Transition name="agal-slide">
      <GlassSurface  v-if="gallery.batchMode.value" class="agal-batch-bar glass-surface ">
        <span class="agal-batch-count">{{ gallery.selectedCount.value }} выбрано</span>
        <button class="agal-batch-action" @click="gallery.selectAll()">выбрать все</button>
        <button class="agal-batch-action" @click="gallery.deselectAll()">снять</button>
        <button class="agal-batch-action" @click="batchFeature(true)">★ избранные</button>
        <button class="agal-batch-action" @click="batchFeature(false)">снять ★</button>
        <button class="agal-batch-action agal-batch-action--del" @click="batchDel">удалить</button>
      </GlassSurface>
    </Transition>

    <!-- ─── Filter bar ─────────────────────────────────── -->
    <GalleryFilterBar
      :model-value="filterState"
      :tags="gallery.allTags.value"
      @update:model-value="onFilterUpdate"
    />

    <!-- ─── Empty state ────────────────────────────────── -->
    <GlassSurface  v-if="!gallery.loading.value && !gallery.filtered.value.length" class="agal-empty glass-surface">
      <span class="agal-empty__title">[ NO DATA ATTACHED ]</span>
      <span class="agal-empty__text" v-if="gallery.items.value.length">По текущим фильтрам ничего не найдено.</span>
      <span class="agal-empty__text" v-else>Реестр пока пуст. Добавьте первый объект в галерею.</span>
    </GlassSurface>

    <!-- ─── Loading ────────────────────────────────────── -->
    <div v-else-if="gallery.loading.value" class="agal-loading">
      <span>[ LOADING... ]</span>
    </div>

    <!-- ─── Masonry view ───────────────────────────────── -->
    <GalleryMasonry
      v-else-if="gallery.viewMode.value === 'masonry'"
      :items="gallery.filtered.value"
      :min-column-width="280"
      @click="onCardClick"
    >
      <template #default="{ item, index }">
        <GlassSurface  class="msn-card " :class="{ 'msn-card--selected': gallery.selectedIds.value.has(item.id) }" @click="onCardClick(index)">
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
        </GlassSurface>
      </template>
    </GalleryMasonry>

    <!-- ─── Grid view ──────────────────────────────────── -->
    <div v-else-if="gallery.viewMode.value === 'grid'" class="agal-grid">
      <GlassSurface
        v-for="(item, index) in gallery.filtered.value"
        :key="item.id"
        class="agal-card"
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
      </GlassSurface>
    </div>

    <!-- ─── List view ──────────────────────────────────── -->
    <div v-else class="agal-list">
      <GlassSurface
        v-for="(item, index) in gallery.filtered.value"
        :key="item.id"
        class="agal-list-row"
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
      </GlassSurface>
    </div>
    </div><!-- /cv-wipe-inner -->

    <div v-if="isPaged" class="cv-pager-rail">      <div class="cv-pager-rail__meta">
        <span class="cv-pager-rail__mode">{{ pagerModeLabel }}</span>
        <span>экран {{ pageIndex }} / {{ pageCount }}</span>
      </div>
      <div class="cv-pager-rail__actions">
        <GlassButton variant="secondary" density="compact" type="button"  @click="move('prev')">← экран</GlassButton>
        <GlassButton variant="secondary" density="compact" type="button"  @click="move('next')">{{ contentViewMode === 'flow' ? 'экран / раздел' : pagerNextLabel }}</GlassButton>
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
          <GlassSurface  class="agal-modal glass-surface ">
            <div class="agal-modal-head">
              <span>{{ editingId ? 'редактировать' : 'добавить' }}</span>
              <button class="agal-close" @click="closeModal">×</button>
            </div>

            <form @submit.prevent="save" class="agal-form">
              <!-- Title -->
              <div class="agal-field">
                <label>Название *</label>
                <GlassInput v-model="form.title" class=" agal-finput" required autofocus placeholder="введите название" />
              </div>

              <!-- Main image -->
              <div class="agal-field">
                <label>Основное изображение</label>
                <div class="agal-upload-row">
                  <GlassInput v-model="form.image" class=" agal-finput" placeholder="имя файла или загрузите →" />
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
                <GlassInput v-model="tagsStr" class=" agal-finput" placeholder="минимализм, дерево, нейтральный..." />
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
          </GlassSurface>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import type { GalleryItem, GalleryFilterState } from '~~/shared/types/gallery'
import type { GalleryFilterStateExtended } from '~/entities/gallery/ui/GalleryFilterBar.vue'
import type { MaterialProperties } from '~~/shared/types/material'

const props = defineProps<{ category: string; title: string }>()
const router = useRouter()
const route = useRoute()
const designSystem = useDesignSystem()
const adminNav = useAdminNav()

// ── Composable (единый источник truth) ────────────────────
const categoryRef = computed(() => props.category)
const gallery = useGallery(categoryRef)
await gallery.load()
const galleryCategoryOrder = computed(() => ['interiors', 'furniture', 'moodboards', 'materials', 'art'])

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

const {
  viewportRef,
  contentViewMode,
  isPaged,
  pagerModeLabel,
  pagerNextLabel,
  pageIndex,
  pageCount,
  syncPager,
  move,
  handleWheel,
  handleKeydown,
} = useContentViewport({
  mode: computed(() => designSystem.tokens.value.contentViewMode),
  currentSection: computed(() => props.category),
  sectionOrder: galleryCategoryOrder,
  onNavigate: async (nextCategory) => {
    const targetPath = `/admin/gallery/${nextCategory}`

    if (route.path !== targetPath) {
      await router.push(targetPath)
    }

    adminNav.select({ id: `gal_${nextCategory}`, name: nextCategory, type: 'leaf' })
  },
  transitionMs: computed(() => designSystem.tokens.value.pageTransitDuration ?? 280),
})

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
  } finally {
    ;(e.target as HTMLInputElement).value = ''
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

<style scoped src="./AdminGallery.scoped.css"></style>
