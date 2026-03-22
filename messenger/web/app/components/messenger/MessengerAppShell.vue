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
const connectionStatusLabel = computed(() => {
  if (realtime.connected.value) {
    return 'Live Sync'
  }

  if (realtime.connecting.value) {
    return 'Connecting'
  }

  return 'Offline Sync'
})
const connectionStatusColor = computed(() => {
  if (realtime.connected.value) {
    return 'success'
  }

  if (realtime.connecting.value) {
    return 'warning'
  }

  return 'secondary'
})
const activeSectionModel = computed<MessengerSectionKey>({
  get: () => navigation.activeSection.value,
  set: (value) => navigation.openSection(value),
})

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

watch(() => navigation.activeSection.value, async (nextSection, previousSection) => {
  if (!import.meta.client || nextSection === previousSection) {
    return
  }

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
      :class="{
        'messenger-shell--immersive': !showHero,
        'messenger-shell--chat-idle-controls': showUnifiedBottomControls,
      }"
      :data-messenger-keyboard="viewport.keyboardOpen.value ? 'open' : 'closed'"
    >
      <div class="messenger-aurora messenger-aurora--one" />
      <div class="messenger-aurora messenger-aurora--two" />
      <div class="messenger-aurora messenger-aurora--three" />

      <VCard v-if="showHero" class="hero-block hero-block--vuetify" color="surface" variant="tonal">
        <VCardText class="hero-block__body">
          <div class="hero-row hero-row--vuetify">
            <div class="hero-badge-row">
              <p class="hero-kicker">Standalone Messenger</p>
              <VChip class="glass-pill glass-pill--vuetify" :color="connectionStatusColor" size="small" variant="tonal">
                {{ connectionStatusLabel }}
              </VChip>
            </div>
            <VBtn type="button" color="secondary" variant="tonal" @click="logout">
              Выйти
            </VBtn>
          </div>
          <h1>{{ activeTitle }}</h1>
          <p class="hero-text">
            Отдельный material-first messenger с direct-чатами, контактами, приглашениями и живым обновлением событий.
          </p>
          <div v-if="auth.user.value" class="hero-presence">
            <VChip size="small" variant="text">{{ auth.user.value.displayName }}</VChip>
            <VChip size="small" variant="text">@{{ auth.user.value.login }}</VChip>
          </div>
        </VCardText>
      </VCard>

      <MessengerChatSection v-if="navigation.activeSection.value === 'chat'" />
      <MessengerChatsSection v-else-if="navigation.activeSection.value === 'chats'" />
      <MessengerContactsSection v-else-if="navigation.activeSection.value === 'contacts'" />
      <MessengerSettingsSection v-else />

      <MessengerCallOverlay />

      <VBottomNavigation
        v-model="activeSectionModel"
        class="bottom-nav bottom-nav--vuetify"
        grow
        active
        aria-label="Основные экраны мессенджера"
      >
        <VBtn
          v-for="section in sections"
          :key="section.key"
          class="bottom-nav__item"
          :class="{ 'bottom-nav__item--active': navigation.activeSection.value === section.key }"
          :value="section.key"
        >
          <span class="bottom-nav__icon" aria-hidden="true">
            <MessengerIcon :name="navIconName(section.key as MessengerSectionKey)" :size="18" />
          </span>
          <span class="bottom-nav__label">{{ section.shortTitle }}</span>
        </VBtn>
      </VBottomNavigation>
    </div>
  </VMain>
</template>
