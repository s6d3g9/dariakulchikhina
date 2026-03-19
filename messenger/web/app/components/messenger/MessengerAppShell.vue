<script setup lang="ts">
import type { MessengerSectionKey } from '../../composables/useMessengerSections'

const { sections } = useMessengerSections()
const auth = useMessengerAuth()
const activeSection = ref<MessengerSectionKey>('chats')

const activeTitle = computed(() => sections.find(section => section.key === activeSection.value)?.shortTitle ?? 'Чаты')

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="messenger-shell">
    <section class="hero-block">
      <div class="hero-row">
        <p class="hero-kicker">Standalone Messenger</p>
        <button type="button" class="action-btn" @click="logout">Выйти</button>
      </div>
      <h1>{{ activeTitle }}</h1>
      <p class="hero-text">
        Отдельный клиент нового мессенджера. Следующий шаг после shell — auth, discovery, invites и direct chats.
      </p>
      <p v-if="auth.user.value" class="hero-user">{{ auth.user.value.displayName }} · @{{ auth.user.value.login }}</p>
    </section>

    <MessengerChatSection v-if="activeSection === 'chat'" />
    <MessengerChatsSection v-else-if="activeSection === 'chats'" />
    <MessengerContactsSection v-else-if="activeSection === 'contacts'" />
    <MessengerSettingsSection v-else />

    <nav class="bottom-nav" aria-label="Основные экраны мессенджера">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': activeSection === section.key }"
        @click="activeSection = section.key"
      >
        {{ section.shortTitle }}
      </button>
    </nav>
  </div>
</template>