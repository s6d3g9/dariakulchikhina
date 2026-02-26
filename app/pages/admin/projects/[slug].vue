<template>
  <div>
    <div v-if="projectPending" class="text-sm text-gray-400">Загрузка...</div>
    <div v-else-if="!project" class="text-sm text-gray-400">Проект не найден</div>
    <template v-else>
      <!-- Хлебные крошки -->
      <div class="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <NuxtLink to="/admin" class="hover:text-gray-700">Проекты</NuxtLink>
        <span>/</span>
        <span class="text-gray-700">{{ project.title }}</span>
      </div>

      <!-- Заголовок -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-lg font-light">{{ project.title }}</h1>
          <p class="text-xs text-gray-400">{{ project.slug }}</p>
        </div>
        <div class="flex gap-2">
          <UButton variant="outline" size="sm" @click="showEdit = true">Редактировать</UButton>
          <a :href="`/client/${project.slug}`" target="_blank">
            <UButton variant="ghost" size="sm">Страница клиента ↗</UButton>
          </a>
        </div>
      </div>

      <!-- Вкладки страниц -->
      <div class="flex gap-1 border-b border-gray-200 mb-6 text-sm overflow-x-auto">
        <button
          v-for="pg in availablePages"
          :key="pg.slug"
          class="px-4 py-2 whitespace-nowrap border-b-2 transition-colors"
          :class="activePage === pg.slug
            ? 'border-gray-900 text-gray-900 font-medium'
            : 'border-transparent text-gray-400 hover:text-gray-700'"
          @click="activePage = pg.slug"
        >
          {{ pg.title }}
        </button>
      </div>

      <!-- Содержимое страницы -->
      <div v-if="activePage === 'project_roadmap'">
        <AdminRoadmap :slug="route.params.slug as string" />
      </div>
      <div v-else-if="activePage === 'work_status'">
        <AdminWorkStatus :slug="route.params.slug as string" />
      </div>
      <div v-else>
        <AdminPageContent :slug="route.params.slug as string" :page="activePage" />
      </div>
    </template>

    <!-- Модальное окно редактирования -->
    <UModal v-model:open="showEdit">
      <template #content>
        <div class="p-6 max-w-md">
          <h3 class="text-sm font-medium mb-4 tracking-widest uppercase">Редактировать проект</h3>
          <form @submit.prevent="saveProject">
            <div class="mb-3">
              <label class="text-xs text-gray-500 block mb-1">Название</label>
              <UInput v-model="editForm.title" required />
            </div>
            <div class="mb-3">
              <label class="text-xs text-gray-500 block mb-1">PIN клиента</label>
              <UInput v-model="editForm.clientPin" placeholder="пусто = недоступен" />
            </div>
            <p v-if="editError" class="text-red-500 text-xs mb-3">{{ editError }}</p>
            <div class="flex gap-2 justify-end">
              <UButton variant="ghost" @click="showEdit = false">Отмена</UButton>
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

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: project, pending: projectPending, refresh } = await useFetch<any>(`/api/projects/${slug.value}`)
const { data: pageConfigs } = await useFetch<any[]>('/api/projects')

const activePage = ref('materials')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')

const editForm = reactive({
  title: project.value?.title || '',
  clientPin: project.value?.clientPin || ''
})

watch(project, (p) => {
  if (p) {
    editForm.title = p.title
    editForm.clientPin = p.clientPin || ''
  }
})

// Доступные страницы = pages из проекта с конфигом
const allPageSlugs = [
  { slug: 'materials', title: 'материалы' },
  { slug: 'tz', title: 'тех. задание' },
  { slug: 'profile_customer', title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'профиль подрядчиков' },
  { slug: 'work_status', title: 'статусы работ' },
  { slug: 'project_roadmap', title: 'дорожная карта' },
]

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter(p => pages.includes(p.slug))
})

async function saveProject() {
  saving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}`, {
      method: 'PUT',
      body: { title: editForm.title, clientPin: editForm.clientPin || null }
    })
    showEdit.value = false
    refresh()
  } catch (e: any) {
    editError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>