<script setup lang="ts">
import type { MessengerSectionKey } from '../../composables/useMessengerSections'

const auth = useMessengerAuth()
const navigation = useMessengerConversationState()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
const viewport = useMessengerViewport()
const settingsModel = useMessengerSettings()

// Nav bar скрываем при открытой медиа-плашке или клавиатуре
const showBottomNav = computed(() =>
  !navigation.mediaSheetOpen.value && !viewport.keyboardOpen.value,
)

// Активный раздел для VBottomNavigation
const navValue = computed<MessengerSectionKey>({
  get: () => {
    // Если в chat, но нет открытого диалога — показываем chats
    if (navigation.activeSection.value === 'chat' && !navigation.activeConversationId.value) {
      return 'chats'
    }
    return navigation.activeSection.value
  },
  set: (val) => {
    if (val === 'chat' && !navigation.activeConversationId.value) return
    navigation.openSection(val)
  },
})

const chatDisabled = computed(() => !navigation.activeConversationId.value)

let detachViewport: (() => void) | null = null

onMounted(() => {
  settingsModel.hydrate()
  detachViewport = viewport.attach()
  void realtime.connect()
})

onBeforeUnmount(() => {
  detachViewport?.()
  detachViewport = null
})

watch(() => navigation.activeSection.value, async (nextSection, previousSection) => {
  if (!import.meta.client || nextSection === previousSection) return
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'auto' })
})

async function logout() {
  calls.reset()
  realtime.disconnect()
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <VMain>
    <div
      class="messenger-shell"
      :data-messenger-keyboard="viewport.keyboardOpen.value ? 'open' : 'closed'"
      :data-messenger-media-sheet="navigation.mediaSheetOpen.value ? 'open' : 'closed'"
    >
      <!-- Активная секция (v-show сохраняет стейт при переключении) -->
      <div class="messenger-section-wrap">
        <MessengerChatSection
          v-show="navigation.activeSection.value === 'chat'"
        />
        <MessengerChatsSection
          v-show="navigation.activeSection.value === 'chats'"
        />
        <MessengerContactsSection
          v-show="navigation.activeSection.value === 'contacts'"
        />
        <MessengerSettingsSection
          v-show="navigation.activeSection.value === 'settings'"
          @logout="logout"
        />
      </div>

      <!-- Звонок (overlay) -->
      <MessengerCallOverlay />

      <!-- Bottom Navigation Bar -->
      <VBottomNavigation
        v-model="navValue"
        v-show="showBottomNav"
        class="messenger-bottom-nav"
        bg-color="surface-container-low"
        grow
        elevation="0"
        aria-label="Основная навигация"
      >
        <VBtn value="chats" class="messenger-nav-btn">
          <VIcon class="messenger-nav-icon">mdi-message-text-outline</VIcon>
          <span class="messenger-nav-label">Чаты</span>
        </VBtn>

        <VBtn
          value="chat"
          class="messenger-nav-btn"
          :disabled="chatDisabled"
        >
          <VIcon class="messenger-nav-icon">mdi-message-outline</VIcon>
          <span class="messenger-nav-label">Чат</span>
        </VBtn>

        <VBtn value="contacts" class="messenger-nav-btn">
          <VIcon class="messenger-nav-icon">mdi-account-multiple-outline</VIcon>
          <span class="messenger-nav-label">Контакты</span>
        </VBtn>

        <VBtn value="settings" class="messenger-nav-btn">
          <VIcon class="messenger-nav-icon">mdi-cog-outline</VIcon>
          <span class="messenger-nav-label">Настройки</span>
        </VBtn>
      </VBottomNavigation>
    </div>
  </VMain>
</template>
