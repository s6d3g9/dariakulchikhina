<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white border border-gray-200 p-10 w-80">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-400 mb-6">Вход</h2>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <input
            v-model="form.email"
            type="email"
            placeholder="email"
            required
            class="w-full border-b border-gray-200 pb-2 text-sm outline-none font-inherit focus:border-gray-600"
          />
        </div>
        <div class="mb-6">
          <input
            v-model="form.password"
            type="password"
            placeholder="пароль"
            required
            class="w-full border-b border-gray-200 pb-2 text-sm outline-none font-inherit focus:border-gray-600"
          />
        </div>
        <p v-if="error" class="text-red-500 text-xs mb-4">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full border border-gray-900 bg-transparent py-2 text-sm cursor-pointer hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-50"
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
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    router.push('/admin')
  } catch (e: any) {
    error.value = e.data?.message || 'Неверные данные'
  } finally {
    loading.value = false
  }
}
</script>