<template>
  <div ref="container" class="msn-grid" :style="gridStyles">
    <TransitionGroup name="msn-stagger" tag="div" class="msn-grid-inner" :style="gridStyles">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        ref="itemRefs"
        class="msn-item"
        :class="{ 'msn-item--featured': featuredSpan && item.featured && columns >= 2 }"
        :style="{ '--msn-delay': `${Math.min(index * 40, 400)}ms` }"
        @click="emit('click', index)"
      >
        <slot :item="item" :index="index">
          <!-- Дефолтная карточка -->
          <div class="msn-card glass-card">
            <div class="msn-img-wrap" :style="{ aspectRatio: getAspectRatio(item) }">
              <!-- Blur-up placeholder -->
              <div v-if="!loadedImages.has(item.id)" class="msn-blur-placeholder" />

              <img
                v-if="item.image"
                :src="`/uploads/${item.image}`"
                :alt="item.title"
                class="msn-img"
                :class="{ 'msn-img--loaded': loadedImages.has(item.id) }"
                loading="lazy"
                decoding="async"
                @load="onImageLoaded(item.id)"
              >
              <div v-else class="msn-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </div>

              <!-- Overlay badge -->
              <div class="msn-overlay">
                <span v-if="item.featured" class="msn-star">★</span>
                <span v-if="getAllImages(item).length > 1" class="msn-multi">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="15" height="15" rx="2"/><path d="M22 2H9a2 2 0 0 0-2 2"/><path d="M22 2v13a2 2 0 0 1-2 2"/></svg>
                  {{ getAllImages(item).length }}
                </span>
              </div>
            </div>

            <div class="msn-info">
              <p class="msn-title">{{ item.title }}</p>
              <p v-if="item.description" class="msn-desc">{{ item.description }}</p>
              <div v-if="item.tags?.length" class="msn-tags">
                <span v-for="t in item.tags" :key="t" class="msn-tag">{{ t }}</span>
              </div>
            </div>
          </div>
        </slot>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { GalleryItem } from '~~/shared/types/gallery'

const props = withDefaults(defineProps<{
  items: GalleryItem[]
  /** Минимальная ширина колонки (px) */
  minColumnWidth?: number
  /** Featured элементы занимают 2 колонки */
  featuredSpan?: boolean
}>(), {
  minColumnWidth: 260,
  featuredSpan: true,
})

const emit = defineEmits<{
  click: [index: number]
}>()

const container = ref<HTMLElement>()
const itemRefs = ref<HTMLElement[]>([])
const columns = ref(3)
const loadedImages = ref(new Set<number>())

const gridStyles = computed(() => ({
  '--msn-cols': columns.value,
}))

function onImageLoaded(id: number) {
  loadedImages.value.add(id)
  loadedImages.value = new Set(loadedImages.value)
}

function getAllImages(item: GalleryItem): string[] {
  const imgs: string[] = []
  if (item.image) imgs.push(item.image)
  if (item.images?.length) {
    item.images.forEach((img: string) => {
      if (!imgs.includes(img)) imgs.push(img)
    })
  }
  return imgs
}

function getAspectRatio(item: GalleryItem): string {
  if (item.width && item.height) {
    const ratio = item.width / item.height
    // Ограничиваем экстремальные пропорции
    if (ratio > 2.2) return '2.2 / 1'
    if (ratio < 0.5) return '1 / 2'
    return `${item.width} / ${item.height}`
  }
  // Стандартные пропорции для masonry разнообразия
  const patterns = ['4/3', '3/4', '1/1', '16/9', '3/2']
  return patterns[item.id % patterns.length] ?? '4/3'
}

function updateColumns() {
  if (!container.value) return
  const w = container.value.offsetWidth
  columns.value = Math.max(1, Math.floor(w / props.minColumnWidth))
}

let observer: ResizeObserver | null = null

onMounted(() => {
  updateColumns()
  observer = new ResizeObserver(updateColumns)
  if (container.value) observer.observe(container.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
/* ── Masonry Grid (CSS columns) ──────────────────────────── */
.msn-grid {
  padding-bottom: 14px;
}
.msn-grid-inner {
  columns: var(--msn-cols, 3);
  column-gap: 14px;
}
.msn-item {
  break-inside: avoid;
  margin-bottom: 14px;
  cursor: pointer;
  animation: msn-appear .4s cubic-bezier(.21, 1.02, .73, 1) both;
  animation-delay: var(--msn-delay, 0ms);
}
.msn-item--featured {
  /* In column layout, featured items stand out visually with a subtle glow */
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.15));
}

@keyframes msn-appear {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── TransitionGroup stagger ─────────────────────────────── */
.msn-stagger-enter-active {
  transition: opacity .35s ease, transform .35s cubic-bezier(.21, 1.02, .73, 1);
  transition-delay: var(--msn-delay, 0ms);
}
.msn-stagger-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.msn-stagger-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.msn-stagger-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.msn-stagger-move {
  transition: transform .3s ease;
}

/* ── Card ────────────────────────────────────────────────── */
.msn-card {
  background: var(--glass-bg, rgba(255, 255, 255, 0.48));
  border: none;
  box-shadow: var(--glass-shadow, 0 10px 28px rgba(18, 18, 18, 0.08));
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  border-radius: 14px;
  overflow: hidden;
  transition: transform .25s cubic-bezier(.21, 1.02, .73, 1), box-shadow .25s ease;
  will-change: transform;
}
.msn-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 48px rgba(18, 18, 18, 0.16);
}
html.dark .msn-card {
  background: linear-gradient(160deg, rgba(22, 23, 28, 0.92) 0%, rgba(14, 15, 18, 0.96) 100%);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

/* ── Image ───────────────────────────────────────────────── */
.msn-img-wrap {
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}
html.dark .msn-img-wrap { background: rgba(255, 255, 255, 0.04); }

/* Blur-up placeholder (Pinterest-style) */
.msn-blur-placeholder {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.08) 100%);
  animation: msn-pulse 1.5s ease-in-out infinite alternate;
  z-index: 1;
}
html.dark .msn-blur-placeholder {
  background: linear-gradient(135deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,.06) 100%);
}
@keyframes msn-pulse {
  from { opacity: .6; }
  to { opacity: 1; }
}

.msn-img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  opacity: 0;
  transition: opacity .5s cubic-bezier(.21, 1.02, .73, 1), transform .35s ease;
}
.msn-img--loaded { opacity: 1; }
.msn-card:hover .msn-img { transform: scale(1.03); }

.msn-placeholder {
  width: 100%; height: 100%;
  aspect-ratio: 4 / 3;
  display: flex; align-items: center; justify-content: center;
  color: var(--glass-text, #1a1a1a); opacity: .16;
}

/* ── Overlay badges ──────────────────────────────────────── */
.msn-overlay {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 5px;
  opacity: 0; transform: translateY(-4px);
  transition: opacity .18s ease, transform .18s ease;
}
.msn-card:hover .msn-overlay {
  opacity: 1; transform: translateY(0);
}

.msn-star {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(251, 191, 36, 0.85);
  color: #fff; font-size: .72rem;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
}
.msn-multi {
  display: flex; align-items: center; gap: 3px;
  padding: 4px 8px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: #1a1a1a; font-size: .64rem; font-weight: 600;
}

/* ── Info ────────────────────────────────────────────────── */
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
  font-size: .62rem; padding: 2px 7px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.06); color: var(--glass-text, #1a1a1a); opacity: .65;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  letter-spacing: .1px; white-space: nowrap;
}
html.dark .msn-tag { background: rgba(255, 255, 255, 0.09); opacity: .75; }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .msn-grid-inner { columns: 2; column-gap: 8px; }
  .msn-item { margin-bottom: 8px; }
}
@media (max-width: 380px) {
  .msn-grid-inner { columns: 1; }
}
</style>
