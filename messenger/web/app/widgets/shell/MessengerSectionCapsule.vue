<script setup lang="ts">
import type { MessengerSectionKey } from './model/useMessengerSections'
import { sectionIcon } from './composables/sectionIcon'

const props = defineProps<{
  sectionKey: MessengerSectionKey
}>()

const { sections } = useMessengerSections()
const navigation = useMessengerConversationState()
const menuOpen = ref(false)

const currentSection = computed(() =>
  sections.value.find(s => s.key === props.sectionKey),
)

const menuItems = computed(() =>
  sections.value
    .filter(s => s.key !== props.sectionKey)
    .map(s => ({
      key: s.key,
      title: s.title,
      icon: sectionIcon(s.key),
    })),
)

function onNavigate(key: MessengerSectionKey) {
  navigation.openSection(key)
}
</script>

<template>
  <header class="chat-header chat-header--section">
    <div class="chat-header__toolbar chat-header__toolbar--section">
      <div class="chat-header__nav-group">
        <VMenu
          v-model="menuOpen"
          location="bottom start"
          offset="8"
          :close-on-content-click="true"
        >
          <template #activator="{ props: menuProps }">
            <button
              type="button"
              class="chat-header__section-chip"
              :class="{ 'chat-header__section-chip--open': menuOpen }"
              :aria-label="`Открыть список разделов. Текущий: ${currentSection?.title ?? ''}`"
              :title="currentSection?.title"
              v-bind="menuProps"
            >
              <VIcon :size="24" class="chat-header__section-chip-icon">{{ sectionIcon(sectionKey) }}</VIcon>
              <span class="chat-header__section-chip-label">{{ currentSection?.title }}</span>
              <VIcon :size="14" class="chat-header__section-chip-caret" aria-hidden="true">
                {{ menuOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </VIcon>
            </button>
          </template>
          <VList class="chat-header__section-menu" density="comfortable" nav bg-color="surface-container-highest">
            <VListItem
              v-for="item in menuItems"
              :key="item.key"
              @click="onNavigate(item.key)"
            >
              <template #prepend>
                <VIcon :size="18" class="mr-2">{{ item.icon }}</VIcon>
              </template>
              <VListItemTitle>{{ item.title }}</VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </div>

      <div class="chat-header__main-rail chat-header__main-rail--section">
        <slot name="main" />
      </div>
    </div>
    <slot />
  </header>
</template>
