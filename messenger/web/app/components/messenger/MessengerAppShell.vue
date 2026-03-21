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
      return 'stack'
    case 'contacts':
      return 'users'
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
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 7.75V6.5A1.75 1.75 0 0 1 11.75 4.75h5.75A1.75 1.75 0 0 1 19.25 6.5v11a1.75 1.75 0 0 1-1.75 1.75h-5.75A1.75 1.75 0 0 1 10 17.5v-1.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            <path d="M13.75 12H5.25M8.5 8.75 5.25 12l3.25 3.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
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
          <svg v-if="navIconName(section.key as MessengerSectionKey) === 'chat'" viewBox="0 0 24 24">
            <path d="M7.5 18.25 4.75 19l.75-2.55V8.25A2.5 2.5 0 0 1 8 5.75h8A2.5 2.5 0 0 1 18.5 8.25v5.5a2.5 2.5 0 0 1-2.5 2.5H9.45l-1.95 2Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          <svg v-else-if="navIconName(section.key as MessengerSectionKey) === 'stack'" viewBox="0 0 24 24">
            <path d="M6.75 6.75h10.5A1.75 1.75 0 0 1 19 8.5v5A1.75 1.75 0 0 1 17.25 15.25H6.75A1.75 1.75 0 0 1 5 13.5v-5a1.75 1.75 0 0 1 1.75-1.75ZM8.25 15.25v1a1.75 1.75 0 0 0 1.75 1.75h7.25A1.75 1.75 0 0 0 19 16.25v-5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          <svg v-else-if="navIconName(section.key as MessengerSectionKey) === 'users'" viewBox="0 0 24 24">
            <path d="M9 11.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM15.75 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM4.75 17a4.25 4.25 0 0 1 8.5 0M13.25 17a3.5 3.5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="m12 4.75 1.11 1.78 2.06.35.56 2.02 1.9.91-.37 2.05 1.37 1.57-1.37 1.57.37 2.05-1.9.91-.56 2.02-2.06.35L12 19.25l-1.11 1.78-2.06-.35-.56-2.02-1.9-.91.37-2.05-1.37-1.57 1.37-1.57-.37-2.05 1.9-.91.56-2.02 2.06-.35L12 4.75Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
            <path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
          </svg>
        </span>
        <span class="bottom-nav__label">{{ section.shortTitle }}</span>
      </button>
    </nav>
  </div>
</template>
