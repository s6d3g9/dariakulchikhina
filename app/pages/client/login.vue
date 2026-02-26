<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white border border-gray-200 p-10 w-80">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-400 mb-2">Личный кабинет</h2>
      <p class="text-xs text-gray-400 mb-6">Введите PIN-код проекта</p>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <input
            v-model="code"
            type="text"
            placeholder="PIN-код"
            required
            class="w-full border-b border-gray-200 pb-2 text-sm outline-none font-inherit focus:border-gray-600 tracking-widest"
          />
        </div>
        <p v-if="error" class="text-red-500 text-xs mb-4">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full border border-gray-900 bg-transparent py-2 text-sm cursor-pointer hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-50"
        >
          {{ loading ? '...' : 'Открыть' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const router = useRouter()
const code = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ slug: string }>('/api/auth/client-login', {
      method: 'POST',
      body: { code: code.value }
    })
    router.push(`/client/${res.slug}`)
  } catch (e: any) {
    error.value = e.data?.message || 'Неверный PIN-код'
  } finally {
    loading.value = false
  }
}
</script>