<template>
  <div class="auth-root glass-page">
    <div class="auth-stage" :data-auth-role="selectedRole">
      <section class="auth-panel glass-surface" aria-label="Контекст регистрации">
        <p class="auth-panel__eyebrow">Новый доступ</p>
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
        <h1 class="auth-title">Единая регистрация</h1>
        <p class="auth-subtitle">Простая регистрация: логин, пароль, роль. Остальные данные заполните уже внутри кабинета.</p>
      </div>

      <div class="auth-role-grid" role="tablist" aria-label="Выбор роли для регистрации">
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

      <form v-if="!created" @submit.prevent="submit">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label>Логин</label>
            <GlassInput v-model="form.login" name="login" type="text" class=" auth-input" placeholder="логин" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <GlassInput v-model="form.password" name="password" type="password" class=" auth-input" placeholder="минимум 8 символов" required autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <div v-if="loading" class="auth-progress" aria-hidden="true">
          <span class="auth-progress__label">[ СОЗДАЕМ АККАУНТ ]</span>
          <span class="auth-progress__line"></span>
        </div>
        <GlassButton variant="primary" type="submit" class=" auth-submit" :disabled="loading">{{ loading ? 'Создание…' : submitLabel }}</GlassButton>
      </form>

      <div v-else class="seed-box">
        <p class="seed-title">Сохраните фразу восстановления</p>
        <p class="seed-copy">{{ successMeta }}</p>
        <textarea readonly class="glass-input seed-value" :value="recoveryPhrase" rows="4" />
        <div class="auth-actions">
          <GlassButton variant="secondary" density="compact" type="button"  @click="copyPhrase">Скопировать</GlassButton>
          <NuxtLink :to="successLoginPath" class="a-btn-save auth-link-btn">Перейти ко входу</NuxtLink>
        </div>
      </div>

      <div class="auth-links auth-links--single">
        <NuxtLink :to="successLoginPath">← ко входу</NuxtLink>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: 'default', pageTransition: false, keepalive: false })

type RegisterRole = 'designer' | 'client' | 'contractor'
type RegisterRoleInsight = {
  tag: string
  title: string
  copy: string
  facts: Array<{ label: string; value: string }>
}

const route = useRoute()
const router = useRouter()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Администратор', note: 'Создание аккаунта администратора.' },
  { value: 'client', label: 'Клиент', note: 'Создание кабинета проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Создание доступа подрядчика.' },
] as const satisfies ReadonlyArray<{ value: RegisterRole; label: string; note: string }>

const roleInsights: Record<RegisterRole, RegisterRoleInsight> = {
  designer: {
    tag: 'Регистрация администратора',
    title: 'Создайте рабочий доступ студии и сохраните секретную фразу один раз.',
    copy: 'После создания система покажет фразу восстановления только один раз. Сохраните ее сразу, затем переходите к обычному входу в админ-кабинет.',
    facts: [
      { label: 'Что создается', value: 'Админ-аккаунт с обычным логином и паролем' },
      { label: 'Что получите', value: 'Одноразовый показ фразы восстановления' },
      { label: 'Дальше', value: 'Вход через /login?role=admin' },
    ],
  },
  client: {
    tag: 'Регистрация клиента',
    title: 'Откройте кабинет проекта и сразу получите проектный код.',
    copy: 'После регистрации клиент получает фразу восстановления, а система создает проектный доступ. Остальные данные можно заполнить уже внутри кабинета.',
    facts: [
      { label: 'Что создается', value: 'Клиентский доступ и привязанный кабинет проекта' },
      { label: 'Что получите', value: 'Фразу восстановления и код проекта' },
      { label: 'Дальше', value: 'Вход через /login?role=client' },
    ],
  },
  contractor: {
    tag: 'Регистрация подрядчика',
    title: 'Создайте доступ подрядчика и сразу зафиксируйте персональный ID.',
    copy: 'Система создаст кабинет подрядчика, покажет фразу восстановления и вернет уникальный ID. После этого можно войти обычным способом и перейти к задачам.',
    facts: [
      { label: 'Что создается', value: 'Кабинет подрядчика с персональным входом' },
      { label: 'Что получите', value: 'Фразу восстановления и уникальный ID' },
      { label: 'Дальше', value: 'Вход через /login?role=contractor' },
    ],
  },
}

function normalizeRole(value: unknown): RegisterRole {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (rawValue === 'admin') {
    return 'designer'
  }

  if (rawValue === 'designer' || rawValue === 'client' || rawValue === 'contractor') {
    return rawValue
  }

  return 'client'
}

function toRoleQueryValue(role: RegisterRole) {
  return role === 'designer' ? 'admin' : role
}

function getCurrentRoleQueryValue() {
  return Array.isArray(route.query.role) ? route.query.role[0] : route.query.role
}

const selectedRole = ref<RegisterRole>(normalizeRole(route.query.role))
const form = reactive({ login: '', password: '' })

const error = ref('')
const loading = ref(false)
const created = ref(false)
const recoveryPhrase = ref('')
const successMeta = ref('')
const activeRoleInsight = computed(() => roleInsights[selectedRole.value])

const roleToLoginPath: Record<RegisterRole, string> = {
  designer: '/login?role=admin',
  client: '/login?role=client',
  contractor: '/login?role=contractor',
}

const submitLabel = computed(() => {
  if (selectedRole.value === 'designer') return 'Создать аккаунт администратора'
  if (selectedRole.value === 'client') return 'Создать аккаунт клиента'
  return 'Создать аккаунт подрядчика'
})

const successLoginPath = computed(() => roleToLoginPath[selectedRole.value])

function resetSuccessState() {
  error.value = ''
  created.value = false
  recoveryPhrase.value = ''
  successMeta.value = ''
}

function syncRoleQuery(role: RegisterRole) {
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
    resetSuccessState()
  },
)

function selectRole(role: RegisterRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  resetSuccessState()
  void syncRoleQuery(role)
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await ensureCsrfCookie()

    if (selectedRole.value === 'designer') {
      const result = await $fetch<{ recoveryPhrase: string }>('/api/auth/register', {
        method: 'POST',
        body: form,
        headers: csrfHeaders(),
      })
      recoveryPhrase.value = result.recoveryPhrase
      successMeta.value = 'Аккаунт администратора создан. Эта фраза показывается один раз.'
    } else if (selectedRole.value === 'client') {
      const result = await $fetch<{ recoveryPhrase: string; project: { slug: string } }>('/api/auth/client-register', {
        method: 'POST',
        body: form,
        headers: csrfHeaders(),
      })
      recoveryPhrase.value = result.recoveryPhrase
      successMeta.value = `Кабинет клиента создан. Проектный код: ${result.project.slug}`
    } else {
      const result = await $fetch<{ recoveryPhrase: string; contractor: { id: number } }>('/api/auth/contractor-register', {
        method: 'POST',
        body: form,
        headers: csrfHeaders(),
      })
      recoveryPhrase.value = result.recoveryPhrase
      successMeta.value = `Кабинет подрядчика создан. Ваш ID: ${result.contractor.id}`
    }

    created.value = true
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Не удалось создать аккаунт'
  } finally {
    loading.value = false
  }
}

async function copyPhrase() {
  if (!recoveryPhrase.value || !navigator?.clipboard) return
  await navigator.clipboard.writeText(recoveryPhrase.value)
}
</script>