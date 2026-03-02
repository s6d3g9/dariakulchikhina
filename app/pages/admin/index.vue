<template>
  <div class="pj-root">

    <!-- ── Header bar ── -->
    <div class="pj-topbar glass-card">
      <div class="pj-topbar-left">
        <span class="pj-topbar-title">проекты</span>
        <span class="pj-count">{{ projects?.length ?? 0 }}</span>
      </div>
      <div class="pj-topbar-right">
        <input v-model="searchQuery" class="pj-search glass-input" placeholder="поиск..." />
        <button class="a-btn-sm" @click="showCreate = true; wizardStep = 1">+ создать</button>
      </div>
    </div>

    <!-- ── Loading / Empty ── -->
    <div v-if="pending && !hasProjectsCache" class="pj-empty">
      <span class="pj-empty-icon">⏳</span>Загрузка…
    </div>
    <div v-else-if="projects?.length === 0" class="pj-empty">
      <span class="pj-empty-icon">📁</span>
      <span>Нет проектов — создайте первый</span>
      <button class="a-btn-sm" style="margin-top:6px" @click="showCreate = true; wizardStep = 1">+ создать проект</button>
    </div>
    <div v-else>
      <div v-if="filteredProjects.length === 0" class="pj-empty">
        <span class="pj-empty-icon">🔍</span>Ничего не найдено
      </div>
      <transition-group v-else name="pj-list" tag="div" class="pj-grid">
        <div
          v-for="p in filteredProjects" :key="p.id"
          class="pj-card glass-card"
        >
          <div class="pj-card-main">
            <NuxtLink :to="`/admin/projects/${p.slug}`" class="pj-card-title">{{ p.title }}</NuxtLink>
            <div class="pj-card-meta">
              <span class="pj-card-slug">{{ p.slug }}</span>
              <span v-if="p.status" class="pj-phase" :class="`pj-phase--${phaseColor(p.status)}`">{{ phaseLabel(p.status) }}</span>
            </div>
            <div v-if="p.taskTotal > 0" class="pj-progress">
              <div class="pj-progress-bar" :title="`${p.taskDone} из ${p.taskTotal} выполнено`">
                <div class="pj-progress-fill" :style="{ width: Math.round(p.taskDone / p.taskTotal * 100) + '%' }" />
              </div>
              <span class="pj-progress-text">{{ p.taskDone }}/{{ p.taskTotal }}</span>
              <span v-if="p.taskOverdue > 0" class="pj-overdue">⚠ {{ p.taskOverdue }} просрочено</span>
            </div>
          </div>
          <NuxtLink :to="`/admin/projects/${p.slug}`" class="pj-card-arrow">→</NuxtLink>
        </div>
      </transition-group>
    </div>

    <!-- ══ Create modal ══ -->
    <Teleport to="body">
      <div v-if="showCreate" class="pj-backdrop" @click.self="closeCreate">
        <div class="pj-modal glass-surface">
          <div class="pj-modal-head">
            <span>новый проект</span>
            <span class="pj-modal-step">шаг {{ wizardStep }} из 2</span>
            <button class="pj-modal-close" @click="closeCreate">✕</button>
          </div>
          <div class="pj-modal-body">
            <form @submit.prevent="onWizardSubmit">
              <!-- Step 1 -->
              <template v-if="wizardStep === 1">
                <div class="pj-form-field">
                  <label class="pj-form-label">Название</label>
                  <input v-model="newProject.title" class="pj-form-input" required placeholder="Название проекта" autofocus />
                </div>
                <div class="pj-form-field">
                  <label class="pj-form-label">Slug (URL)</label>
                  <input v-model="newProject.slug" class="pj-form-input" required placeholder="project-slug" />
                </div>
                <div class="pj-form-field">
                  <label class="pj-form-label">Сценарий дорожной карты</label>
                  <select v-model="newProject.roadmapTemplateKey" class="pj-form-input pj-form-select">
                    <option value="">— без шаблона</option>
                    <option v-for="tpl in allTemplates" :key="tpl.key" :value="tpl.key">
                      {{ tpl.title }}{{ tpl.isBuiltIn === false ? ' · пользовательский' : '' }}
                    </option>
                  </select>
                </div>
              </template>

              <!-- Step 2: preview -->
              <template v-else>
                <div class="pj-preview-row">
                  <span class="pj-preview-label">Проект</span>
                  <span class="pj-preview-value">{{ newProject.title }} · <span class="pj-preview-dim">{{ newProject.slug }}</span></span>
                </div>
                <div class="pj-preview-row">
                  <span class="pj-preview-label">Сценарий</span>
                  <span class="pj-preview-value">{{ selectedTemplate ? selectedTemplate.title : '— без шаблона' }}</span>
                </div>
                <div v-if="selectedTemplate?.description" class="pj-preview-desc">{{ selectedTemplate.description }}</div>

                <div v-if="selectedTemplate" class="pj-preview-stages">
                  <span class="pj-preview-label">Этапы роадмапа ({{ selectedTemplate.stages.length }})</span>
                  <div class="pj-stages-list">
                    <div v-for="(s, i) in selectedTemplate.stages" :key="i" class="pj-stage-item">
                      <span class="pj-stage-num">{{ i + 1 }}</span>
                      <span>{{ s.title }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="pj-preview-hint">Роадмап будет пустым — этапы можно добавить вручную</div>

                <div class="pj-preview-pages">
                  <span class="pj-preview-label">Страницы</span>
                  <div class="pj-pages-chips">
                    <span v-for="pg in corePageLabels" :key="pg" class="pj-page-chip">{{ pg }}</span>
                  </div>
                </div>
              </template>

              <p v-if="createError" class="pj-form-error">{{ createError }}</p>

              <div class="pj-modal-foot">
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
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ROADMAP_TEMPLATES } from '~~/shared/types/roadmap-templates'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const projectsCache = useState<any[]>('cache-admin-projects', () => [])

const { data: projects, pending, refresh } = await useFetch<any[]>('/api/projects', {
  server: false,
  default: () => projectsCache.value,
})

const hasProjectsCache = computed(() => projectsCache.value.length > 0)

watch(projects, (value) => {
  if (Array.isArray(value)) {
    projectsCache.value = value
  }
}, { deep: true })

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

const { lastSaved } = useRoadmapBus()
watch(lastSaved, reloadProjects)
onMounted(reloadProjects)
onActivated(reloadProjects)

const { data: customTemplates } = useFetch<any[]>('/api/roadmap-templates', { server: false, default: () => [] })

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
/* ══════════════════════════════════════════════════════════════
   PROJECTS — glass design system
   ══════════════════════════════════════════════════════════════ */

/* ── Topbar ── */
.pj-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}
.pj-topbar-left { display: flex; align-items: center; gap: 10px; }
.pj-topbar-title {
  font-size: var(--ds-text-sm, .78rem); text-transform: uppercase;
  letter-spacing: .08em; color: var(--glass-text); opacity: .45;
  font-weight: var(--ds-heading-weight, 600);
}
.pj-count {
  font-size: var(--ds-text-xs, .65rem); padding: 1px 7px;
  border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .6;
}
.pj-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pj-search { width: 220px; padding: 7px 12px; font-size: var(--ds-text-sm, .8rem); }

/* ── Empty state ── */
.pj-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  font-size: var(--ds-text-sm, .84rem); color: var(--glass-text);
  opacity: .4; padding: 40px 0; text-align: center;
}
.pj-empty-icon { font-size: 1.8rem; opacity: .5; }

/* ── Project grid ── */
.pj-grid { display: flex; flex-direction: column; gap: 8px; }

/* ── Project card ── */
.pj-card {
  display: flex; align-items: center; padding: 14px 18px; gap: 12px;
  transition: box-shadow var(--ds-transition, .18s ease), transform var(--ds-transition, .18s ease);
}
.pj-card:hover {
  box-shadow: var(--ds-shadow-lg, 0 8px 32px rgba(0,0,0,.1));
  transform: translateY(-1px);
}
.pj-card-main { flex: 1; min-width: 0; }
.pj-card-title {
  font-size: var(--ds-text-sm, .9rem); font-weight: 500;
  color: var(--glass-text); text-decoration: none;
  display: block;
}
.pj-card-title:hover { text-decoration: underline; }
.pj-card-meta {
  display: flex; align-items: center; gap: 8px; margin-top: 3px;
}
.pj-card-slug {
  font-size: var(--ds-text-xs, .74rem); color: var(--glass-text); opacity: .3;
}
.pj-card-arrow {
  font-size: 1rem; color: var(--glass-text); opacity: .15;
  text-decoration: none; flex-shrink: 0;
  transition: opacity .15s;
}
.pj-card:hover .pj-card-arrow { opacity: .5; }

/* ── Phase badge ── */
.pj-phase {
  font-size: .6rem; font-weight: 500; padding: 2px 8px;
  border-radius: var(--chip-radius, 999px); white-space: nowrap;
}
.pj-phase--gray    { color: var(--glass-text); opacity: .35; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.pj-phase--violet  { color: #7c3aed; background: rgba(124,58,237,.08); }
.pj-phase--blue    { color: #2563eb; background: rgba(37,99,235,.08); }
.pj-phase--amber   { color: #b45309; background: rgba(180,83,9,.07); }
.pj-phase--orange  { color: #c2410c; background: rgba(194,65,12,.07); }
.pj-phase--green   { color: #15803d; background: rgba(21,128,61,.08); }
.pj-phase--teal    { color: #0f766e; background: rgba(15,118,110,.08); }
html.dark .pj-phase--violet { color: #a78bfa; background: rgba(167,139,250,.12); }
html.dark .pj-phase--blue   { color: #93c5fd; background: rgba(147,197,253,.12); }
html.dark .pj-phase--amber  { color: #fcd34d; background: rgba(252,211,77,.1); }
html.dark .pj-phase--orange { color: #fdba74; background: rgba(253,186,116,.1); }
html.dark .pj-phase--green  { color: #86efac; background: rgba(134,239,172,.1); }
html.dark .pj-phase--teal   { color: #5eead4; background: rgba(94,234,212,.1); }

/* ── Progress ── */
.pj-progress {
  display: flex; align-items: center; gap: 10px; margin-top: 6px;
}
.pj-progress-bar {
  width: 80px; height: 4px; border-radius: 3px; overflow: hidden; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.pj-progress-fill {
  height: 100%; border-radius: 3px; background: #15803d; transition: width .3s;
}
.pj-progress-text {
  font-size: var(--ds-text-xs, .7rem); color: var(--glass-text); opacity: .35;
}
.pj-overdue {
  font-size: var(--ds-text-xs, .7rem); color: var(--ds-error, #dc2626); font-weight: 600;
}

/* ── Transitions ── */
.pj-list-enter-active, .pj-list-leave-active { transition: all .2s ease; }
.pj-list-enter-from { opacity: 0; transform: translateY(-4px); }
.pj-list-leave-to  { opacity: 0; transform: translateY(4px); }

/* ══ Modal ══ */
.pj-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.pj-modal {
  width: 520px; max-width: 100%; max-height: 90vh;
  border-radius: var(--modal-radius, 16px);
  display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18);
}
.pj-modal-head {
  display: flex; align-items: center; gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text);
  flex-shrink: 0;
}
.pj-modal-step {
  font-size: var(--ds-text-xs, .7rem); color: var(--glass-text); opacity: .35;
  margin-left: auto;
}
.pj-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px;
  margin-left: 8px;
}
.pj-modal-close:hover { opacity: 1; }
.pj-modal-body {
  overflow-y: auto; flex: 1; padding: 16px 20px;
}
.pj-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 14px; margin-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Form fields ── */
.pj-form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.pj-form-label {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .4; font-weight: 600;
}
.pj-form-input {
  border: none; padding: 8px 10px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .84rem); font-family: inherit; outline: none;
  width: 100%; box-sizing: border-box;
  transition: background .15s ease;
}
.pj-form-input:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.pj-form-select { appearance: none; cursor: pointer; }
.pj-form-error {
  font-size: var(--ds-text-xs, .78rem); color: var(--ds-error, #dc2626); margin-bottom: 8px;
}

/* ── Preview (step 2) ── */
.pj-preview-row {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px;
}
.pj-preview-label {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .35; font-weight: 600;
}
.pj-preview-value {
  font-size: var(--ds-text-sm, .86rem); color: var(--glass-text);
}
.pj-preview-dim { color: var(--glass-text); opacity: .4; }
.pj-preview-desc {
  font-size: var(--ds-text-xs, .74rem); color: var(--glass-text); opacity: .4;
  margin-bottom: 10px;
}
.pj-preview-hint {
  font-size: var(--ds-text-xs, .78rem); color: var(--glass-text); opacity: .35;
  margin-bottom: 12px;
}
.pj-preview-stages { margin-bottom: 12px; }
.pj-stages-list {
  margin-top: 6px; max-height: 180px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px;
}
.pj-stage-item {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--ds-text-xs, .76rem); color: var(--glass-text); opacity: .6;
}
.pj-stage-num {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .55rem; font-weight: 600; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.pj-preview-pages { margin-bottom: 8px; }
.pj-pages-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pj-page-chip {
  font-size: .68rem; padding: 2px 8px;
  border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); opacity: .5;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .pj-search { width: 140px; }
}
</style>
