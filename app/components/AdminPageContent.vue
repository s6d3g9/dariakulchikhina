<template>
  <div>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <template v-else>
      <div class="flex justify-end mb-4">
        <button class="a-btn-save" @click="save" :disabled="saving">{{ saving ? "..." : "сохранить" }}</button>
      </div>
      <textarea
        v-model="rawJson"
        class="w-full h-[500px] font-mono text-xs border border-gray-200 p-4 outline-none focus:border-gray-400 resize-y"
        spellcheck="false"
      />
      <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; page: string }>()

const { data: content, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?pageSlug=${props.page}`
)

const rawJson = ref('')
const saving = ref(false)
const error = ref('')

watch(content, (v) => {
  rawJson.value = JSON.stringify(v || {}, null, 2)
}, { immediate: true })

watch(() => props.page, () => {
  refresh()
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    const parsed = JSON.parse(rawJson.value)
    await $fetch(`/api/projects/${props.slug}/page-content`, {
      method: 'PUT',
      body: { pageSlug: props.page, content: parsed }
    })
  } catch (e: any) {
    error.value = e instanceof SyntaxError ? 'Неверный JSON' : (e.data?.message || 'Ошибка')
  } finally {
    saving.value = false
  }
}
</script>