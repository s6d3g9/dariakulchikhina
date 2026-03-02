<template>
  <div>
    <div class="a-card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">проекты</span>
      <button class="a-btn-save" aria-label="добавить" title="добавить" @click="showCreate = true; wizardStep = 1" style="padding:7px 14px;font-size:.96rem;line-height:1">+</button>
    </div>

    <div v-if="pending && !hasProjectsCache" style="font-size:.88rem;color:#999;padding:12px 0">Загрузка...</div>
    <div v-else-if="projects?.length === 0" style="font-size:.88rem;color:#999;padding:12px 0">Нет проектов</div>
    <div v-else>
      <!-- Search -->
      <div style="margin-bottom:12px">
        <input
          v-model="searchQuery"
          class="a-input"
          placeholder="поиск проекта..."
          style="max-width:360px"
        />
      </div>
      <div v-if="filteredProjects.length === 0" style="font-size:.84rem;color:#bbb;padding:10px 0">Ничего не найдено</div>
      <div
        v-for="p in filteredProjects"
        :key="p.id"
        class="a-card"
        style="display:flex;flex-direction:column;gap:10px;padding:16px 20px;margin-bottom:8px"
      >
        <!-- Title row -->
        <div>
          <NuxtLink :to="`/admin/projects/${p.slug}`" class="a-project-link">{{ p.title }}</NuxtLink>
          <div style="font-size:.76rem;color:#aaa;margin-top:2px;display:flex;align-items:center;gap:8px">
            <span>{{ p.slug }}</span>
            <span v-if="p.status" :class="`pi-badge pi-badge--${phaseColor(p.status)}`">{{ phaseLabel(p.status) }}</span>
          </div>
          <div v-if="p.taskTotal > 0" style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <div class="a-task-mini-bar" :title="`${p.taskDone} из ${p.taskTotal} выполнено`">
              <div class="a-task-mini-fill" :style="{ width: Math.round(p.taskDone / p.taskTotal * 100) + '%' }" />
            </div>
            <span style="font-size:.72rem;color:#aaa">{{ p.taskDone }}/{{ p.taskTotal }}</span>
            <span v-if="p.taskOverdue > 0" style="font-size:.72rem;color:#c00;font-weight:600">⚠ {{ p.taskOverdue }} просрочено</span>
          </div>
        </div>
        <!-- Phase pills -->
        <AdminProjectPhase
          :slug="p.slug"
          :status="p.status"
          @update:status="updateProjectStatus(p.slug, $event)"
        />
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
              <span v-for="pg in corePageLabels" :key="pg" style="font-size:.72rem;padding:2px 8px;color:#666;border:none;background:color-mix(in srgb, var(--glass-bg) 90%, transparent);border-radius:999px">{{ pg }}</span>
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

const projectsCache = useState<any[]>('cache-admin-projects', () => [])

const { data: projects, pending } = await useFetch<any[]>('/api/projects', {
  server: false,
  default: () => projectsCache.value,
})

const hasProjectsCache = computed(() => projectsCache.value.length > 0)

watch(projects, (value) => {
  if (Array.isArray(value)) {
    projectsCache.value = value
  }
}, { deep: true })

// Прямой $fetch в обход Nuxt-кеша — гарантирует свежие данные
async function reloadProjects() {
  try {
    const result = await $fetch<any[]>('/api/projects')
    if (Array.isArray(result)) {
      projects.value = result
      projectsCache.value = result
    }
  } catch { /* silent */ }
}

function updateProjectStatus(slug: string, newStatus: string) {
  if (projects.value) {
    const p = projects.value.find((x: any) => x.slug === slug)
    if (p) p.status = newStatus
  }
}

// При возврате на страницу и при сохранении роадмапа — обновляем список
const { lastSaved } = useRoadmapBus()
watch(lastSaved, reloadProjects)
onMounted(reloadProjects)
onActivated(reloadProjects)

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
}
const corePageLabels = Object.values(CORE_PAGE_LABELS)

const showCreate = ref(false)
const wizardStep = ref(1)
const creating = ref(false)
const createError = ref('')
const newProject = reactive({ title: '', slug: '', roadmapTemplateKey: '' })
const searchQuery = ref('')

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return projects.value || []
  const q = searchQuery.value.toLowerCase()
  return (projects.value || []).filter((p: any) =>
    p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q)
  )
})

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
    createError.value = e.data?.message || e.data?.statusMessage || e.statusMessage || e.message || 'Ошибка создания проекта'
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
/* ── Task mini progress bar ────────────────────────────── */
.a-task-mini-bar {
  width: 80px; height: 5px;
  background: var(--glass-border);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.a-task-mini-fill {
  height: 100%;
  background: #15803d;
  border-radius: 3px;
  transition: width .3s;
}

/* ── Card (glass-surface parity) ───────────────────────── */
.a-card {
  background: var(--glass-bg);
  border: none;
  box-shadow: var(--ds-shadow, var(--glass-shadow));
  -webkit-backdrop-filter: blur(var(--glass-blur, 18px)) saturate(var(--glass-saturation, 145%));
  backdrop-filter: blur(var(--glass-blur, 18px)) saturate(var(--glass-saturation, 145%));
  border-radius: var(--card-radius, 14px);
  transition: box-shadow var(--ds-transition, 180ms ease),
              border-radius var(--ds-transition, 180ms ease),
              background var(--ds-transition, 180ms ease);
}

/* ── Links ─────────────────────────────────────────────── */
.a-project-link {
  font-size: .9rem;
  color: var(--glass-text);
  text-decoration: none;
  font-weight: 500;
}
.a-project-link:hover { text-decoration: underline; }

/* ── Phase badges ─────────────────────────────────────── */
.pi-badge {
  display: inline-block;
  font-size: .65rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  border: none;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: var(--glass-text);
  opacity: .7;
}
.pi-badge--gray      { opacity: .45; }
.pi-badge--violet    { color: #7c3aed; background: rgba(124,58,237,.07); opacity: 1; }
.pi-badge--blue      { color: #1d4ed8; background: rgba(29,78,216,.07); opacity: 1; }
.pi-badge--amber     { color: #b45309; background: rgba(180,83,9,.06); opacity: 1; }
.pi-badge--orange    { color: #c2410c; background: rgba(194,65,12,.06); opacity: 1; }
.pi-badge--green     { color: #15803d; background: rgba(21,128,61,.07); opacity: 1; }
.pi-badge--teal      { color: #0f766e; background: rgba(15,118,110,.07); opacity: 1; }

/* ── Buttons ───────────────────────────────────────────── */
.a-btn-sm {
  border: none;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 5px 12px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 8px;
  color: var(--glass-text);
  opacity: .75;
  text-decoration: none;
  display: inline-block;
  white-space: nowrap;
  transition: opacity .15s, box-shadow .15s;
}
.a-btn-sm:hover {
  opacity: 1;
  box-shadow: 0 3px 10px rgba(0,0,0,.1);
}
.a-btn-danger {
  color: rgba(200,40,40,1);
  background: rgba(200,40,40,.07);
  opacity: 1;
}
.a-btn-danger:hover { background: rgba(200,40,40,.85); color: #fff; border-color: transparent; box-shadow: none; }

.a-btn-save {
  border: none;
  background: var(--glass-text);
  color: var(--glass-page-bg);
  padding: 9px 22px;
  font-size: .82rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-radius: 9px;
  transition: opacity .15s;
}
.a-btn-save:hover { opacity: .82; }
.a-btn-save:disabled { opacity: .45; cursor: default; }

/* ── Form ──────────────────────────────────────────────── */
.a-field { margin-bottom: 14px; }
.a-field label {
  display: block;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: var(--glass-text);
  opacity: .45;
  margin-bottom: 6px;
}
.a-input {
  display: block; width: 100%; box-sizing: border-box;
  border: none;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  padding: 8px 12px;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  color: var(--glass-text);
  border-radius: 8px;
  transition: opacity .15s;
}
.a-input:focus { opacity: .92; }
.a-select {
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

/* ── Modal ─────────────────────────────────────────────── */
.a-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.a-modal {
  background: var(--glass-bg);
  border: none;
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  border-radius: 18px;
  padding: 28px 30px;
  width: 360px;
  max-width: 90vw;
}
</style>
