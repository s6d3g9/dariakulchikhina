<template>
  <div class="auth-root glass-page">
    <div class="auth-card glass-surface">
      <div class="auth-head">
        <h1 class="auth-title">Единое восстановление доступа</h1>
        <p class="auth-subtitle">Выберите роль, введите логин, recovery phrase и задайте новый пароль.</p>
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
            <input v-model="form.login" name="login" type="text" class="glass-input auth-input" placeholder="login" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" />
          </div>

          <div class="auth-field">
            <label>Recovery phrase</label>
            <textarea v-model="form.recoveryPhrase" name="recoveryPhrase" class="glass-input auth-input auth-input--textarea" rows="4" required placeholder="12 слов через пробел" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>

          <div class="auth-field">
            <label>Новый пароль</label>
            <input v-model="form.newPassword" name="newPassword" type="password" class="glass-input auth-input" placeholder="минимум 8 символов" required autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </div>
        </div>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="success" class="auth-success">{{ success }}</p>
        <div v-if="loading" class="auth-progress" aria-hidden="true">
          <span class="auth-progress__label">[ ОБНОВЛЯЕМ ДОСТУП ]</span>
          <span class="auth-progress__line"></span>
        </div>
        <button type="submit" class="a-btn-save auth-submit" :disabled="loading">{{ loading ? 'Сброс…' : submitLabel }}</button>
      </form>

      <div class="auth-links auth-links--single">
        <NuxtLink :to="successLoginPath">← ко входу</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

definePageMeta({ layout: 'default', pageTransition: false, keepalive: false })

type RecoverRole = 'designer' | 'client' | 'contractor'

const route = useRoute()
const { csrfHeaders, ensureCsrfCookie } = useCsrfHeaders()

const roleOptions = [
  { value: 'designer', label: 'Администратор', note: 'Восстановление входа в админ-кабинет.' },
  { value: 'client', label: 'Клиент', note: 'Восстановление доступа к кабинету проекта.' },
  { value: 'contractor', label: 'Подрядчик', note: 'Восстановление доступа к задачам и документам.' },
] as const satisfies ReadonlyArray<{ value: RecoverRole; label: string; note: string }>

function normalizeRole(value: unknown): RecoverRole {
  if (value === 'admin') {
    return 'designer'
  }

  if (value === 'designer' || value === 'client' || value === 'contractor') {
    return value
  }

  return 'client'
}

const selectedRole = ref<RecoverRole>(normalizeRole(route.query.role))
const form = reactive({ login: '', recoveryPhrase: '', newPassword: '' })
const error = ref('')
const success = ref('')
const loading = ref(false)

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

function selectRole(role: RecoverRole) {
  if (role === selectedRole.value) {
    return
  }

  selectedRole.value = role
  error.value = ''
  success.value = ''
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

<style scoped>
.auth-root {
  min-height: 100vh;
  min-height: 100dvh;
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

.auth-field label {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .7;
}

.auth-input,
.auth-submit {
  width: 100%;
  min-height: 48px;
  font-size: 16px;
}

.auth-input--textarea {
  resize: vertical;
}

.auth-error {
  color: var(--ds-error, #d96b6b);
  font-size: .8rem;
  margin: 0 0 10px;
}

.auth-success {
  color: var(--ds-success, #5caa7f);
  font-size: .8rem;
  margin: 0 0 10px;
}

.auth-progress {
  display: grid;
  gap: 8px;
  margin: 0 0 12px;
}

.auth-progress__label {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .58;
}

.auth-progress__line {
  position: relative;
  display: block;
  width: 100%;
  height: 2px;
  overflow: hidden;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.auth-progress__line::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 28%;
  background: color-mix(in srgb, var(--glass-text) 58%, transparent);
  animation: auth-progress-slide 1.2s linear infinite;
}

@keyframes auth-progress-slide {
  from {
    transform: translateX(-140%);
  }
  to {
    transform: translateX(420%);
  }
}

.auth-links a {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 720px) {
  .auth-card {
    max-width: 100%;
    padding: 24px;
  }

  .auth-role-grid {
    grid-template-columns: 1fr;
  }
}

@supports (padding: env(safe-area-inset-top)) {
  .auth-root {
    padding-top: max(20px, env(safe-area-inset-top));
    padding-right: max(20px, env(safe-area-inset-right));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
    padding-left: max(20px, env(safe-area-inset-left));
  }
}
</style>