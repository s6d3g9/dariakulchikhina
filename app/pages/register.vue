<template>
  <div class="auth-root glass-page">
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
            <input v-model="form.login" name="login" type="text" class="glass-input auth-input" placeholder="login" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" />
          </div>

          <div class="auth-field">
            <label>Пароль</label>
            <input v-model="form.password" name="password" type="password" class="glass-input auth-input" placeholder="минимум 8 символов" required autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <button type="submit" class="a-btn-save auth-submit" :disabled="loading">{{ loading ? 'Создание…' : submitLabel }}</button>
      </form>

      <div v-else class="seed-box">
        <p class="seed-title">Сохраните recovery phrase</p>
        <p class="seed-copy">{{ successMeta }}</p>
        <textarea readonly class="glass-input seed-value" :value="recoveryPhrase" rows="4" />
        <div class="auth-actions">
          <button type="button" class="a-btn-sm" @click="copyPhrase">Скопировать</button>
          <NuxtLink :to="successLoginPath" class="a-btn-save auth-link-btn">Перейти ко входу</NuxtLink>
        </div>
      </div>

      <div class="auth-links auth-links--single">
        <NuxtLink :to="successLoginPath">← ко входу</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: 'default' })

type RegisterRole = 'designer' | 'client' | 'contractor'

const route = useRoute()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Дизайнер', note: 'Создание аккаунта дизайнера.' },
  { value: 'client', label: 'Клиент', note: 'Создание кабинета проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Создание доступа подрядчика.' },
] as const satisfies ReadonlyArray<{ value: RegisterRole; label: string; note: string }>

function normalizeRole(value: unknown): RegisterRole {
  if (value === 'designer' || value === 'client' || value === 'contractor') {
    return value
  }

  return 'client'
}

const selectedRole = ref<RegisterRole>(normalizeRole(route.query.role))
const form = reactive({ login: '', password: '' })

const error = ref('')
const loading = ref(false)
const created = ref(false)
const recoveryPhrase = ref('')
const successMeta = ref('')

const roleToLoginPath: Record<RegisterRole, string> = {
  designer: '/login?role=designer',
  client: '/login?role=client',
  contractor: '/login?role=contractor',
}

const submitLabel = computed(() => {
  if (selectedRole.value === 'designer') return 'Создать аккаунт дизайнера'
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

function selectRole(role: RegisterRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  resetSuccessState()
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
      successMeta.value = 'Аккаунт дизайнера создан. Эта фраза показывается один раз.'
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
  max-width: 620px;
  padding: 32px;
  display: grid;
  gap: 16px;
}

.auth-head {
  display: grid;
  gap: 6px;
}

.auth-title,
.seed-title {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.auth-subtitle,
.seed-copy {
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

.auth-field label {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .7;
}

.auth-input,
.auth-submit,
.seed-value {
  width: 100%;
}

.auth-error {
  color: var(--ds-error, #d96b6b);
  font-size: .8rem;
  margin: 0 0 10px;
}

.seed-box {
  display: grid;
  gap: 12px;
}

.auth-actions,
.auth-links {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.auth-links--single a,
.auth-links a,
.auth-link-btn {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 760px) {
  .auth-card {
    max-width: 460px;
  }

  .auth-role-grid {
    grid-template-columns: 1fr;
  }
}
</style>