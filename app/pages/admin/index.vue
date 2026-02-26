<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-sm font-medium tracking-widest uppercase text-gray-700">Проекты</h1>
      <UButton size="sm" @click="showCreate = true">+ Новый проект</UButton>
    </div>

    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <div v-else-if="projects?.length === 0" class="text-sm text-gray-400">Нет проектов</div>
    <div v-else class="grid gap-2">
      <div
        v-for="p in projects"
        :key="p.id"
        class="flex items-center justify-between border border-gray-100 p-4 hover:border-gray-300 transition-colors"
      >
        <div>
          <NuxtLink :to="`/admin/projects/${p.slug}`" class="text-sm font-medium hover:underline">
            {{ p.title }}
          </NuxtLink>
          <p class="text-xs text-gray-400 mt-0.5">{{ p.slug }}</p>
        </div>
        <div class="flex gap-2">
          <NuxtLink :to="`/admin/projects/${p.slug}`">
            <UButton variant="ghost" size="xs">Открыть</UButton>
          </NuxtLink>
          <UButton variant="ghost" size="xs" color="error" @click="deleteProject(p.slug)">
            Удалить
          </UButton>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания проекта -->
    <UModal v-model:open="showCreate">
      <template #content>
        <div class="p-6">
          <h3 class="text-sm font-medium mb-4 tracking-widest uppercase">Новый проект</h3>
          <form @submit.prevent="createProject">
            <div class="mb-3">
              <label class="text-xs text-gray-500 block mb-1">Название</label>
              <UInput v-model="newProject.title" placeholder="название проекта" required />
            </div>
            <div class="mb-3">
              <label class="text-xs text-gray-500 block mb-1">Slug (URL)</label>
              <UInput v-model="newProject.slug" placeholder="project_slug" required />
            </div>
            <div class="mb-4">
              <label class="text-xs text-gray-500 block mb-1">PIN клиента</label>
              <UInput v-model="newProject.clientPin" placeholder="1234" />
            </div>
            <p v-if="createError" class="text-red-500 text-xs mb-3">{{ createError }}</p>
            <div class="flex gap-2 justify-end">
              <UButton variant="ghost" @click="showCreate = false">Отмена</UButton>
              <UButton type="submit" :loading="creating">Создать</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: projects, pending, refresh } = await useFetch<any[]>('/api/projects')

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const newProject = reactive({ title: '', slug: '', clientPin: '' })

async function createProject() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/projects', {
      method: 'POST',
      body: {
        title: newProject.title,
        slug: newProject.slug,
        clientPin: newProject.clientPin || undefined,
        pages: ['materials', 'tz', 'profile_customer', 'profile_contractors', 'work_status', 'project_roadmap']
      }
    })
    showCreate.value = false
    newProject.title = ''
    newProject.slug = ''
    newProject.clientPin = ''
    refresh()
  } catch (e: any) {
    createError.value = e.data?.message || 'Ошибка'
  } finally {
    creating.value = false
  }
}

async function deleteProject(slug: string) {
  if (!confirm(`Удалить проект ${slug}?`)) return
  try {
    await $fetch(`/api/projects/${slug}`, { method: 'DELETE' })
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Ошибка')
  }
}
</script>