<script setup lang="ts">
const auth = useMessengerAuth()
const install = useMessengerInstall()
const form = reactive({
  login: '',
  password: '',
})
const errorMessage = ref('')
const pending = ref(false)
const installActionLabel = computed(() => install.installPending.value ? 'Запрашиваем установку...' : 'Установить как приложение')

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

async function installMessengerApp() {
  await install.installApp()
}

function showManualInstallHelp() {
  install.noteManualInstall()
}
</script>

<template>
  <div class="auth-shell auth-shell--vuetify">
    <VCard class="auth-card auth-card--vuetify" color="surface" variant="tonal">
      <VCardText class="auth-card__body">
        <div class="auth-card__copy">
          <p class="auth-card__eyebrow">Material 3 Messenger</p>
          <h1>Вход</h1>
          <p class="hero-text">Войдите в отдельный messenger с плотными tonal-surfaces, спокойной иерархией и единым Material 3 ритмом.</p>
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

          <VBtn type="submit" block :disabled="pending" variant="flat" class="auth-submit">
            <span class="auth-submit__content">
              <MessengerProgressCircular v-if="pending" class="auth-submit__progress" aria-label="Вход выполняется" indeterminate size="sm" />
              <span>{{ pending ? 'Входим...' : 'Войти' }}</span>
            </span>
          </VBtn>
        </VForm>

        <div class="auth-install-card">
          <p class="auth-install-card__title">Открывать как приложение</p>
          <p class="auth-install-card__meta">{{ install.installStatusLabel.value }}</p>
          <div class="auth-install-card__actions">
            <VBtn
              v-if="!install.installed.value"
              type="button"
              color="primary"
              variant="flat"
              :loading="install.installPending.value"
              :disabled="install.installPending.value"
              @click="installMessengerApp()"
            >
              {{ installActionLabel }}
            </VBtn>
            <VBtn
              type="button"
              color="secondary"
              variant="tonal"
              @click="showManualInstallHelp()"
            >
              {{ install.installed.value ? 'Проверить режим приложения' : 'Как установить вручную' }}
            </VBtn>
          </div>
          <VAlert v-if="install.installMessage.value" type="info" class="mt-4">
            {{ install.installMessage.value }}
          </VAlert>
        </div>
      </VCardText>

      <VCardActions class="auth-card__actions">
        <p class="auth-link-caption">Нет аккаунта?</p>
        <NuxtLink to="/register" class="auth-link auth-link--vuetify">Регистрация</NuxtLink>
      </VCardActions>
    </VCard>
  </div>
</template>