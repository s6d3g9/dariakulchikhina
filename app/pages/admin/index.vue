<template>
  <div>
    <div class="a-card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">проекты</span>
      <button class="a-btn-save" @click="showCreate = true; wizardStep = 1" style="padding:7px 18px;font-size:.82rem">+ новый проект</button>
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
          <div style="font-size:.76rem;color:#aaa;margin-top:2px;display:flex;align-items:center;gap:8px">
            <span>{{ p.slug }}</span>
            <span v-if="p.status" :class="`pi-badge pi-badge--${phaseColor(p.status)}`">{{ phaseLabel(p.status) }}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          <a
            :href="`https://dariakulchikhina.com/api/auth/client-open?projectSlug=${encodeURIComponent(p.slug)}`"
            class="a-btn-sm"
            style="text-decoration:none;display:inline-block"
          >кабинет клиента ↗</a>
          <NuxtLink :to="`/admin/projects/${p.slug}`">
            <button class="a-btn-sm">открыть</button>
          </NuxtLink>
          <button class="a-btn-sm a-btn-danger" @click="deleteProject(p.slug)">удалить</button>
        </div>
      </div>
    </div>

    <div v-if="showCreate" class="a-modal-backdrop" @click.self="closeCreate">
      <div class="a-modal" style="width:520px;max-width:94vw">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">новый проект</h3>
        <div style="font-size:.72rem;color:#bbb;margin-bottom:20px">шаг {{ wizardStep }} из 2</div>

        <form @submit.prevent="onWizardSubmit">
          <!-- Step 1: название, slug, шаблон -->
          <template v-if="wizardStep === 1">
            <div class="a-field">
              <label>Название</label>
              <input v-model="newProject.title" class="a-input" required placeholder="Название проекта" autofocus>
            </div>
            <div class="a-field">
              <label>Slug (URL)</label>
              <input v-model="newProject.slug" class="a-input" required placeholder="project-slug">
            </div>
            <div class="a-field">
              <label>Сценарий дорожной карты</label>
              <select v-model="newProject.roadmapTemplateKey" class="a-input a-select">
                <option value="">— без шаблона</option>
                <option v-for="tpl in allTemplates" :key="tpl.key" :value="tpl.key">
                  {{ tpl.title }}{{ tpl.isBuiltIn === false ? ' · пользовательский' : '' }}
                </option>
              </select>
            </div>
          </template>

          <!-- Step 2: превью -->
          <template v-else>
            <div class="a-field" style="margin-bottom:6px">
              <label>Проект</label>
              <div style="font-size:.88rem">{{ newProject.title }} · <span style="color:#aaa">{{ newProject.slug }}</span></div>
            </div>
            <div class="a-field" style="margin-bottom:6px">
              <label>Сценарий</label>
              <div style="font-size:.88rem">{{ selectedTemplate ? selectedTemplate.title : '— без шаблона' }}</div>
              <div v-if="selectedTemplate" style="font-size:.74rem;color:#aaa;margin-top:2px">{{ selectedTemplate.description }}</div>
            </div>
            <div v-if="selectedTemplate" class="a-field" style="margin-bottom:6px">
              <label>Этапы роадмапа ({{ selectedTemplate.stages.length }})</label>
              <ul style="margin:6px 0 0;padding-left:16px;max-height:180px;overflow:auto">
                <li v-for="(s, i) in selectedTemplate.stages" :key="i" style="font-size:.78rem;color:#666;margin-bottom:2px">
                  {{ i + 1 }}. {{ s.title }}
                </li>
              </ul>
            </div>
            <div v-else style="font-size:.8rem;color:#aaa;margin-bottom:12px">
              Роадмап будет пустым — этапы можно добавить вручную
            </div>
            <div style="font-size:.78rem;color:#888;margin-bottom:4px">Будут созданы страницы:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
              <span v-for="pg in corePageLabels" :key="pg" style="font-size:.72rem;border:1px solid #ddd;padding:2px 8px;color:#666">{{ pg }}</span>
            </div>
          </template>

          <p v-if="createError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ createError }}</p>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="closeCreate">отмена</button>
            <button v-if="wizardStep === 2" type="button" class="a-btn-sm" @click="wizardStep = 1">← назад</button>
            <button type="submit" class="a-btn-save" :disabled="creating">
              {{ wizardStep === 1 ? 'далее →' : (creating ? '...' : 'создать проект') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROADMAP_TEMPLATES } from '~~/shared/types/roadmap-templates'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: projects, pending, refresh } = await useFetch<any[]>('/api/projects')
const { data: customTemplates } = useFetch<any[]>('/api/roadmap-templates', { server: false, default: () => [] })

// API returns all templates (built-in + custom). Use as primary source.
// Fall back to local ROADMAP_TEMPLATES before the client-side fetch completes.
const allTemplates = computed(() =>
  (customTemplates.value && customTemplates.value.length > 0)
    ? customTemplates.value
    : ROADMAP_TEMPLATES.map(t => ({ ...t, isBuiltIn: true }))
)

const CORE_PAGE_LABELS: Record<string, string> = {
  materials: 'материалы',
  tz: 'ТЗ',
  profile_customer: 'профиль клиента',
  profile_contractors: 'подрядчики',
  work_status: 'статус работ',
  project_roadmap: 'роадмап',
}
const corePageLabels = Object.values(CORE_PAGE_LABELS)

const showCreate = ref(false)
const wizardStep = ref(1)
const creating = ref(false)
const createError = ref('')
const newProject = reactive({ title: '', slug: '', roadmapTemplateKey: '' })

const selectedTemplate = computed(() =>
  newProject.roadmapTemplateKey
    ? allTemplates.value.find(t => t.key === newProject.roadmapTemplateKey) ?? null
    : null
)

function closeCreate() {
  showCreate.value = false
  wizardStep.value = 1
  newProject.title = ''
  newProject.slug = ''
  newProject.roadmapTemplateKey = ''
  createError.value = ''
}

function onWizardSubmit() {
  if (wizardStep.value === 1) {
    if (!newProject.title.trim() || !newProject.slug.trim()) return
    wizardStep.value = 2
    return
  }
  createProject()
}

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
      },
    })
    closeCreate()
    refresh()
  } catch (e: any) {
    createError.value = e.data?.message || 'Ошибка создания проекта'
    wizardStep.value = 1
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

function phaseLabel(status: string) {
  return PROJECT_PHASES.find(p => p.key === status)?.label || status
}

function phaseColor(status: string) {
  return PROJECT_PHASES.find(p => p.key === status)?.color || 'gray'
}
</script>

<style scoped>
/* light defaults */
.a-card {
  --card-bg: #fff;
  --card-border: #e0e0e0;
  --card-text: #1a1a1a;
  --card-muted: #aaa;
  --link-color: #1a1a1a;
  --btn-border: #ddd;
  --btn-color: #666;
  --btn-hover-border: #1a1a1a;
  --btn-hover-color: #1a1a1a;
  --danger-color: #c00;
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

  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 0;
}
.a-project-link { font-size: .9rem; color: var(--link-color); text-decoration: none; font-weight: 500; }
.a-project-link:hover { text-decoration: underline; }
.pi-badge {
  display: inline-block;
  font-size: .66rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 20px;
  white-space: nowrap;
}
.pi-badge--gray      { background: #f3f4f6; color: #6b7280; }
.pi-badge--violet    { background: #ede9fe; color: #7c3aed; }
.pi-badge--blue      { background: #dbeafe; color: #1d4ed8; }
.pi-badge--amber     { background: #fef3c7; color: #b45309; }
.pi-badge--orange    { background: #ffedd5; color: #c2410c; }
.pi-badge--green     { background: #dcfce7; color: #15803d; }
.pi-badge--teal      { background: #ccfbf1; color: #0f766e; }
.a-btn-sm {
  border: 1px solid var(--btn-border); background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
  color: var(--btn-color);
}
.a-btn-sm:hover { border-color: var(--btn-hover-border); color: var(--btn-hover-color); }
.a-btn-danger { color: var(--danger-color); border-color: var(--danger-color); }
.a-btn-danger:hover { background: #c00; color: #fff; }
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
.a-select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  padding-bottom: 8px;
}
.a-modal-backdrop {
  position: fixed; inset: 0; background: var(--backdrop-bg);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: var(--modal-bg); border: 1px solid var(--modal-border);
  padding: 32px; width: 360px; max-width: 90vw;
}
</style>
