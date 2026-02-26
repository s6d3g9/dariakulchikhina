<template>
  <div>
    <div class="a-card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">проекты</span>
      <button class="a-btn-save" @click="showCreate = true" style="padding:7px 18px;font-size:.82rem">+ новый проект</button>
    </div>

    <div v-if="pending" style="font-size:.88rem;color:#999;padding:12px 0">Загрузка...</div>
    <div v-else-if="projects?.length === 0" style="font-size:.88rem;color:#999;padding:12px 0">Нет проектов</div>
    <div v-else>
      <div
        v-for="p in projects"
        :key="p.id"
        class="a-card"
        style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;margin-bottom:8px"
      >
        <div>
          <NuxtLink :to="`/admin/projects/${p.slug}`" class="a-project-link">{{ p.title }}</NuxtLink>
          <div style="font-size:.76rem;color:#aaa;margin-top:2px">{{ p.slug }}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <a :href="`/client/${p.slug}`" target="_blank" rel="noopener noreferrer">
            <button class="a-btn-sm">готовые страницы ↗</button>
          </a>
          <NuxtLink :to="`/admin/projects/${p.slug}`">
            <button class="a-btn-sm">открыть</button>
          </NuxtLink>
          <button class="a-btn-sm a-btn-danger" @click="deleteProject(p.slug)">удалить</button>
        </div>
      </div>
    </div>

    <div v-if="showCreate" class="a-modal-backdrop" @click.self="showCreate = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">новый проект</h3>
        <form @submit.prevent="createProject">
          <div class="a-field">
            <label>Название</label>
            <input v-model="newProject.title" class="a-input" required placeholder="Название проекта">
          </div>
          <div class="a-field">
            <label>Slug (URL)</label>
            <input v-model="newProject.slug" class="a-input" required placeholder="project_slug">
          </div>
          <div class="a-field">
            <label>PIN клиента</label>
            <input v-model="newProject.clientPin" class="a-input" placeholder="1234">
          </div>
          <p v-if="createError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ createError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="showCreate = false">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="creating">{{ creating ? '...' : 'создать' }}</button>
          </div>
        </form>
      </div>
    </div>
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

<style scoped>
.a-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 0; }
.a-project-link { font-size: .9rem; color: #1a1a1a; text-decoration: none; font-weight: 500; }
.a-project-link:hover { text-decoration: underline; }
.a-btn-sm {
  border: 1px solid #ddd; background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
}
.a-btn-sm:hover { border-color: #1a1a1a; }
.a-btn-danger { color: #c00; border-color: #c00; }
.a-btn-danger:hover { background: #c00; color: #fff; }
.a-btn-save {
  border: 1px solid #1a1a1a; background: #1a1a1a; color: #fff;
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: #333; }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: #888; margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid #ddd;
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
}
.a-input:focus { border-bottom-color: #1a1a1a; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: #fff; border: 1px solid #e0e0e0; padding: 32px; width: 360px; max-width: 90vw;
}
</style>
