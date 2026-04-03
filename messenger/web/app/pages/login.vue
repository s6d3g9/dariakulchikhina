<script setup lang="ts">
const auth = useMessengerAuth()
const install = useMessengerInstall()
const route = useRoute()
const loginField = ref<{ focus: () => void } | null>(null)
const passwordField = ref<{ focus: () => void } | null>(null)
const form = reactive({
  login: '',
  password: '',
})
const errorMessage = ref('')
const pending = ref(false)
const touched = reactive({
  login: false,
  password: false,
})
const installActionLabel = computed(() => install.installPending.value ? 'Запрашиваем установку...' : 'Установить как приложение')
const normalizedLogin = computed(() => form.login.trim().toLowerCase())
const loginError = computed(() => touched.login && !normalizedLogin.value.length ? 'Укажите логин.' : '')
const passwordError = computed(() => touched.password && !form.password.length ? 'Укажите пароль.' : '')
const canSubmit = computed(() => !pending.value && normalizedLogin.value.length > 0 && form.password.length > 0)
const localTestLoginPending = ref(false)

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function isLocalTestHost() {
  if (!import.meta.client) {
    return false
  }

  return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
}

watch(() => form.login, (value) => {
  const normalized = value.toLowerCase().replace(/\s+/g, '')
  if (normalized !== value) {
    form.login = normalized
  }
})

onMounted(async () => {
  await auth.hydrate()
  if (auth.user.value) {
    await navigateTo('/')
    return
  }

  if (!isLocalTestHost()) {
    return
  }

  const testLogin = getQueryValue(route.query.testLogin).trim().toLowerCase()
  const testPassword = getQueryValue(route.query.testPassword)

  if (!testLogin || !testPassword || localTestLoginPending.value) {
    return
  }

  localTestLoginPending.value = true
  errorMessage.value = ''
  touched.login = true
  touched.password = true
  form.login = testLogin
  form.password = testPassword
  pending.value = true

  try {
    await auth.login({
      login: testLogin,
      password: testPassword,
    })

    const nextTarget = getQueryValue(route.query.next) || '/'
    await navigateTo(nextTarget)
  } catch {
    errorMessage.value = 'Не удалось войти. Проверьте логин и пароль.'
  } finally {
    pending.value = false
    localTestLoginPending.value = false
  }
})

async function submit() {
  errorMessage.value = ''
  touched.login = true
  touched.password = true

  if (!normalizedLogin.value.length || !form.password.length) {
    return
  }

  pending.value = true

  try {
    await auth.login({
      login: normalizedLogin.value,
      password: form.password,
    })
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

function queueFocus(action: () => void) {
  requestAnimationFrame(() => {
    action()
  })
}

function focusPasswordField() {
  queueFocus(() => {
    passwordField.value?.focus()
  })
}

function markTouched(field: keyof typeof touched) {
  touched[field] = true
}
</script>

<template>
  <div class="auth-shell auth-shell--vuetify">
    <VCard class="auth-card auth-card--vuetify" color="surface" variant="tonal">
      <VCardText class="auth-card__body">
        <div class="auth-card__copy">
          <p class="auth-card__eyebrow">Material 3 Messenger</p>
          <h1>Вход</h1>
          <p class="hero-text">Войдите в messenger и откройте чаты, контакты и агентов.</p>
        </div>

        <form class="auth-form auth-form--native" @submit.prevent="submit">
          <MessengerAuthField
            ref="loginField"
            v-model="form.login"
            label="Логин"
            autocomplete="username"
            enterkeyhint="next"
            :disabled="pending"
            required
            :error="loginError"
            @blur="markTouched('login')"
            @enter="focusPasswordField"
          />

          <MessengerAuthField
            ref="passwordField"
            v-model="form.password"
            label="Пароль"
            type="password"
            autocomplete="current-password"
            enterkeyhint="go"
            :disabled="pending"
            required
            :error="passwordError"
            @blur="markTouched('password')"
            @enter="submit"
          />

          <VAlert v-if="errorMessage" type="error" :icon="false" class="auth-alert">
            {{ errorMessage }}
          </VAlert>

          <VBtn type="submit" block :disabled="!canSubmit" variant="flat" class="auth-submit">
            <span class="auth-submit__content">
              <MessengerProgressCircular v-if="pending" class="auth-submit__progress" aria-label="Вход выполняется" indeterminate size="sm" />
              <span>{{ pending ? 'Входим...' : 'Войти' }}</span>
            </span>
          </VBtn>
        </form>

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
          <VAlert v-if="install.installMessage.value" type="info" :icon="false" class="mt-4 auth-alert">
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