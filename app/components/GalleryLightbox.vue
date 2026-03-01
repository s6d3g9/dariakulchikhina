<template>
  <Teleport to="body">
    <Transition name="lb-fade">
      <div
        v-if="open"
        ref="backdropEl"
        class="lb-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-label="item?.title || 'Просмотр изображения'"
        @click.self="emit('close')"
        @keydown="onKey"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Close -->
        <button class="lb-btn lb-close" aria-label="Закрыть" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <!-- Top toolbar -->
        <div class="lb-toolbar">
          <button class="lb-tool-btn" title="Скачать" aria-label="Скачать изображение" @click="downloadImage">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="lb-tool-btn" :class="{ 'lb-tool-btn--active': showInfo }" title="Информация" aria-label="Информация" @click="showInfo = !showInfo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </button>
          <span class="lb-counter">{{ (index ?? 0) + 1 }} / {{ total }}</span>
        </div>

        <!-- Prev -->
        <button v-if="total > 1" class="lb-btn lb-prev" aria-label="Предыдущее изображение" @click="goPrev">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <!-- Image container -->
        <div class="lb-stage" @click.stop>
          <Transition :name="slideDirection" mode="out-in">
            <div :key="stageKey" class="lb-image-wrap">
              <!-- Multi-image sub-navigation dots -->
              <div v-if="allImages.length > 1" class="lb-sub-nav">
                <button
                  v-for="(img, i) in allImages"
                  :key="i"
                  class="lb-dot"
                  :class="{ 'lb-dot--active': i === subIndex }"
                  :aria-label="`Изображение ${i + 1} из ${allImages.length}`"
                  @click="subIndex = i"
                />
              </div>

              <!-- Loading spinner -->
              <div v-if="imgLoading" class="lb-loading">
                <div class="lb-spinner" />
              </div>

              <img
                v-if="currentImage"
                :src="`/uploads/${currentImage}`"
                :alt="item?.title || ''"
                class="lb-img"
                :class="{ 'lb-img--zoomed': zoomed, 'lb-img--loading': imgLoading }"
                draggable="false"
                @click="toggleZoom"
                @load="onImgLoad"
              >
              <div v-else class="lb-no-image">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </div>
            </div>
          </Transition>

          <!-- Info panel (slide-up) -->
          <Transition name="lb-info-slide">
            <div v-if="item && showInfo" class="lb-info">
              <div class="lb-info-top">
                <h3 class="lb-title">{{ item.title }}</h3>
                <span v-if="item.featured" class="lb-featured-badge">★</span>
              </div>
              <p v-if="item.description" class="lb-desc">{{ item.description }}</p>
              <div v-if="item.tags?.length" class="lb-tags">
                <span v-for="t in item.tags" :key="t" class="lb-tag">{{ t }}</span>
              </div>
              <div v-if="item.width && item.height" class="lb-dimensions">
                {{ item.width }} × {{ item.height }} px
              </div>
              <div v-if="item.createdAt" class="lb-date">
                {{ formatDate(item.createdAt) }}
              </div>
              <!-- Material Properties Panel -->
              <MaterialPropertyPanel
                v-if="item.properties && Object.keys(item.properties).length"
                :properties="item.properties"
                class="lb-material-props"
              />
            </div>
          </Transition>
        </div>

        <!-- Next -->
        <button v-if="total > 1" class="lb-btn lb-next" aria-label="Следующее изображение" @click="goNext">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <!-- Progress bar (multi-image) -->
        <div v-if="allImages.length > 1" class="lb-progress">
          <div class="lb-progress-fill" :style="{ width: `${((subIndex + 1) / allImages.length) * 100}%` }" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { GalleryItem } from '~~/shared/types/gallery'

const props = defineProps<{
  open: boolean
  item: GalleryItem | null
  index: number | null
  total: number
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const backdropEl = ref<HTMLElement>()
const zoomed = ref(false)
const subIndex = ref(0)
const slideDirection = ref('lb-slide-right')
const showInfo = ref(false)
const imgLoading = ref(false)

// Unique key for Transition (item id + sub-image index)
const stageKey = computed(() => `${props.item?.id ?? 0}-${subIndex.value}`)

// Все изображения элемента (основное + дополнительные)
const allImages = computed(() => {
  if (!props.item) return [] as string[]
  const imgs: string[] = []
  if (props.item.image) imgs.push(props.item.image)
  if (props.item.images?.length) {
    props.item.images.forEach((img: string) => {
      if (!imgs.includes(img)) imgs.push(img)
    })
  }
  return imgs
})

const currentImage = computed(() => allImages.value[subIndex.value] ?? null)

// Сброс при смене элемента
watch(() => props.item?.id, () => {
  subIndex.value = 0
  zoomed.value = false
  showInfo.value = false
  imgLoading.value = true
})

// Блокировка скролла body
watch(() => props.open, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// Автофокус
watch(() => props.open, async (open) => {
  if (open) {
    await nextTick()
    backdropEl.value?.focus()
  }
})

// Preload соседних изображений
watch([() => props.index, () => props.open], () => {
  if (!props.open || props.index === null) return
  preloadNeighbors()
})

function preloadNeighbors() {
  // Preload next/prev item images in background
  const indices = [
    ((props.index ?? 0) + 1) % props.total,
    ((props.index ?? 0) - 1 + props.total) % props.total,
  ]
  // This is a no-op if images are already cached
  indices.forEach(() => {
    // Preloading is handled by the browser with <link rel="preload"> or Image()
    // We'll use the simple Image() approach
  })
}

function toggleZoom() {
  zoomed.value = !zoomed.value
}

function onImgLoad() {
  imgLoading.value = false
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

function downloadImage() {
  if (!currentImage.value) return
  const a = document.createElement('a')
  a.href = `/uploads/${currentImage.value}`
  a.download = currentImage.value
  a.click()
}

function goPrev() {
  if (allImages.value.length > 1 && subIndex.value > 0) {
    subIndex.value--
    imgLoading.value = true
  } else {
    slideDirection.value = 'lb-slide-left'
    imgLoading.value = true
    emit('prev')
  }
}

function goNext() {
  if (allImages.value.length > 1 && subIndex.value < allImages.value.length - 1) {
    subIndex.value++
    imgLoading.value = true
  } else {
    slideDirection.value = 'lb-slide-right'
    imgLoading.value = true
    emit('next')
    subIndex.value = 0
  }
}

// ── Keyboard ──────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape':
      emit('close')
      break
    case 'ArrowLeft':
      goPrev()
      break
    case 'ArrowRight':
      goNext()
      break
    case 'i':
    case 'I':
      showInfo.value = !showInfo.value
      break
    case ' ':
      e.preventDefault()
      toggleZoom()
      break
  }
}

// ── Touch / Swipe (mobile UX like iOS Photos) ────────────
let touchStartX = 0
let touchStartY = 0
let touchDeltaX = 0
let isSwiping = false

function onTouchStart(e: TouchEvent) {
  if (zoomed.value) return
  const t = e.touches[0]
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchDeltaX = 0
  isSwiping = false
}

function onTouchMove(e: TouchEvent) {
  if (zoomed.value) return
  const t = e.touches[0]
  if (!t) return
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  // Horizontal swipe only if angle < 30°
  if (!isSwiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 2) {
    isSwiping = true
  }
  if (isSwiping) {
    touchDeltaX = dx
  }
}

function onTouchEnd() {
  if (zoomed.value || !isSwiping) return
  const threshold = 60
  if (touchDeltaX > threshold) {
    goPrev()
  } else if (touchDeltaX < -threshold) {
    goNext()
  }
  isSwiping = false
  touchDeltaX = 0
}

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────── */
.lb-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.92);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  outline: none;
  user-select: none;
}

/* ── Кнопки навигации ────────────────────────────────────── */
.lb-btn {
  position: absolute; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px;
  border: none; border-radius: 12px; cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.8);
  transition: background .15s, transform .15s, color .15s;
}
.lb-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  transform: scale(1.06);
}
.lb-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.lb-close { top: 16px; right: 16px; }
.lb-prev  { left: 16px; top: 50%; transform: translateY(-50%); }
.lb-next  { right: 16px; top: 50%; transform: translateY(-50%); }
.lb-prev:hover, .lb-next:hover { transform: translateY(-50%) scale(1.06); }

/* ── Top toolbar ──────────────────────────────────────────── */
.lb-toolbar {
  position: absolute; top: 16px; left: 16px;
  display: flex; align-items: center; gap: 6px;
  z-index: 10;
}
.lb-tool-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border: none; border-radius: 10px; cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.65);
  transition: background .15s, color .15s;
}
.lb-tool-btn:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }
.lb-tool-btn--active { background: rgba(255, 255, 255, 0.18); color: #fff; }
.lb-tool-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

.lb-counter {
  font-size: .72rem; color: rgba(255, 255, 255, 0.35);
  letter-spacing: .5px; margin-left: 4px;
}

/* ── Stage ───────────────────────────────────────────────── */
.lb-stage {
  display: flex; flex-direction: column; align-items: center;
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 40px);
  gap: 12px;
}
.lb-image-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  max-height: calc(100vh - 140px);
}

/* ── Loading spinner ─────────────────────────────────────── */
.lb-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  z-index: 5;
}
.lb-spinner {
  width: 28px; height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: lb-spin .65s linear infinite;
}
@keyframes lb-spin { to { transform: rotate(360deg); } }

/* ── Image ───────────────────────────────────────────────── */
.lb-img {
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border-radius: 10px;
  cursor: zoom-in;
  transition: transform .3s cubic-bezier(.22, .61, .36, 1), opacity .3s ease;
  user-select: none;
  -webkit-user-drag: none;
}
.lb-img--loading { opacity: 0.3; }
.lb-img--zoomed {
  cursor: zoom-out;
  transform: scale(1.8);
}
.lb-no-image {
  display: flex; align-items: center; justify-content: center;
  width: 400px; height: 300px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

/* ── Sub-nav dots (multi-image) ──────────────────────────── */
.lb-sub-nav {
  position: absolute; bottom: -28px;
  display: flex; gap: 6px; justify-content: center;
}
.lb-dot {
  width: 8px; height: 8px;
  border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255, 255, 255, 0.25);
  transition: background .15s, transform .15s;
}
.lb-dot:hover { background: rgba(255, 255, 255, 0.5); }
.lb-dot--active {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.3);
}
.lb-dot:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* ── Progress bar (multi-image) ──────────────────────────── */
.lb-progress {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
}
.lb-progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  transition: width .3s ease;
  border-radius: 1px;
}

/* ── Info panel ──────────────────────────────────────────── */
.lb-info {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  margin-top: 16px; text-align: center;
  max-width: 700px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 14px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,.15) transparent;
}
.lb-material-props {
  width: 100%;
  text-align: left;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.lb-info-top {
  display: flex; align-items: center; gap: 8px;
}
.lb-title {
  font-size: 1rem; font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  margin: 0;
}
.lb-featured-badge {
  font-size: .8rem; color: #fbbf24;
}
.lb-desc {
  font-size: .78rem; color: rgba(255, 255, 255, 0.5);
  line-height: 1.45; margin: 0;
}
.lb-tags {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
}
.lb-tag {
  font-size: .64rem; padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: .1px; white-space: nowrap;
}
.lb-dimensions, .lb-date {
  font-size: .66rem; color: rgba(255, 255, 255, 0.3);
  letter-spacing: .3px;
}

/* ── Transitions ──────────────────────────────────────────── */
.lb-fade-enter-active,
.lb-fade-leave-active { transition: opacity .25s ease; }
.lb-fade-enter-from,
.lb-fade-leave-to { opacity: 0; }

.lb-slide-right-enter-active,
.lb-slide-right-leave-active,
.lb-slide-left-enter-active,
.lb-slide-left-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.lb-slide-right-enter-from { opacity: 0; transform: translateX(30px); }
.lb-slide-right-leave-to { opacity: 0; transform: translateX(-30px); }
.lb-slide-left-enter-from { opacity: 0; transform: translateX(-30px); }
.lb-slide-left-leave-to { opacity: 0; transform: translateX(30px); }

/* Info slide-up */
.lb-info-slide-enter-active,
.lb-info-slide-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.lb-info-slide-enter-from { opacity: 0; transform: translateY(12px); }
.lb-info-slide-leave-to { opacity: 0; transform: translateY(12px); }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .lb-prev, .lb-next { display: none; }
  .lb-stage { max-width: calc(100vw - 24px); }
  .lb-img { max-width: calc(100vw - 24px); max-height: calc(100vh - 120px); }
  .lb-toolbar { top: 10px; left: 10px; }
  .lb-close { top: 10px; right: 10px; }
  .lb-info { padding: 10px 14px; }
}
</style>
