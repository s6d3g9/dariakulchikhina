<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MessengerSectionKey } from './model/useMessengerSections'
import { useAnimatedNavIndicator } from './composables/useAnimatedNavIndicator'
import { sectionIcon } from './composables/sectionIcon'

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

const barEl = ref<HTMLElement | null>(null)
const itemElsRaw = ref<HTMLElement[]>([])
const itemEls = computed(() => itemElsRaw.value.filter(Boolean))

const activeIndex = computed(() =>
  props.sections.findIndex(section => section.key === props.modelValue),
)

const { indicatorStyle } = useAnimatedNavIndicator(barEl, itemEls, activeIndex, { axis: 'x' })

function selectSection(section: SectionItem) {
  if (section.key === 'chat' && props.chatDisabled) {
    return
  }
  emit('update:modelValue', section.key)
}
</script>

<template>
  <nav
    ref="barEl"
    class="messenger-bottom-nav"
    aria-label="Основная навигация"
  >
    <div
      class="messenger-bottom-nav__indicator"
      aria-hidden="true"
      :style="indicatorStyle"
    />
    <button
      v-for="section in props.sections"
      :key="section.key"
      ref="itemElsRaw"
      type="button"
      class="messenger-nav-btn"
      :class="{ 'messenger-nav-btn--active': props.modelValue === section.key }"
      :disabled="section.key === 'chat' && props.chatDisabled"
      @click="selectSection(section)"
    >
      <VIcon class="messenger-nav-icon">
        {{ section.icon || sectionIcon(section.key) }}
      </VIcon>
    </button>
  </nav>
</template>
