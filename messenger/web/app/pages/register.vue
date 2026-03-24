<script setup lang="ts">
const auth = useMessengerAuth()
const install = useMessengerInstall()
const displayNameField = ref<{ $el?: HTMLElement } | null>(null)
const loginField = ref<{ $el?: HTMLElement } | null>(null)
const passwordField = ref<{ $el?: HTMLElement } | null>(null)
const inputCleanupHandlers: Array<() => void> = []
const LOGIN_PATTERN = /^[a-z0-9._-]+$/

const form = reactive({
  displayName: '',
  login: '',
  password: '',
})
const errorMessage = ref('')
const pending = ref(false)
const touched = reactive({
  displayName: false,
  login: false,
  password: false,
})
const installActionLabel = computed(() => install.installPending.value ? 'Запрашиваем установку...' : 'Установить как приложение')

const trimmedDisplayName = computed(() => form.displayName.trim())
const normalizedLogin = computed(() => form.login.trim().toLowerCase())

const displayNameError = computed(() => {
  if (!trimmedDisplayName.value.length) {
    return 'Укажите имя.'
  }

  if (trimmedDisplayName.value.length < 2) {
    return 'Имя должно содержать минимум 2 символа.'
  }

  if (trimmedDisplayName.value.length > 80) {
    return 'Имя не должно превышать 80 символов.'
  }

  return ''
})

const loginError = computed(() => {
  if (!normalizedLogin.value.length) {
    return 'Укажите логин.'
  }

  if (normalizedLogin.value.length < 3) {
    return 'Логин должен содержать минимум 3 символа.'
  }

  if (normalizedLogin.value.length > 32) {
    return 'Логин не должен превышать 32 символа.'
  }

  if (!LOGIN_PATTERN.test(normalizedLogin.value)) {
    return 'Логин может содержать только латинские буквы, цифры и символы . _ -'
  }

  return ''
})

const passwordError = computed(() => {
  if (!form.password.length) {
    return 'Укажите пароль.'
  }

  if (form.password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов.'
  }

  if (form.password.length > 128) {
    return 'Пароль не должен превышать 128 символов.'
  }

  return ''
})

const hasClientValidationErrors = computed(() => Boolean(
  displayNameError.value || loginError.value || passwordError.value,
))

const canSubmit = computed(() => !pending.value && !hasClientValidationErrors.value)

const visibleDisplayNameError = computed(() => touched.displayName ? displayNameError.value : '')
const visibleLoginError = computed(() => touched.login ? loginError.value : '')
const visiblePasswordError = computed(() => touched.password ? passwordError.value : '')

watch(() => form.login, (value) => {
  const normalized = value.toLowerCase().replace(/\s+/g, '')
  if (normalized !== value) {
    form.login = normalized
  }
})

onMounted(async () => {
  await auth.hydrate()
  await nextTick()
  bindInputKeyboardFlow()
  if (auth.user.value) {
    await navigateTo('/')
  }
})

onBeforeUnmount(() => {
  for (const cleanup of inputCleanupHandlers.splice(0)) {
    cleanup()
  }
})

async function submit() {
  errorMessage.value = ''
  touched.displayName = true
  touched.login = true
  touched.password = true

  if (hasClientValidationErrors.value) {
    errorMessage.value = displayNameError.value || loginError.value || passwordError.value
    return
  }

  pending.value = true

  try {
    await auth.register({
      displayName: trimmedDisplayName.value,
      login: normalizedLogin.value,
      password: form.password,
    })
    await navigateTo('/')
  } catch (error) {
    errorMessage.value = resolveRegistrationError(error)
  } finally {
    pending.value = false
  }
}

function resolveRegistrationError(error: unknown) {
  const fallback = 'Не удалось зарегистрироваться. Попробуйте еще раз.'

  if (!error || typeof error !== 'object') {
    return fallback
  }

  const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined
  const errorCode = 'data' in error
    ? (error as { data?: { error?: string } }).data?.error
    : undefined

  if (statusCode === 409 || errorCode === 'USER_EXISTS') {
    return 'Этот логин уже занят.'
  }

  if (statusCode === 400 || errorCode === 'INVALID_PAYLOAD') {
    const trimmedDisplayName = form.displayName.trim()
    const trimmedLogin = form.login.trim()

    if (trimmedDisplayName.length < 2) {
      return 'Имя должно содержать минимум 2 символа.'
    }

    if (trimmedLogin.length < 3) {
      return 'Логин должен содержать минимум 3 символа.'
    }

    if (trimmedLogin.length > 32) {
      return 'Логин не должен превышать 32 символа.'
    }

    if (!LOGIN_PATTERN.test(trimmedLogin.toLowerCase())) {
      return 'Логин может содержать только латинские буквы, цифры и символы . _ -'
    }

    if (form.password.length < 8) {
      return 'Пароль должен содержать минимум 8 символов.'
    }

    return 'Проверьте имя, логин и пароль. Одна из форм заполнена неверно.'
  }

  return fallback
}

function markTouched(field: keyof typeof touched) {
  touched[field] = true
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

function focusLoginField() {
  focusField(loginField.value)
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

  const displayNameInput = getFieldInput(displayNameField.value)
  const loginInput = getFieldInput(loginField.value)
  const passwordInput = getFieldInput(passwordField.value)

  if (displayNameInput) {
    const handleDisplayNameEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      loginInput?.focus()
    }

    displayNameInput.addEventListener('keydown', handleDisplayNameEnter)
    inputCleanupHandlers.push(() => displayNameInput.removeEventListener('keydown', handleDisplayNameEnter))
  }

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
          <h1>Регистрация</h1>
          <p class="hero-text">Создайте аккаунт для messenger в обновлённом Material 3 интерфейсе без старого glass-shell.</p>
        </div>

        <VForm class="auth-form auth-form--vuetify" @submit.prevent="submit">
          <VTextField
            ref="displayNameField"
            v-model="form.displayName"
            class="auth-field"
            label="Имя"
            color="primary"
            base-color="primary"
            variant="outlined"
            autocomplete="name"
            enterkeyhint="next"
            minlength="2"
            maxlength="80"
            required
            :error-messages="visibleDisplayNameError ? [visibleDisplayNameError] : []"
            @update:model-value="markTouched('displayName')"
            @blur="markTouched('displayName')"
          />

          <VTextField
            ref="loginField"
            v-model="form.login"
            class="auth-field"
            label="Логин"
            color="primary"
            base-color="primary"
            variant="outlined"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            inputmode="text"
            enterkeyhint="next"
            minlength="3"
            maxlength="32"
            required
            hint="Латиница, цифры и символы . _ -"
            persistent-hint
            :error-messages="visibleLoginError ? [visibleLoginError] : []"
            @update:model-value="markTouched('login')"
            @blur="markTouched('login')"
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
            autocomplete="new-password"
            enterkeyhint="done"
            minlength="8"
            maxlength="128"
            required
            :error-messages="visiblePasswordError ? [visiblePasswordError] : []"
            @update:model-value="markTouched('password')"
            @blur="markTouched('password')"
          />

          <VAlert v-if="errorMessage" type="error">
            {{ errorMessage }}
          </VAlert>

          <VBtn type="submit" block :disabled="!canSubmit" variant="flat" class="auth-submit">
            <span class="auth-submit__content">
              <MessengerProgressCircular v-if="pending" class="auth-submit__progress" aria-label="Регистрация выполняется" indeterminate size="sm" />
              <span>{{ pending ? 'Создаем...' : 'Создать аккаунт' }}</span>
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
        <p class="auth-link-caption">Уже зарегистрированы?</p>
        <NuxtLink to="/login" class="auth-link auth-link--vuetify">У меня уже есть аккаунт</NuxtLink>
      </VCardActions>
    </VCard>
  </div>
</template>