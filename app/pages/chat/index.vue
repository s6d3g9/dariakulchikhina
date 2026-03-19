<template>
  <div v-if="pending" class="chat-page-loading">[ LOADING... ]</div>
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

<style scoped>
.chat-page-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>