<template>
  <div class="gfb-wrap">
    <!-- View mode toggle -->
    <div class="gfb-modes">
      <button
        v-for="mode in modes"
        :key="mode.value"
        class="gfb-mode-btn"
        :class="{ 'gfb-mode-btn--active': modelValue.viewMode === mode.value }"
        :title="mode.label"
        :aria-label="`Режим: ${mode.label}`"
        :aria-pressed="modelValue.viewMode === mode.value"
        @click="emit('update:modelValue', { ...modelValue, viewMode: mode.value })"
      >
        <component :is="mode.icon" />
      </button>
    </div>

    <!-- Search -->
    <div class="gfb-search-wrap">
      <svg class="gfb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        :value="modelValue.search"
        class="gfb-search glass-input"
        placeholder="поиск..."
        aria-label="Поиск в галерее"
        @input="emit('update:modelValue', { ...modelValue, search: ($event.target as HTMLInputElement).value })"
      >
      <button
        v-if="modelValue.search"
        class="gfb-search-clear"
        aria-label="Очистить поиск"
        @click="emit('update:modelValue', { ...modelValue, search: '' })"
      >
        ×
      </button>
    </div>

    <!-- Sort dropdown -->
    <div class="gfb-sort-wrap">
      <button class="gfb-sort-btn" :class="{ 'gfb-sort-btn--active': sortOpen }" @click="sortOpen = !sortOpen">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
        {{ sortLabel }}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="gfb-sort-chevron" :class="{ 'gfb-sort-chevron--open': sortOpen }"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <Transition name="gfb-dropdown">
        <div v-if="sortOpen" class="gfb-sort-dropdown glass-surface" @click.stop>
          <button
            v-for="opt in sortOptions"
            :key="opt.field"
            class="gfb-sort-opt"
            :class="{ 'gfb-sort-opt--active': modelValue.sortField === opt.field }"
            @click="selectSort(opt.field)"
          >
            <span>{{ opt.label }}</span>
            <svg
              v-if="modelValue.sortField === opt.field"
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              class="gfb-sort-dir"
              :class="{ 'gfb-sort-dir--desc': modelValue.sortDir === 'desc' }"
            >
              <polyline points="6 15 12 9 18 15"/>
            </svg>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Featured toggle -->
    <button
      class="gfb-featured-btn"
      :class="{ 'gfb-featured-btn--active': modelValue.showFeatured }"
      :aria-pressed="modelValue.showFeatured"
      @click="emit('update:modelValue', { ...modelValue, showFeatured: !modelValue.showFeatured })"
    >
      ★ избранные
    </button>

    <!-- Tags -->
    <div v-if="tags.length" class="gfb-tags">
      <button
        class="gfb-tag"
        :class="{ 'gfb-tag--active': !modelValue.activeTag }"
        @click="emit('update:modelValue', { ...modelValue, activeTag: null })"
      >
        все
      </button>
      <button
        v-for="tag in tags"
        :key="tag"
        class="gfb-tag"
        :class="{ 'gfb-tag--active': modelValue.activeTag === tag }"
        @click="emit('update:modelValue', { ...modelValue, activeTag: modelValue.activeTag === tag ? null : tag })"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GalleryFilterState, GalleryViewMode } from '~~/shared/types/gallery'

export interface GalleryFilterStateExtended extends GalleryFilterState {
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

/** @deprecated Use GalleryFilterState from shared/types/gallery */
export type FilterState = GalleryFilterState

const props = defineProps<{
  modelValue: GalleryFilterStateExtended
  tags: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: GalleryFilterStateExtended]
}>()

const sortOpen = ref(false)

const sortOptions = [
  { field: 'sort-order', label: 'Порядок' },
  { field: 'name', label: 'По имени' },
  { field: 'date', label: 'По дате' },
] as const

const sortLabel = computed(() => {
  const opt = sortOptions.find(o => o.field === props.modelValue.sortField)
  return opt?.label || 'Порядок'
})

function selectSort(field: string) {
  if (props.modelValue.sortField === field) {
    // Toggle direction
    emit('update:modelValue', {
      ...props.modelValue,
      sortDir: props.modelValue.sortDir === 'asc' ? 'desc' : 'asc',
    })
  } else {
    emit('update:modelValue', {
      ...props.modelValue,
      sortField: field,
      sortDir: 'asc',
    })
  }
  sortOpen.value = false
}

// Close dropdown on outside click
function onOutsideClick(e: MouseEvent) {
  if (sortOpen.value) sortOpen.value = false
}
onMounted(() => document.addEventListener('click', onOutsideClick))
onUnmounted(() => document.removeEventListener('click', onOutsideClick))

// View mode icons as render functions
const MasonryIcon = () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('rect', { x: 2, y: 2, width: 8, height: 12, rx: 1 }),
  h('rect', { x: 14, y: 2, width: 8, height: 8, rx: 1 }),
  h('rect', { x: 2, y: 16, width: 8, height: 6, rx: 1 }),
  h('rect', { x: 14, y: 12, width: 8, height: 10, rx: 1 }),
])

const GridIcon = () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('rect', { x: 3, y: 3, width: 7, height: 7, rx: 1 }),
  h('rect', { x: 14, y: 3, width: 7, height: 7, rx: 1 }),
  h('rect', { x: 3, y: 14, width: 7, height: 7, rx: 1 }),
  h('rect', { x: 14, y: 14, width: 7, height: 7, rx: 1 }),
])

const ListIcon = () => h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('line', { x1: 8, y1: 6, x2: 21, y2: 6 }),
  h('line', { x1: 8, y1: 12, x2: 21, y2: 12 }),
  h('line', { x1: 8, y1: 18, x2: 21, y2: 18 }),
  h('line', { x1: 3, y1: 6, x2: 3.01, y2: 6 }),
  h('line', { x1: 3, y1: 12, x2: 3.01, y2: 12 }),
  h('line', { x1: 3, y1: 18, x2: 3.01, y2: 18 }),
])

const modes: Array<{ value: GalleryViewMode; label: string; icon: ReturnType<typeof MasonryIcon> }> = [
  { value: 'masonry', label: 'Masonry', icon: MasonryIcon as any },
  { value: 'grid', label: 'Сетка', icon: GridIcon as any },
  { value: 'list', label: 'Список', icon: ListIcon as any },
]
</script>

<style scoped>
.gfb-wrap {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
  padding: 10px 0;
}

/* ── View mode buttons ───────────────────────────────────── */
.gfb-modes {
  display: flex; gap: 2px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px; padding: 3px;
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
html.dark .gfb-modes { background: rgba(255, 255, 255, 0.06); }

.gfb-mode-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 28px;
  border: none; border-radius: 6px; cursor: pointer;
  background: transparent;
  color: var(--glass-text, #1a1a1a); opacity: .4;
  transition: opacity .13s, background .13s;
}
.gfb-mode-btn:hover { opacity: .7; }
.gfb-mode-btn--active {
  opacity: 1;
  background: var(--glass-bg, rgba(255, 255, 255, 0.48));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.gfb-mode-btn:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 1px;
}

/* ── Search ──────────────────────────────────────────────── */
.gfb-search-wrap {
  position: relative;
  display: flex; align-items: center;
}
.gfb-search-icon {
  position: absolute; left: 10px;
  color: var(--glass-text, #1a1a1a); opacity: .35;
  pointer-events: none;
}
.gfb-search {
  width: 200px; padding: 7px 28px 7px 32px;
  border-radius: 8px; font-size: .82rem;
  font-family: inherit;
  transition: width .2s ease;
}
.gfb-search:focus { width: 260px; }
.gfb-search-clear {
  position: absolute; right: 6px;
  width: 18px; height: 18px;
  border: none; border-radius: 4px; cursor: pointer;
  background: rgba(0, 0, 0, 0.08);
  color: var(--glass-text, #1a1a1a);
  font-size: .7rem; display: flex; align-items: center; justify-content: center;
  transition: background .13s;
}
.gfb-search-clear:hover { background: rgba(0, 0, 0, 0.15); }
html.dark .gfb-search-clear { background: rgba(255, 255, 255, 0.1); }

/* ── Sort dropdown ───────────────────────────────────────── */
.gfb-sort-wrap {
  position: relative;
}
.gfb-sort-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 10px;
  border: none; border-radius: 7px; cursor: pointer;
  font-family: inherit; font-size: .72rem;
  letter-spacing: .2px; white-space: nowrap;
  background: rgba(0, 0, 0, 0.04);
  color: var(--glass-text, #1a1a1a); opacity: .6;
  transition: opacity .13s, background .13s;
}
.gfb-sort-btn:hover { opacity: .85; }
.gfb-sort-btn--active { opacity: .9; background: rgba(0, 0, 0, 0.08); }
html.dark .gfb-sort-btn { background: rgba(255, 255, 255, 0.06); }

.gfb-sort-chevron {
  transition: transform .2s ease;
}
.gfb-sort-chevron--open { transform: rotate(180deg); }

.gfb-sort-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0;
  min-width: 140px;
  padding: 4px;
  border-radius: 10px; z-index: 20;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  background: var(--glass-bg, rgba(255, 255, 255, 0.92));
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
}
html.dark .gfb-sort-dropdown {
  background: rgba(28, 29, 34, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.gfb-sort-opt {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 7px 10px;
  border: none; border-radius: 7px; cursor: pointer;
  font-family: inherit; font-size: .76rem;
  background: transparent;
  color: var(--glass-text, #1a1a1a);
  transition: background .13s;
}
.gfb-sort-opt:hover { background: rgba(0, 0, 0, 0.06); }
.gfb-sort-opt--active { font-weight: 600; }
html.dark .gfb-sort-opt:hover { background: rgba(255, 255, 255, 0.08); }

.gfb-sort-dir {
  transition: transform .2s ease;
}
.gfb-sort-dir--desc { transform: rotate(180deg); }

.gfb-dropdown-enter-active,
.gfb-dropdown-leave-active { transition: opacity .15s ease, transform .15s ease; }
.gfb-dropdown-enter-from,
.gfb-dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Featured toggle ─────────────────────────────────────── */
.gfb-featured-btn {
  padding: 6px 12px;
  border: none; border-radius: 7px; cursor: pointer;
  font-family: inherit; font-size: .72rem;
  letter-spacing: .3px; white-space: nowrap;
  background: rgba(0, 0, 0, 0.04);
  color: var(--glass-text, #1a1a1a); opacity: .5;
  transition: opacity .13s, background .13s;
}
.gfb-featured-btn:hover { opacity: .8; }
.gfb-featured-btn--active {
  opacity: 1;
  background: rgba(251, 191, 36, 0.15);
  color: #b45309;
}
html.dark .gfb-featured-btn { background: rgba(255, 255, 255, 0.06); }
html.dark .gfb-featured-btn--active {
  background: rgba(251, 191, 36, 0.18);
  color: #fbbf24;
}

/* ── Tags ────────────────────────────────────────────────── */
.gfb-tags {
  display: flex; flex-wrap: wrap; gap: 4px;
  margin-left: auto;
}
.gfb-tag {
  padding: 4px 10px;
  border: none; border-radius: 6px; cursor: pointer;
  font-family: inherit; font-size: .68rem;
  letter-spacing: .2px; white-space: nowrap;
  background: rgba(0, 0, 0, 0.05);
  color: var(--glass-text, #1a1a1a); opacity: .5;
  transition: opacity .13s, background .13s;
}
.gfb-tag:hover { opacity: .8; }
.gfb-tag--active {
  opacity: 1;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
}
html.dark .gfb-tag { background: rgba(255, 255, 255, 0.07); }
html.dark .gfb-tag--active {
  background: rgba(255, 255, 255, 0.88);
  color: #111;
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .gfb-search { width: 140px; }
  .gfb-search:focus { width: 180px; }
  .gfb-tags { margin-left: 0; width: 100%; }
}
</style>
