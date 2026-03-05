<template>
  <div>

    <!-- ── Top bar ── -->
    <div class="kb-topbar">
      <div class="kb-topbar-left">
        <h1 class="kb-title">Проекты</h1>
        <span class="kb-total-badge">{{ projects?.length ?? 0 }}</span>
      </div>
      <div class="kb-topbar-right">
        <div class="kb-search-wrap">
          <svg class="kb-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input v-model="searchQuery" class="kb-search" placeholder="поиск проектов..." />
        </div>
        <div class="kb-view-toggle">
          <button class="kb-view-btn" :class="{ 'kb-view-btn--active': view === 'kanban' }" @click="setView('kanban')" title="Канбан-доска">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="16" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>
          </button>
          <button class="kb-view-btn" :class="{ 'kb-view-btn--active': view === 'list' }" @click="setView('list')" title="Список">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="3.5" cy="6" r="1.5" fill="currentColor"/><circle cx="3.5" cy="12" r="1.5" fill="currentColor"/><circle cx="3.5" cy="18" r="1.5" fill="currentColor"/></svg>
          </button>
        </div>
        <button class="kb-btn-add" @click="showCreate = true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          Новый проект
        </button>
      </div>
    </div>

    <!-- ── Loading skeleton ── -->
    <template v-if="pending && !hasProjectsCache">
      <div class="kb-skeleton-row">
        <div class="kb-skeleton-col" v-for="i in 4" :key="i">
          <div class="kb-skel-head"></div>
          <div class="kb-skel-card" v-for="j in 2" :key="j"></div>
        </div>
      </div>
    </template>

    <template v-else>

      <!-- ── Kanban board ── -->
      <div v-if="view === 'kanban'" class="kb-board">
        <div v-for="phase in PHASES" :key="phase.key" class="kb-col">
          <div class="kb-col-head">
            <span class="kb-col-dot" :style="{ background: phase.dotColor }"></span>
            <span class="kb-col-title">{{ phase.label }}</span>
            <span class="kb-col-count">{{ projectsByPhase[phase.key]?.length ?? 0 }}</span>
          </div>
          <div class="kb-col-body">
            <template v-if="projectsByPhase[phase.key]?.length">
              <div
                v-for="p in projectsByPhase[phase.key]"
                :key="p.id"
                class="kb-card-wrap"
              >
                <div
                  class="kb-card"
                  @click="navigateTo(`/admin/projects/${p.slug}`)"
                >
                  <div class="kb-card-title">{{ p.title }}</div>
                  <div v-if="p.profile?.fio" class="kb-card-fio">{{ p.profile.fio }}</div>
                  <div class="kb-card-meta">
                    <span class="kb-card-date">{{ fmtDate(p.createdAt) }}</span>
                    <span v-if="p.profile?.contract_paid || p.profile?.contract_total" class="kb-card-payment">
                      <span v-if="p.profile?.contract_paid" class="kb-payment-paid">{{ fmtMoney(p.profile.contract_paid) }}</span>
                      <span v-if="p.profile?.contract_paid && p.profile?.contract_total" class="kb-payment-sep"> / </span>
                      <span v-if="p.profile?.contract_total" class="kb-payment-total">{{ fmtMoney(p.profile.contract_total) }}</span>
                    </span>
                  </div>
                  <div v-if="p.profile?.visit_date" class="kb-card-visit">
                    <span v-if="p.profile?.visit_contractor_name" class="kb-visit-contractor">{{ p.profile.visit_contractor_name }}</span>
                    <span v-if="p.profile?.visit_contractor_name" class="kb-visit-arrow"> → </span>
                    <span class="kb-visit-when">{{ p.profile.visit_date }}<template v-if="p.profile?.visit_time"> {{ p.profile.visit_time }}</template></span>
                    <span v-if="p.profile?.visit_status && p.profile?.visit_status !== 'scheduled'" :class="`kb-visit-status kb-visit-status--${p.profile.visit_status}`">{{ visitLabel(p.profile.visit_status) }}</span>
                  </div>
                  <div v-if="p.taskTotal > 0" class="kb-card-progress">
                    <div class="kb-prog-track">
                      <div class="kb-prog-fill" :style="{ width: Math.round(p.taskDone / p.taskTotal * 100) + '%' }"></div>
                    </div>
                    <span class="kb-prog-label">{{ p.taskDone }}/{{ p.taskTotal }}</span>
                    <span v-if="p.taskOverdue > 0" class="kb-prog-overdue">⚠ {{ p.taskOverdue }}</span>
                  </div>
                  <div class="kb-card-foot">
                    <NuxtLink :to="`/admin/projects/${p.slug}`" class="kb-card-link" @click.stop>открыть →</NuxtLink>
                  </div>
                </div>
                <!-- Follow-up alert below card -->
                <div v-if="followUpUrgency(p.profile) === 'red'" class="kb-followup kb-followup--red">
                  🔴 {{ p.profile?.follow_up_note || 'Follow-up!' }} · {{ p.profile?.follow_up_date }}
                </div>
                <div v-else-if="followUpUrgency(p.profile) === 'yellow'" class="kb-followup kb-followup--yellow">
                  🟡 {{ p.profile?.follow_up_note || 'Follow-up' }} · {{ p.profile?.follow_up_date }}
                </div>
              </div>
            </template>
            <div v-else class="kb-col-empty">—</div>
          </div>
        </div>
      </div>

      <!-- ── List view ── -->
      <div v-else class="kb-listview">
        <table class="kb-table">
          <thead>
            <tr>
              <th>Проект</th>
              <th>Фаза</th>
              <th>Прогресс задач</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="filteredProjects.length">
              <tr
                v-for="p in filteredProjects"
                :key="p.id"
                class="kb-table-row"
                @click="navigateTo(`/admin/projects/${p.slug}`)"
              >
                <td class="kb-trow-name">
                  <span class="kb-av">{{ p.title?.charAt(0)?.toUpperCase() || '?' }}</span>
                  <div>
                    <div class="kb-trow-title">{{ p.title }}</div>
                    <div class="kb-trow-slug">{{ p.slug }}</div>
                  </div>
                </td>
                <td>
                  <span v-if="p.status" class="kb-phase-chip" :data-color="phaseColor(p.status)">{{ phaseLabel(p.status) }}</span>
                  <span v-else class="kb-phase-chip" data-color="gray">—</span>
                </td>
                <td class="kb-trow-prog">
                  <template v-if="p.taskTotal > 0">
                    <div class="kb-prog-track kb-prog-track--sm">
                      <div class="kb-prog-fill" :style="{ width: Math.round(p.taskDone / p.taskTotal * 100) + '%' }"></div>
                    </div>
                    <span class="kb-prog-label">{{ p.taskDone }}/{{ p.taskTotal }}</span>
                    <span v-if="p.taskOverdue > 0" class="kb-prog-overdue">⚠ {{ p.taskOverdue }}</span>
                  </template>
                  <span v-else class="kb-prog-label">—</span>
                </td>
                <td class="kb-trow-action">
                  <NuxtLink :to="`/admin/projects/${p.slug}`" class="kb-action-btn" @click.stop>открыть</NuxtLink>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="4" class="kb-table-empty">
                <span v-if="searchQuery">Ничего не найдено по «{{ searchQuery }}»</span>
                <span v-else>Нет проектов — <button class="kb-inline-link" @click.stop="showCreate = true">создайте первый</button></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </template>

    <!-- ══ Create modal ══ -->
    <Teleport to="body">
      <div v-if="showCreate" class="pj-backdrop" @click.self="closeCreate">
        <div class="pj-modal">
          <div class="pj-modal-head">
            <span>Новый проект</span>
            <button class="pj-modal-close" @click="closeCreate">✕</button>
          </div>
          <div class="pj-modal-body">
            <form @submit.prevent="createProject">
              <div class="pj-form-field">
                <label class="pj-form-label">Название проекта</label>
                <input v-model="newProject.title" class="pj-input" required placeholder="Например: Квартира Смирновых" autofocus @input="onTitleInput" />
              </div>
              <div class="pj-form-field">
                <label class="pj-form-label">URL клиента</label>
                <div class="pj-slug-row">
                  <input v-model="newProject.slug" class="pj-input pj-slug-input" required placeholder="smirnov-apt" />
                  <button type="button" class="pj-slug-gen" :class="{ spinning: slugGenerating }" title="Сформировать URL клиента" @click="generateSlug">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                    <span>сформировать</span>
                  </button>
                </div>
                <div v-if="newProject.slug" class="pj-slug-preview">/client/{{ newProject.slug }}</div>
              </div>
              <p v-if="createError" class="pj-form-error">{{ createError }}</p>
              <div class="pj-modal-foot">
                <button type="button" class="pj-btn-cancel" @click="closeCreate">Отмена</button>
                <button type="submit" class="pj-btn-save" :disabled="creating">{{ creating ? '...' : 'Создать проект' }}</button>
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

// ── View toggle (kanban / list) ────────────────────────
type ViewMode = 'kanban' | 'list'
const view = ref<ViewMode>('kanban')
function setView(v: ViewMode) {
  view.value = v
  if (process.client) localStorage.setItem('admin-projects-view', v)
}
onMounted(() => {
  const saved = localStorage.getItem('admin-projects-view') as ViewMode | null
  if (saved === 'list' || saved === 'kanban') view.value = saved
})

// ── Kanban config ──────────────────────────────────────
const PHASE_DOT_COLORS: Record<string, string> = {
  lead:            '#a1a1aa',
  concept:         '#8b5cf6',
  working_project: '#3b82f6',
  procurement:     '#f59e0b',
  construction:    '#f97316',
  commissioning:   '#22c55e',
  completed:       '#14b8a6',
}

const PHASES = PROJECT_PHASES.map(p => ({
  key: p.key,
  label: p.label,
  dotColor: PHASE_DOT_COLORS[p.key] || '#a1a1aa',
}))

const projectsByPhase = computed(() => {
  const all = filteredProjects.value
  const map: Record<string, any[]> = {}
  for (const ph of PHASES) map[ph.key] = []
  for (const p of all) {
    const key = p.status || 'lead'
    if (map[key]) map[key].push(p)
    else map['lead'].push(p)
  }
  return map
})

// ── Search ─────────────────────────────────────────────
const searchQuery = ref('')
const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return projects.value || []
  const q = searchQuery.value.toLowerCase()
  return (projects.value || []).filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q))
})

// ── Create wizard ──────────────────────────────────────
const showCreate = ref(false); const creating = ref(false); const createError = ref('')
const slugGenerating = ref(false)
const newProject = reactive({ title: '', slug: '' })

function closeCreate() { showCreate.value = false; newProject.title = ''; newProject.slug = ''; createError.value = '' }

// Transliteration table RU → EN
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',
  л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',
  ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  ' ':'-','_':'-',
}
function toSlug(str: string): string {
  return str.toLowerCase()
    .split('').map(c => TRANSLIT[c] ?? (/[a-z0-9]/.test(c) ? c : '-'))
    .join('').replace(/-{2,}/g, '-').replace(/^-|-$/g, '')
}
function makeUnique(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

async function generateSlug() {
  const title = newProject.title.trim()
  if (!title) return
  slugGenerating.value = true
  try {
    const existing = (projects.value || []).map((p: any) => p.slug as string)
    const taken = new Set(existing)
    newProject.slug = makeUnique(toSlug(title), taken)
  } finally {
    slugGenerating.value = false
  }
}

function onTitleInput() {
  // auto-generate only if slug is empty or was previously auto-generated
  if (!newProject.slug || newProject.slug === toSlug(newProject.title.slice(0, -1).trim())) {
    generateSlug()
  }
}

async function createProject() {
  if (!newProject.title.trim() || !newProject.slug.trim()) return
  creating.value = true; createError.value = ''
  try {
    await $fetch('/api/projects', { method: 'POST', body: { title: newProject.title, slug: newProject.slug } })
    closeCreate(); refresh()
  } catch (e: any) { createError.value = e.data?.message || e.data?.statusMessage || e.statusMessage || e.message || 'Ошибка создания проекта' }
  finally { creating.value = false }
}

function phaseLabel(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.label || status }
function phaseColor(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.color || 'gray' }

// ── Card helpers ───────────────────────────────────────
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtMoney(v: string | number | null | undefined): string {
  if (!v) return ''
  const n = typeof v === 'string' ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) : Number(v)
  if (isNaN(n)) return String(v)
  return new Intl.NumberFormat('ru-RU', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' ₽'
}

const VISIT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'запланирован',
  done:      'проведён',
  noshow:    'не явился',
  postponed: 'перенесён',
  cancelled: 'отменён',
}
function visitLabel(status: string): string {
  return VISIT_STATUS_LABELS[status] || status
}

function followUpUrgency(profile: any): 'red' | 'yellow' | null {
  const d = profile?.follow_up_date
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0); dt.setHours(0, 0, 0, 0)
  const diff = (dt.getTime() - today.getTime()) / 86400000
  if (diff <= 0) return 'red'
  if (diff <= 3) return 'yellow'
  return null
}
</script>

<style scoped>

/* ══════════════════════════════════════════════
   TOKENS — override glass vars for clean look
══════════════════════════════════════════════ */
/* ── Top bar ── */
.kb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.kb-topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kb-title {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--glass-text);
}
.kb-total-badge {
  font-size: .72rem;
  font-weight: 600;
  color: var(--glass-text);
  opacity: .4;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-radius: 10px;
  padding: 1px 8px;
  min-width: 24px;
  text-align: center;
}
.kb-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Search ── */
.kb-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.kb-search-icon {
  position: absolute;
  left: 9px;
  color: var(--glass-text);
  opacity: .35;
  pointer-events: none;
}
.kb-search {
  width: 220px;
  height: 32px;
  padding: 0 10px 0 28px;
  font-size: .8rem;
  font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg) 70%, transparent);
  color: var(--glass-text);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.kb-search:focus {
  border-color: color-mix(in srgb, var(--glass-text) 30%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.kb-search::placeholder { color: var(--glass-text); opacity: .3; }

/* ── View toggle ── */
.kb-view-toggle {
  display: flex;
  gap: 2px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  border-radius: 8px;
  padding: 2px;
}
.kb-view-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--glass-text);
  opacity: .45;
  transition: opacity .14s, background .14s;
}
.kb-view-btn:hover { opacity: .75; }
.kb-view-btn--active {
  background: var(--glass-bg);
  opacity: 1;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

/* ── Add button ── */
.kb-btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  font-size: .8rem;
  font-family: inherit;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: var(--glass-text);
  color: var(--glass-page-bg);
  transition: opacity .15s;
  white-space: nowrap;
}
.kb-btn-add:hover { opacity: .85; }

/* ═══════════════════════════════════
   KANBAN BOARD
═══════════════════════════════════ */
.kb-board {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 16px;
  align-items: flex-start;
}
.kb-board::-webkit-scrollbar { height: 5px; }
.kb-board::-webkit-scrollbar-track { background: transparent; }
.kb-board::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--glass-text) 15%, transparent); border-radius: 3px; }

/* Column */
.kb-col {
  flex: 0 0 220px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kb-col-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 4px 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  margin-bottom: 0;
}
.kb-col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kb-col-title {
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--glass-text);
  flex: 1;
}
.kb-col-count {
  font-size: .68rem;
  font-weight: 600;
  color: var(--glass-text);
  opacity: .35;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  border-radius: 10px;
  padding: 1px 6px;
}
.kb-col-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.kb-col-empty {
  font-size: .72rem;
  color: var(--glass-text);
  opacity: .2;
  padding: 10px 4px;
  text-align: center;
}

/* Card */
.kb-card {
  background: var(--glass-bg);
  border: 1px solid color-mix(in srgb, var(--glass-text) 9%, transparent);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: box-shadow .15s, border-color .15s, transform .1s;
}
.kb-card:hover {
  border-color: color-mix(in srgb, var(--glass-text) 18%, transparent);
  box-shadow: 0 4px 16px rgba(0,0,0,.07);
  transform: translateY(-1px);
}
.kb-card-title {
  font-size: .84rem;
  font-weight: 500;
  color: var(--glass-text);
  line-height: 1.35;
  margin-bottom: 3px;
}
/* ── Card wrap (card + follow-up alert) ── */
.kb-card-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}
/* FIO */
.kb-card-fio {
  font-size: .72rem;
  color: var(--glass-text);
  opacity: .55;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Meta row: date + payment */
.kb-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.kb-card-date {
  font-size: .67rem;
  color: var(--glass-text);
  opacity: .3;
}
.kb-card-payment {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: .7rem;
}
.kb-payment-paid {
  color: #22c55e;
  font-weight: 600;
}
.kb-payment-sep {
  color: var(--glass-text);
  opacity: .35;
}
.kb-payment-total {
  color: #242424;
  font-weight: 500;
}
/* Visit row */
.kb-card-visit {
  font-size: .68rem;
  color: var(--glass-text);
  opacity: .55;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}
.kb-visit-contractor { font-weight: 500; opacity: .8; }
.kb-visit-arrow { opacity: .35; }
.kb-visit-when { font-variant-numeric: tabular-nums; }
.kb-visit-status {
  font-size: .62rem;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 4px;
}
.kb-visit-status--done      { background: #dcfce7; color: #15803d; }
.kb-visit-status--noshow    { background: #fee2e2; color: #b91c1c; }
.kb-visit-status--postponed { background: #fef9c3; color: #854d0e; }
.kb-visit-status--cancelled { background: #f4f4f5; color: #71717a; }
/* Follow-up alerts */
.kb-followup {
  font-size: .67rem;
  padding: 5px 10px;
  border-radius: 0 0 10px 10px;
  border: 1px solid transparent;
  border-top: none;
  margin-top: -1px;
  line-height: 1.3;
}
.kb-followup--red {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}
.kb-followup--yellow {
  background: #fef9c3;
  color: #854d0e;
  border-color: #fde047;
}
.kb-card-progress {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
}
.kb-prog-track {
  flex: 1;
  height: 4px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-radius: 2px;
  overflow: hidden;
}
.kb-prog-track--sm {
  width: 80px;
  flex: none;
}
.kb-prog-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 2px;
  transition: width .3s;
}
.kb-prog-label {
  font-size: .68rem;
  color: var(--glass-text);
  opacity: .4;
  white-space: nowrap;
}
.kb-prog-overdue {
  font-size: .65rem;
  color: #ef4444;
  font-weight: 600;
  white-space: nowrap;
}
.kb-card-foot {
  display: flex;
  justify-content: flex-end;
}
.kb-card-link {
  font-size: .68rem;
  color: var(--glass-text);
  opacity: .4;
  text-decoration: none;
  transition: opacity .12s;
}
.kb-card-link:hover { opacity: .9; }

/* ═══════════════════════════════════
   LIST VIEW
═══════════════════════════════════ */
.kb-listview {
  background: var(--glass-bg);
  border: 1px solid color-mix(in srgb, var(--glass-text) 9%, transparent);
  border-radius: 12px;
  overflow: hidden;
}
.kb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .82rem;
}
.kb-table th {
  text-align: left;
  font-size: .65rem;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .35;
  padding: 10px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-weight: 600;
  white-space: nowrap;
}
.kb-table-row {
  cursor: pointer;
  transition: background .12s;
}
.kb-table-row:hover td {
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.kb-table td {
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
  color: var(--glass-text);
  vertical-align: middle;
}
.kb-table tr:last-child td { border-bottom: none; }

.kb-trow-name {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kb-av {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: .8rem;
  font-weight: 700;
  flex-shrink: 0;
  background: color-mix(in srgb, #6366f1 12%, transparent);
  color: #6366f1;
}
.kb-trow-title { font-weight: 500; font-size: .85rem; }
.kb-trow-slug {
  font-size: .68rem;
  color: var(--glass-text);
  opacity: .3;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-top: 1px;
}
.kb-trow-prog {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.kb-trow-action { text-align: right; }

/* Phase chip */
.kb-phase-chip {
  display: inline-block;
  font-size: .7rem;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 10px;
  white-space: nowrap;
}
.kb-phase-chip[data-color="gray"]   { background: color-mix(in srgb, var(--glass-text) 7%, transparent); color: var(--glass-text); opacity: .5; }
.kb-phase-chip[data-color="violet"] { background: rgba(139,92,246,.1); color: #7c3aed; }
.kb-phase-chip[data-color="blue"]   { background: rgba(59,130,246,.1); color: #2563eb; }
.kb-phase-chip[data-color="amber"]  { background: rgba(245,158,11,.1); color: #b45309; }
.kb-phase-chip[data-color="orange"] { background: rgba(249,115,22,.1); color: #c2410c; }
.kb-phase-chip[data-color="green"]  { background: rgba(34,197,94,.1); color: #15803d; }
.kb-phase-chip[data-color="teal"]   { background: rgba(20,184,166,.1); color: #0f766e; }
html.dark .kb-phase-chip[data-color="violet"] { background: rgba(167,139,250,.12); color: #a78bfa; }
html.dark .kb-phase-chip[data-color="blue"]   { background: rgba(147,197,253,.12); color: #93c5fd; }
html.dark .kb-phase-chip[data-color="amber"]  { background: rgba(252,211,77,.1); color: #fcd34d; }
html.dark .kb-phase-chip[data-color="orange"] { background: rgba(253,186,116,.1); color: #fdba74; }
html.dark .kb-phase-chip[data-color="green"]  { background: rgba(134,239,172,.1); color: #86efac; }
html.dark .kb-phase-chip[data-color="teal"]   { background: rgba(94,234,212,.1); color: #5eead4; }

.kb-action-btn {
  display: inline-block;
  font-size: .74rem;
  padding: 4px 10px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  transition: background .12s;
  white-space: nowrap;
}
.kb-action-btn:hover { background: color-mix(in srgb, var(--glass-text) 14%, transparent); }

.kb-table-empty {
  text-align: center;
  padding: 36px 16px !important;
  color: var(--glass-text);
  opacity: .35;
  font-size: .82rem;
}
.kb-inline-link {
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  color: var(--glass-text);
  text-decoration: underline;
  opacity: .6;
  padding: 0;
}
.kb-inline-link:hover { opacity: 1; }

/* ═══════════════════════════════════
   SKELETON LOADER
═══════════════════════════════════ */
.kb-skeleton-row {
  display: flex;
  gap: 14px;
}
.kb-skeleton-col {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
@keyframes kb-shimmer {
  from { opacity: .5; } to { opacity: 1; }
}
.kb-skel-head {
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  animation: kb-shimmer 1.2s ease-in-out infinite alternate;
}
.kb-skel-card {
  height: 72px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  animation: kb-shimmer 1.2s ease-in-out infinite alternate;
}

/* ═══════════════════════════════════
   MODAL
═══════════════════════════════════ */
.pj-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.pj-modal {
  width: 480px; max-width: 100%;
  background: var(--glass-bg);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 14px;
  box-shadow: 0 16px 60px rgba(0,0,0,.16);
  overflow: hidden;
}
.pj-modal-head {
  display: flex; align-items: center; gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: .9rem; font-weight: 500; color: var(--glass-text);
}
.pj-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: var(--glass-text); opacity: .4; padding: 2px 4px; margin-left: 4px;
}
.pj-modal-close:hover { opacity: 1; }
.pj-modal-body { padding: 20px; }
.pj-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 16px; margin-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

.pj-form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.pj-form-label {
  font-size: .65rem; text-transform: uppercase; letter-spacing: .08em;
  color: var(--glass-text); opacity: .4; font-weight: 600;
}
.pj-input {
  height: 36px; padding: 0 12px; font-size: .85rem;
  font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  color: var(--glass-text); outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.pj-input:focus {
  border-color: color-mix(in srgb, var(--glass-text) 30%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.pj-input::placeholder { color: var(--glass-text); opacity: .3; }
.pj-form-error { font-size: .78rem; color: #dc2626; margin-bottom: 10px; }

.pj-slug-row { display: flex; gap: 8px; align-items: center; }
.pj-slug-input { flex: 1; min-width: 0; }
.pj-slug-gen {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0 12px; height: 36px; border-radius: 8px; border: none;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .6; font-size: .75rem; font-family: inherit;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: opacity .15s, background .15s;
}
.pj-slug-gen:hover { opacity: 1; background: color-mix(in srgb, var(--glass-text) 14%, transparent); }
.pj-slug-gen svg { flex-shrink: 0; transition: transform .4s ease; }
.pj-slug-gen.spinning svg { animation: spin .5s linear; }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.pj-slug-preview { font-size: .72rem; color: var(--glass-text); opacity: .35; margin-top: 4px; font-family: monospace; }

.pj-preview-row { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
.pj-preview-label { font-size: .62rem; text-transform: uppercase; letter-spacing: .07em; color: var(--glass-text); opacity: .35; font-weight: 600; }
.pj-preview-value { font-size: .88rem; color: var(--glass-text); }
.pj-preview-dim { opacity: .4; }
.pj-preview-pages { margin-bottom: 12px; }
.pj-pages-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.pj-page-chip {
  font-size: .7rem; padding: 3px 9px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  color: var(--glass-text); opacity: .55;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.pj-btn-cancel {
  height: 34px; padding: 0 14px; font-size: .82rem;
  font-family: inherit; border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px; background: transparent;
  color: var(--glass-text); cursor: pointer; opacity: .7; transition: opacity .12s;
}
.pj-btn-cancel:hover { opacity: 1; }
.pj-btn-save {
  height: 34px; padding: 0 18px; font-size: .82rem;
  font-family: inherit; font-weight: 500;
  border: none; border-radius: 8px;
  background: var(--glass-text); color: var(--glass-page-bg);
  cursor: pointer; transition: opacity .14s;
}
.pj-btn-save:hover { opacity: .85; }
.pj-btn-save:disabled { opacity: .4; cursor: not-allowed; }

/* ═══════════════════════════════════
   RESPONSIVE
═══════════════════════════════════ */
@media (max-width: 768px) {
  .kb-search { width: 150px; }
  .kb-col { flex: 0 0 175px; min-width: 165px; }
}
@media (max-width: 480px) {
  .kb-topbar { gap: 8px; }
  .kb-search { width: 120px; }
  .kb-view-toggle { display: none; }
  .kb-board { gap: 10px; }
  .kb-col { flex: 0 0 160px; min-width: 150px; }
}
</style>
