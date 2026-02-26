<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-sm font-medium tracking-widest uppercase text-gray-700">Подрядчики</h1>
      <UButton size="sm" @click="showCreate = true">+ Добавить</UButton>
    </div>

    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <div v-else class="grid gap-2">
      <div
        v-for="c in contractors"
        :key="c.id"
        class="flex items-center justify-between border border-gray-100 p-4"
      >
        <div>
          <p class="text-sm font-medium">{{ c.name }}</p>
          <p v-if="c.companyName" class="text-xs text-gray-400">{{ c.companyName }}</p>
          <p class="text-xs text-gray-400">PIN: {{ c.pin || '—' }}</p>
        </div>
        <div class="flex gap-2">
          <UButton variant="ghost" size="xs" @click="openEdit(c)">Изменить</UButton>
          <UButton variant="ghost" size="xs" color="error" @click="del(c.id)">Удалить</UButton>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания/редактирования -->
    <UModal v-model:open="showCreate">
      <template #content>
        <div class="p-6 max-w-md">
          <h3 class="text-sm font-medium mb-4 tracking-widest uppercase">
            {{ editingId ? 'Редактировать' : 'Добавить' }} подрядчика
          </h3>
          <form @submit.prevent="save">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="text-xs text-gray-500 block mb-1">Название *</label>
                <UInput v-model="form.name" required />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Slug *</label>
                <UInput v-model="form.slug" required :disabled="!!editingId" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="text-xs text-gray-500 block mb-1">Компания</label>
                <UInput v-model="form.companyName" />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">PIN</label>
                <UInput v-model="form.pin" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="text-xs text-gray-500 block mb-1">Телефон</label>
                <UInput v-model="form.phone" />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">Email</label>
                <UInput v-model="form.email" />
              </div>
            </div>
            <p v-if="formError" class="text-red-500 text-xs mb-3">{{ formError }}</p>
            <div class="flex gap-2 justify-end">
              <UButton variant="ghost" @click="closeModal">Отмена</UButton>
              <UButton type="submit" :loading="saving">Сохранить</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: contractors, pending, refresh } = await useFetch<any[]>('/api/contractors')

const showCreate = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)

const form = reactive({
  name: '', slug: '', companyName: '', pin: '', phone: '', email: ''
})

function openEdit(c: any) {
  editingId.value = c.id
  form.name = c.name
  form.slug = c.slug
  form.companyName = c.companyName || ''
  form.pin = c.pin || ''
  form.phone = c.phone || ''
  form.email = c.email || ''
  showCreate.value = true
}

function closeModal() {
  showCreate.value = false
  editingId.value = null
  Object.assign(form, { name: '', slug: '', companyName: '', pin: '', phone: '', email: '' })
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/contractors', { method: 'POST', body: form })
    }
    closeModal()
    refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('Удалить подрядчика?')) return
  await $fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  refresh()
}
</script>