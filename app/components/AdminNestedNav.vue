<template>
  <!--
    AdminNestedNav — fractal drill-down navigator
    Реализует NavigationNode schema (shared/types/navigation.ts)
    ПРАВИЛА: только текст в меню, никаких иконок/эмодзи, только левый сайдбар
  -->
  <div class="nav-shell" :class="`nav-shell--${navTransitionMode}`" :style="navMotionStyle">
    <Transition name="nav-pane" mode="out-in">
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
            v-for="(item, index) in filteredPayload"
            :key="item.id"
            class="nav-item"
            :class="{
              'nav-item--active': item.id === activeId,
              'nav-item--node': item.type === 'node',
            }"
            :style="{ '--nav-item-index': index }"
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

const { tokens } = useDesignSystem()

const search = ref('')

const navTransitionMode = computed(() => tokens.value.archNavTransition || 'slide')

const navDistance = computed(() => Math.min(56, Math.max(0, tokens.value.navTransitDistance ?? 18)))

const navDuration = computed(() => Math.min(700, Math.max(80, tokens.value.navTransitDuration ?? 220)))

const navMotionStyle = computed(() => {
  const enter = props.direction === 'fwd' ? navDistance.value : -navDistance.value
  const leave = props.direction === 'fwd' ? -navDistance.value : navDistance.value
  return {
    '--nav-enter-x': `${enter}px`,
    '--nav-leave-x': `${leave}px`,
    '--nav-trans-duration': `${navDuration.value}ms`,
  }
})

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
  gap: var(--ds-nav-panel-gap, 8px);
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
  margin-bottom: 0;
}
.nav-search {
  width: 100%;
  box-sizing: border-box;
  padding: calc(var(--nav-item-padding-v, 12px) * 0.75) var(--nav-item-padding-h, 16px);
  font-size: var(--ds-text-xs, .74rem);
  font-family: inherit;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: var(--nav-item-radius, var(--input-radius, 6px));
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
  gap: var(--ds-nav-list-gap, 2px);
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
  min-height: 44px;
  padding: var(--nav-item-padding-v, 12px) var(--nav-item-padding-h, 16px);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--ds-text-sm, .8rem);
  color: var(--glass-text);
  opacity: .6;
  border-radius: var(--nav-item-radius, 6px);
  text-align: left;
  transition: opacity .15s, background .15s;
  white-space: nowrap;
  overflow: hidden;
  animation: nav-item-in calc(var(--ds-nav-trans-duration, 220ms) * 0.9) ease both;
  animation-delay: calc(var(--nav-item-index, 0) * var(--ds-nav-item-stagger, 0ms));
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
.nav-pane-enter-active,
.nav-pane-leave-active {
  transition:
    opacity var(--nav-trans-duration, var(--ds-nav-trans-duration, 220ms)) ease,
    transform var(--nav-trans-duration, var(--ds-nav-trans-duration, 220ms)) cubic-bezier(0.33, 1, 0.68, 1),
    filter var(--nav-trans-duration, var(--ds-nav-trans-duration, 220ms)) ease;
  will-change: opacity, transform, filter;
}

.nav-shell--none .nav-pane-enter-active,
.nav-shell--none .nav-pane-leave-active {
  transition: none;
}

.nav-shell--none .nav-pane-enter-from,
.nav-shell--none .nav-pane-leave-to {
  opacity: 1;
  transform: none;
  filter: none;
}

.nav-shell--fade .nav-pane-enter-from,
.nav-shell--fade .nav-pane-leave-to {
  opacity: 0;
}

.nav-shell--slide .nav-pane-enter-from {
  opacity: 0;
  transform: translateX(var(--nav-enter-x, 18px));
}

.nav-shell--slide .nav-pane-leave-to {
  opacity: 0;
  transform: translateX(var(--nav-leave-x, -18px));
}

.nav-shell--push .nav-pane-enter-from {
  opacity: 0;
  transform: translateX(var(--nav-enter-x, 18px)) scale(.985);
}

.nav-shell--push .nav-pane-leave-to {
  opacity: 0;
  transform: translateX(var(--nav-leave-x, -18px)) scale(1.015);
}

.nav-shell--stack .nav-pane-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(.985);
}

.nav-shell--stack .nav-pane-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(1.015);
}

.nav-shell--blur .nav-pane-enter-from {
  opacity: 0;
  transform: translateX(calc(var(--nav-enter-x, 18px) * 0.5));
  filter: blur(10px);
}

.nav-shell--blur .nav-pane-leave-to {
  opacity: 0;
  transform: translateX(calc(var(--nav-leave-x, -18px) * 0.5));
  filter: blur(10px);
}

@keyframes nav-item-in {
  from {
    opacity: 0;
    transform: translateX(calc(var(--nav-enter-x, 18px) * 0.3));
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

:global(html[data-nav-layout="compact"]) .nav-search {
  font-size: var(--ds-text-xs, .72rem);
}

:global(html[data-nav-layout="compact"]) .nav-item {
  font-size: var(--ds-text-xs, .76rem);
}

:global(html[data-nav-layout="showcase"]) .nav-hd {
  padding-top: 12px;
}

:global(html[data-nav-layout="showcase"]) .nav-item {
  letter-spacing: .04em;
  font-size: var(--ds-text-base, .92rem);
}

:global(html[data-nav-layout="rail"]) .nav-list {
  gap: calc(var(--ds-nav-list-gap, 2px) + 2px);
}

:global(html[data-nav-layout="rail"]) .nav-item {
  border-radius: 999px;
  letter-spacing: .06em;
}
</style>
