<template>
  <div>
    <div class="a-card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">проекты</span>
      <button class="a-btn-save" @click="openCreate" style="padding:7px 18px;font-size:.82rem">+ новый проект</button>
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

    <div v-if="showCreate" class="a-modal-backdrop" @click.self="closeCreate">
      <div class="a-modal" style="width:520px;max-width:94vw">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">новый проект</h3>
        <form @submit.prevent="onSubmitWizard">
          <div style="font-size:.75rem;color:#888;margin-bottom:12px">шаг {{ createStep }} из 2</div>

          <template v-if="createStep === 1">
            <div class="a-field">
              <label>Название</label>
              <input v-model="newProject.title" class="a-input" required placeholder="Название проекта">
            </div>
            <div class="a-field">
              <label>Slug (URL)</label>
              <input v-model="newProject.slug" class="a-input" required placeholder="project_slug">
            </div>
            <div class="a-field">
              <label>Шаблон проекта (сценарий)</label>
              <select v-model="newProject.roadmapTemplateKey" class="a-input" style="border:1px solid #ddd;padding:8px">
                <option v-for="tpl in templates || []" :key="tpl.key" :value="tpl.key">
                  {{ tpl.title }}{{ tpl.isBuiltIn ? ' · встроенный' : ' · пользовательский' }}
                </option>
              </select>
            </div>
          </template>

          <template v-else>
            <div class="a-field" style="margin-bottom:8px">
              <label>Проект</label>
              <div style="font-size:.86rem">{{ newProject.title || '—' }} · {{ newProject.slug || '—' }}</div>
            </div>
            <div class="a-field" style="margin-bottom:8px">
              <label>Выбранный сценарий</label>
              <div style="font-size:.86rem">{{ selectedTemplate?.title || '—' }}</div>
              <div v-if="selectedTemplate" style="font-size:.74rem;color:#999;margin-top:3px">{{ selectedTemplate.description }}</div>
            </div>
            <div class="a-field" style="margin-bottom:8px">
              <label>Будут добавлены страницы</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                <span v-for="pg in corePageLabels" :key="pg" style="font-size:.72rem;border:1px solid #ddd;padding:2px 6px;color:#666">{{ pg }}</span>
              </div>
            </div>
            <div class="a-field" style="margin-bottom:8px">
              <label>Этапы дорожной карты</label>
              <ul style="margin:6px 0 0 0;padding-left:16px;max-height:180px;overflow:auto">
                <li v-for="(s, idx) in (selectedTemplate?.stages || [])" :key="`${s.title}-${idx}`" style="font-size:.78rem;color:#666;margin-bottom:2px">
                  {{ idx + 1 }}. {{ s.title }}
                </li>
              </ul>
            </div>
          </template>

          <p v-if="createError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ createError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="closeCreate">отмена</button>
            <button v-if="createStep === 2" type="button" class="a-btn-sm" @click="createStep = 1">назад</button>
            <button type="submit" class="a-btn-save" :disabled="creating">
              {{ createStep === 1 ? 'дальше' : (creating ? '...' : 'создать проект') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: projects, pending, refresh } = await useFetch<any[]>('/api/projects')
const { data: templates } = await useFetch<any[]>('/api/roadmap-templates')
const showCreate = ref(false)
const createStep = ref(1)
const creating = ref(false)
const createError = ref('')
const newProject = reactive({ title: '', slug: '', roadmapTemplateKey: '' })

const corePageLabels = [
  'материалы',
  'тех. задание',
  'профиль клиента',
  'профиль подрядчиков',
  'статусы работ',
  'дорожная карта',
]

const selectedTemplate = computed(() =>
  (templates.value || []).find((tpl: any) => tpl.key === newProject.roadmapTemplateKey)
)

watch(templates, (list) => {
  if (!newProject.roadmapTemplateKey && Array.isArray(list) && list.length > 0) {
    newProject.roadmapTemplateKey = list[0].key
  }
}, { immediate: true })

async function createProject() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/projects', {
      method: 'POST',
      body: {
        title: newProject.title,
        slug: newProject.slug,
        roadmapTemplateKey: newProject.roadmapTemplateKey || undefined,
      }
    })
    closeCreate()
    refresh()
  } catch (e: any) {
    createError.value = e.data?.message || 'Ошибка'
  } finally {
    creating.value = false
  }
}

function openCreate() {
  showCreate.value = true
  createStep.value = 1
  createError.value = ''
  newProject.title = ''
  newProject.slug = ''
  newProject.roadmapTemplateKey = templates.value?.[0]?.key || ''
}

function closeCreate() {
  showCreate.value = false
  createStep.value = 1
  createError.value = ''
}

function onSubmitWizard() {
  if (createStep.value === 1) {
    if (!newProject.title.trim() || !newProject.slug.trim()) {
      createError.value = 'Заполните название и slug'
      return
    }
    createError.value = ''
    createStep.value = 2
    return
  }
  createProject()
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
