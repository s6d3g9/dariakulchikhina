<template>
  <div class="login-root glass-page">
    <div class="login-card glass-surface">
      <div class="login-header">
        <div class="login-icon">◈</div>
        <h1 class="login-title">Кабинет дизайнера</h1>
        <p class="login-subtitle">Войдите, чтобы управлять проектами</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="login-field">
          <label>Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="your@email.com"
            required
            autocomplete="email"
            class="glass-input login-input"
            autofocus
          />
        </div>

        <div class="login-field">
          <label>Пароль</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="Ваш пароль"
            required
            autocomplete="current-password"
            class="glass-input login-input"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? 'Вход…' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const router = useRouter()
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/designer-login', {
      method: 'POST',
      body: { email: form.email.trim(), password: form.password },
    })
    router.push('/designer')
  } catch (e: any) {
    error.value =
      (e.data?.message && e.data.message !== 'Server Error' ? e.data.message : '') ||
      (e.data?.statusMessage || '').trim() ||
      'Неверный email или пароль'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border-radius: 16px;
}

.login-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--glass-accent, #6366f1);
}

.login-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: var(--glass-text, #111);
}

.login-subtitle {
  font-size: 0.875rem;
  color: var(--glass-label, #888);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.login-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--glass-label, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.login-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border, #ddd);
  background: var(--glass-input-bg, #fff);
  color: var(--glass-text, #111);
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus {
  border-color: var(--glass-accent, #6366f1);
}

.login-error {
  font-size: 0.85rem;
  color: var(--glass-danger, #e53e3e);
  background: color-mix(in srgb, var(--glass-danger, #e53e3e) 10%, transparent);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin: 0;
}

.login-btn {
  margin-top: 0.5rem;
  padding: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  background: var(--glass-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn:not(:disabled):hover {
  opacity: 0.9;
}
</style>
