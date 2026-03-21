<script setup lang="ts">
const auth = useMessengerAuth()
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
  if (auth.user.value) {
    await navigateTo('/')
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
</script>

<template>
  <div class="auth-shell">
    <section class="auth-card">
      <p class="hero-kicker">Messenger Auth</p>
      <h1>Регистрация</h1>
      <p class="hero-text">Создайте отдельный аккаунт для нового standalone messenger.</p>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field" :class="{ 'auth-field--invalid': visibleDisplayNameError }">
          <span>Имя</span>
          <input v-model="form.displayName" type="text" class="inline-input" autocomplete="name" minlength="2" maxlength="80" required @input="markTouched('displayName')" @blur="markTouched('displayName')">
          <span v-if="visibleDisplayNameError" class="auth-field__error">{{ visibleDisplayNameError }}</span>
        </label>

        <label class="auth-field" :class="{ 'auth-field--invalid': visibleLoginError }">
          <span>Логин</span>
          <input v-model="form.login" type="text" class="inline-input" autocomplete="username" autocapitalize="off" spellcheck="false" inputmode="text" minlength="3" maxlength="32" required @input="markTouched('login')" @blur="markTouched('login')">
          <span class="auth-field__hint">Латиница, цифры и символы . _ -</span>
          <span v-if="visibleLoginError" class="auth-field__error">{{ visibleLoginError }}</span>
        </label>

        <label class="auth-field" :class="{ 'auth-field--invalid': visiblePasswordError }">
          <span>Пароль</span>
          <input v-model="form.password" type="password" class="inline-input" autocomplete="new-password" minlength="8" maxlength="128" required @input="markTouched('password')" @blur="markTouched('password')">
          <span v-if="visiblePasswordError" class="auth-field__error">{{ visiblePasswordError }}</span>
        </label>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

        <button type="submit" class="action-btn" :disabled="!canSubmit">
          {{ pending ? 'Создаем...' : 'Создать аккаунт' }}
        </button>
      </form>

      <NuxtLink to="/login" class="auth-link">У меня уже есть аккаунт</NuxtLink>
    </section>
  </div>
</template>