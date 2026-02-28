<template>
  <div class="cab-root glass-page">

    <header class="cab-header glass-surface">
      <div class="cab-logo">DK <span>| {{ contractor?.contractorType === 'company' ? 'Кабинет подрядчика' : 'Кабинет мастера' }}</span></div>
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
            <span v-if="item.key === 'staff' && staff?.length" class="cab-badge">{{ staff.length }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="cab-main">
        <div class="cab-inner">

          <!-- ── Задачи ──────────────────────────────────────────── -->
          <template v-if="section === 'tasks'">

            <!-- Кнопка «Добавить задачу мастеру» для компании -->
            <div v-if="contractor?.contractorType === 'company' && staff?.length" class="cab-add-task-row">
              <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу мастеру</button>
            </div>

            <!-- Фильтр -->
            <div v-if="workItems?.length" class="cab-filters">
              <button
                v-for="f in FILTERS" :key="f.value"
                class="cab-filter-btn"
                :class="{ active: statusFilter === f.value }"
                @click="statusFilter = f.value"
              >{{ f.label }}<span v-if="f.count" class="cab-filter-count">{{ f.count }}</span></button>
            </div>

            <div v-if="!workItems?.length" class="cab-empty">
              <div class="cab-empty-icon">◎</div>
              <p>Задач пока нет.<br>Они появятся когда дизайнер добавит вас к проекту.</p>
            </div>
            <div v-else-if="!byProject.length" class="cab-empty">
              <div class="cab-empty-icon">◉</div>
              <p>Нет задач с выбранным фильтром.</p>
            </div>
            <template v-else>
              <div v-for="proj in byProject" :key="proj.slug" class="cab-project-group">
                <!-- Заголовок проекта с прогрессом -->
                <div class="cab-proj-header">
                  <span class="cab-proj-title">{{ proj.title }}</span>
                  <span class="cab-proj-stats">{{ proj.doneCount }} / {{ proj.totalCount }}</span>
                </div>
                <div class="cab-proj-progress">
                  <div class="cab-proj-progress-bar" :style="{ width: proj.totalCount ? (proj.doneCount / proj.totalCount * 100) + '%' : '0%' }" />
                </div>

                <!-- Группы по виду работ -->
                <div v-for="wtGroup in proj.wtGroups" :key="wtGroup.workType" class="cab-wt-group">
                  <button class="cab-wt-head" @click="toggleWtGroup(proj.slug, wtGroup.workType)">
                    <span class="cab-wt-icon">{{ isWtGroupOpen(proj.slug, wtGroup.workType) ? '▾' : '▸' }}</span>
                    <span class="cab-wt-name">{{ wtGroup.label }}</span>
                    <span class="cab-wt-count">{{ wtGroup.items.length }} зад.</span>
                    <span v-if="wtGroup.stages.length" class="cab-wt-prog">
                      {{ stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) }}% этапов
                    </span>
                  </button>

                  <div v-if="isWtGroupOpen(proj.slug, wtGroup.workType)" class="cab-wt-body">
                    <!-- Задачи -->
                    <div class="cab-tasks">
                      <div
                        v-for="item in wtGroup.items" :key="item.id"
                        class="cab-task glass-surface"
                        :class="{ expanded: expandedId === item.id }"
                      >
                        <!-- Верхняя строка -->
                        <div class="cab-task-top" @click="toggleExpand(item.id)">
                          <span class="cab-task-expand-icon">{{ expandedId === item.id ? '▾' : '▸' }}</span>
                          <span class="cab-task-name">{{ item.title }}</span>
                          <span v-if="item.assignedToName" class="cab-task-assigned-badge">→ {{ item.assignedToName }}</span>
                          <span v-if="item.roadmapStageTitle" class="cab-task-stage-badge">{{ item.roadmapStageTitle }}</span>
                          <select
                            :value="item.status"
                            class="cab-status-select"
                            :class="`cab-status--${item.status}`"
                            @click.stop
                            @change="updateStatus(item, ($event.target as HTMLSelectElement).value)"
                          >
                            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                          </select>
                        </div>

                        <!-- Collapsed: краткая инфо -->
                        <template v-if="expandedId !== item.id">
                          <div v-if="item.dateStart || item.dateEnd || item.budget" class="cab-task-meta">
                            <span v-if="item.dateStart">с {{ item.dateStart }}</span>
                            <span v-if="item.dateEnd">по {{ item.dateEnd }}</span>
                            <span v-if="item.budget" class="cab-task-budget">{{ item.budget }}</span>
                          </div>
                          <div v-if="item.notes" class="cab-task-notes cab-task-notes--preview">{{ item.notes }}</div>
                        </template>

                        <!-- Expanded: редактирование -->
                        <template v-else>
                          <div class="cab-task-edit">
                            <div class="cab-task-edit-row">
                              <div class="cab-task-edit-field">
                                <label>Дата начала</label>
                                <input v-model="editMap[item.id].dateStart" class="glass-input cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                              </div>
                              <div class="cab-task-edit-field">
                                <label>Дата окончания</label>
                                <input v-model="editMap[item.id].dateEnd" class="glass-input cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                              </div>
                              <div v-if="item.budget" class="cab-task-edit-field">
                                <label>Бюджет</label>
                                <span class="cab-task-budget cab-task-budget--lg">{{ item.budget }}</span>
                              </div>
                            </div>
                            <div class="cab-task-edit-field">
                              <label>Заметка для дизайнера</label>
                              <textarea v-model="editMap[item.id].notes" class="glass-input" rows="3" placeholder="Статус работ, вопросы, уточнения…" />
                            </div>
                            <div class="cab-task-edit-actions">
                              <button type="button" class="cab-task-save" :disabled="savingItem === item.id" @click.stop="saveTaskDetails(item)">
                                {{ savingItem === item.id ? 'Сохранение…' : 'Сохранить' }}
                              </button>
                              <button type="button" class="cab-task-cancel" @click.stop="expandedId = null">Отмена</button>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>

                    <!-- Технологические этапы (интерактивный чеклист) -->
                    <div v-if="wtGroup.stages.length" class="cab-stages-inline glass-surface">
                      <div class="cab-stages-inline-head">
                        <span class="cab-stages-inline-title">Технологические этапы</span>
                        <span class="cab-stages-inline-pct">{{ stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) }}%</span>
                      </div>
                      <div class="cab-stages-inline-bar-wrap">
                        <div class="cab-stages-inline-bar" :style="{ width: stagesPct(proj.slug, wtGroup.workType, wtGroup.stages.length) + '%' }" />
                      </div>
                      <div
                        v-for="(stage, idx) in wtGroup.stages" :key="stage.key"
                        class="cab-stage-check-row"
                        :class="{ done: isStageDone(proj.slug, wtGroup.workType, stage.key) }"
                        @click="toggleStage(proj.slug, wtGroup.workType, stage.key)"
                      >
                        <span class="cab-stage-check-icon">{{ isStageDone(proj.slug, wtGroup.workType, stage.key) ? '✓' : '○' }}</span>
                        <span class="cab-stage-num">{{ idx + 1 }}</span>
                        <span class="cab-stage-label">{{ stage.label }}</span>
                        <span v-if="stage.hint" class="cab-stage-hint">{{ stage.hint }}</span>
                      </div>
                    </div>
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

          <!-- ── Бригада ────────────────────────────────────── -->
          <template v-else-if="section === 'staff'">
            <div v-if="!staff?.length" class="cab-empty">
              <div class="cab-empty-icon">◔</div>
              <p>Сотрудников пока нет.<br>Администратор добавит мастеров за вашей компанией.</p>
            </div>
            <div v-else class="cab-staff-list">
              <NuxtLink
                v-for="m in staff" :key="m.id"
                :to="`/contractor/${m.id}`"
                class="cab-staff-card glass-surface"
              >
                <div class="cab-staff-avatar">◑</div>
                <div class="cab-staff-info">
                  <div class="cab-staff-name">{{ m.name }}</div>
                  <div v-if="m.workTypes?.length" class="cab-staff-wt">
                    {{ m.workTypes.slice(0,3).map((w: string) => workTypeLabel(w)).join(' · ') }}
                    <span v-if="m.workTypes.length > 3"> +{{ m.workTypes.length - 3 }}</span>
                  </div>
                  <div class="cab-staff-contacts">
                    <span v-if="m.phone">☎️ {{ m.phone }}</span>
                    <span v-if="m.messenger && m.messengerNick">
                      <template v-if="m.messenger === 'telegram'">✈️</template>
                      <template v-else-if="m.messenger === 'whatsapp'">&#128242;</template>
                      <template v-else>💬</template>
                      {{ m.messengerNick }}
                    </span>
                  </div>
                </div>
                <div class="cab-staff-arrow">›</div>
              </NuxtLink>
            </div>
          </template>

        </div>
      </main>
    </div>

    <footer class="cab-footer">DK Studio · {{ contractor?.contractorType === 'company' ? 'Кабинет подрядчика' : 'Кабинет мастера' }}</footer>

    <!-- Модальное окно: новая задача мастеру -->
    <Teleport to="body">
      <div v-if="showNewTaskModal" class="cab-modal-overlay" @click.self="showNewTaskModal = false">
        <div class="cab-modal glass-surface">
          <div class="cab-modal-head">
            <span class="cab-modal-title">Новая задача мастеру</span>
            <button class="cab-modal-close" @click="showNewTaskModal = false">✕</button>
          </div>
          <div class="cab-modal-body">
            <div class="cab-field">
              <label>Мастер *</label>
              <select v-model="newTask.masterContractorId" class="glass-input">
                <option :value="null" disabled>— выберите мастера —</option>
                <option v-for="m in staff" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="cab-field">
              <label>Проект *</label>
              <select v-model="newTask.projectSlug" class="glass-input">
                <option value="" disabled>— выберите проект —</option>
                <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
              </select>
            </div>
            <div class="cab-field">
              <label>Название задачи *</label>
              <input v-model="newTask.title" class="glass-input" placeholder="Что нужно сделать…" />
            </div>
            <div class="cab-field">
              <label>Вид работ</label>
              <select v-model="newTask.workType" class="glass-input">
                <option value="">— не указан —</option>
                <option v-for="w in CONTRACTOR_WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
              </select>
            </div>
            <div class="cab-modal-row2">
              <div class="cab-field">
                <label>Дата начала</label>
                <input v-model="newTask.dateStart" class="glass-input" placeholder="дд.мм.гггг" />
              </div>
              <div class="cab-field">
                <label>Дата окончания</label>
                <input v-model="newTask.dateEnd" class="glass-input" placeholder="дд.мм.гггг" />
              </div>
            </div>
            <div class="cab-field">
              <label>Бюджет</label>
              <input v-model="newTask.budget" class="glass-input" placeholder="например: 50 000 ₽" />
            </div>
            <div class="cab-field">
              <label>Примечание</label>
              <textarea v-model="newTask.notes" class="glass-input" rows="3" placeholder="Уточнения, материалы, особые требования…" />
            </div>
          </div>
          <div class="cab-modal-foot">
            <button
              class="cab-task-save"
              :disabled="creatingTask || !newTask.masterContractorId || !newTask.projectSlug || !newTask.title.trim()"
              @click="createTask"
            >{{ creatingTask ? 'Создание…' : 'Создать задачу' }}</button>
            <button class="cab-task-cancel" @click="showNewTaskModal = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_ROLE_TYPE_OPTIONS, CONTRACTOR_WORK_TYPE_OPTIONS, WORK_TYPE_STAGES } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'default' })

const router = useRouter()
const route = useRoute()
const contractorId = Number(route.params.id)

const { data: contractor, pending, refresh } = await useFetch<any>(`/api/contractors/${contractorId}`)
const { data: workItems, refresh: refreshItems } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/work-items`, { default: () => [] }
)
const { data: staff } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/staff`, { default: () => [] }
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

// ── Auth guard ───────────────────────────────────────────────────
const { data: meData } = await useFetch<any>('/api/auth/me')
if (meData.value?.contractorId && meData.value.contractorId !== contractorId) {
  await navigateTo(`/contractor/${meData.value.contractorId}`)
}

// ── Nav ──────────────────────────────────────────────────────────
const section = ref('tasks')
const nav = computed(() => {
  const items: { key: string; icon: string; label: string }[] = [
    { key: 'tasks',   icon: '◎', label: 'Мои задачи' },
    { key: 'profile', icon: '◑', label: 'Мой профиль' },
  ]
  if (contractor.value?.contractorType === 'company') {
    items.splice(1, 0, { key: 'staff', icon: '◔', label: 'Бригада' })
  }
  return items
})

// ── Wt group open state ──────────────────────────────────────────
const wtGroupOpenSet = reactive(new Set<string>())
function wtGroupKey(slug: string, wt: string) { return `${slug}::${wt}` }
function isWtGroupOpen(slug: string, wt: string) { return wtGroupOpenSet.has(wtGroupKey(slug, wt)) }
function toggleWtGroup(slug: string, wt: string) {
  const k = wtGroupKey(slug, wt)
  if (wtGroupOpenSet.has(k)) wtGroupOpenSet.delete(k)
  else wtGroupOpenSet.add(k)
}

// ── Stage checklist (localStorage) ──────────────────────────────
interface WtGroup { workType: string; label: string; items: any[]; stages: any[] }

function lsKey(projectSlug: string, wt: string) {
  return `cab_stages_${contractorId}_${projectSlug}_${wt}`
}
function loadStageDone(projectSlug: string, wt: string): Set<string> {
  if (process.server) return new Set()
  try { const r = localStorage.getItem(lsKey(projectSlug, wt)); return new Set(r ? JSON.parse(r) : []) }
  catch { return new Set() }
}
const stagesCache = reactive<Record<string, Set<string>>>({})
function getStageDone(projectSlug: string, wt: string): Set<string> {
  const k = lsKey(projectSlug, wt)
  if (!stagesCache[k]) stagesCache[k] = loadStageDone(projectSlug, wt)
  return stagesCache[k]
}
function toggleStage(projectSlug: string, wt: string, stageKey: string) {
  const s = getStageDone(projectSlug, wt)
  if (s.has(stageKey)) s.delete(stageKey)
  else s.add(stageKey)
  if (!process.server) localStorage.setItem(lsKey(projectSlug, wt), JSON.stringify([...s]))
}
function isStageDone(projectSlug: string, wt: string, key: string) {
  return getStageDone(projectSlug, wt).has(key)
}
function stagesPct(projectSlug: string, wt: string, total: number) {
  if (!total) return 0
  return Math.round(getStageDone(projectSlug, wt).size / total * 100)
}

// ── Tasks ─────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'pending',     label: 'Ожидание' },
  { value: 'planned',     label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'paused',      label: 'На паузе' },
  { value: 'done',        label: 'Выполнено' },
  { value: 'cancelled',   label: 'Отменено' },
]

const statusFilter = ref('all')
const expandedId = ref<number | null>(null)
const savingItem = ref<number | null>(null)

// map id → { notes, dateStart, dateEnd } для редактирования
const editMap = reactive<Record<number, { notes: string; dateStart: string; dateEnd: string }>>({})

watch(workItems, (items) => {
  for (const item of items || []) {
    if (!editMap[item.id]) {
      editMap[item.id] = { notes: item.notes || '', dateStart: item.dateStart || '', dateEnd: item.dateEnd || '' }
    }
    // auto-open all wt groups
    const k = wtGroupKey(item.projectSlug, item.workType || '__general__')
    wtGroupOpenSet.add(k)
  }
}, { immediate: true })

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

const activeCount = computed(() =>
  (workItems.value || []).filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length
)

const FILTERS = computed(() => {
  const all = workItems.value || []
  return [
    { value: 'all',       label: 'Все',       count: all.length },
    { value: 'active',    label: 'Активные',  count: all.filter((i: any) => ['planned','in_progress'].includes(i.status)).length },
    { value: 'done',      label: 'Выполнено', count: all.filter((i: any) => i.status === 'done').length },
    { value: 'cancelled', label: 'Отменено',  count: all.filter((i: any) => i.status === 'cancelled').length },
  ]
})

const byProject = computed(() => {
  const all = workItems.value || []
  const map = new Map<string, { slug: string; title: string; wtGroups: WtGroup[]; doneCount: number; totalCount: number }>()
  for (const item of all) {
    if (!map.has(item.projectSlug)) {
      map.set(item.projectSlug, { slug: item.projectSlug, title: item.projectTitle, wtGroups: [], doneCount: 0, totalCount: 0 })
    }
    const proj = map.get(item.projectSlug)!
    proj.totalCount++
    if (item.status === 'done') proj.doneCount++
    const f = statusFilter.value
    const show = (
      f === 'all' ||
      (f === 'active' && ['planned','in_progress'].includes(item.status)) ||
      (f === 'done' && item.status === 'done') ||
      (f === 'cancelled' && item.status === 'cancelled')
    )
    if (!show) continue
    const wt = item.workType || '__general__'
    let grp = proj.wtGroups.find(g => g.workType === wt)
    if (!grp) {
      const label = wt === '__general__'
        ? 'Общие задачи'
        : (CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)?.label || wt)
      const stages = wt !== '__general__' ? (WORK_TYPE_STAGES[wt] || []) : []
      grp = { workType: wt, label, items: [], stages }
      proj.wtGroups.push(grp)
    }
    grp.items.push(item)
  }
  return [...map.values()].filter(p => p.wtGroups.length > 0)
})

// ── Все проекты (для формы новой задачи) ────────────────────────
const allProjects = computed(() => {
  const seen = new Set<string>()
  const result: { slug: string; title: string }[] = []
  for (const item of workItems.value || []) {
    if (!seen.has(item.projectSlug)) {
      seen.add(item.projectSlug)
      result.push({ slug: item.projectSlug, title: item.projectTitle })
    }
  }
  return result
})

// ── Новая задача мастеру ─────────────────────────────────────────
const showNewTaskModal = ref(false)
const creatingTask = ref(false)
const newTask = reactive({
  masterContractorId: null as number | null,
  projectSlug: '',
  title: '',
  workType: '',
  dateStart: '',
  dateEnd: '',
  budget: '',
  notes: '',
})

function openNewTaskModal() {
  newTask.masterContractorId = staff.value?.length === 1 ? staff.value[0].id : null
  newTask.projectSlug = allProjects.value.length === 1 ? allProjects.value[0].slug : ''
  newTask.title = ''
  newTask.workType = ''
  newTask.dateStart = ''
  newTask.dateEnd = ''
  newTask.budget = ''
  newTask.notes = ''
  showNewTaskModal.value = true
}

async function createTask() {
  if (!newTask.masterContractorId || !newTask.projectSlug || !newTask.title.trim()) return
  creatingTask.value = true
  try {
    await $fetch(`/api/contractors/${contractorId}/work-items`, {
      method: 'POST',
      body: {
        projectSlug: newTask.projectSlug,
        masterContractorId: newTask.masterContractorId,
        title: newTask.title.trim(),
        workType: newTask.workType || null,
        dateStart: newTask.dateStart || null,
        dateEnd: newTask.dateEnd || null,
        budget: newTask.budget || null,
        notes: newTask.notes || null,
      },
    })
    showNewTaskModal.value = false
    refreshItems()
  } finally {
    creatingTask.value = false
  }
}

async function updateStatus(item: any, status: string) {
  item.status = status
  await $fetch(`/api/contractors/${contractorId}/work-items/${item.id}`, {
    method: 'PUT',
    body: { status },
  })
  refreshItems()
}

async function saveTaskDetails(item: any) {
  savingItem.value = item.id
  const edit = editMap[item.id]
  try {
    const updated = await $fetch<any>(`/api/contractors/${contractorId}/work-items/${item.id}`, {
      method: 'PUT',
      body: { notes: edit.notes, dateStart: edit.dateStart || null, dateEnd: edit.dateEnd || null },
    })
    item.notes = updated.notes
    item.dateStart = updated.dateStart
    item.dateEnd = updated.dateEnd
    expandedId.value = null
  } finally {
    savingItem.value = null
  }
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

/* Filters */
.cab-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.cab-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  background: var(--glass-bg, rgba(255,255,255,0.2));
  backdrop-filter: blur(8px);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.15s, background 0.15s;
}
.cab-filter-btn:hover { opacity: 1; }
.cab-filter-btn.active {
  opacity: 1;
  background: rgba(100,110,200,0.18);
  border-color: rgba(100,110,200,0.5);
  font-weight: 600;
}
.cab-filter-count {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(100,110,200,0.15);
}

/* Project groups */
.cab-project-group { margin-bottom: 28px; }
.cab-proj-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cab-proj-title {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.5;
}
.cab-proj-stats { font-size: 0.7rem; opacity: 0.4; }
.cab-proj-progress {
  height: 3px;
  background: rgba(255,255,255,0.18);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.cab-proj-progress-bar {
  height: 100%;
  background: rgba(40,160,100,0.6);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.cab-tasks { display: flex; flex-direction: column; gap: 10px; }

/* Task card */
.cab-task {
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 0.2s;
}
.cab-task.expanded {
  box-shadow: 0 8px 32px rgba(80,90,180,0.12);
}
.cab-task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  cursor: pointer;
  user-select: none;
}
.cab-task-expand-icon {
  font-size: 0.7rem;
  opacity: 0.45;
  flex-shrink: 0;
  width: 12px;
}
.cab-task-name { font-size: 0.9rem; font-weight: 600; flex: 1; min-width: 0; }
.cab-task-meta { font-size: 0.78rem; opacity: 0.6; display: flex; gap: 8px; flex-wrap: wrap; }
.cab-task-budget { font-size: 0.78rem; opacity: 0.7; }
.cab-task-budget--lg { font-size: 0.88rem; font-weight: 600; opacity: 0.8; }
.cab-task-notes { font-size: 0.82rem; opacity: 0.65; line-height: 1.5; }
.cab-task-notes--preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Task inline edit */
.cab-task-edit { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; }
.cab-task-edit-row { display: flex; gap: 12px; flex-wrap: wrap; }
.cab-task-edit-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 120px; }
.cab-task-edit-field label { font-size: 0.72rem; opacity: 0.5; }
.cab-task-edit-inp { width: 100%; }
.cab-task-edit-actions { display: flex; gap: 10px; align-items: center; }
.cab-task-save {
  cursor: pointer;
  padding: 5px 18px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(180,180,220,0.45);
  backdrop-filter: blur(8px);
  transition: background 0.15s;
}
.cab-task-save:hover { background: rgba(255,255,255,0.5); }
.cab-task-save:disabled { opacity: 0.5; cursor: default; }
.cab-task-cancel {
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-family: inherit;
  background: none;
  border: none;
  opacity: 0.45;
  transition: opacity 0.15s;
}
.cab-task-cancel:hover { opacity: 0.9; }

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

/* Stages */
.cab-stages-block {
  border-radius: 12px;
  margin-bottom: 10px;
  overflow: hidden;
}
.cab-stages-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  text-align: left;
}
.cab-stages-head:hover { background: rgba(255,255,255,0.15); }
.cab-stages-icon { font-size: 0.7rem; opacity: 0.45; width: 12px; flex-shrink: 0; }
.cab-stages-title { font-size: 0.9rem; font-weight: 600; flex: 1; }
.cab-stages-count { font-size: 0.72rem; opacity: 0.45; white-space: nowrap; }
.cab-stages-list {
  border-top: 1px solid rgba(255,255,255,0.12);
  padding: 10px 0 8px;
}
.cab-stage-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 18px;
  transition: background 0.1s;
}
.cab-stage-row:hover { background: rgba(255,255,255,0.1); }
.cab-stage-num {
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.35;
  min-width: 18px;
  text-align: right;
  flex-shrink: 0;
}
.cab-stage-label { font-size: 0.85rem; flex: 1; line-height: 1.4; }
.cab-stage-hint { font-size: 0.75rem; opacity: 0.5; white-space: nowrap; }

/* Mobile */
@media (max-width: 768px) {
  .cab-header { padding: 12px 16px; }
  .cab-body { flex-direction: column; padding: 16px 12px; gap: 16px; }
  .cab-sidebar { width: 100%; position: static; padding: 6px 0; }
  .cab-nav { flex-direction: row; overflow-x: auto; gap: 4px; padding: 0 4px 4px; }
  .cab-nav-item { flex-shrink: 0; border-radius: 20px; padding: 7px 14px; white-space: nowrap; }
  .cab-grid-2 { grid-template-columns: 1fr; }
}

/* Work type group */
.cab-wt-group { margin-bottom: 14px; }
.cab-wt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--glass-bg, rgba(255,255,255,0.28));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(8px);
  transition: background 0.15s;
  margin-bottom: 6px;
}
.cab-wt-head:hover { background: rgba(255,255,255,0.38); }
.cab-wt-icon { font-size: 0.65rem; opacity: 0.45; width: 12px; flex-shrink: 0; }
.cab-wt-name { flex: 1; }
.cab-wt-count { font-size: 0.73rem; opacity: 0.45; font-weight: 400; white-space: nowrap; }
.cab-wt-prog { font-size: 0.73rem; font-weight: 700; opacity: 0.7; color: #228855; white-space: nowrap; }
.cab-wt-body { padding-left: 4px; }

/* Stage inline checklist */
.cab-stages-inline {
  margin-top: 12px;
  border-radius: 12px;
  padding: 14px 18px;
  background: var(--glass-bg, rgba(255,255,255,0.18));
}
.cab-stages-inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cab-stages-inline-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.5; }
.cab-stages-inline-pct { font-size: 0.8rem; font-weight: 700; color: #228855; opacity: 0.85; }
.cab-stages-inline-bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.18);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.cab-stages-inline-bar {
  height: 100%;
  background: rgba(40,160,100,0.6);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.cab-stage-check-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s;
  user-select: none;
}
.cab-stage-check-row:hover { background: rgba(255,255,255,0.15); }
.cab-stage-check-row.done { opacity: 0.55; }
.cab-stage-check-icon {
  font-size: 0.8rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  color: #228855;
  font-weight: 700;
  opacity: 0.75;
}
.cab-stage-check-row:not(.done) .cab-stage-check-icon { color: var(--glass-text, #1a1a2e); opacity: 0.3; }
.cab-stage-check-row.done .cab-stage-label { text-decoration: line-through; }

/* Roadmap stage badge on task */
.cab-task-stage-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(240,180,30,0.14);
  border: 1px solid rgba(220,160,20,0.3);
  color: rgba(160,110,10,1);
  white-space: nowrap;
  flex-shrink: 0;
}
.dark .cab-task-stage-badge {
  background: rgba(240,200,60,0.12);
  border-color: rgba(240,200,60,0.25);
  color: rgba(230,190,80,1);
}
/* Assigned-to master badge */
.cab-task-assigned-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(80,140,255,0.1);
  border: 1px solid rgba(80,140,255,0.25);
  color: rgba(40,90,200,1);
  white-space: nowrap;
  flex-shrink: 0;
}
.dark .cab-task-assigned-badge {
  background: rgba(100,160,255,0.1);
  border-color: rgba(100,160,255,0.25);
  color: rgba(140,195,255,1);
}

/* Staff list */
.cab-staff-list { display: flex; flex-direction: column; gap: 10px; }
.cab-staff-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--glass-text, #1a1a2e);
  transition: box-shadow 0.18s, background 0.15s;
}
.cab-staff-card:hover {
  box-shadow: 0 6px 24px rgba(80,90,180,0.13);
  background: rgba(255,255,255,0.35);
}
.cab-staff-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: rgba(100,110,200,0.15);
  border: 1px solid rgba(100,110,200,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  opacity: 0.75;
}
.cab-staff-info { flex: 1; min-width: 0; }
.cab-staff-name { font-size: 0.92rem; font-weight: 600; margin-bottom: 3px; }
.cab-staff-wt { font-size: 0.75rem; opacity: 0.55; margin-bottom: 4px; }
.cab-staff-contacts {
  display: flex; gap: 12px;
  font-size: 0.78rem; opacity: 0.6;
}
.cab-staff-arrow {
  font-size: 1.4rem;
  opacity: 0.25;
  flex-shrink: 0;
  line-height: 1;
}

/* Добавить задачу мастеру */
.cab-add-task-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.cab-add-task-btn {
  background: rgba(99, 179, 237, 0.18);
  border: 1px solid rgba(99, 179, 237, 0.4);
  color: var(--glass-text, #1a1a2e);
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.cab-add-task-btn:hover { background: rgba(99, 179, 237, 0.32); }

/* Модальное окно */
.cab-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.cab-modal {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.cab-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.2));
}
.cab-modal-title {
  font-size: 1rem;
  font-weight: 700;
}
.cab-modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.5;
  padding: 4px 8px;
}
.cab-modal-close:hover { opacity: 1; }
.cab-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cab-modal-row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.cab-modal-foot {
  padding: 16px 24px 20px;
  display: flex;
  gap: 10px;
  border-top: 1px solid var(--glass-border, rgba(255,255,255,0.2));
}
</style>
