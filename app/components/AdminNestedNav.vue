<template>
  <!--
    AdminNestedNav — стековый drill-down navigator
    Каждый уровень = { title, items[] } где item может быть узлом (node) или листом (leaf)
    Узел — проваливаемся дальше; лист — выбираем (контент в main)
    Родитель управляет стеком (navStack), передаёт currentNode + глубину для анимации
  -->
  <div class="ann-shell">

    <!-- Один узел в момент времени, Transition даёт slide -->
    <Transition :name="direction === 'fwd' ? 'ann-fwd' : 'ann-back'" mode="out-in">
      <div :key="node.key ?? node.title" class="ann-panel">

        <!-- ── Header: назад + заголовок + счётчик ── -->
        <div class="ann-hd">
          <button v-if="canGoBack" class="ann-back" @click="emit('back')">
            <svg viewBox="0 0 16 16" width="9" height="9" fill="none">
              <path d="M10 2 L4 8 L10 14" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ backLabel }}</span>
          </button>
          <div class="ann-title-row">
            <span class="ann-title">{{ node.title }}</span>
            <span v-if="node.count != null" class="ann-count">{{ node.count }}</span>
          </div>
        </div>

        <!-- ── Поиск ── -->
        <div class="ann-search">
          <input
            type="search"
            :value="search"
            @input="search = ($event.target as HTMLInputElement).value"
            class="ann-search-input"
            placeholder="поиск…"
            autocomplete="off"
          />
        </div>

        <!-- ── Список items ── -->
        <div class="ann-body">
          <slot name="before-items" />

          <div v-if="!filteredItems.length && search" class="ann-empty">ничего не найдено</div>
          <div v-else-if="!node.items?.length" class="ann-empty">
            <slot name="empty">{{ node.emptyText ?? 'пусто' }}</slot>
          </div>

          <div class="ann-list">
            <button
              v-for="item in filteredItems"
              :key="item.key"
              class="ann-item"
              :class="{
                'ann-item--active': item.key === activeKey,
                'ann-item--node': item.isNode,
              }"
              @click="onItemClick(item)"
            >
              <span v-if="item.icon" class="ann-item-icon">{{ item.icon }}</span>
              <span class="ann-item-label">
                {{ item.label }}
                <span v-if="item.sub" class="ann-item-sub">{{ item.sub }}</span>
              </span>
              <span v-if="item.count != null" class="ann-item-count">{{ item.count }}</span>
              <span v-if="item.isNode" class="ann-item-arrow">›</span>
            </button>
          </div>

          <slot name="after-items" />
        </div>

        <!-- ── Футер ── -->
        <div v-if="$slots.footer" class="ann-footer">
          <slot name="footer" />
        </div>

      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
export interface NavItem {
  key: string
  label: string
  icon?: string
  sub?: string
  count?: number
  isNode?: boolean      // true = узел (проваливаемся), false/undefined = лист (выбираем)
  isActive?: boolean
}

export interface NavNode {
  key?: string           // уникальный ключ узла для анимации
  title: string
  count?: number
  emptyText?: string
  items: NavItem[]
}

const props = defineProps<{
  node: NavNode
  direction?: 'fwd' | 'back'   // направление анимации при смене узла
  activeKey?: string            // ключ активного листа
  canGoBack?: boolean
  backLabel?: string
}>()

const emit = defineEmits<{
  back: []
  drill: [item: NavItem]   // кликнули на узел — провалиться
  select: [item: NavItem]  // кликнули на лист — выбрать
}>()

const search = ref('')

// При смене узла сбрасываем поиск
watch(() => props.node.key, () => { search.value = '' })

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.node.items
  return props.node.items.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.sub?.toLowerCase().includes(q)
  )
})

function onItemClick(item: NavItem) {
  if (item.isNode) emit('drill', item)
  else emit('select', item)
}
</script>

<style scoped>
/* ── Shell ────────────────────────────────────── */
.ann-shell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Panel ────────────────────────────────────── */
.ann-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

/* ── Header ───────────────────────────────────── */
.ann-hd {
  flex-shrink: 0;
  padding: 10px 10px 0;
  background: var(--glass-page-bg);
}
.ann-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: .68rem;
  color: var(--glass-text);
  opacity: .48;
  cursor: pointer;
  padding: 2px 6px 2px 2px;
  border-radius: 6px;
  font-family: inherit;
  transition: opacity .12s, background .12s;
  margin-bottom: 4px;
}
.ann-back:hover { opacity: .82; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }

.ann-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 2px;
  margin-bottom: 6px;
}
.ann-title {
  font-size: .8rem;
  font-weight: 600;
  color: var(--glass-text);
  letter-spacing: -.01em;
}
.ann-count {
  font-size: .62rem;
  color: var(--glass-text);
  opacity: .35;
}

/* ── Search ───────────────────────────────────── */
.ann-search {
  flex-shrink: 0;
  padding: 0 10px 8px;
  background: var(--glass-page-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 7%, transparent);
}
.ann-search-input {
  width: 100%;
  box-sizing: border-box;
  font-size: .74rem;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 38%, transparent);
  color: var(--glass-text);
  outline: none;
  font-family: inherit;
  transition: border-color .15s;
}
.ann-search-input:focus {
  border-color: color-mix(in srgb, var(--ds-accent, #7c6ef7) 48%, transparent);
}
.ann-search-input::placeholder { opacity: .38; }
.ann-search-input::-webkit-search-cancel-button { display: none; }

/* ── Body ─────────────────────────────────────── */
.ann-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 8px 24px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--glass-text) 16%, transparent) transparent;
}
.ann-body::-webkit-scrollbar { width: 3px; }
.ann-body::-webkit-scrollbar-track { background: transparent; }
.ann-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 2px;
}
.ann-empty { font-size: .74rem; color: var(--glass-text); opacity: .3; padding: 12px 4px; }

/* ── List items ───────────────────────────────── */
.ann-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ann-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: .78rem;
  color: var(--glass-text);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  line-height: 1.3;
  opacity: .62;
  transition: background .1s, opacity .1s;
}
.ann-item:hover {
  background: color-mix(in srgb, var(--glass-bg) 72%, transparent);
  opacity: .92;
}
.ann-item--active {
  background: color-mix(in srgb, var(--glass-bg) 90%, transparent);
  opacity: 1;
  font-weight: 600;
}
.ann-item--node.ann-item--active {
  background: color-mix(in srgb, var(--ds-accent, #7c6ef7) 10%, var(--glass-bg));
}
.ann-item-icon { font-size: .8rem; flex-shrink: 0; }
.ann-item-label { flex: 1; min-width: 0; }
.ann-item-sub {
  display: block;
  font-size: .66rem;
  opacity: .5;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ann-item-count {
  font-size: .62rem;
  opacity: .4;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.ann-item-arrow {
  font-size: .9rem;
  opacity: .35;
  flex-shrink: 0;
  margin-left: auto;
}

/* ── Footer ───────────────────────────────────── */
.ann-footer {
  flex-shrink: 0;
  padding: 8px 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Slide transitions ────────────────────────── */
.ann-fwd-enter-active,
.ann-fwd-leave-active,
.ann-back-enter-active,
.ann-back-leave-active {
  transition: transform .2s cubic-bezier(.4,0,.2,1), opacity .16s ease;
  position: absolute;
  inset: 0;
  will-change: transform, opacity;
}
.ann-fwd-enter-from  { transform: translateX(100%); opacity: 0; }
.ann-fwd-enter-to    { transform: translateX(0);    opacity: 1; }
.ann-fwd-leave-from  { transform: translateX(0);    opacity: 1; }
.ann-fwd-leave-to    { transform: translateX(-30%); opacity: 0; }

.ann-back-enter-from { transform: translateX(-30%); opacity: 0; }
.ann-back-enter-to   { transform: translateX(0);    opacity: 1; }
.ann-back-leave-from { transform: translateX(0);    opacity: 1; }
.ann-back-leave-to   { transform: translateX(100%); opacity: 0; }
</style>
