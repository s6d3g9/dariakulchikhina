<script setup lang="ts">
const auth = useMessengerAuth()
const form = reactive({
  login: '',
  password: '',
})
const errorMessage = ref('')
const pending = ref(false)

onMounted(async () => {
  await auth.hydrate()
  if (auth.user.value) {
    await navigateTo('/')
  }
})

async function submit() {
  errorMessage.value = ''
  pending.value = true

  try {
    await auth.login(form)
    await navigateTo('/')
  } catch {
    errorMessage.value = 'Не удалось войти. Проверьте логин и пароль.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-shell auth-shell--vuetify">
    <VCard class="auth-card auth-card--vuetify" color="surface" variant="elevated">
      <VCardText class="auth-card__body">
        <div class="auth-card__copy">
          <p class="auth-card__eyebrow">Messenger Auth</p>
          <h1>Вход</h1>
          <p class="hero-text">Отдельный вход для standalone messenger на новой material-базе.</p>
        </div>

        <VForm class="auth-form auth-form--vuetify" @submit.prevent="submit">
          <VTextField
            v-model="form.login"
            label="Логин"
            autocomplete="username"
            required
          />

          <VTextField
            v-model="form.password"
            label="Пароль"
            type="password"
            autocomplete="current-password"
            required
          />

          <VAlert v-if="errorMessage" type="error">
            {{ errorMessage }}
          </VAlert>

          <VBtn type="submit" block :disabled="pending">
            {{ pending ? 'Входим...' : 'Войти' }}
          </VBtn>
        </VForm>
      </VCardText>

      <VCardActions class="auth-card__actions">
        <p class="auth-link-caption">Нет аккаунта?</p>
        <NuxtLink to="/register" class="auth-link auth-link--vuetify">Регистрация</NuxtLink>
      </VCardActions>
    </VCard>
  </div>
</template>