<template>
  <div class="auth-root glass-page">
    <div class="auth-stage" :data-auth-role="selectedRole">
      <section class="auth-panel glass-surface" aria-label="Контекст входа">
        <p class="auth-panel__eyebrow">Единая точка доступа</p>
        <p class="auth-panel__tag">{{ activeRoleInsight.tag }}</p>
        <h2 class="auth-panel__title">{{ activeRoleInsight.title }}</h2>
        <p class="auth-panel__copy">{{ activeRoleInsight.copy }}</p>

        <div class="auth-panel__facts">
          <article v-for="fact in activeRoleInsight.facts" :key="fact.label" class="auth-panel__fact">
            <span class="auth-panel__fact-label">{{ fact.label }}</span>
            <span class="auth-panel__fact-value">{{ fact.value }}</span>
          </article>
        </div>
      </section>

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
            <GlassInput
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
              class=" auth-input"
            />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <GlassInput
              v-model="credentials.password"
              name="password"
              type="password"
              placeholder="пароль"
              autocomplete="current-password"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              required
              class=" auth-input"
            />
          </div>
        </div>

        <p v-if="credentialsError" class="auth-error">{{ credentialsError }}</p>

        <div v-if="credentialsLoading" class="auth-progress" aria-hidden="true">
          <span class="auth-progress__label">[ ПРОВЕРЯЕМ ДОСТУП ]</span>
          <span class="auth-progress__line"></span>
        </div>

        <GlassButton variant="primary" type="submit" :disabled="credentialsLoading" class=" auth-submit">
          {{ credentialsLoading ? 'Вход…' : submitLabel }}
        </GlassButton>
      </form>

      <div v-if="selectedRole === 'client'" class="auth-secondary glass-surface">
        <p class="auth-secondary__title">Вход по коду проекта</p>
        <form @submit.prevent="submitClientLegacy" class="auth-form-grid">
          <div class="auth-field auth-field--compact">
            <label>Код проекта</label>
            <GlassInput
              v-model="clientLegacySlug"
              type="text"
              placeholder="например: ivanov-project-2024"
              autocomplete="off"
              spellcheck="false"
              required
              class=" auth-input"
            />
          </div>

          <p v-if="clientLegacyError" class="auth-error">{{ clientLegacyError }}</p>
          <div v-if="clientLegacyLoading" class="auth-progress" aria-hidden="true">
            <span class="auth-progress__label">[ ИЩЕМ ПРОЕКТ ]</span>
            <span class="auth-progress__line"></span>
          </div>
          <GlassButton variant="secondary" density="compact" type="submit" :disabled="clientLegacyLoading" class=" auth-submit auth-submit--secondary">
            {{ clientLegacyLoading ? 'Вход…' : 'Войти по коду проекта' }}
          </GlassButton>
        </form>
      </div>

      <div v-if="selectedRole === 'contractor'" class="auth-secondary glass-surface">
        <p class="auth-secondary__title">Вход по ID и коду доступа</p>
        <form @submit.prevent="submitContractorLegacy" class="auth-form-grid">
          <div class="auth-field auth-field--compact">
            <label>ID подрядчика</label>
            <GlassInput
              v-model.number="contractorLegacy.id"
              type="number"
              min="1"
              placeholder="Ваш ID"
              required
              class=" auth-input"
            />
          </div>

          <div class="auth-field auth-field--compact">
            <label>Код доступа</label>
            <GlassInput
              v-model="contractorLegacy.slug"
              type="text"
              placeholder="slug, выданный дизайнером"
              required
              class=" auth-input"
            />
          </div>

          <p v-if="contractorLegacyError" class="auth-error">{{ contractorLegacyError }}</p>
          <div v-if="contractorLegacyLoading" class="auth-progress" aria-hidden="true">
            <span class="auth-progress__label">[ ПРОВЕРЯЕМ ПОДРЯДЧИКА ]</span>
            <span class="auth-progress__line"></span>
          </div>
          <GlassButton variant="secondary" density="compact" type="submit" :disabled="contractorLegacyLoading" class=" auth-submit auth-submit--secondary">
            {{ contractorLegacyLoading ? 'Вход…' : 'Войти по ID' }}
          </GlassButton>
        </form>
      </div>

      <div class="auth-links">
        <NuxtLink :to="registerPath">Регистрация</NuxtLink>
        <NuxtLink :to="recoverPath">Восстановить доступ</NuxtLink>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: 'default', pageTransition: false, keepalive: false })

type LoginRole = 'designer' | 'client' | 'contractor'
type LoginRoleInsight = {
  tag: string
  title: string
  copy: string
  facts: Array<{ label: string; value: string }>
}

const route = useRoute()
const router = useRouter()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Администратор', note: 'Вход в админ-кабинет.' },
  { value: 'client', label: 'Клиент', note: 'Вход в кабинет проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Вход в задачи и документы.' },
] as const satisfies ReadonlyArray<{ value: LoginRole; label: string; note: string }>

const roleInsights: Record<LoginRole, LoginRoleInsight> = {
  designer: {
    tag: 'Роль: администратор',
    title: 'Контроль проектов, документов и всей рабочей зоны студии.',
    copy: 'Основной сценарий ведет прямо в админ-кабинет. Доступ восстанавливается через ту же единую связку логина, пароля и recovery-фразы.',
    facts: [
      { label: 'Маршрут', value: 'Переход сразу в /admin' },
      { label: 'Проверка', value: 'CSRF-защищенный логин по обычным учетным данным' },
      { label: 'Резерв', value: 'Сброс доступа через страницу восстановления' },
    ],
  },
  client: {
    tag: 'Роль: клиент',
    title: 'Быстрый вход в кабинет проекта без лишних переходов.',
    copy: 'Основной вход работает по логину и паролю. Ниже остается резервный сценарий по коду проекта, если клиент пользуется старым способом доступа.',
    facts: [
      { label: 'Маршрут', value: 'Открывается кабинет конкретного проекта' },
      { label: 'Резерв', value: 'Можно войти по коду проекта без смены страницы' },
      { label: 'После входа', value: 'Документы, этапы и согласования доступны сразу' },
    ],
  },
  contractor: {
    tag: 'Роль: подрядчик',
    title: 'Вход в задачи, статусы и рабочие документы подрядчика.',
    copy: 'Подрядчик может войти по логину и паролю либо использовать резервный сценарий по ID и коду доступа, если кабинет уже был выдан дизайнером.',
    facts: [
      { label: 'Маршрут', value: 'Открывается персональный кабинет подрядчика' },
      { label: 'Резерв', value: 'Старый вход по ID и коду доступа сохранен' },
      { label: 'После входа', value: 'Сразу доступны задачи, сроки и файлы' },
    ],
  },
}

function normalizeRole(value: unknown): LoginRole {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (rawValue === 'admin') {
    return 'designer'
  }

  if (rawValue === 'designer' || rawValue === 'client' || rawValue === 'contractor') {
    return rawValue
  }

  return 'client'
}

function toRoleQueryValue(role: LoginRole) {
  return role === 'designer' ? 'admin' : role
}

function getCurrentRoleQueryValue() {
  return Array.isArray(route.query.role) ? route.query.role[0] : route.query.role
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

const activeRoleInsight = computed(() => roleInsights[selectedRole.value])
const registerPath = computed(() => `/register?role=${toRoleQueryValue(selectedRole.value)}`)
const recoverPath = computed(() => `/recover?role=${toRoleQueryValue(selectedRole.value)}`)

const submitLabel = computed(() => {
  if (selectedRole.value === 'designer') return 'Войти как администратор'
  if (selectedRole.value === 'client') return 'Войти как клиент'
  return 'Войти как подрядчик'
})

function resetErrors() {
  credentialsError.value = ''
  clientLegacyError.value = ''
  contractorLegacyError.value = ''
}

function syncRoleQuery(role: LoginRole) {
  const nextRole = toRoleQueryValue(role)
  if (getCurrentRoleQueryValue() === nextRole) {
    return
  }

  return router.replace({
    query: {
      ...route.query,
      role: nextRole,
    },
  })
}

watch(
  () => route.query.role,
  (value) => {
    const nextRole = normalizeRole(value)
    if (nextRole === selectedRole.value) {
      return
    }

    selectedRole.value = nextRole
    resetErrors()
  },
)

function selectRole(role: LoginRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  resetErrors()
  void syncRoleQuery(role)
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
      await ensureCsrfCookie()
      const result = await $fetch<{ ok: boolean; slug: string }>('/api/auth/client-login', {
        method: 'POST',
        body: {
          login: credentials.login.trim().toLowerCase(),
          password: credentials.password,
        },
        headers: csrfHeaders(),
      })
      await router.push(`/client/${result.slug}`)
      return
    }

    await ensureCsrfCookie()
    const result = await $fetch<{ ok: boolean; id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: {
        login: credentials.login.trim().toLowerCase(),
        password: credentials.password,
      },
      headers: csrfHeaders(),
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
    await ensureCsrfCookie()
    const result = await $fetch<{ ok: boolean; slug: string }>('/api/auth/client-login', {
      method: 'POST',
      body: { slug },
      headers: csrfHeaders(),
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
    await ensureCsrfCookie()
    const result = await $fetch<{ ok: boolean; id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: {
        id: contractorLegacy.id,
        slug: contractorLegacy.slug.trim(),
      },
      headers: csrfHeaders(),
    })
    await router.push(`/contractor/${result.id}`)
  } catch (e: any) {
    contractorLegacyError.value = e.data?.statusMessage || e.data?.message || 'Неверные данные входа'
  } finally {
    contractorLegacyLoading.value = false
  }
}
</script>