<template>
  <div class="login-root glass-page">
    <div class="login-card glass-surface">
      <div class="login-header">
        <div class="login-icon">◑</div>
        <h1 class="login-title">Кабинет подрядчика</h1>
        <p class="login-subtitle">Введите ваш ID и код доступа</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="login-field">
          <label>ID подрядчика</label>
          <input
            v-model.number="form.id"
            type="number"
            min="1"
            placeholder="Ваш ID"
            required
            class="glass-input login-input"
            autofocus
          />
        </div>

        <div class="login-field">
          <label>Код доступа (slug)</label>
          <input
            v-model="form.slug"
            type="text"
            placeholder="Код, выданный дизайнером"
            required
            class="glass-input login-input"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="login-btn"
        >
          {{ loading ? 'Вход…' : 'Войти' }}
        </button>
      </form>

      <div class="login-help">
        <p>Не знаете свой код? Запросите его у дизайнера.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const router = useRouter()
const form = reactive({ id: null as number | null, slug: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!form.id || !form.slug.trim()) {
    error.value = 'Заполните все поля'
    return
  }
  loading.value = true
  try {
    const result = await $fetch<{ ok: boolean; id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: { id: form.id, slug: form.slug.trim() },
    })
    router.push(`/contractor/${result.id}`)
  } catch (e: any) {
    error.value = (e.data?.message && e.data.message !== 'Server Error' ? e.data.message : '') ||
      (e.data?.statusMessage || '').trim() ||
      'Неверные данные'
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
  opacity: 0.6;
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
  border-radius: 20px;
  border: 1px solid rgba(180, 180, 220, 0.45);
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  font-size: 0.9rem;
  font-weight: 700;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  transition: background 0.15s;
}
.login-btn:hover { background: rgba(255, 255, 255, 0.5); }
.login-btn:disabled { opacity: 0.5; cursor: default; }

.login-help {
  margin-top: 20px;
  text-align: center;
}
.login-help p {
  font-size: 0.78rem;
  opacity: 0.4;
  margin: 0;
}
</style>
