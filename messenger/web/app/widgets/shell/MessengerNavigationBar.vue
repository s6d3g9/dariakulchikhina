<script setup lang="ts">
import type { MessengerSectionKey } from './model/useMessengerSections'

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
</script>

<template>
  <nav
    class="messenger-bottom-nav"
    aria-label="Основная навигация"
  >
    <button
      v-for="section in props.sections"
      :key="section.key"
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
