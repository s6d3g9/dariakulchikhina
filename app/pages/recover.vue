<template>
  <div class="auth-root glass-page">
    <div class="auth-stage" :data-auth-role="selectedRole">
      <section class="auth-panel glass-surface" aria-label="Контекст восстановления доступа">
        <p class="auth-panel__eyebrow">Сброс доступа</p>
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
        <h1 class="auth-title">Единое восстановление доступа</h1>
        <p class="auth-subtitle">Выберите роль, введите логин, фразу восстановления и задайте новый пароль.</p>
      </div>

      <div class="auth-role-grid" role="tablist" aria-label="Выбор роли для восстановления доступа">
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

      <form @submit.prevent="submit">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label>Логин</label>
            <GlassInput v-model="form.login" name="login" type="text" class=" auth-input" placeholder="логин" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" />
          </div>

          <div class="auth-field">
            <label>Фраза восстановления</label>
            <textarea v-model="form.recoveryPhrase" name="recoveryPhrase" class="glass-input auth-input auth-input--textarea" rows="4" required placeholder="12 слов через пробел" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>

          <div class="auth-field">
            <label>Новый пароль</label>
            <GlassInput v-model="form.newPassword" name="newPassword" type="password" class=" auth-input" placeholder="минимум 8 символов" required autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="success" class="auth-success">{{ success }}</p>
        <div v-if="loading" class="auth-progress" aria-hidden="true">
          <span class="auth-progress__label">[ ОБНОВЛЯЕМ ДОСТУП ]</span>
          <span class="auth-progress__line"></span>
        </div>
        <GlassButton variant="primary" type="submit" class=" auth-submit" :disabled="loading">{{ loading ? 'Сброс…' : submitLabel }}</GlassButton>
      </form>

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

type RecoverRole = 'designer' | 'client' | 'contractor'
type RecoverRoleInsight = {
  tag: string
  title: string
  copy: string
  facts: Array<{ label: string; value: string }>
}

const route = useRoute()
const router = useRouter()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Администратор', note: 'Восстановление входа в админ-кабинет.' },
  { value: 'client', label: 'Клиент', note: 'Восстановление доступа к кабинету проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Восстановление доступа к задачам и документам.' },
] as const satisfies ReadonlyArray<{ value: RecoverRole; label: string; note: string }>

const roleInsights: Record<RecoverRole, RecoverRoleInsight> = {
  designer: {
    tag: 'Админ-восстановление',
    title: 'Подтвердите личность и обновите пароль для рабочей зоны студии.',
    copy: 'Нужны логин, фраза восстановления и новый пароль. После успешного сброса можно сразу вернуться к обычному входу в админ-кабинет.',
    facts: [
      { label: 'Что нужно', value: 'Логин, фраза восстановления и новый пароль' },
      { label: 'Результат', value: 'Доступ восстанавливается без отдельного обращения' },
      { label: 'Маршрут', value: 'Дальше вход через /login?role=admin' },
    ],
  },
  client: {
    tag: 'Восстановление клиента',
    title: 'Верните доступ к кабинету проекта в одном экране.',
    copy: 'Сценарий обновляет пароль клиента и оставляет текущий проектный поток без дополнительных шагов. После этого вход выполняется как обычно по логину и паролю.',
    facts: [
      { label: 'Что нужно', value: 'Логин, фраза восстановления и новый пароль' },
      { label: 'Результат', value: 'Снова открывается кабинет проекта' },
      { label: 'Маршрут', value: 'Дальше вход через /login?role=client' },
    ],
  },
  contractor: {
    tag: 'Восстановление подрядчика',
    title: 'Обновите пароль и вернитесь к задачам без поддержки вручную.',
    copy: 'Подрядчик подтверждает доступ recovery-фразой и сразу получает новый пароль. После сброса можно снова зайти в кабинет по стандартному сценарию.',
    facts: [
      { label: 'Что нужно', value: 'Логин, фраза восстановления и новый пароль' },
      { label: 'Результат', value: 'Доступ к задачам и документам восстанавливается' },
      { label: 'Маршрут', value: 'Дальше вход через /login?role=contractor' },
    ],
  },
}

function normalizeRole(value: unknown): RecoverRole {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (rawValue === 'admin') {
    return 'designer'
  }

  if (rawValue === 'designer' || rawValue === 'client' || rawValue === 'contractor') {
    return rawValue
  }

  return 'client'
}

function toRoleQueryValue(role: RecoverRole) {
  return role === 'designer' ? 'admin' : role
}

function getCurrentRoleQueryValue() {
  return Array.isArray(route.query.role) ? route.query.role[0] : route.query.role
}

const selectedRole = ref<RecoverRole>(normalizeRole(route.query.role))
const form = reactive({ login: '', recoveryPhrase: '', newPassword: '' })
const error = ref('')
const success = ref('')
const loading = ref(false)
const activeRoleInsight = computed(() => roleInsights[selectedRole.value])

const roleToLoginPath: Record<RecoverRole, string> = {
  designer: '/login?role=admin',
  client: '/login?role=client',
  contractor: '/login?role=contractor',
}

const roleToRecoverPath: Record<RecoverRole, string> = {
  designer: '/api/auth/recover',
  client: '/api/auth/client-recover',
  contractor: '/api/auth/contractor-recover',
}

const submitLabel = computed(() => {
  if (selectedRole.value === 'designer') return 'Сбросить пароль администратора'
  if (selectedRole.value === 'client') return 'Сбросить пароль клиента'
  return 'Сбросить пароль подрядчика'
})

const successLoginPath = computed(() => roleToLoginPath[selectedRole.value])

function syncRoleQuery(role: RecoverRole) {
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
    error.value = ''
    success.value = ''
  },
)

function selectRole(role: RecoverRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  error.value = ''
  success.value = ''
  void syncRoleQuery(role)
}

async function submit() {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    await ensureCsrfCookie()
    await $fetch(roleToRecoverPath[selectedRole.value], {
      method: 'POST',
      body: form,
      headers: csrfHeaders(),
    })

    if (selectedRole.value === 'designer') {
      success.value = 'Пароль обновлён. Теперь можно войти в админ-кабинет.'
    } else if (selectedRole.value === 'client') {
      success.value = 'Пароль обновлён. Теперь можно войти в кабинет клиента.'
    } else {
      success.value = 'Пароль обновлён. Теперь можно войти в кабинет подрядчика.'
    }
  } catch (e: any) {
    if (selectedRole.value === 'designer') {
      error.value = e.data?.statusMessage || 'Не удалось восстановить доступ администратора'
    } else if (selectedRole.value === 'client') {
      error.value = e.data?.statusMessage || 'Не удалось восстановить доступ клиента'
    } else {
      error.value = e.data?.statusMessage || 'Не удалось восстановить доступ подрядчика'
    }
  } finally {
    loading.value = false
  }
}
</script>