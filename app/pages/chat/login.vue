<template>
  <section class="auth-root glass-page">
    <div class="auth-card glass-surface">
      <div class="auth-head">
        <p class="auth-secondary__title">Standalone Chat</p>
        <h1 class="auth-title">Вход</h1>
        <p class="auth-subtitle">Отдельная ссылка без проектных меню. Войдите и откройте direct-чат с любым зарегистрированным участником.</p>
      </div>

      <form @submit.prevent="submit">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label>Логин</label>
            <GlassInput
              v-model="form.login"
              name="login"
              type="text"
              class=" auth-input"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              inputmode="text"
              required
            />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <GlassInput
              v-model="form.password"
              name="password"
              type="password"
              class=" auth-input"
              autocomplete="current-password"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              required
            />
          </div>
        </div>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

        <div v-if="loading" class="auth-progress" aria-hidden="true">
          <span class="auth-progress__label">[ ВХОД В ЧАТ ]</span>
          <span class="auth-progress__line"></span>
        </div>

        <GlassButton variant="primary" type="submit" class=" auth-submit" :disabled="loading">
          {{ loading ? 'Вход...' : 'Войти в чат' }}
        </GlassButton>
      </form>

      <div class="auth-links">
        <NuxtLink to="/chat/register">Регистрация</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: false })

type AuthState = {
  authenticated: boolean
}

const form = reactive({ login: '', password: '' })
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
    await $fetch('/api/chat/auth/login', {
      method: 'POST',
      body: {
        login: form.login,
        password: form.password,
      },
      headers: csrfHeaders(),
    })
    await navigateTo('/chat')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.data?.message || 'Не удалось войти в чат'
  } finally {
    loading.value = false
  }
}
</script>