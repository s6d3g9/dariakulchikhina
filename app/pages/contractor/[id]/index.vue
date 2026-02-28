<template>
  <div class="cab-root glass-page">

    <header class="cab-header glass-surface">
      <div class="cab-logo">DK <span>| Кабинет исполнителя</span></div>
      <div class="cab-hright">
        <span v-if="contractor" class="cab-hname">{{ contractor.name }}</span>
        <button class="glass-chip cab-logout" @click="logout">Выйти</button>
      </div>
    </header>

    <div v-if="pending" class="cab-loading">Загружаем…</div>

    <div v-else-if="contractor" class="cab-body">

      <!-- Sidebar -->
      <aside class="cab-sidebar glass-surface">
        <nav class="cab-nav">
          <button
            v-for="item in nav" :key="item.key"
            class="cab-nav-item"
            :class="{ active: section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.key === 'tasks' && activeCount" class="cab-badge">{{ activeCount }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="cab-main">
        <div class="cab-inner">

          <!-- ── Задачи ──────────────────────────────────────────── -->
          <template v-if="section === 'tasks'">
            <div v-if="!workItems?.length" class="cab-empty">
              <div class="cab-empty-icon">◎</div>
              <p>Задач пока нет.<br>Они появятся когда дизайнер добавит вас к проекту.</p>
            </div>
            <template v-else>
              <div v-for="proj in byProject" :key="proj.slug" class="cab-project-group">
                <div class="cab-proj-title">{{ proj.title }}</div>
                <div class="cab-tasks">
                  <div v-for="item in proj.items" :key="item.id" class="cab-task glass-surface">
                    <div class="cab-task-top">
                      <span class="cab-task-name">{{ item.title }}</span>
                      <select
                        :value="item.status"
                        class="cab-status-select"
                        :class="`cab-status--${item.status}`"
                        @change="updateStatus(item, ($event.target as HTMLSelectElement).value)"
                      >
                        <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                      </select>
                    </div>
                    <div v-if="item.dateStart || item.dateEnd" class="cab-task-dates">
                      <span v-if="item.dateStart">с {{ item.dateStart }}</span>
                      <span v-if="item.dateEnd">по {{ item.dateEnd }}</span>
                    </div>
                    <div v-if="item.budget" class="cab-task-budget">{{ item.budget }}</div>
                    <div v-if="item.notes" class="cab-task-notes">{{ item.notes }}</div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- ── Профиль ─────────────────────────────────────────── -->
          <template v-else-if="section === 'profile'">
            <form @submit.prevent="saveProfile" class="cab-form">

              <div class="cab-form-section">
                <h3>Контакты</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Имя / название</label>
                    <input v-model="form.name" class="glass-input" required />
                  </div>
                  <div class="cab-field">
                    <label>Компания</label>
                    <input v-model="form.companyName" class="glass-input" />
                  </div>
                  <div class="cab-field">
                    <label>Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" />
                  </div>
                  <div class="cab-field">
                    <label>Email</label>
                    <input v-model="form.email" class="glass-input" type="email" />
                  </div>
                  <div class="cab-field">
                    <label>Мессенджер</label>
                    <select v-model="form.messenger" class="glass-input cab-select">
                      <option value="">—</option>
                      <option>telegram</option>
                      <option>whatsapp</option>
                      <option>viber</option>
                    </select>
                  </div>
                  <div class="cab-field">
                    <label>Ник / номер</label>
                    <input v-model="form.messengerNick" class="glass-input" />
                  </div>
                  <div class="cab-field">
                    <label>Сайт / портфолио</label>
                    <input v-model="form.website" class="glass-input" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Специализации</h3>
                <div class="cab-field cab-field-full">
                  <label>Роль / профессия</label>
                  <div v-for="group in ROLE_GROUPS" :key="group.label" class="cab-tag-group">
                    <div class="cab-tag-group-label">{{ group.label }}</div>
                    <div class="cab-tags">
                      <button
                        v-for="r in group.items" :key="r.value" type="button"
                        class="cab-tag" :class="{ active: form.roleTypes.includes(r.value) }"
                        @click="toggleArr(form.roleTypes, r.value)"
                      >{{ r.label }}</button>
                    </div>
                  </div>
                </div>

                <div class="cab-field cab-field-full" style="margin-top:16px">
                  <label>Виды работ</label>
                  <div v-for="group in WORK_GROUPS" :key="group.label" class="cab-tag-group">
                    <div class="cab-tag-group-label">{{ group.label }}</div>
                    <div class="cab-tags">
                      <button
                        v-for="w in group.items" :key="w.value" type="button"
                        class="cab-tag" :class="{ active: form.workTypes.includes(w.value) }"
                        @click="toggleArr(form.workTypes, w.value)"
                      >{{ w.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>О себе</h3>
                <div class="cab-field cab-field-full">
                  <label>Заметки / описание</label>
                  <textarea v-model="form.notes" class="glass-input" rows="4" placeholder="Опыт, специализация, особые условия работы…" />
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

        </div>
      </main>
    </div>

    <footer class="cab-footer">DK Studio · Кабинет исполнителя</footer>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_ROLE_TYPE_OPTIONS, CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'default', middleware: ['contractor'] })

const router = useRouter()
const route = useRoute()
const contractorId = Number(route.params.id)

const { data: contractor, pending, refresh } = await useFetch<any>(`/api/contractors/${contractorId}`)
const { data: workItems, refresh: refreshItems } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/work-items`, { default: () => [] }
)

// ── Form ──────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  messenger: '',
  messengerNick: '',
  website: '',
  notes: '',
  roleTypes: [] as string[],
  workTypes: [] as string[],
})

watch(contractor, (c) => {
  if (!c) return
  form.name          = c.name          || ''
  form.companyName   = c.companyName   || ''
  form.phone         = c.phone         || ''
  form.email         = c.email         || ''
  form.messenger     = c.messenger     || ''
  form.messengerNick = c.messengerNick || ''
  form.website       = c.website       || ''
  form.notes         = c.notes         || ''
  form.roleTypes     = Array.isArray(c.roleTypes) ? [...c.roleTypes] : []
  form.workTypes     = Array.isArray(c.workTypes) ? [...c.workTypes] : []
}, { immediate: true })

// ── Nav ──────────────────────────────────────────────────────────
const section = ref('tasks')
const nav = [
  { key: 'tasks',   icon: '◎', label: 'Мои задачи' },
  { key: 'profile', icon: '◑', label: 'Мой профиль' },
]

// ── Tasks ─────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'pending',     label: 'Ожидание' },
  { value: 'planned',     label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'paused',      label: 'На паузе' },
  { value: 'done',        label: 'Выполнено' },
  { value: 'cancelled',   label: 'Отменено' },
]

const activeCount = computed(() =>
  (workItems.value || []).filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length
)

const byProject = computed(() => {
  const map = new Map<string, { slug: string; title: string; items: any[] }>()
  for (const item of workItems.value || []) {
    if (!map.has(item.projectSlug)) {
      map.set(item.projectSlug, { slug: item.projectSlug, title: item.projectTitle, items: [] })
    }
    map.get(item.projectSlug)!.items.push(item)
  }
  return [...map.values()]
})

async function updateStatus(item: any, status: string) {
  item.status = status
  await $fetch(`/api/contractors/${contractorId}/work-items/${item.id}`, {
    method: 'PUT',
    body: { status },
  })
  refreshItems()
}

// ── Profile ───────────────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    label: 'Управление',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['general_contractor','foreman','site_manager','estimator'].includes(r.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['demolition_worker','mason','concrete_worker','reinforcer','welder'].includes(r.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['electrician','plumber','hvac_engineer','low_current_engineer','gas_engineer','smart_home_installer','security_installer','av_installer'].includes(r.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['plasterer','painter','tiler','floor_installer','wallpaper_installer','decorative_finish_specialist'].includes(r.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['carpenter','joiner','drywall_installer','window_installer','glazier','furniture_assembler'].includes(r.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['stone_worker','facade_worker','roofer','landscape_worker','pool_installer','cleaner'].includes(r.value)
    ),
  },
]

const WORK_GROUPS = [
  {
    label: 'Демонтаж и подготовка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['demolition','debris_removal'].includes(w.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['masonry','concrete_work','screed','waterproofing','partition_installation','insulation'].includes(w.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['electrical_installation','plumbing_installation','hvac','heating','smart_home','low_current','gas_installation','security_systems','av_systems'].includes(w.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['plastering','puttying','tile_installation','painting','wallpapering','ceiling_installation','floor_installation','decorative_plaster'].includes(w.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['carpentry','joinery','window_installation','door_installation','built_in_furniture','drywall_installation'].includes(w.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['stone_cladding','facade_works','roofing','landscaping','pool_installation','furniture_installation','final_cleaning'].includes(w.value)
    ),
  },
]

function toggleArr(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}

const saving = ref(false)
const saveMsg = ref('')

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  try {
    await $fetch(`/api/contractors/${contractorId}/self`, {
      method: 'PUT',
      body: { ...form },
    })
    await refresh()
    saveMsg.value = 'Сохранено!'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } finally {
    saving.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/contractor-logout', { method: 'POST' })
  router.push('/contractor/login')
}
</script>

<style scoped>
.cab-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--glass-page-bg, #f0f4ff);
}

/* Header */
.cab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.25));
}
.cab-logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--glass-text, #1a1a2e);
}
.cab-logo span { font-weight: 400; font-size: 0.95rem; opacity: 0.65; margin-left: 6px; }
.cab-hright { display: flex; align-items: center; gap: 14px; }
.cab-hname { font-size: 0.9rem; opacity: 0.75; }
.cab-logout {
  cursor: pointer;
  background: none;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  font-size: 0.85rem;
}

.cab-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px;
  opacity: 0.5;
  font-size: 1.1rem;
}

/* Body layout */
.cab-body {
  flex: 1;
  display: flex;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 20px;
  gap: 24px;
  align-items: flex-start;
}

/* Sidebar */
.cab-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 12px 0;
  position: sticky;
  top: 84px;
}
.cab-nav { display: flex; flex-direction: column; }
.cab-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.7;
  transition: background 0.15s, opacity 0.15s;
}
.cab-nav-item:hover { background: rgba(255,255,255,0.18); opacity: 1; }
.cab-nav-item.active { background: rgba(255,255,255,0.28); opacity: 1; font-weight: 600; }
.cab-nav-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
.cab-badge {
  margin-left: auto;
  background: rgba(100,110,200,0.25);
  color: var(--glass-text, #1a1a2e);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* Main */
.cab-main { flex: 1; min-width: 0; }
.cab-inner { max-width: 900px; }

/* Empty state */
.cab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  opacity: 0.55;
  background: var(--glass-bg, rgba(255,255,255,0.2));
  border: 1px dashed var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
}
.cab-empty-icon { font-size: 2.5rem; margin-bottom: 14px; }
.cab-empty p { font-size: 0.95rem; line-height: 1.6; margin: 0; }

/* Project groups */
.cab-project-group { margin-bottom: 28px; }
.cab-proj-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.5;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}
.cab-tasks { display: flex; flex-direction: column; gap: 10px; }

/* Task card */
.cab-task {
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cab-task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.cab-task-name { font-size: 0.9rem; font-weight: 600; flex: 1; min-width: 0; }
.cab-task-dates { font-size: 0.78rem; opacity: 0.6; display: flex; gap: 8px; }
.cab-task-budget { font-size: 0.78rem; opacity: 0.7; }
.cab-task-notes { font-size: 0.82rem; opacity: 0.65; line-height: 1.5; }

/* Status select */
.cab-status-select {
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
  font-weight: 600;
  white-space: nowrap;
}
.cab-status--pending     { background: rgba(160,160,170,0.18); color: #888; }
.cab-status--planned     { background: rgba(80,120,220,0.15);  color: #3b6fd4; }
.cab-status--in_progress { background: rgba(210,160,30,0.15);  color: #a07a10; }
.cab-status--paused      { background: rgba(220,100,40,0.15);  color: #c05818; }
.cab-status--done        { background: rgba(40,160,100,0.15);  color: #228855; }
.cab-status--cancelled   { background: rgba(200,50,50,0.12);   color: #bb3333; }

/* Form */
.cab-form-section {
  background: var(--glass-bg, rgba(255,255,255,0.35));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 18px;
}
.cab-form-section h3 {
  margin: 0 0 16px;
  font-size: 0.9rem;
  font-weight: 700;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cab-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cab-field { display: flex; flex-direction: column; gap: 5px; }
.cab-field label { font-size: 0.78rem; opacity: 0.6; }
.cab-field .glass-input { width: 100%; resize: vertical; }
.cab-field-full { grid-column: 1 / -1; }
.cab-select { appearance: none; cursor: pointer; }

/* Tag groups */
.cab-tag-group { margin-bottom: 12px; }
.cab-tag-group-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.5;
  margin-bottom: 7px;
}
.cab-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.cab-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(180,180,220,0.3);
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(6px);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
  white-space: nowrap;
}
.cab-tag:hover { background: rgba(255,255,255,0.28); border-color: rgba(120,130,200,0.4); }
.cab-tag.active {
  background: rgba(100,110,200,0.22);
  border-color: rgba(100,110,200,0.55);
  font-weight: 600;
}

/* Form footer */
.cab-foot { display: flex; align-items: center; gap: 16px; margin-top: 6px; }
.cab-save {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 8px 26px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(180,180,220,0.45);
  backdrop-filter: blur(10px);
  transition: background 0.15s;
}
.cab-save:hover { background: rgba(255,255,255,0.5); }
.cab-save:disabled { opacity: 0.5; cursor: default; }
.cab-save-msg { font-size: 0.88rem; color: #4a7c59; font-weight: 600; }

.cab-footer { text-align: center; padding: 18px; font-size: 0.8rem; opacity: 0.35; }

/* Mobile */
@media (max-width: 768px) {
  .cab-header { padding: 12px 16px; }
  .cab-body { flex-direction: column; padding: 16px 12px; gap: 16px; }
  .cab-sidebar { width: 100%; position: static; padding: 6px 0; }
  .cab-nav { flex-direction: row; overflow-x: auto; gap: 4px; padding: 0 4px 4px; }
  .cab-nav-item { flex-shrink: 0; border-radius: 20px; padding: 7px 14px; white-space: nowrap; }
  .cab-grid-2 { grid-template-columns: 1fr; }
}
</style>
