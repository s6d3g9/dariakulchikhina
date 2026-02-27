<template>
  <div class="cda-root">
    <div v-if="pending" class="cda-loading"><div class="cda-loading-bar"></div></div>
    <template v-else>

      <!-- Albums / categories -->
      <div class="cda-cats" v-if="categories.length > 1">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="cda-cat-btn"
          :class="{ 'cda-cat-btn--active': activeCat === cat.key }"
          @click="activeCat = cat.key"
        >{{ cat.label }} <span class="cda-cat-count">{{ cat.count }}</span></button>
      </div>

      <!-- Empty state -->
      <div v-if="!filteredFiles.length" class="cda-empty">
        <span class="cda-empty-icon">▣</span>
        <p>Материалы альбома ещё не загружены.<br>Дизайнер добавит их по мере готовности.</p>
      </div>

      <!-- Gallery grid -->
      <div v-else class="cda-grid">
        <div
          v-for="file in filteredFiles"
          :key="file.url"
          class="cda-item"
          :class="{ 'cda-item--image': isImage(file) }"
          @click="openLightbox(file)"
        >
          <!-- Image preview -->
          <div v-if="isImage(file)" class="cda-img-wrap">
            <img :src="file.url" :alt="file.label || file.filename" class="cda-img" loading="lazy">
            <div class="cda-img-overlay">
              <span class="cda-overlay-zoom">⊕</span>
            </div>
          </div>

          <!-- Non-image file -->
          <div v-else class="cda-file-card" @click.stop>
            <span class="cda-file-icon">{{ fileIcon(file) }}</span>
            <div class="cda-file-info">
              <span class="cda-file-name">{{ file.label || file.filename }}</span>
              <span class="cda-file-ext">{{ fileExt(file) }}</span>
            </div>
            <a :href="file.url" target="_blank" class="cda-file-dl" @click.stop>↓</a>
          </div>

          <!-- Caption -->
          <div class="cda-item-caption" v-if="file.label && isImage(file)">{{ file.label }}</div>
        </div>
      </div>

      <!-- Lightbox -->
      <transition name="cda-lb">
        <div v-if="lightboxFile" class="cda-lightbox" @click.self="closeLightbox">
          <button class="cda-lb-close" @click="closeLightbox">×</button>
          <div class="cda-lb-inner">
            <img :src="lightboxFile.url" :alt="lightboxFile.label || ''" class="cda-lb-img">
            <div class="cda-lb-caption" v-if="lightboxFile.label">{{ lightboxFile.label }}</div>
          </div>
          <button v-if="lightboxPrev" class="cda-lb-nav cda-lb-nav--prev" @click="lightboxStep(-1)">‹</button>
          <button v-if="lightboxNext" class="cda-lb-nav cda-lb-nav--next" @click="lightboxStep(1)">›</button>
        </div>
      </transition>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

// All files from various profile sources + dedicated album_files field
const allFiles = computed<any[]>(() => {
  const pf = project.value?.profile || {}
  const base: any[] = []

  // album_files — dedicated gallery uploads
  if (Array.isArray(pf.album_files)) base.push(...pf.album_files)

  // survey_files (shown if category includes 'survey')
  if (Array.isArray(pf.survey_files)) {
    base.push(...pf.survey_files.map((f: any) => ({ ...f, category: f.category || 'survey' })))
  }

  return base
})

// Categories
const CAT_MAP: Record<string, string> = {
  all:       'Все',
  concept:   'Концепция',
  render:    'Визуализации',
  plan:      'Планировки',
  detail:    'Детали',
  material:  'Материалы',
  survey:    'Обмеры',
  other:     'Прочее',
}

const activeCat = ref('all')

const categories = computed(() => {
  const counts: Record<string, number> = { all: allFiles.value.length }
  allFiles.value.forEach(f => {
    const c = f.category || 'other'
    counts[c] = (counts[c] || 0) + 1
  })
  const result = [{ key: 'all', label: 'Все', count: counts.all }]
  Object.entries(counts).forEach(([key, count]) => {
    if (key !== 'all' && count > 0) {
      result.push({ key, label: CAT_MAP[key] || key, count })
    }
  })
  return result
})

const filteredFiles = computed(() => {
  if (activeCat.value === 'all') return allFiles.value
  return allFiles.value.filter(f => (f.category || 'other') === activeCat.value)
})

// Helpers
function isImage(f: any) {
  const ext = fileExt(f).toLowerCase()
  return ['jpg','jpeg','png','webp','gif','avif','svg'].includes(ext)
}
function fileExt(f: any) {
  const name = f.filename || f.url || ''
  return name.split('.').pop() || ''
}
function fileIcon(f: any) {
  const ext = fileExt(f).toLowerCase()
  if (['pdf'].includes(ext)) return '📄'
  if (['dwg','dxf'].includes(ext)) return '📐'
  if (['zip','rar','7z'].includes(ext)) return '🗜'
  if (['e57','rcp','las'].includes(ext)) return '📡'
  return '📎'
}

// Lightbox
const lightboxIdx = ref(-1)
const lightboxFile = computed(() => lightboxIdx.value >= 0 ? filteredFiles.value[lightboxIdx.value] : null)
const lightboxPrev = computed(() => lightboxIdx.value > 0)
const lightboxNext = computed(() => lightboxIdx.value < filteredFiles.value.length - 1)

function openLightbox(file: any) {
  if (!isImage(file)) return
  lightboxIdx.value = filteredFiles.value.indexOf(file)
}
function closeLightbox() { lightboxIdx.value = -1 }
function lightboxStep(dir: number) {
  lightboxIdx.value = Math.max(0, Math.min(filteredFiles.value.length - 1, lightboxIdx.value + dir))
}

// Keyboard navigation
onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
function onKey(e: KeyboardEvent) {
  if (!lightboxFile.value) return
  if (e.key === 'ArrowLeft')  lightboxStep(-1)
  if (e.key === 'ArrowRight') lightboxStep(1)
  if (e.key === 'Escape')     closeLightbox()
}
</script>

<style scoped>
.cda-root { padding: 4px 0 48px; }
.cda-loading { padding: 40px 0; }
.cda-loading-bar { height: 2px; width: 60px; background: var(--c-border, #e8e8e4); animation: cda-b .9s ease infinite alternate; }
@keyframes cda-b { to { width: 140px; opacity: .4; } }

/* Categories */
.cda-cats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
.cda-cat-btn {
  background: none; border: 1px solid var(--c-border, #e8e8e4);
  padding: 5px 14px; font-size: .72rem; cursor: pointer;
  font-family: inherit; color: var(--c-muted, #888);
  display: flex; align-items: center; gap: 6px;
}
.cda-cat-btn:hover { border-color: var(--c-text, #1a1a1a); color: var(--c-text, #1a1a1a); }
.cda-cat-btn--active { border-color: var(--c-text, #1a1a1a); color: var(--c-text, #1a1a1a); background: var(--c-bg2, #f8f8f7); }
.cda-cat-count { font-size: .62rem; color: var(--c-muted, #aaa); }

/* Empty */
.cda-empty { text-align: center; padding: 64px 0; color: var(--c-muted, #aaa); }
.cda-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 16px; opacity: .3; }
.cda-empty p { font-size: .82rem; line-height: 1.7; margin: 0; }

/* Gallery grid */
.cda-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* Image item */
.cda-item { cursor: default; }
.cda-item--image { cursor: pointer; }
.cda-img-wrap {
  position: relative; overflow: hidden;
  aspect-ratio: 4/3; background: var(--c-bg2, #f8f8f7);
  border: 1px solid var(--c-border, #e8e8e4);
}
.cda-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform .3s;
}
.cda-item--image:hover .cda-img { transform: scale(1.03); }
.cda-img-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center;
  transition: background .2s;
}
.cda-item--image:hover .cda-img-overlay { background: rgba(0,0,0,.25); }
.cda-overlay-zoom { font-size: 1.8rem; color: rgba(255,255,255,0); transition: color .2s; }
.cda-item--image:hover .cda-overlay-zoom { color: rgba(255,255,255,.8); }
.cda-item-caption {
  font-size: .7rem; color: var(--c-muted, #888); padding: 6px 2px 0;
  line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* File card */
.cda-file-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 16px; border: 1px solid var(--c-border, #e8e8e4);
  background: var(--c-bg, #fff);
}
.cda-file-icon { font-size: 1.5rem; flex-shrink: 0; }
.cda-file-info { flex: 1; min-width: 0; }
.cda-file-name { display: block; font-size: .8rem; color: var(--c-text, #333); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cda-file-ext  { font-size: .62rem; color: var(--c-muted, #aaa); text-transform: uppercase; }
.cda-file-dl {
  font-size: 1rem; color: var(--c-muted, #aaa); text-decoration: none; flex-shrink: 0;
  width: 28px; height: 28px; border: 1px solid var(--c-border, #e8e8e4);
  display: flex; align-items: center; justify-content: center;
}
.cda-file-dl:hover { border-color: var(--c-text, #1a1a1a); color: var(--c-text, #1a1a1a); }

/* Lightbox */
.cda-lightbox {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.9); display: flex; align-items: center; justify-content: center;
}
.cda-lb-close {
  position: absolute; top: 20px; right: 24px;
  background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer;
  line-height: 1; opacity: .7;
}
.cda-lb-close:hover { opacity: 1; }
.cda-lb-inner { max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cda-lb-img { max-width: 90vw; max-height: 80vh; object-fit: contain; }
.cda-lb-caption { font-size: .78rem; color: rgba(255,255,255,.6); text-align: center; }
.cda-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: none; border: 1px solid rgba(255,255,255,.3); color: #fff;
  font-size: 2rem; width: 48px; height: 48px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; opacity: .7; line-height: 1;
}
.cda-lb-nav:hover { opacity: 1; background: rgba(255,255,255,.1); }
.cda-lb-nav--prev { left: 20px; }
.cda-lb-nav--next { right: 20px; }

/* Lightbox transition */
.cda-lb-enter-active, .cda-lb-leave-active { transition: opacity .2s; }
.cda-lb-enter-from, .cda-lb-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .cda-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .cda-lb-nav { width: 36px; height: 36px; font-size: 1.5rem; }
}
</style>
