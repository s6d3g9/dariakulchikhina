<template>
  <div>
    <div class="ent-empty-detail">
      <span class="ent-empty-icon">📁</span>
      <span v-if="projects?.length">Выберите проект из списка</span>
      <span v-else-if="pending || isBootstrapping">[ LOADING... ]</span>
      <span v-else>Нет проектов — создайте первый</span>
      <GlassButton variant="secondary" density="compact" v-if="!projects?.length && !pending && !isBootstrapping"  style="margin-top:6px" @click="openCreate">+ создать проект</GlassButton>
    </div>
    <Teleport to="body">
      <div v-if="showCreate" class="pj-backdrop" @click.self="closeCreate">
        <div class="pj-modal glass-surface">
          <div class="pj-modal-head">
            <span>новый проект</span>
            <span class="pj-modal-step">шаг {{ wizardStep }} из 3</span>
            <button class="pj-modal-close" @click="closeCreate">✕</button>
          </div>
          <div class="pj-modal-body">
            <form @submit.prevent="onWizardSubmit">

              <!-- ── Шаг 1: Выбор пресета ─────────────────────────── -->
              <template v-if="wizardStep === 1">
                <p class="pj-step-hint">Выберите тип объекта — это определит набор разделов проекта</p>

                <div class="pj-preset-category">
                  <span class="pj-preset-cat-label">Жилые объекты</span>
                  <div class="pj-preset-grid">
                    <button
                      v-for="p in residentialPresets"
                      :key="p.key"
                      type="button"
                      class="pj-preset-card"
                      :class="{ 'pj-preset-card--active': newProject.projectType === p.key }"
                      @click="selectPreset(p.key)"
                    >
                      <span class="pj-preset-icon">{{ p.icon }}</span>
                      <span class="pj-preset-label">{{ p.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="pj-preset-category">
                  <span class="pj-preset-cat-label">Коммерческие объекты</span>
                  <div class="pj-preset-grid">
                    <button
                      v-for="p in commercialPresets"
                      :key="p.key"
                      type="button"
                      class="pj-preset-card"
                      :class="{ 'pj-preset-card--active': newProject.projectType === p.key }"
                      @click="selectPreset(p.key)"
                    >
                      <span class="pj-preset-icon">{{ p.icon }}</span>
                      <span class="pj-preset-label">{{ p.label }}</span>
                    </button>
                  </div>
                </div>

                <div v-if="selectedPreset" class="pj-preset-desc">
                  {{ selectedPreset.description }}
                </div>
              </template>

              <!-- ── Шаг 2: Название и slug ──────────────────────── -->
              <template v-else-if="wizardStep === 2">
                <div v-if="selectedPreset" class="pj-selected-preset">
                  <span class="pj-preset-icon">{{ selectedPreset.icon }}</span>
                  <span>{{ selectedPreset.label }}</span>
                </div>
                <div class="pj-form-field">
                  <label class="pj-form-label">Название проекта</label>
                  <GlassInput
                    v-model="newProject.title"
                    
                    required
                    placeholder="Квартира Иванова — ул. Ленина, 10"
                    autofocus
                    @input="autoSlug"
                  />
                </div>
                <div class="pj-form-field">
                  <label class="pj-form-label">Slug (часть URL)</label>
                  <GlassInput
                    v-model="newProject.slug"
                    
                    required
                    placeholder="ivanova-lenina-10"
                  />
                  <span class="pj-slug-hint">/admin/projects/<strong>{{ newProject.slug || '...' }}</strong></span>
                </div>
              </template>

              <!-- ── Шаг 3: Подтверждение ────────────────────────── -->
              <template v-else>
                <div class="pj-confirm-block">
                  <div class="pj-confirm-row">
                    <span class="pj-preview-label">Название</span>
                    <span class="pj-preview-value">{{ newProject.title }}</span>
                  </div>
                  <div class="pj-confirm-row">
                    <span class="pj-preview-label">Slug</span>
                    <span class="pj-preview-value pj-preview-dim">{{ newProject.slug }}</span>
                  </div>
                  <div class="pj-confirm-row">
                    <span class="pj-preview-label">Тип объекта</span>
                    <span class="pj-preview-value">
                      <span v-if="selectedPreset">{{ selectedPreset.icon }} {{ selectedPreset.label }}</span>
                      <span v-else>—</span>
                    </span>
                  </div>
                  <div class="pj-confirm-row">
                    <span class="pj-preview-label">Разделов</span>
                    <span class="pj-preview-value">{{ selectedPreset?.pages.length ?? 20 }}</span>
                  </div>
                </div>
              </template>

              <p v-if="createError" class="pj-form-error">{{ createError }}</p>
              <div class="pj-modal-foot">
                <GlassButton variant="secondary" density="compact" type="button"  @click="closeCreate">отмена</GlassButton>
                <GlassButton variant="secondary" density="compact" v-if="wizardStep > 1" type="button"  @click="wizardStep--">← назад</GlassButton>
                <GlassButton variant="primary"
                  type="submit"
                  
                  :disabled="creating || (wizardStep === 1 && !newProject.projectType)"
                >
                  {{ wizardStep < 3 ? 'далее →' : (creating ? '...' : 'создать проект') }}
                </GlassButton>
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
import { PROJECT_PRESETS, getPresetsByCategory, findPreset } from '~~/shared/constants/presets'

definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
const adminCatalogs = useAdminCatalogs()

const projects = adminCatalogs.getCatalog('projects')
const pending = adminCatalogs.isCatalogLoading('projects')
const isBootstrapping = ref(true)

async function reloadProjects() {
  try {
    await adminCatalogs.ensureCatalog('projects', true)
  } catch {
    // silent: empty state already covers unavailable data
  } finally {
    isBootstrapping.value = false
  }
}

onMounted(async () => {
  isBootstrapping.value = true
  await adminNav.ensureSection('projects')
  await reloadProjects()
})
onActivated(async () => {
  isBootstrapping.value = true
  await adminNav.ensureSection('projects')
  await reloadProjects()
})

// ── Пресеты ──────────────────────────────────────────
const residentialPresets = getPresetsByCategory('residential')
const commercialPresets = getPresetsByCategory('commercial')

// ── Create wizard ──────────────────────────────────────
const showCreate = ref(false)
const wizardStep = ref(1)
const creating = ref(false)
const createError = ref('')
const newProject = reactive({ title: '', slug: '', projectType: '' })

const selectedPreset = computed(() =>
  newProject.projectType ? findPreset(newProject.projectType) : undefined,
)

function openCreate() {
  showCreate.value = true
  wizardStep.value = 1
}

function closeCreate() {
  showCreate.value = false
  wizardStep.value = 1
  newProject.title = ''
  newProject.slug = ''
  newProject.projectType = ''
  createError.value = ''
}

function selectPreset(key: string) {
  newProject.projectType = key
}

/** Автоматически генерировать slug из названия */
function autoSlug() {
  if (!newProject.title) return
  newProject.slug = newProject.title
    .toLowerCase()
    .replace(/ё/g, 'e').replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'v')
    .replace(/г/g, 'g').replace(/д/g, 'd').replace(/е/g, 'e').replace(/ж/g, 'zh')
    .replace(/з/g, 'z').replace(/и/g, 'i').replace(/й/g, 'y').replace(/к/g, 'k')
    .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
    .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't')
    .replace(/у/g, 'u').replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch').replace(/ш/g, 'sh').replace(/щ/g, 'sch').replace(/ъ/g, '')
    .replace(/ы/g, 'y').replace(/ь/g, '').replace(/э/g, 'e').replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function onWizardSubmit() {
  if (wizardStep.value === 1) {
    if (!newProject.projectType) return
    wizardStep.value = 2
    return
  }
  if (wizardStep.value === 2) {
    if (!newProject.title.trim() || !newProject.slug.trim()) return
    wizardStep.value = 3
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
        projectType: newProject.projectType || 'apartment',
      },
    })
    closeCreate()
    await reloadProjects()
  } catch (e: any) {
    createError.value = e.data?.message || e.data?.statusMessage || e.statusMessage || e.message || 'Ошибка создания проекта'
    wizardStep.value = 2
  } finally {
    creating.value = false
  }
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

/* ══ Preset selector ══ */
.pj-step-hint { font-size: .8rem; color: var(--glass-text); opacity: .45; margin-bottom: 14px; }
.pj-preset-category { margin-bottom: 16px; }
.pj-preset-cat-label { display: block; font-size: .58rem; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; color: var(--glass-text); opacity: .3; margin-bottom: 8px; }
.pj-preset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pj-preset-card {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 10px 6px 8px;
  border-radius: 10px;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  cursor: pointer; transition: border-color .15s, background .15s;
}
.pj-preset-card:hover { border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, transparent); background: color-mix(in srgb, var(--ds-accent, #6366f1) 6%, transparent); }
.pj-preset-card--active { border-color: var(--ds-accent, #6366f1); background: color-mix(in srgb, var(--ds-accent, #6366f1) 10%, transparent); }
.pj-preset-icon { font-size: 1.5rem; line-height: 1; }
.pj-preset-label { font-size: .68rem; font-weight: 500; color: var(--glass-text); text-align: center; line-height: 1.2; }
.pj-preset-desc { font-size: .76rem; color: var(--glass-text); opacity: .4; padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--glass-text) 4%, transparent); margin-top: 4px; }

/* ══ Step 2: title+slug ══ */
.pj-selected-preset { display: inline-flex; align-items: center; gap: 6px; font-size: .8rem; color: var(--ds-accent, #6366f1); background: color-mix(in srgb, var(--ds-accent, #6366f1) 8%, transparent); border-radius: 8px; padding: 4px 10px; margin-bottom: 14px; font-weight: 500; }
.pj-slug-hint { font-size: .68rem; color: var(--glass-text); opacity: .35; margin-top: 3px; }

/* ══ Step 3: confirmation ══ */
.pj-confirm-block { border-radius: 10px; border: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); overflow: hidden; margin-bottom: 6px; }
.pj-confirm-row { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 14px; gap: 10px; }
.pj-confirm-row + .pj-confirm-row { border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent); }
</style>
