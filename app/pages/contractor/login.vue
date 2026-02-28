<template>
  <div class="min-h-screen flex items-center justify-center glass-page px-4">
    <div class="glass-card border border-white/60 dark:border-white/10 p-10 w-80">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-gray-300 mb-2">Подрядчик</h2>
      <p class="text-xs text-gray-500 dark:text-gray-300 mb-6">Введите ваш ID</p>
      <form @submit.prevent="submit">
        <div class="mb-4">
          <input
            v-model="contractorId"
            type="number"
            placeholder="ID подрядчика"
            required
            min="1"
            class="w-full glass-input rounded-md px-3 py-2 text-sm outline-none font-inherit tracking-widest"
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
const contractorId = ref<number | ''>('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ id: number }>('/api/auth/contractor-login', {
      method: 'POST',
      body: { id: Number(contractorId.value) }
    })
    router.push(`/contractor/${res.id}`)
  } catch (e: any) {
    error.value = e.data?.message || 'Подрядчик не найден'
  } finally {
    loading.value = false
  }
}
</script>