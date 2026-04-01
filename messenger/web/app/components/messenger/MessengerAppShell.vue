<script setup lang="ts">
import type { MessengerSectionKey } from '../../composables/useMessengerSections'

const auth = useMessengerAuth()
const navigation = useMessengerConversationState()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
const viewport = useMessengerViewport()
const settingsModel = useMessengerSettings()
const { agentsEnabled } = useMessengerFeatures()
const { sections } = useMessengerSections()

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

function sectionIcon(section: MessengerSectionKey) {
  switch (section) {
    case 'chat':
      return 'mdi-message-outline'
    case 'chats':
      return 'mdi-message-text-outline'
    case 'contacts':
      return 'mdi-account-multiple-outline'
    case 'agents':
      return 'mdi-robot-outline'
    case 'settings':
      return 'mdi-cog-outline'
  }
}

function openNavSection(section: MessengerSectionKey) {
  if (section === 'chat' && chatDisabled.value) {
    return
  }

  navValue.value = section
}

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
  if (calls.activeCall.value || calls.incomingCall.value) return
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
      <div class="messenger-workspace">
        <aside class="messenger-desktop-nav" aria-label="Боковая навигация Messenger">
          <div class="messenger-desktop-nav__head">
            <p class="messenger-desktop-nav__title">Разделы</p>
          </div>

          <nav class="messenger-desktop-nav__list" aria-label="Разделы Messenger">
            <button
              v-for="section in sections"
              :key="section.key"
              type="button"
              class="messenger-desktop-nav__item"
              :class="{ 'messenger-desktop-nav__item--active': navValue === section.key }"
              :disabled="section.key === 'chat' && chatDisabled"
              @click="openNavSection(section.key)"
            >
              <span class="messenger-desktop-nav__label">{{ section.title }}</span>
            </button>
          </nav>
        </aside>

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
          <MessengerAgentsSection
            v-if="agentsEnabled"
            v-show="navigation.activeSection.value === 'agents'"
          />
          <MessengerSettingsSection
            v-show="navigation.activeSection.value === 'settings'"
            @logout="logout"
          />
        </div>
      </div>

      <!-- Звонок (overlay) -->
      <MessengerCallOverlay />

      <!-- Bottom Navigation Bar (кастомный, не VBottomNavigation — чтобы оставался в flex-потоке) -->
      <nav
        v-show="showBottomNav"
        class="messenger-bottom-nav"
        aria-label="Основная навигация"
      >
        <button
          type="button"
          class="messenger-nav-btn"
          :class="{ 'messenger-nav-btn--active': navValue === 'chat' }"
          :disabled="chatDisabled"
          @click="navValue = 'chat'"
        >
          <VIcon class="messenger-nav-icon">mdi-message-outline</VIcon>
        </button>

        <button
          type="button"
          class="messenger-nav-btn"
          :class="{ 'messenger-nav-btn--active': navValue === 'chats' }"
          @click="navValue = 'chats'"
        >
          <VIcon class="messenger-nav-icon">mdi-message-text-outline</VIcon>
        </button>

        <button
          type="button"
          class="messenger-nav-btn"
          :class="{ 'messenger-nav-btn--active': navValue === 'contacts' }"
          @click="navValue = 'contacts'"
        >
          <VIcon class="messenger-nav-icon">mdi-account-multiple-outline</VIcon>
        </button>

        <button
          v-if="agentsEnabled"
          type="button"
          class="messenger-nav-btn"
          :class="{ 'messenger-nav-btn--active': navValue === 'agents' }"
          @click="navValue = 'agents'"
        >
          <VIcon class="messenger-nav-icon">mdi-robot-outline</VIcon>
        </button>

        <button
          type="button"
          class="messenger-nav-btn"
          :class="{ 'messenger-nav-btn--active': navValue === 'settings' }"
          @click="navValue = 'settings'"
        >
          <VIcon class="messenger-nav-icon">mdi-cog-outline</VIcon>
        </button>
      </nav>
    </div>
  </VMain>
</template>
