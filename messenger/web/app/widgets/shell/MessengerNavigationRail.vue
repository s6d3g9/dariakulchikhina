<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MessengerSectionKey } from './model/useMessengerSections'
import { useAnimatedNavIndicator } from './composables/useAnimatedNavIndicator'

interface SectionItem {
  readonly key: MessengerSectionKey
  readonly title: string
  readonly shortTitle?: string
  readonly icon?: string
}

const props = defineProps<{
  modelValue: MessengerSectionKey
  sections: ReadonlyArray<SectionItem>
  chatDisabled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: MessengerSectionKey): void
}>()

const railEl = ref<HTMLElement | null>(null)
const itemElsRaw = ref<HTMLElement[]>([])
const itemEls = computed(() => itemElsRaw.value.filter(Boolean))

const activeIndex = computed(() =>
  props.sections.findIndex(section => section.key === props.modelValue),
)

const { indicatorStyle } = useAnimatedNavIndicator(railEl, itemEls, activeIndex)

function sectionIcon(section: MessengerSectionKey): string {
  switch (section) {
    case 'chat':
      return 'mdi-message-outline'
    case 'chats':
      return 'mdi-message-text-outline'
    case 'contacts':
      return 'mdi-account-multiple-outline'
    case 'agents':
      return 'mdi-robot-outline'
    case 'aidev':
      return 'mdi-rocket-launch-outline'
    case 'settings':
      return 'mdi-cog-outline'
  }
}

function selectSection(section: SectionItem) {
  if (section.key === 'chat' && props.chatDisabled) {
    return
  }
  emit('update:modelValue', section.key)
}

function moveFocus(delta: number) {
  const buttons = itemEls.value
  if (buttons.length === 0) return

  const active = document.activeElement as HTMLElement | null
  const currentIndex = active ? buttons.indexOf(active) : -1
  const startIndex = currentIndex >= 0 ? currentIndex : Math.max(0, activeIndex.value)
  const nextIndex = (startIndex + delta + buttons.length) % buttons.length
  buttons[nextIndex]?.focus()
}

function focusPrev() {
  moveFocus(-1)
}

function focusNext() {
  moveFocus(1)
}
</script>

<template>
  <nav
    ref="railEl"
    class="messenger-nav-rail"
    aria-label="Основная навигация"
    @keydown.up.prevent="focusPrev"
    @keydown.down.prevent="focusNext"
  >
    <div
      class="messenger-nav-rail__indicator"
      aria-hidden="true"
      :style="indicatorStyle"
    />
    <button
      v-for="section in props.sections"
      :key="section.key"
      ref="itemElsRaw"
      type="button"
      class="messenger-nav-rail__item"
      :class="{ 'messenger-nav-rail__item--active': props.modelValue === section.key }"
      :aria-current="props.modelValue === section.key ? 'page' : undefined"
      :disabled="props.chatDisabled && section.key === 'chat'"
      @click="selectSection(section)"
    >
      <VIcon class="messenger-nav-rail__icon">
        {{ section.icon || sectionIcon(section.key) }}
      </VIcon>
      <span class="messenger-nav-rail__label">{{ section.shortTitle || section.title }}</span>
    </button>
  </nav>
</template>

<style scoped>
.messenger-nav-rail__item--active {
  color: rgb(var(--v-theme-on-secondary-container));
}
</style>
