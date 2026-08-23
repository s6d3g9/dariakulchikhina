<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Entity, PanelDescriptor } from '@daria/shell-panels/entity'

const props = defineProps<{
  entity: Entity
  mode?: string
}>()

const emit = defineEmits<{
  (event: 'toggle-view'): void
  (event: 'set-mode', mode: string): void
}>()

const topOpen = ref(false)
const bottomOpen = ref(false)
const openSide = ref<'left' | 'right' | null>(null)
const localMode = ref(props.mode ?? props.entity.modes[0] ?? '')

const currentMode = computed(() => {
  if (props.mode && props.entity.modes.includes(props.mode)) {
    return props.mode
  }

  if (props.entity.modes.includes(localMode.value)) {
    return localMode.value
  }

  return props.entity.modes[0] ?? ''
})

watch(
  () => [props.entity.view, props.entity.modes.join('|'), props.mode ?? ''],
  () => {
    localMode.value = currentMode.value
    openSide.value = null
    topOpen.value = false
    bottomOpen.value = false
  },
)

function cycleMode() {
  const allowed = props.entity.modes
  const firstMode = allowed[0]
  if (!firstMode) {
    return
  }

  const currentIndex = allowed.indexOf(currentMode.value)
  const nextMode = allowed[(currentIndex + 1) % allowed.length] ?? firstMode
  localMode.value = nextMode
  emit('set-mode', nextMode)
}

function togglePanel(panel: 'top' | 'bottom') {
  if (panel === 'top') {
    topOpen.value = !topOpen.value
    return
  }

  bottomOpen.value = !bottomOpen.value
}

function panelKey(panel: PanelDescriptor, index: number) {
  return `${panel.contentKind}-${panel.title}-${index}`
}
</script>

<template>
  <section class="shell-layout" aria-label="Entity shell">
    <header class="shell-header">
      <div class="search-stub" aria-hidden="true">
        Поиск
      </div>
      <div class="avatar-stub" aria-hidden="true" />
    </header>

    <section class="strip-zone" aria-label="Top panel">
      <button class="strip-toggle" type="button" @click="togglePanel('top')">
        <span>{{ entity.panels.top.title }}</span>
        <span class="chevron" aria-hidden="true">{{ topOpen ? '⌃' : '⌄' }}</span>
      </button>
      <ul v-if="topOpen" class="panel-list">
        <li
          v-for="(item, index) in entity.panels.top.items"
          :key="panelKey(entity.panels.top, index)"
          class="panel-item"
        >
          <strong>{{ item.primary }}</strong>
          <span v-if="item.secondary">{{ item.secondary }}</span>
        </li>
        <li v-if="!entity.panels.top.items.length" class="panel-empty">
          Нет элементов
        </li>
      </ul>
    </section>

    <main class="center-row">
      <button
        class="edge-button edge-button-left"
        type="button"
        :aria-label="`Открыть ${entity.panels.left.title}`"
        @click="openSide = 'left'"
      >
        <span>{{ entity.panels.left.title }}</span>
      </button>

      <section class="card-zone" aria-label="Entity card zone">
        <header class="card-toolbar">
          <button class="icon-button" type="button" aria-label="Переключить вид" @click="emit('toggle-view')">
            ⇄
          </button>
          <button class="mode-button" type="button" @click="cycleMode">
            {{ currentMode || 'mode' }}
          </button>
        </header>
        <div class="card-body">
          <slot />
        </div>
      </section>

      <button
        class="edge-button edge-button-right"
        type="button"
        :aria-label="`Открыть ${entity.panels.right.title}`"
        @click="openSide = 'right'"
      >
        <span>{{ entity.panels.right.title }}</span>
      </button>

      <aside
        class="side-overlay side-overlay-left"
        :class="{ 'side-overlay-open': openSide === 'left' }"
        aria-label="Left panel"
      >
        <header class="overlay-header">
          <strong>{{ entity.panels.left.title }}</strong>
          <button type="button" @click="openSide = null">
            Закрыть
          </button>
        </header>
        <ul class="panel-list">
          <li
            v-for="(item, index) in entity.panels.left.items"
            :key="panelKey(entity.panels.left, index)"
            class="panel-item"
          >
            <strong>{{ item.primary }}</strong>
            <span v-if="item.secondary">{{ item.secondary }}</span>
          </li>
          <li v-if="!entity.panels.left.items.length" class="panel-empty">
            Нет элементов
          </li>
        </ul>
      </aside>

      <aside
        class="side-overlay side-overlay-right"
        :class="{ 'side-overlay-open': openSide === 'right' }"
        aria-label="Right panel"
      >
        <header class="overlay-header">
          <strong>{{ entity.panels.right.title }}</strong>
          <button type="button" @click="openSide = null">
            Закрыть
          </button>
        </header>
        <ul class="panel-list">
          <li
            v-for="(item, index) in entity.panels.right.items"
            :key="panelKey(entity.panels.right, index)"
            class="panel-item"
          >
            <strong>{{ item.primary }}</strong>
            <span v-if="item.secondary">{{ item.secondary }}</span>
          </li>
          <li v-if="!entity.panels.right.items.length" class="panel-empty">
            Нет элементов
          </li>
        </ul>
      </aside>
    </main>

    <section class="strip-zone" aria-label="Bottom panel">
      <button class="strip-toggle" type="button" @click="togglePanel('bottom')">
        <span>{{ entity.panels.bottom.title }}</span>
        <span class="chevron" aria-hidden="true">{{ bottomOpen ? '⌃' : '⌄' }}</span>
      </button>
      <ul v-if="bottomOpen" class="panel-list">
        <li
          v-for="(item, index) in entity.panels.bottom.items"
          :key="panelKey(entity.panels.bottom, index)"
          class="panel-item"
        >
          <strong>{{ item.primary }}</strong>
          <span v-if="item.secondary">{{ item.secondary }}</span>
        </li>
        <li v-if="!entity.panels.bottom.items.length" class="panel-empty">
          Нет элементов
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.shell-layout {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  gap: 10px;
  background: #f6f7f8;
  color: #202124;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  padding: 10px;
}

.shell-header {
  display: flex;
  height: 56px;
  flex: 0 0 56px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #d8dde3;
  border-radius: 12px;
  background: #ffffff;
  padding: 0 12px;
}

.search-stub {
  display: flex;
  min-height: 34px;
  min-width: 0;
  flex: 1;
  align-items: center;
  border: 1px dashed #c8cfd8;
  border-radius: 12px;
  color: #6a7280;
  padding: 0 12px;
}

.avatar-stub {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border: 1px solid #c8cfd8;
  border-radius: 50%;
  background: #e8ecef;
  margin-left: 12px;
}

.strip-zone {
  overflow: hidden;
  border: 1px solid #d8dde3;
  border-radius: 12px;
  background: #ffffff;
}

.strip-toggle {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0 12px;
  text-align: left;
}

.chevron {
  font-size: 16px;
  line-height: 1;
}

.center-row {
  position: relative;
  display: grid;
  min-height: 420px;
  flex: 1;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  gap: 8px;
  overflow: hidden;
}

.edge-button {
  display: flex;
  width: 42px;
  min-width: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid #cfd6dd;
  border-radius: 12px;
  background: #ffffff;
  color: #303640;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 8px 0;
}

.edge-button span {
  max-height: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  writing-mode: vertical-rl;
}

.edge-button-left span {
  transform: rotate(180deg);
}

.card-zone {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #cfd6dd;
  border-radius: 12px;
  background: #ffffff;
}

.card-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  border-bottom: 1px solid #e1e5ea;
  padding: 8px;
}

.icon-button,
.mode-button,
.overlay-header button {
  min-height: 32px;
  border: 1px solid #c8cfd8;
  border-radius: 10px;
  background: #ffffff;
  color: #202124;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.icon-button {
  width: 34px;
  font-size: 18px;
}

.mode-button {
  max-width: 160px;
  overflow: hidden;
  padding: 0 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  min-width: 0;
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.side-overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: min(78vw, 300px);
  overflow: auto;
  border: 1px solid #cfd6dd;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(32, 33, 36, 0.16);
  transition: transform 180ms ease;
}

.side-overlay-left {
  left: 0;
  transform: translateX(calc(-100% - 12px));
}

.side-overlay-right {
  right: 0;
  transform: translateX(calc(100% + 12px));
}

.side-overlay-open {
  transform: translateX(0);
}

.overlay-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #e1e5ea;
  padding: 8px 10px;
}

.overlay-header strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-header button {
  flex: 0 0 auto;
  padding: 0 10px;
}

.panel-list {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 10px;
}

.panel-item,
.panel-empty {
  display: grid;
  gap: 4px;
  border: 1px solid #e1e5ea;
  border-radius: 10px;
  padding: 10px;
}

.panel-item strong {
  font-size: 13px;
}

.panel-item span,
.panel-empty {
  color: #636b76;
  font-size: 12px;
}
</style>
