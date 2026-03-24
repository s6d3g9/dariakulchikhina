<script setup lang="ts">
const auth = useMessengerAuth()
const install = useMessengerInstall()
const loginField = ref<{ $el?: HTMLElement } | null>(null)
const passwordField = ref<{ $el?: HTMLElement } | null>(null)
const inputCleanupHandlers: Array<() => void> = []
const form = reactive({
  login: '',
  password: '',
})
const errorMessage = ref('')
const pending = ref(false)
const installActionLabel = computed(() => install.installPending.value ? 'Запрашиваем установку...' : 'Установить как приложение')

onMounted(async () => {
  await auth.hydrate()
  await nextTick()
  bindInputKeyboardFlow()
  if (auth.user.value) {
    await navigateTo('/')
  }
})

onUpdated(() => {
  bindInputKeyboardFlow()
})

onBeforeUnmount(() => {
  for (const cleanup of inputCleanupHandlers.splice(0)) {
    cleanup()
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

function focusField(field: { $el?: HTMLElement } | null) {
  const input = field?.$el?.querySelector('input, textarea')
  if (input instanceof HTMLElement) {
    input.focus()
  }
}

function focusPasswordField() {
  focusField(passwordField.value)
}

function getFieldInput(field: { $el?: HTMLElement } | null) {
  const input = field?.$el?.querySelector('input, textarea')
  return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
    ? input
    : null
}

function bindInputKeyboardFlow() {
  for (const cleanup of inputCleanupHandlers.splice(0)) {
    cleanup()
  }

  const loginInput = getFieldInput(loginField.value)
  const passwordInput = getFieldInput(passwordField.value)

  if (loginInput) {
    const handleLoginEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      passwordInput?.focus()
    }

    loginInput.addEventListener('keydown', handleLoginEnter)
    inputCleanupHandlers.push(() => loginInput.removeEventListener('keydown', handleLoginEnter))
  }

  if (passwordInput) {
    const handlePasswordEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      void submit()
    }

    passwordInput.addEventListener('keydown', handlePasswordEnter)
    inputCleanupHandlers.push(() => passwordInput.removeEventListener('keydown', handlePasswordEnter))
  }
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
            ref="loginField"
            v-model="form.login"
            class="auth-field"
            label="Логин"
            color="primary"
            base-color="primary"
            variant="outlined"
            autocomplete="username"
            enterkeyhint="next"
            required
          />

          <VTextField
            ref="passwordField"
            v-model="form.password"
            class="auth-field"
            label="Пароль"
            color="primary"
            base-color="primary"
            variant="outlined"
            type="password"
            autocomplete="current-password"
            enterkeyhint="go"
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