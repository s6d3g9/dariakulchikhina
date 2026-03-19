<template>
  <div class="auth-root glass-page">
    <div class="auth-card glass-surface">
      <div class="auth-head">
        <h1 class="auth-title">Единый вход</h1>
        <p class="auth-subtitle">Выберите роль и войдите по логину и паролю. Для клиента и подрядчика старые способы входа сохранены ниже.</p>
      </div>

      <form @submit.prevent="submitCredentials">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label>Роль</label>
            <select v-model="selectedRole" class="glass-input auth-input" @change="syncRoleQuery">
              <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
            </select>
          </div>

          <div class="auth-field">
            <label>Логин</label>
            <input
              v-model="credentials.login"
              type="text"
              placeholder="логин"
              autocomplete="username"
              required
              class="glass-input auth-input"
            />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <input
              v-model="credentials.password"
              type="password"
              placeholder="пароль"
              autocomplete="current-password"
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
  { value: 'designer', label: 'Дизайнер' },
  { value: 'client', label: 'Клиент' },
  { value: 'contractor', label: 'Подрядчик' },
] as const satisfies ReadonlyArray<{ value: LoginRole; label: string }>

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

watch(() => route.query.role, (nextRole) => {
  selectedRole.value = normalizeRole(nextRole)
  resetErrors()
})

function resetErrors() {
  credentialsError.value = ''
  clientLegacyError.value = ''
  contractorLegacyError.value = ''
}

function syncRoleQuery() {
  resetErrors()
  router.replace({ query: { ...route.query, role: selectedRole.value } })
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
}
</style>