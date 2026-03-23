<template>
  <div class="auth-root glass-page">
    <div class="auth-card glass-surface">
      <div class="auth-head">
        <h1 class="auth-title">Единый вход</h1>
        <p class="auth-subtitle">Выберите роль и войдите по логину и паролю. Для клиента и подрядчика старые способы входа сохранены ниже.</p>
      </div>

      <div class="auth-role-grid" role="tablist" aria-label="Выбор роли для входа">
        <button
          v-for="role in roleOptions"
          :key="role.value"
          type="button"
          class="auth-role-btn"
          :class="{ 'auth-role-btn--active': selectedRole === role.value }"
          @click="selectRole(role.value)"
        >
          <span class="auth-role-btn__title">{{ role.label }}</span>
          <span class="auth-role-btn__note">{{ role.note }}</span>
        </button>
      </div>

      <form @submit.prevent="submitCredentials">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label>Логин</label>
            <input
              v-model="credentials.login"
              name="login"
              type="text"
              placeholder="логин"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              inputmode="text"
              required
              class="glass-input auth-input"
            />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <input
              v-model="credentials.password"
              name="password"
              type="password"
              placeholder="пароль"
              autocomplete="current-password"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              required
              class="glass-input auth-input"
            />
          </div>
        </div>

        <p v-if="credentialsError" class="auth-error">{{ credentialsError }}</p>

        <button type="submit" :disabled="credentialsLoading" class="a-btn-save auth-submit">
          {{ credentialsLoading ? 'Вход…' : submitLabel }}
        </button>
      </form>

      <div v-if="selectedRole === 'client'" class="auth-secondary glass-surface">
        <p class="auth-secondary__title">Вход по коду проекта</p>
        <form @submit.prevent="submitClientLegacy" class="auth-form-grid">
          <div class="auth-field auth-field--compact">
            <label>Код проекта</label>
            <input
              v-model="clientLegacySlug"
              type="text"
              placeholder="например: ivanov-project-2024"
              autocomplete="off"
              spellcheck="false"
              required
              class="glass-input auth-input"
            />
          </div>

          <p v-if="clientLegacyError" class="auth-error">{{ clientLegacyError }}</p>
          <button type="submit" :disabled="clientLegacyLoading" class="a-btn-sm auth-submit auth-submit--secondary">
            {{ clientLegacyLoading ? 'Вход…' : 'Войти по коду проекта' }}
          </button>
        </form>
      </div>

      <div v-if="selectedRole === 'contractor'" class="auth-secondary glass-surface">
        <p class="auth-secondary__title">Вход по ID и коду доступа</p>
        <form @submit.prevent="submitContractorLegacy" class="auth-form-grid">
          <div class="auth-field auth-field--compact">
            <label>ID подрядчика</label>
            <input
              v-model.number="contractorLegacy.id"
              type="number"
              min="1"
              placeholder="Ваш ID"
              required
              class="glass-input auth-input"
            />
          </div>

          <div class="auth-field auth-field--compact">
            <label>Код доступа</label>
            <input
              v-model="contractorLegacy.slug"
              type="text"
              placeholder="slug, выданный дизайнером"
              required
              class="glass-input auth-input"
            />
          </div>

          <p v-if="contractorLegacyError" class="auth-error">{{ contractorLegacyError }}</p>
          <button type="submit" :disabled="contractorLegacyLoading" class="a-btn-sm auth-submit auth-submit--secondary">
            {{ contractorLegacyLoading ? 'Вход…' : 'Войти по ID' }}
          </button>
        </form>
      </div>

      <div class="auth-links">
        <NuxtLink :to="registerPath">Регистрация</NuxtLink>
        <NuxtLink :to="recoverPath">Восстановить доступ</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: 'default' })

type LoginRole = 'designer' | 'client' | 'contractor'

const route = useRoute()
const router = useRouter()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Дизайнер', note: 'Вход в админ-кабинет.' },
  { value: 'client', label: 'Клиент', note: 'Вход в кабинет проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Вход в задачи и документы.' },
] as const satisfies ReadonlyArray<{ value: LoginRole; label: string; note: string }>

function normalizeRole(value: unknown): LoginRole {
  if (value === 'designer' || value === 'client' || value === 'contractor') {
    return value
  }

  return 'client'
}

const selectedRole = ref<LoginRole>(normalizeRole(route.query.role))
const credentials = reactive({ login: '', password: '' })
const clientLegacySlug = ref('')
const contractorLegacy = reactive({ id: null as number | null, slug: '' })

const credentialsError = ref('')
const clientLegacyError = ref('')
const contractorLegacyError = ref('')
const credentialsLoading = ref(false)
const clientLegacyLoading = ref(false)
const contractorLegacyLoading = ref(false)

const registerPath = computed(() => `/register?role=${selectedRole.value}`)
const recoverPath = computed(() => `/recover?role=${selectedRole.value}`)

const submitLabel = computed(() => {
  if (selectedRole.value === 'designer') return 'Войти как дизайнер'
  if (selectedRole.value === 'client') return 'Войти как клиент'
  return 'Войти как подрядчик'
})

function resetErrors() {
  credentialsError.value = ''
  clientLegacyError.value = ''
  contractorLegacyError.value = ''
}

function selectRole(role: LoginRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  resetErrors()
}

async function submitCredentials() {
  resetErrors()
  credentialsLoading.value = true

  try {
    if (selectedRole.value === 'designer') {
      await ensureCsrfCookie()
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: credentials,
        headers: csrfHeaders(),
      })
      await router.push('/admin')
      return
    }

    if (selectedRole.value === 'client') {
      const result = await $fetch<{ ok: boolean; slug: string }>('/api/auth/client-login', {
        method: 'POST',
        body: {
          login: credentials.login.trim().toLowerCase(),
          password: credentials.password,
        },
      })
      await router.push(`/client/${result.slug}`)
      return
    }

    const result = await $fetch<{ ok: boolean; id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: {
        login: credentials.login.trim().toLowerCase(),
        password: credentials.password,
      },
    })
    await router.push(`/contractor/${result.id}`)
  } catch (e: any) {
    credentialsError.value = e.data?.statusMessage || e.data?.message || 'Неверный логин или пароль'
  } finally {
    credentialsLoading.value = false
  }
}

async function submitClientLegacy() {
  resetErrors()
  const slug = clientLegacySlug.value.trim().toLowerCase()
  if (!slug) {
    clientLegacyError.value = 'Введите код проекта'
    return
  }

  clientLegacyLoading.value = true
  try {
    const result = await $fetch<{ ok: boolean; slug: string }>('/api/auth/client-login', {
      method: 'POST',
      body: { slug },
    })
    await router.push(`/client/${result.slug}`)
  } catch (e: any) {
    clientLegacyError.value = e.data?.statusMessage || e.data?.message || 'Неверный код проекта'
  } finally {
    clientLegacyLoading.value = false
  }
}

async function submitContractorLegacy() {
  resetErrors()
  if (!contractorLegacy.id || !contractorLegacy.slug.trim()) {
    contractorLegacyError.value = 'Заполните ID и код доступа'
    return
  }

  contractorLegacyLoading.value = true
  try {
    const result = await $fetch<{ ok: boolean; id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: {
        id: contractorLegacy.id,
        slug: contractorLegacy.slug.trim(),
      },
    })
    await router.push(`/contractor/${result.id}`)
  } catch (e: any) {
    contractorLegacyError.value = e.data?.statusMessage || e.data?.message || 'Неверные данные входа'
  } finally {
    contractorLegacyLoading.value = false
  }
}
</script>

<style scoped>
.auth-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 560px;
  padding: 32px;
  display: grid;
  gap: 16px;
}

.auth-head {
  display: grid;
  gap: 6px;
}

.auth-title {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.auth-subtitle {
  margin: 0;
  font-size: .82rem;
  opacity: .74;
}

.auth-role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.auth-role-btn {
  display: grid;
  gap: 6px;
  min-height: 68px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: transparent;
  color: inherit;
  text-align: left;
  font-family: inherit;
}

.auth-role-btn--active {
  border-color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.auth-role-btn__title {
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.auth-role-btn__note {
  font-size: .72rem;
  opacity: .68;
  line-height: 1.35;
}

.auth-form-grid {
  display: grid;
  gap: 0;
}

.auth-field {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.auth-field--compact {
  margin-bottom: 12px;
}

.auth-field label {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .7;
}

.auth-input,
.auth-submit {
  width: 100%;
}

.auth-submit--secondary {
  justify-self: start;
}

.auth-secondary {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.auth-secondary__title {
  margin: 0;
  font-size: .76rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .7;
}

.auth-error {
  color: var(--ds-error, #d96b6b);
  font-size: .8rem;
  margin: 0 0 10px;
}

.auth-links {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.auth-links a {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 760px) {
  .auth-card {
    max-width: 460px;
    padding: 24px;
  }

  .auth-role-grid {
    grid-template-columns: 1fr;
  }
}
</style>