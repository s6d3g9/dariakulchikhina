<template>
  <div class="min-h-screen flex items-center justify-center glass-page px-4">
    <div class="glass-card border border-white/60 dark:border-white/10 p-10 w-80">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-gray-300 mb-6">Вход</h2>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <input
            v-model="form.login"
            type="text"
            placeholder="логин"
            autocomplete="username"
            required
            class="w-full glass-input rounded-md px-3 py-2 text-sm outline-none"
          />
        </div>
        <div class="mb-6">
          <input
            v-model="form.password"
            type="password"
            placeholder="пароль"
            autocomplete="current-password"
            required
            class="w-full glass-input rounded-md px-3 py-2 text-sm outline-none"
          />
        </div>
        <p v-if="error" class="text-red-500 text-xs mb-4">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full glass-chip py-2 text-sm cursor-pointer transition-colors disabled:opacity-50 hover:opacity-90"
        >
          {{ loading ? '...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const router = useRouter()
const form = reactive({ login: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    router.push('/admin')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Неверный логин или пароль'
  } finally {
    loading.value = false
  }
}
</script>
