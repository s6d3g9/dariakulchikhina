<template>
  <div class="login-root glass-page">
    <div class="login-card glass-surface">
      <div class="login-header">
        <div class="login-icon">◌</div>
        <h1 class="login-title">Личный кабинет</h1>
        <p class="login-subtitle">Введите код доступа к вашему проекту</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="login-field">
          <label>Код проекта</label>
          <input
            v-model="slug"
            type="text"
            placeholder="например: ivanov-project-2024"
            required
            class="glass-input login-input"
            autofocus
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" :disabled="loading" class="login-btn a-btn-save">
          {{ loading ? 'Вход…' : 'Войти в кабинет' }}
        </button>
      </form>

      <div class="login-help">
        <p>Код выдаётся дизайнером. Если вы его не знаете — обратитесь к нам.</p>
        <NuxtLink to="/admin/login" class="login-back">← Я дизайнер</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const router = useRouter()
const slug = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  const s = slug.value.trim().toLowerCase()
  if (!s) { error.value = 'Введите код проекта'; return }
  loading.value = true
  try {
    const result = await $fetch<{ ok: boolean; slug: string }>('/api/auth/client-login', {
      method: 'POST',
      body: { slug: s },
    })
    router.push(`/client/${result.slug}`)
  } catch (e: any) {
    error.value = (e.data?.message && e.data.message !== 'Server Error' ? e.data.message : '') ||
      (e.data?.statusMessage || '').trim() ||
      'Неверный код. Проверьте и попробуйте снова.'
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
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 40px 32px;
  border-radius: 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-icon {
  font-size: 2.4rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

.login-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 6px;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.8;
}

.login-subtitle {
  font-size: 0.82rem;
  opacity: 0.5;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.login-field label {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.login-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.92rem;
}

.login-error {
  color: var(--ds-error, #e05252);
  font-size: 0.82rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  padding: 6px 12px;
  background: rgba(224, 82, 82, 0.08);
  border-radius: 10px;
}

.login-btn {
  width: 100%;
  padding: 11px;
}

.login-help {
  margin-top: 20px;
  text-align: center;
}

.login-help p {
  font-size: 0.78rem;
  opacity: 0.4;
  margin: 0 0 10px;
}

.login-back {
  font-size: 0.75rem;
  opacity: 0.35;
  color: inherit;
  text-decoration: none;
  transition: opacity 0.15s;
}
.login-back:hover { opacity: 0.65; }
</style>
