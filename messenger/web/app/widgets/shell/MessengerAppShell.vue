<script setup lang="ts">
import type { MessengerSectionKey } from './model/useMessengerSections'

const auth = useMessengerAuth()
const route = useRoute()
const navigation = useMessengerConversationState()
const conversations = useMessengerConversations()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
const viewport = useMessengerViewport()
const settingsModel = useMessengerSettings()
const { agentsEnabled } = useMessengerFeatures()
const { sections } = useMessengerSections()
const localTestScenarioPending = ref(false)

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function isLocalTestHost() {
  if (!import.meta.client) {
    return false
  }

  return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
}

async function maybeRunLocalTestScenario() {
  if (!isLocalTestHost() || localTestScenarioPending.value) {
    return
  }

  const testPeerUserId = getQueryValue(route.query.testPeerUserId)
  const testCall = getQueryValue(route.query.testCall)
  const testFocusComposer = getQueryValue(route.query.testFocusComposer) === '1'

  if (!testPeerUserId && !testCall && !testFocusComposer) {
    return
  }

  localTestScenarioPending.value = true

  try {
    if (testPeerUserId) {
      await conversations.openDirectConversation(testPeerUserId)
    }

    if (testCall === 'audio' || testCall === 'video') {
      await nextTick()
      await calls.startOutgoingCall(testCall)
    }

    if (testFocusComposer) {
      await nextTick()
      requestAnimationFrame(() => {
        const composer = document.querySelector<HTMLElement>('[aria-label="Сообщение"]')
        composer?.focus()
        composer?.click()
      })
    }
  } finally {
    const nextQuery = { ...route.query }
    delete nextQuery.testLogin
    delete nextQuery.testPassword
    delete nextQuery.next
    delete nextQuery.testPeerUserId
    delete nextQuery.testCall
    delete nextQuery.testFocusComposer
    await navigateTo({ path: route.path, query: nextQuery }, { replace: true })
    localTestScenarioPending.value = false
  }
}

// Nav bar скрываем при открытой медиа-плашке или панели анализа через v-show.
// Скрытие при открытой клавиатуре — через CSS [data-messenger-keyboard='open']
// (синхронно с padding-bottom, без Vue-тикового race condition).
const showBottomNav = computed(() =>
  !navigation.mediaSheetOpen.value && !calls.analysisPanelOpen.value,
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
const detachedCallHeaderVisible = computed(() => {
  const activeConversationId = navigation.activeConversationId.value
  const incomingBoundToActiveChat = Boolean(
    navigation.activeSection.value === 'chat'
    && calls.incomingCall.value?.conversationId
    && calls.incomingCall.value.conversationId === activeConversationId,
  )
  const activeAudioCallBoundToActiveChat = Boolean(
    navigation.activeSection.value === 'chat'
    && calls.activeCall.value?.mode === 'audio'
    && calls.activeCall.value.conversationId === activeConversationId,
  )

  return Boolean(
    (calls.incomingCall.value && !incomingBoundToActiveChat)
    || (calls.activeCall.value?.mode === 'audio' && !activeAudioCallBoundToActiveChat),
  )
})

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
    case 'aidev':
      return 'mdi-rocket-launch-outline'
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

onMounted(() => {
  settingsModel.hydrate()
  void realtime.connect()
  void maybeRunLocalTestScenario()
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
      :data-messenger-analysis-panel="calls.analysisPanelOpen.value ? 'open' : 'closed'"
      :data-messenger-detached-call="detachedCallHeaderVisible ? 'open' : 'closed'"
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
          <MessengerAidevSection
            v-show="navigation.activeSection.value === 'aidev'"
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
          :class="{ 'messenger-nav-btn--active': navValue === 'aidev' }"
          @click="navValue = 'aidev'"
        >
          <VIcon class="messenger-nav-icon">mdi-rocket-launch-outline</VIcon>
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
