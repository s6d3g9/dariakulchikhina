<script setup lang="ts">
import type { MessengerSectionKey } from '../../composables/useMessengerSections'

const { sections } = useMessengerSections()
const auth = useMessengerAuth()
const navigation = useMessengerConversationState()
const realtime = useMessengerRealtime()
const calls = useMessengerCalls()
const viewport = useMessengerViewport()
const settingsModel = useMessengerSettings()

const activeTitle = computed(() => sections.find(section => section.key === navigation.activeSection.value)?.shortTitle ?? 'Чаты')
const showHero = computed(() => navigation.activeSection.value === 'settings')
const showUnifiedBottomControls = computed(() => navigation.activeSection.value === 'chat' && !viewport.keyboardOpen.value)

function navIconName(section: MessengerSectionKey) {
  switch (section) {
    case 'chat':
      return 'chat'
    case 'chats':
      return 'chats'
    case 'contacts':
      return 'contacts'
    case 'settings':
      return 'settings'
  }
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

async function logout() {
  calls.reset()
  realtime.disconnect()
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div
    class="messenger-shell"
    :class="{
      'messenger-shell--immersive': !showHero,
      'messenger-shell--chat-idle-controls': showUnifiedBottomControls,
    }"
    :data-messenger-keyboard="viewport.keyboardOpen.value ? 'open' : 'closed'"
  >
    <div class="messenger-aurora messenger-aurora--one" />
    <div class="messenger-aurora messenger-aurora--two" />
    <div class="messenger-aurora messenger-aurora--three" />

    <section v-if="showHero" class="hero-block">
      <div class="hero-row">
        <div class="hero-badge-row">
          <p class="hero-kicker">Standalone Messenger</p>
          <span class="glass-pill" :class="{ 'glass-pill--live': realtime.connected.value }">
            {{ realtime.connected.value ? 'Live Sync' : realtime.connecting.value ? 'Connecting' : 'Offline Sync' }}
          </span>
        </div>
        <button type="button" class="action-btn action-btn--ghost" @click="logout">
          <MessengerIcon name="logout" :size="18" />
          Выйти
        </button>
      </div>
      <h1>{{ activeTitle }}</h1>
      <p class="hero-text">
        Отдельный liquid glass messenger с direct-чатами, контактами, приглашениями и живым обновлением событий.
      </p>
      <div v-if="auth.user.value" class="hero-presence">
        <p class="hero-user">{{ auth.user.value.displayName }}</p>
        <p class="hero-user hero-user--muted">@{{ auth.user.value.login }}</p>
      </div>
    </section>

    <MessengerChatSection v-if="navigation.activeSection.value === 'chat'" />
    <MessengerChatsSection v-else-if="navigation.activeSection.value === 'chats'" />
    <MessengerContactsSection v-else-if="navigation.activeSection.value === 'contacts'" />
    <MessengerSettingsSection v-else />

    <MessengerCallOverlay />

    <nav class="bottom-nav" aria-label="Основные экраны мессенджера">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': navigation.activeSection.value === section.key }"
        :aria-label="section.shortTitle"
        @click="navigation.openSection(section.key as MessengerSectionKey)"
      >
        <span class="bottom-nav__icon" aria-hidden="true">
          <MessengerIcon :name="navIconName(section.key as MessengerSectionKey)" :size="18" />
        </span>
        <span class="bottom-nav__label">{{ section.shortTitle }}</span>
      </button>
    </nav>
  </div>
</template>
