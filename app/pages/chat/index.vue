<template>
  <div v-if="pending" class="auth-root glass-page">
    <div class="auth-card glass-surface">
      <p class="auth-secondary__title">Standalone Chat</p>
      <div class="auth-progress" aria-hidden="true">
        <span class="auth-progress__label">[ ОТКРЫВАЕМ ЧАТ ]</span>
        <span class="auth-progress__line"></span>
      </div>
    </div>
  </div>
  <StandaloneChatPanel v-else-if="authState?.authenticated && authState.user" :user="authState.user" />
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

type AuthState = {
  authenticated: boolean
  user: {
    id: string
    login: string
    displayName: string
    nickname?: string
    createdAt: string
  } | null
}

const { data, pending } = useFetch<AuthState>('/api/chat/auth/me', {
  server: false,
  immediate: true,
})

const authState = computed(() => data.value || null)

watchEffect(async () => {
  if (pending.value) return
  if (!authState.value?.authenticated) {
    await navigateTo('/chat/login')
  }
})
</script>