<template>
  <div>
    <div v-if="projectPending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else-if="!project" style="font-size:.88rem;color:#999">Проект не найден</div>
    <template v-else>
      <div style="font-size:.78rem;color:#aaa;margin-bottom:12px">
        <NuxtLink to="/admin" style="color:#888;text-decoration:none">проекты</NuxtLink>
        <span style="margin:0 6px">/</span>
        <span>{{ project.title }}</span>
      </div>

      <!-- Phase tracker -->
      <AdminProjectPhase
        :slug="route.params.slug as string"
        :status="projectStatus"
        @update:status="projectStatus = $event"
      />

      <div class="proj-tabs">
        <button
          v-for="pg in availablePages"
          :key="pg.slug"
          class="proj-tab"
          :class="{ 'proj-tab--active': activePage === pg.slug }"
          @click="activePage = pg.slug"
        >{{ pg.title }}</button>
        <span style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <a :href="`https://dariakulchikhina.com/api/auth/client-open?projectSlug=${encodeURIComponent(project.slug)}`" class="proj-ready-link">готовые страницы ↗</a>
          <button class="proj-tab proj-tab--settings" @click="showEdit = true">⚙ проект</button>
        </span>
      </div>

      <div v-if="activePage === 'project_roadmap'">
        <AdminRoadmap :slug="route.params.slug as string" />
      </div>
      <div v-else-if="activePage === 'work_status'">
        <AdminWorkStatus :slug="route.params.slug as string" />
      </div>
      <div v-else-if="activePage === 'profile_customer'">
        <AdminClientProfile :slug="route.params.slug as string" />
      </div>
      <div v-else-if="activePage === 'profile_contractors'">
        <AdminContractorsProfile />
      </div>
      <div v-else>
        <AdminPageContent :slug="route.params.slug as string" :page="activePage" />
      </div>
    </template>

    <div v-if="showEdit" class="a-modal-backdrop" @click.self="showEdit = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">редактировать проект</h3>
        <form @submit.prevent="saveProject">
          <div class="a-field">
            <label>Название</label>
            <input v-model="editForm.title" class="a-input" required>
          </div>
          <p v-if="editError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ editError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="showEdit = false">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: project, pending: projectPending, refresh } = await useFetch<any>(`/api/projects/${slug.value}`)
const activePage = ref('materials')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')

watch(project, (p) => {
  if (p) {
    editForm.title = p.title
    projectStatus.value = p.status || 'lead'
  }
})

const editForm = reactive({
  title: project.value?.title || ''
})

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
      body: { title: editForm.title }
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

<style scoped>
.proj-tabs {
  --tab-border: #ddd;
  --tab-color: #666;
  --tab-hover-border: #1a1a1a;
  --tab-hover-color: #1a1a1a;
  --tab-active-border: #1a1a1a;
  --tab-active-color: #1a1a1a;
  --link-color: #555;
  --link-border: #ddd;
  --btn-border: #ddd;
  --btn-color: #666;
  --save-bg: #1a1a1a;
  --save-color: #fff;
  --save-hover-bg: #333;
  --input-border: #ddd;
  --input-focus: #1a1a1a;
  --input-color: inherit;
  --label-color: #888;
  --modal-bg: #fff;
  --modal-border: #e0e0e0;
  --backdrop-bg: rgba(0,0,0,0.3);

  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}
.proj-tab {
  padding: 8px 16px;
  border: 1px solid var(--tab-border);
  background: transparent;
  text-decoration: none;
  color: var(--tab-color);
  font-size: .82rem;
  border-radius: 2px;
  cursor: pointer;
  font-family: inherit;
}
.proj-tab:hover { border-color: var(--tab-hover-border); color: var(--tab-hover-color); }
.proj-tab--active { border-color: var(--tab-active-border); color: var(--tab-active-color); font-weight: 500; }
.proj-tab--settings { border-style: dashed; font-size: .78rem; }
.proj-ready-link {
  font-size: .78rem; color: var(--link-color); text-decoration: none;
  border: 1px solid var(--link-border); padding: 6px 10px; border-radius: 2px;
}
.proj-ready-link:hover { border-color: var(--tab-hover-border); color: var(--tab-hover-color); }
.a-btn-sm {
  border: 1px solid var(--btn-border); background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
  color: var(--btn-color);
}
.a-btn-sm:hover { border-color: var(--tab-hover-border); color: var(--tab-hover-color); }
.a-btn-save {
  border: 1px solid var(--save-bg); background: var(--save-bg); color: var(--save-color);
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: var(--save-hover-bg); }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: var(--label-color); margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid var(--input-border);
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
  color: var(--input-color); background: transparent;
}
.a-input:focus { border-bottom-color: var(--input-focus); }
.a-modal-backdrop {
  position: fixed; inset: 0; background: var(--backdrop-bg);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: var(--modal-bg); border: 1px solid var(--modal-border);
  padding: 32px; width: 380px; max-width: 90vw;
}
</style>
