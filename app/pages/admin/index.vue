<template>
  <div>
    <div class="ent-layout ent-layout--with-stats">
      <!-- ═══ Sidebar ═══ -->
      <nav class="ent-sidebar std-sidenav">
        <AdminSidebarSwitcher title="проекты" :count="projects?.length ?? 0" />
        <input v-model="searchQuery" class="ent-search glass-input" placeholder="поиск..." />
        <div class="std-nav">
          <template v-if="pending && !hasProjectsCache">
            <div class="ent-nav-skeleton" v-for="i in 4" :key="i" />
          </template>
          <template v-else>
            <button v-for="p in filteredProjects" :key="p.id" class="ent-nav-item" :class="{ 'ent-nav-item--active': selectedSlug === p.slug }" @click="selectProject(p)">
              <span class="ent-nav-avatar pj-av">{{ p.title?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span class="ent-nav-name">{{ p.title }}<span v-if="p.status" class="ent-nav-sub">{{ phaseLabel(p.status) }}</span></span>
              <span v-if="p.status" class="ent-nav-badge pj-phase" :class="`pj-phase--${phaseColor(p.status)}`">{{ phaseLabel(p.status) }}</span>
            </button>
            <div v-if="!filteredProjects.length && searchQuery" class="pj-nav-empty">ничего не найдено</div>
            <div v-else-if="!projects?.length" class="pj-nav-empty">нет проектов</div>
          </template>
        </div>
        <div class="ent-sidebar-foot"><button class="ent-sidebar-add a-btn-sm" @click="showCreate = true; wizardStep = 1">+ создать</button></div>
      </nav>

      <!-- ═══ Detail ═══ -->
      <div class="ent-main">
        <div v-if="selectedProject" class="ent-detail-card glass-card">
          <div class="ent-detail-head">
            <div>
              <div class="ent-detail-name">{{ selectedProject.title }}</div>
              <div class="pj-detail-slug">{{ selectedProject.slug }}</div>
            </div>
            <div class="ent-detail-actions">
              <NuxtLink :to="`/admin/projects/${selectedProject.slug}`" class="a-btn-sm pj-open-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                открыть
              </NuxtLink>
            </div>
          </div>

          <div v-if="selectedProject.status" class="ent-detail-section">статус</div>
          <div v-if="selectedProject.status" class="ent-detail-row">
            <span class="pj-phase-pill" :class="`pj-phase--${phaseColor(selectedProject.status)}`">{{ phaseLabel(selectedProject.status) }}</span>
          </div>

          <div v-if="selectedProject.taskTotal > 0" class="ent-detail-section">прогресс</div>
          <div v-if="selectedProject.taskTotal > 0" class="pj-progress-row">
            <div class="pj-progress-bar"><div class="pj-progress-fill" :style="{ width: Math.round(selectedProject.taskDone / selectedProject.taskTotal * 100) + '%' }" /></div>
            <span class="pj-progress-text">{{ selectedProject.taskDone }}/{{ selectedProject.taskTotal }}</span>
            <span v-if="selectedProject.taskOverdue > 0" class="pj-overdue">⚠ {{ selectedProject.taskOverdue }} просрочено</span>
          </div>

          <div class="ent-detail-foot">
            <NuxtLink :to="`/admin/projects/${selectedProject.slug}`" class="a-btn-sm">управление</NuxtLink>
            <NuxtLink :to="`/admin/contractors?projectSlug=${selectedProject.slug}`" class="a-btn-sm">подрядчики</NuxtLink>
            <NuxtLink :to="`/admin/clients?projectSlug=${selectedProject.slug}`" class="a-btn-sm">клиенты</NuxtLink>
          </div>
        </div>
        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">📁</span>
          <span v-if="projects?.length">Выберите проект из списка</span>
          <span v-else>Нет проектов — создайте первый</span>
          <button v-if="!projects?.length" class="a-btn-sm" style="margin-top:6px" @click="showCreate = true; wizardStep = 1">+ создать проект</button>
        </div>
      </div>

      <!-- ═══ Status bar ═══ -->
      <AdminProjectStatusBar />
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
              <template v-if="wizardStep === 1">
                <div class="pj-form-field"><label class="pj-form-label">Название</label><input v-model="newProject.title" class="glass-input" required placeholder="Название проекта" autofocus /></div>
                <div class="pj-form-field"><label class="pj-form-label">Slug (URL)</label><input v-model="newProject.slug" class="glass-input" required placeholder="project-slug" /></div>
              </template>
              <template v-else>
                <div class="pj-preview-row"><span class="pj-preview-label">Проект</span><span class="pj-preview-value">{{ newProject.title }} · <span class="pj-preview-dim">{{ newProject.slug }}</span></span></div>
                <div class="pj-preview-pages"><span class="pj-preview-label">Страницы</span><div class="pj-pages-chips"><span v-for="pg in corePageLabels" :key="pg" class="pj-page-chip">{{ pg }}</span></div></div>
              </template>
              <p v-if="createError" class="pj-form-error">{{ createError }}</p>
              <div class="pj-modal-foot">
                <button type="button" class="a-btn-sm" @click="closeCreate">отмена</button>
                <button v-if="wizardStep === 2" type="button" class="a-btn-sm" @click="wizardStep = 1">← назад</button>
                <button type="submit" class="a-btn-save" :disabled="creating">{{ wizardStep === 1 ? 'далее →' : (creating ? '...' : 'создать проект') }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const projectsCache = useState<any[]>('cache-admin-projects', () => [])
const { data: projects, pending, refresh } = await useFetch<any[]>('/api/projects', {
  server: false, default: () => projectsCache.value,
})
const hasProjectsCache = computed(() => projectsCache.value.length > 0)
watch(projects, (value) => { if (Array.isArray(value)) projectsCache.value = value }, { deep: true })

async function reloadProjects() {
  try { const result = await $fetch<any[]>('/api/projects'); if (Array.isArray(result)) { projects.value = result; projectsCache.value = result } } catch { /* silent */ }
}
onMounted(reloadProjects)
onActivated(reloadProjects)

const CORE_PAGE_LABELS: Record<string, string> = { materials: 'материалы', tz: 'ТЗ', profile_customer: 'профиль клиента' }
const corePageLabels = Object.values(CORE_PAGE_LABELS)

// ── Search & selection ─────────────────────────────────
const searchQuery = ref('')
const selectedSlug = ref<string | null>(null)
const selectedProject = computed(() => projects.value?.find((p: any) => p.slug === selectedSlug.value) || null)
function selectProject(p: any) { navigateTo(`/admin/projects/${p.slug}`) }

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return projects.value || []
  const q = searchQuery.value.toLowerCase()
  return (projects.value || []).filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q))
})

// ── Create wizard ──────────────────────────────────────
const showCreate = ref(false); const wizardStep = ref(1); const creating = ref(false); const createError = ref('')
const newProject = reactive({ title: '', slug: '' })

function closeCreate() { showCreate.value = false; wizardStep.value = 1; newProject.title = ''; newProject.slug = ''; createError.value = '' }
function onWizardSubmit() { if (wizardStep.value === 1) { if (!newProject.title.trim() || !newProject.slug.trim()) return; wizardStep.value = 2; return }; createProject() }

async function createProject() {
  creating.value = true; createError.value = ''
  try {
    await $fetch('/api/projects', { method: 'POST', body: { title: newProject.title, slug: newProject.slug } })
    closeCreate(); refresh()
  } catch (e: any) { createError.value = e.data?.message || e.data?.statusMessage || e.statusMessage || e.message || 'Ошибка создания проекта'; wizardStep.value = 1 }
  finally { creating.value = false }
}

function phaseLabel(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.label || status }
function phaseColor(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.color || 'gray' }
</script>

<style scoped>
.pj-nav-empty { padding: 16px 10px; text-align: center; font-size: .74rem; color: var(--glass-text); opacity: .3; }
.pj-av { background: color-mix(in srgb, var(--ds-accent, #6366f1) 10%, transparent); color: var(--ds-accent, #6366f1); }
.pj-detail-slug { font-size: .74rem; color: var(--glass-text); opacity: .35; margin-top: 2px; }
.pj-open-btn { display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: var(--glass-page-bg); background: var(--glass-text); opacity: .75; }
.pj-open-btn:hover { opacity: 1; }
.pj-phase { font-size: .5rem; font-weight: 500; padding: 1px 6px; white-space: nowrap; }
.pj-phase-pill { font-size: .66rem; font-weight: 500; padding: 2px 10px; border-radius: var(--chip-radius, 999px); white-space: nowrap; }
.pj-phase--gray    { color: var(--glass-text); opacity: .35; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.pj-phase--violet  { color: var(--phase-violet, #7c3aed); background: color-mix(in srgb, var(--phase-violet, #7c3aed) 8%, transparent); }
.pj-phase--blue    { color: var(--phase-blue, #2563eb); background: color-mix(in srgb, var(--phase-blue, #2563eb) 8%, transparent); }
.pj-phase--amber   { color: var(--phase-amber, #b45309); background: color-mix(in srgb, var(--phase-amber, #b45309) 7%, transparent); }
.pj-phase--orange  { color: var(--phase-orange, #c2410c); background: color-mix(in srgb, var(--phase-orange, #c2410c) 7%, transparent); }
.pj-phase--green   { color: var(--phase-green, #15803d); background: color-mix(in srgb, var(--phase-green, #15803d) 8%, transparent); }
.pj-phase--teal    { color: var(--phase-teal, #0f766e); background: color-mix(in srgb, var(--phase-teal, #0f766e) 8%, transparent); }
html.dark .pj-phase--violet { color: #a78bfa; background: rgba(167,139,250,.12); }
html.dark .pj-phase--blue   { color: #93c5fd; background: rgba(147,197,253,.12); }
html.dark .pj-phase--amber  { color: #fcd34d; background: rgba(252,211,77,.1); }
html.dark .pj-phase--orange { color: #fdba74; background: rgba(253,186,116,.1); }
html.dark .pj-phase--green  { color: #86efac; background: rgba(134,239,172,.1); }
html.dark .pj-phase--teal   { color: #5eead4; background: rgba(94,234,212,.1); }

.pj-progress-row { display: flex; align-items: center; gap: 10px; }
.pj-progress-bar { width: 100px; height: 5px; border-radius: 3px; overflow: hidden; background: color-mix(in srgb, var(--glass-text) 8%, transparent); flex-shrink: 0; }
.pj-progress-fill { height: 100%; border-radius: 3px; background: var(--phase-green, #15803d); transition: width .3s; }
.pj-progress-text { font-size: .72rem; color: var(--glass-text); opacity: .35; }
.pj-overdue { font-size: .72rem; color: var(--ds-error, #dc2626); font-weight: 600; }

/* ══ Modal ══ */
.pj-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.pj-modal { width: 520px; max-width: 100%; max-height: 90vh; border-radius: var(--modal-radius, 16px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
.pj-modal-head { display: flex; align-items: center; gap: 8px; padding: 16px 20px; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text); flex-shrink: 0; }
.pj-modal-step { font-size: var(--ds-text-xs, .7rem); color: var(--glass-text); opacity: .35; margin-left: auto; }
.pj-modal-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px; margin-left: 8px; }
.pj-modal-close:hover { opacity: 1; }
.pj-modal-body { overflow-y: auto; flex: 1; padding: 16px 20px; }
.pj-modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding-top: 14px; margin-top: 12px; border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent); }

.pj-form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.pj-form-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .06em; color: var(--glass-text); opacity: .4; font-weight: 600; }
.pj-form-error { font-size: .78rem; color: var(--ds-error, #dc2626); margin-bottom: 8px; }

.pj-preview-row { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.pj-preview-label { font-size: .58rem; text-transform: uppercase; letter-spacing: .06em; color: var(--glass-text); opacity: .35; font-weight: 600; }
.pj-preview-value { font-size: .86rem; color: var(--glass-text); }
.pj-preview-dim { color: var(--glass-text); opacity: .4; }
.pj-preview-desc { font-size: .74rem; color: var(--glass-text); opacity: .4; margin-bottom: 10px; }
.pj-preview-hint { font-size: .78rem; color: var(--glass-text); opacity: .35; margin-bottom: 12px; }
.pj-preview-stages { margin-bottom: 12px; }
.pj-stages-list { margin-top: 6px; max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.pj-stage-item { display: flex; align-items: center; gap: 6px; font-size: .76rem; color: var(--glass-text); opacity: .6; }
.pj-stage-num { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .55rem; font-weight: 600; flex-shrink: 0; background: color-mix(in srgb, var(--glass-text) 8%, transparent); }
.pj-preview-pages { margin-bottom: 8px; }
.pj-pages-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pj-page-chip { font-size: .68rem; padding: 2px 8px; border-radius: var(--chip-radius, 999px); background: color-mix(in srgb, var(--glass-text) 5%, transparent); color: var(--glass-text); opacity: .5; }
</style>
