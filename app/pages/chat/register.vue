<template>
  <section class="chat-auth-page">
    <div class="chat-auth-box">
      <p class="chat-auth-eyebrow">Standalone Chat</p>
      <h1 class="chat-auth-title">Регистрация</h1>
      <p class="chat-auth-copy">Создайте отдельный chat-аккаунт и сразу попадите в защищённый direct-мессенджер.</p>

      <form class="chat-auth-form" @submit.prevent="submit">
        <label class="chat-auth-label" for="chat-register-name">Имя</label>
        <GlassInput id="chat-register-name" v-model="form.displayName" name="displayName" type="text" class=" chat-auth-input" autocomplete="name" autocapitalize="words" autocorrect="off" spellcheck="false" inputmode="text" required />

        <label class="chat-auth-label" for="chat-register-login">Логин</label>
        <GlassInput id="chat-register-login" v-model="form.login" name="login" type="text" class=" chat-auth-input" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" required />

        <label class="chat-auth-label" for="chat-register-password">Пароль</label>
        <GlassInput id="chat-register-password" v-model="form.password" name="password" type="password" class=" chat-auth-input" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" required />

        <p v-if="errorMessage" class="chat-auth-error">{{ errorMessage }}</p>

        <button type="submit" class="chat-auth-submit" :disabled="loading">
          {{ loading ? 'Создание...' : 'Создать chat-аккаунт' }}
        </button>
      </form>

      <NuxtLink to="/chat/login" class="chat-auth-link">Уже есть аккаунт</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: false })

type AuthState = {
  authenticated: boolean
}

const form = reactive({ displayName: '', login: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const { data, pending } = useFetch<AuthState>('/api/chat/auth/me', {
  server: false,
  immediate: true,
})

watchEffect(async () => {
  if (pending.value) return
  if (data.value?.authenticated) {
    await navigateTo('/chat')
  }
})

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await ensureCsrfCookie()
    await $fetch('/api/chat/auth/register', {
      method: 'POST',
      body: {
        displayName: form.displayName,
        login: form.login,
        password: form.password,
      },
      headers: csrfHeaders(),
    })
    await navigateTo('/chat')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.data?.message || 'Не удалось создать chat-аккаунт'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.chat-auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.chat-auth-box {
  width: min(100%, 520px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 24px;
  display: grid;
  gap: 14px;
}

.chat-auth-eyebrow,
.chat-auth-label,
.chat-auth-link {
  margin: 0;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.chat-auth-title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2.4rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chat-auth-copy,
.chat-auth-error {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.5;
}

.chat-auth-form {
  display: grid;
  gap: 10px;
}

.chat-auth-input,
.chat-auth-submit {
  width: 100%;
  min-height: 48px;
  font-size: 16px;
}

.chat-auth-submit {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chat-auth-error {
  color: var(--ds-error, #d96b6b);
}

.chat-auth-link {
  color: inherit;
  text-decoration: none;
}

@supports (padding: env(safe-area-inset-top)) {
  .chat-auth-page {
    padding-top: max(24px, env(safe-area-inset-top));
    padding-right: max(24px, env(safe-area-inset-right));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
    padding-left: max(24px, env(safe-area-inset-left));
  }
}
</style>