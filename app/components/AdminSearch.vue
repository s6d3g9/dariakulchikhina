<template>
  <Teleport to="body">
    <div v-if="open" class="as-backdrop" @click.self="close">
      <div class="as-panel glass-surface glass-card" role="dialog" aria-modal="true" aria-label="Поиск">
        <!-- ── Input row ── -->
        <div class="as-input-row">
          <svg class="as-icon-search" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref="inputRef"
            v-model="q"
            class="as-input"
            type="search"
            placeholder="проекты, клиенты, подрядчики…"
            autocomplete="off"
            spellcheck="false"
            @keydown.escape.prevent="close"
            @keydown.down.prevent="arrowDown"
            @keydown.up.prevent="arrowUp"
            @keydown.enter.prevent="selectActive"
          />
          <kbd class="as-kbd">esc</kbd>
        </div>

        <!-- ── Results ── -->
        <div class="as-body">
          <!-- Loading -->
          <div v-if="pending && q.length >= 2" class="as-state">поиск…</div>

          <!-- Sections -->
          <template v-else-if="sections.length">
            <div v-for="(section, si) in sections" :key="section.label" class="as-group">
              <div class="as-group-label">{{ section.label }}</div>
              <button
                v-for="(item, ii) in section.items"
                ref="itemRefs"
                :key="item.href + item.label + ii"
                type="button"
                class="as-result"
                :class="{ 'as-result--active': activeIdx === sectionStart(si) + ii }"
                @click="go(item.href)"
                @mouseenter="activeIdx = sectionStart(si) + ii"
              >
                <span class="as-res-icon" v-html="item.icon"></span>
                <span class="as-res-text">
                  <span class="as-res-main">{{ item.label }}</span>
                  <span v-if="item.sublabel" class="as-res-sub">{{ item.sublabel }}</span>
                </span>
                <span v-if="item.badge" class="as-res-badge" :class="`as-badge--${item.badge}`">{{ item.badge }}</span>
                <svg class="as-res-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </template>

          <!-- Empty -->
          <div v-else-if="q.length >= 2 && !pending" class="as-state">ничего не найдено</div>

          <!-- Hint -->
          <div v-else class="as-hint">
            <div class="as-hint-row">
              <kbd class="as-kbd as-kbd--sm">↑</kbd><kbd class="as-kbd as-kbd--sm">↓</kbd> навигация
              &ensp;
              <kbd class="as-kbd as-kbd--sm">↵</kbd> перейти
              &ensp;
              <kbd class="as-kbd as-kbd--sm">esc</kbd> закрыть
            </div>
            <p class="as-hint-tip">начните вводить&thinsp;—&thinsp;поиск по названию, телефону, email</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

interface SearchItem {
  href: string
  label: string
  sublabel?: string
  icon: string
  badge?: string
}
interface SearchSection {
  label: string
  items: SearchItem[]
}
interface SearchResult {
  projects: Array<{ id: number; slug: string; title: string; status: string; href: string }>
  clients: Array<{ id: number; name: string; phone: string | null; email: string | null; href: string }>
  contractors: Array<{ id: number; slug: string; name: string; companyName: string | null; phone: string | null; href: string }>
  total: number
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const inputRef = ref<HTMLInputElement | null>(null)
const q = ref('')
const data = ref<SearchResult | null>(null)
const pending = ref(false)
const activeIdx = ref(-1)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

// ── Sections computed ────────────────────────────────────────────────────────
const sections = computed<SearchSection[]>(() => {
  if (!data.value) return []
  const result: SearchSection[] = []

  if (data.value.projects.length) {
    result.push({
      label: 'проекты',
      items: data.value.projects.map(p => ({
        href: p.href,
        label: p.title,
        sublabel: p.slug,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        badge: p.status,
      })),
    })
  }

  if (data.value.clients.length) {
    result.push({
      label: 'клиенты',
      items: data.value.clients.map(c => ({
        href: c.href,
        label: c.name,
        sublabel: c.phone || c.email || undefined,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
      })),
    })
  }

  if (data.value.contractors.length) {
    result.push({
      label: 'подрядчики',
      items: data.value.contractors.map(ct => ({
        href: ct.href,
        label: ct.name,
        sublabel: ct.companyName || undefined,
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3L9 12l-2 5 5-2 5.7-5.7a2 2 0 0 0-3-3z"/><path d="M16 4l4 4"/></svg>',
      })),
    })
  }

  return result
})

const flatItems = computed<SearchItem[]>(() => sections.value.flatMap(s => s.items))

function sectionStart(si: number): number {
  let idx = 0
  for (let i = 0; i < si; i++) idx += sections.value[i].items.length
  return idx
}

// ── Search ───────────────────────────────────────────────────────────────────
watch(q, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  activeIdx.value = -1
  if (val.length < 2) { data.value = null; return }
  debounceTimer = setTimeout(async () => {
    pending.value = true
    try {
      data.value = await $fetch<SearchResult>(`/api/admin/search?q=${encodeURIComponent(val)}`)
    }
    catch { data.value = null }
    finally { pending.value = false }
  }, 280)
})

// ── Focus on open ────────────────────────────────────────────────────────────
watch(() => props.open, async (val) => {
  if (val) {
    q.value = ''
    data.value = null
    activeIdx.value = -1
    await nextTick()
    inputRef.value?.focus()
  }
})

// ── Navigation ───────────────────────────────────────────────────────────────
function arrowDown() {
  const len = flatItems.value.length
  if (!len) return
  activeIdx.value = activeIdx.value < len - 1 ? activeIdx.value + 1 : 0
  scrollActiveIntoView()
}

function arrowUp() {
  const len = flatItems.value.length
  if (!len) return
  activeIdx.value = activeIdx.value > 0 ? activeIdx.value - 1 : len - 1
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    const panel = document.querySelector('.as-body')
    const active = panel?.querySelector('.as-result--active') as HTMLElement | null
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function selectActive() {
  if (activeIdx.value >= 0 && activeIdx.value < flatItems.value.length) {
    go(flatItems.value[activeIdx.value].href)
  }
}

// ── Navigation ───────────────────────────────────────────────────────────────
function go(href: string) {
  close()
  router.push(href)
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* ── Overlay ── */
.as-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, .42);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 16px 32px;
}

/* ── Panel ── */
.as-panel {
  width: 100%;
  max-width: 560px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  max-height: calc(100vh - 130px);
}

/* ── Input row ── */
.as-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.as-icon-search {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent);
}

.as-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: .9rem;
  color: var(--glass-text);
  caret-color: var(--glass-text);
}
.as-input::placeholder {
  color: color-mix(in srgb, var(--glass-text) 35%, transparent);
}
.as-input::-webkit-search-cancel-button { display: none; }

.as-kbd {
  font-size: .58rem;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 4px;
  padding: 2px 6px;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  font-family: inherit;
  flex-shrink: 0;
}
.as-kbd--sm {
  padding: 1px 5px;
}

/* ── Body ── */
.as-body {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  min-height: 60px;
  max-height: 440px;
}

/* ── State / Empty ── */
.as-state {
  padding: 24px;
  text-align: center;
  font-size: .75rem;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
}

/* ── Hint ── */
.as-hint {
  padding: 20px 20px 22px;
}
.as-hint-row {
  font-size: .68rem;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 12px;
}
.as-hint-tip {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  margin: 0;
}

/* ── Groups ── */
.as-group {
  padding-top: 4px;
}
.as-group + .as-group {
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
  padding-top: 6px;
}
.as-group:last-child { padding-bottom: 6px; }

.as-group-label {
  font-size: .57rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-weight: 700;
  color: color-mix(in srgb, var(--glass-text) 30%, transparent);
  padding: 6px 16px 2px;
}

/* ── Result row ── */
.as-result {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  background: transparent;
  border: none;
  text-align: left;
  color: var(--glass-text);
  border-radius: 0;
  transition: background .12s;
}
.as-result:hover,
.as-result--active {
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
}

.as-res-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
}

.as-res-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.as-res-main {
  font-size: .82rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.as-res-sub {
  font-size: .68rem;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.as-res-badge {
  flex-shrink: 0;
  font-size: .58rem;
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  text-transform: lowercase;
}
/* status badge tints */
.as-badge--lead       { background: color-mix(in srgb, color-mix(in srgb, var(--glass-text) 60%, transparent) 18%, transparent); color: var(--ds-muted, color-mix(in srgb, var(--glass-text) 55%, transparent)); }
.as-badge--initiation { background: color-mix(in srgb, var(--phase-blue, #2196f3) 15%, transparent); color: var(--phase-blue, var(--ds-accent)); }
.as-badge--tor        { background: color-mix(in srgb, var(--phase-amber, var(--ds-warning)) 15%, transparent); color: var(--phase-amber, #e65100); }
.as-badge--concept    { background: color-mix(in srgb, var(--phase-violet, #9c27b0) 15%, transparent); color: var(--phase-violet, #9575cd); }
.as-badge--working_project { background: color-mix(in srgb, var(--phase-teal, #00bcd4) 15%, transparent); color: var(--phase-teal, #00838f); }
.as-badge--realization { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 15%, transparent); color: var(--ds-success, var(--ds-success)); }
.as-badge--done       { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 15%, transparent); color: var(--ds-success, var(--ds-success)); }

.as-res-arrow {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--glass-text) 20%, transparent);
  opacity: 0;
  transition: opacity .12s;
}
.as-result:hover .as-res-arrow,
.as-result--active .as-res-arrow { opacity: 1; }

/* ── Dark overrides ── */
@media (prefers-color-scheme: dark) {
  .as-backdrop { background: rgba(0,0,0,.6); }
}
[data-theme="dark"] .as-backdrop { background: rgba(0,0,0,.6); }
</style>
