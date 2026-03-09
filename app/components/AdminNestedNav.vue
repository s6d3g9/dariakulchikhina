<template>
  <!--
    AdminNestedNav — fractal drill-down navigator
    Реализует NavigationNode schema (shared/types/navigation.ts)
    ПРАВИЛА: только текст в меню, никаких иконок/эмодзи, только левый сайдбар
  -->
  <div class="nav-shell">
    <Transition :name="direction === 'fwd' ? 'nav-fwd' : 'nav-back'" mode="out-in">
      <div :key="node.nodeId" class="nav-panel">

        <!-- Назад + заголовок -->
        <div class="nav-hd">
          <button v-if="canGoBack" class="nav-back" @click="emit('back')">
            <span class="nav-back-arrow">‹</span>
            <span class="nav-back-label">{{ node.context.title }}</span>
          </button>
        </div>

        <!-- Поиск -->
        <div class="nav-search-wrap">
          <input
            v-model="search"
            type="search"
            class="nav-search"
            :placeholder="node.filter.placeholder"
            autocomplete="off"
          />
        </div>

        <!-- Список -->
        <div class="nav-list">
          <div v-if="!filteredPayload.length && search" class="nav-empty">ничего не найдено</div>
          <div v-else-if="!node.payload.length" class="nav-empty">пусто</div>

          <button
            v-for="item in filteredPayload"
            :key="item.id"
            class="nav-item"
            :class="{
              'nav-item--active': item.id === activeId,
              'nav-item--node': item.type === 'node',
            }"
            @click="onItemClick(item)"
          >
            <span class="nav-item-name">{{ item.name }}</span>
            <span v-if="item.type === 'node'" class="nav-item-arrow">›</span>
          </button>
        </div>

      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { NavigationNode, PayloadItem } from '~/shared/types/navigation'

const props = defineProps<{
  node: NavigationNode
  direction?: 'fwd' | 'back'
  canGoBack?: boolean
  activeId?: string
}>()

const emit = defineEmits<{
  drill: [item: PayloadItem]
  select: [item: PayloadItem]
  back: []
}>()

const search = ref('')

// Сбрасываем поиск при смене узла
watch(() => props.node.nodeId, () => { search.value = '' })

const filteredPayload = computed(() => {
  if (!search.value.trim()) return props.node.payload
  const q = search.value.toLowerCase()
  return props.node.payload.filter(i => i.name.toLowerCase().includes(q))
})

function onItemClick(item: PayloadItem) {
  if (item.type === 'node') emit('drill', item)
  else emit('select', item)
}
</script>

<style scoped>
.nav-shell {
  width: 100%;
  overflow: hidden;
}

.nav-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Header ── */
.nav-hd {
  padding: 8px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: .7rem;
  color: var(--glass-text);
  opacity: .35;
  padding: 2px 0;
  transition: opacity .15s;
  text-align: left;
}
.nav-back:hover { opacity: .8; }
.nav-back-arrow { font-size: .9rem; line-height: 1; }
.nav-back-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }

/* ── Search ── */
.nav-search-wrap {
  margin-bottom: 4px;
}
.nav-search {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: var(--ds-text-xs, .74rem);
  font-family: inherit;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: var(--input-radius, 6px);
  color: var(--glass-text);
  outline: none;
  transition: border-color .15s;
}
.nav-search:focus {
  border-color: color-mix(in srgb, var(--glass-text) 25%, transparent);
}

/* ── List ── */
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-empty {
  font-size: var(--ds-text-xs, .72rem);
  color: var(--glass-text);
  opacity: .3;
  padding: 8px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--ds-text-sm, .8rem);
  color: var(--glass-text);
  opacity: .6;
  border-radius: var(--input-radius, 6px);
  text-align: left;
  transition: opacity .15s, background .15s;
  white-space: nowrap;
  overflow: hidden;
}
.nav-item:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
}
.nav-item--active {
  opacity: 1;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  font-weight: 500;
}

.nav-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item-arrow {
  font-size: .9rem;
  opacity: .3;
  flex-shrink: 0;
  margin-left: 4px;
}

/* ── Transitions ── */
.nav-fwd-enter-active,
.nav-fwd-leave-active,
.nav-back-enter-active,
.nav-back-leave-active {
  transition: transform .2s ease, opacity .2s ease;
}
.nav-fwd-enter-from  { transform: translateX(18px); opacity: 0; }
.nav-fwd-leave-to    { transform: translateX(-18px); opacity: 0; }
.nav-back-enter-from { transform: translateX(-18px); opacity: 0; }
.nav-back-leave-to   { transform: translateX(18px); opacity: 0; }
</style>
