<script setup lang="ts">
const auth = useMessengerAuth()
const form = reactive({
  displayName: '',
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
    await auth.register(form)
    await navigateTo('/')
  } catch {
    errorMessage.value = 'Не удалось зарегистрироваться. Возможно, такой логин уже существует.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-shell">
    <section class="auth-card">
      <p class="hero-kicker">Messenger Auth</p>
      <h1>Регистрация</h1>
      <p class="hero-text">Создайте отдельный аккаунт для нового standalone messenger.</p>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field">
          <span>Имя</span>
          <input v-model="form.displayName" type="text" class="inline-input" autocomplete="name" required>
        </label>

        <label class="auth-field">
          <span>Логин</span>
          <input v-model="form.login" type="text" class="inline-input" autocomplete="username" required>
        </label>

        <label class="auth-field">
          <span>Пароль</span>
          <input v-model="form.password" type="password" class="inline-input" autocomplete="new-password" required>
        </label>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

        <button type="submit" class="action-btn" :disabled="pending">
          {{ pending ? 'Создаем...' : 'Создать аккаунт' }}
        </button>
      </form>

      <NuxtLink to="/login" class="auth-link">У меня уже есть аккаунт</NuxtLink>
    </section>
  </div>
</template>