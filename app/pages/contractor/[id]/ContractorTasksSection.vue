<template>
  <!-- Кнопка «Добавить задачу мастеру» для компании -->
  <div v-if="props.contractorType === 'company' && props.staff?.length" class="cab-add-task-row">
    <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу мастеру</button>
  </div>

  <div v-if="showNewTaskModal" class="cab-inline-task-window glass-surface">
    <div class="cab-modal-head">
      <span class="cab-modal-title">Новая задача мастеру</span>
      <button class="cab-modal-close" @click="showNewTaskModal = false">✕</button>
    </div>
    <div class="cab-modal-body">
      <div class="u-field">
        <label>Мастер *</label>
        <select v-model="newTask.masterContractorId" class="glass-input">
          <option :value="null" disabled>— выберите мастера —</option>
          <option v-for="m in props.staff" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div class="u-field">
        <label>Проект *</label>
        <select v-model="newTask.projectSlug" class="glass-input">
          <option value="" disabled>— выберите проект —</option>
          <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
        </select>
      </div>
      <div class="u-field">
        <label>Название задачи *</label>
        <GlassInput v-model="newTask.title" placeholder="Что нужно сделать…" />
      </div>
      <div class="u-field">
        <label>Вид работ</label>
        <select v-model="newTask.workType" class="glass-input">
          <option value="">— не указан —</option>
          <option v-for="w in CONTRACTOR_WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
        </select>
      </div>
      <div class="cab-modal-row2">
        <div class="u-field">
          <label>Дата начала</label>
          <GlassInput v-model="newTask.dateStart" placeholder="дд.мм.гггг" />
        </div>
        <div class="u-field">
          <label>Дата окончания</label>
          <GlassInput v-model="newTask.dateEnd" placeholder="дд.мм.гггг" />
        </div>
      </div>
      <div class="u-field">
        <label>Бюджет</label>
        <GlassInput v-model="newTask.budget" placeholder="например: 50 000 ₽" />
      </div>
      <div class="u-field">
        <label>Примечание</label>
        <textarea v-model="newTask.notes" class="glass-input u-ta" rows="3" placeholder="Уточнения, материалы, особые требования…" />
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
                <select
                  :value="item.status"
                  class="u-status-sel"
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
                  <span v-if="item.dateEnd" :class="{ 'cab-task-overdue': isDue(item.dateEnd) && item.status !== 'done' }">по {{ item.dateEnd }}</span>
                  <span v-if="item.budget" class="cab-task-budget">{{ item.budget }}</span>
                </div>
                <div class="cab-task-counters">
                  <span v-if="item.photoCount" class="cab-task-counter">📷 {{ item.photoCount }}</span>
                  <span v-if="item.commentCount" class="cab-task-counter">💬 {{ item.commentCount }}</span>
                </div>
                <div v-if="item.notes" class="cab-task-notes cab-task-notes--preview">{{ item.notes }}</div>
              </template>

              <!-- Expanded: редактирование -->
              <template v-else>
                <div class="cab-task-edit">
                  <div class="cab-task-edit-row">
                    <div class="cab-task-edit-field">
                      <label>Дата начала</label>
                      <GlassInput v-model="editMap[item.id].dateStart" class=" cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                    </div>
                    <div class="cab-task-edit-field">
                      <label>Дата окончания</label>
                      <GlassInput v-model="editMap[item.id].dateEnd" class=" cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" />
                    </div>
                    <div v-if="item.budget" class="cab-task-edit-field">
                      <label>Бюджет</label>
                      <span class="cab-task-budget cab-task-budget--lg">{{ item.budget }}</span>
                    </div>
                  </div>
                  <div class="cab-task-edit-field">
                    <label>Заметка для дизайнера</label>
                    <textarea v-model="editMap[item.id].notes" class="glass-input u-ta" rows="3" placeholder="Статус работ, вопросы, уточнения…" />
                  </div>
                  <div class="cab-task-edit-actions">
                    <button type="button" class="cab-task-save" :disabled="savingItem === item.id" @click.stop="saveTaskDetails(item)">
                      {{ savingItem === item.id ? 'Сохранение…' : 'Сохранить' }}
                    </button>
                    <button type="button" class="cab-task-cancel" @click.stop="expandedId = null">Отмена</button>
                  </div>

                  <!-- ── Фото выполнения ── -->
                  <div class="cab-task-photos">
                    <div class="cab-task-photos-head">
                      <span class="cab-task-photos-title">Фото выполнения</span>
                      <label class="cab-photo-upload-btn">
                        <input type="file" accept="image/*" multiple style="display:none" @change="uploadPhotos(item, $event)" />
                        {{ uploadingFor === item.id ? 'Загрузка…' : '＋ Добавить фото' }}
                      </label>
                    </div>
                    <div v-if="(photosByItem[item.id] || []).length" class="cab-photos-grid">
                      <div
                        v-for="ph in photosByItem[item.id]" :key="ph.id"
                        class="cab-photo-thumb"
                      >
                        <img :src="ph.url" @click.stop="lightboxUrl = ph.url" />
                        <button class="cab-photo-del" @click.stop="deletePhoto(item.id, ph.id)">✕</button>
                      </div>
                    </div>
                    <div v-else class="cab-photos-empty">Нет фотографий</div>
                  </div>

                  <!-- ── Комментарии ── -->
                  <div class="cab-task-comments">
                    <div class="cab-task-comments-title">Комментарии</div>
                    <div class="cab-comments-list">
                      <div
                        v-for="c in (commentsByItem[item.id] || [])" :key="c.id"
                        class="cab-comment"
                        :class="'cab-comment--' + c.authorType"
                      >
                        <span class="cab-comment-author">{{ c.authorName }}</span>
                        <span class="cab-comment-time">{{ fmtTime(c.createdAt) }}</span>
                        <div class="cab-comment-text">{{ c.text }}</div>
                      </div>
                      <div v-if="!(commentsByItem[item.id] || []).length" class="cab-comments-empty">Нет комментариев</div>
                    </div>
                    <div class="cab-comment-form" @click.stop>
                      <textarea
                        v-model="commentText[item.id]"
                        class="glass-input cab-comment-input"
                        rows="2"
                        placeholder="Напишите комментарий…"
                      />
                      <button
                        class="cab-task-save cab-comment-send"
                        :disabled="sendingComment === item.id || !commentText[item.id]?.trim()"
                        @click.stop="sendComment(item)"
                      >{{ sendingComment === item.id ? '…' : 'Отправить' }}</button>
                    </div>
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

  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightboxUrl" class="cab-lightbox" @click="lightboxUrl = null">
      <button class="cab-lightbox-close" @click.stop="lightboxUrl = null">✕</button>
      <img :src="lightboxUrl" class="cab-lightbox-img" @click.stop />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS, WORK_TYPE_STAGES } from '~~/shared/types/catalogs'

const props = defineProps<{
  contractorId: number | string
  contractorType: string
  staff: any[]
  projects: { slug: string; title: string }[]
}>()

const { data: workItems, refresh: refreshItems } = await useFetch<any[]>(
  `/api/contractors/${props.contractorId}/work-items`, { default: () => [] }
)

// ── allProjects ──────────────────────────────────────────────────
const allProjects = computed(() => {
  const result: { slug: string; title: string }[] = [...props.projects]
  const seen = new Set(result.map(p => p.slug))
  for (const item of workItems.value || []) {
    if (!seen.has(item.projectSlug)) {
      seen.add(item.projectSlug)
      result.push({ slug: item.projectSlug, title: item.projectTitle })
    }
  }
  return result
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
  return `cab_stages_${props.contractorId}_${projectSlug}_${wt}`
}
function loadStageDone(projectSlug: string, wt: string): Set<string> {
  if (import.meta.server) return new Set()
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
  if (!import.meta.server) localStorage.setItem(lsKey(projectSlug, wt), JSON.stringify([...s]))
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
  newTask.masterContractorId = props.staff?.length === 1 ? props.staff[0].id : null
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
    await $fetch(`/api/contractors/${props.contractorId}/work-items`, {
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
  await $fetch(`/api/contractors/${props.contractorId}/work-items/${item.id}`, {
    method: 'PUT',
    body: { status },
  })
  refreshItems()
}

function isDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const [d, m, y] = dateStr.split('.')
  if (!d || !m || !y) return false
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  return due < new Date()
}

// ── Photos ────────────────────────────────────────────────────────
const photosByItem = reactive<Record<number, any[]>>({})
const uploadingFor = ref<number | null>(null)
const lightboxUrl = ref<string | null>(null)

async function loadPhotos(itemId: number) {
  const photos = await $fetch<any[]>(`/api/contractors/${props.contractorId}/work-items/${itemId}/photos`)
  photosByItem[itemId] = photos
}

async function uploadPhotos(item: any, event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  uploadingFor.value = item.id
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const photo = await $fetch<any>(`/api/contractors/${props.contractorId}/work-items/${item.id}/photos`, {
        method: 'POST', body: fd,
      })
      if (!photosByItem[item.id]) photosByItem[item.id] = []
      photosByItem[item.id].push(photo)
    }
    item.photoCount = (item.photoCount || 0) + files.length
  } finally {
    uploadingFor.value = null
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function deletePhoto(itemId: number, photoId: number) {
  await $fetch(`/api/contractors/${props.contractorId}/work-items/${itemId}/photos/${photoId}`, { method: 'DELETE' })
  photosByItem[itemId] = (photosByItem[itemId] || []).filter((p: any) => p.id !== photoId)
  const item = (workItems.value || []).find((i: any) => i.id === itemId)
  if (item) item.photoCount = Math.max(0, (item.photoCount || 1) - 1)
}

// ── Comments ──────────────────────────────────────────────────────
const commentsByItem = reactive<Record<number, any[]>>({})
const commentText = reactive<Record<number, string>>({})
const sendingComment = ref<number | null>(null)

async function loadComments(itemId: number) {
  const comments = await $fetch<any[]>(`/api/contractors/${props.contractorId}/work-items/${itemId}/comments`)
  commentsByItem[itemId] = comments
}

async function sendComment(item: any) {
  const text = (commentText[item.id] || '').trim()
  if (!text) return
  sendingComment.value = item.id
  try {
    const c = await $fetch<any>(`/api/contractors/${props.contractorId}/work-items/${item.id}/comments`, {
      method: 'POST', body: { text },
    })
    if (!commentsByItem[item.id]) commentsByItem[item.id] = []
    commentsByItem[item.id].push(c)
    item.commentCount = (item.commentCount || 0) + 1
    commentText[item.id] = ''
  } finally {
    sendingComment.value = null
  }
}

function fmtTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// Загружаем фото и комментарии при открытии задачи
watch(expandedId, (id) => {
  if (id !== null) {
    loadPhotos(id)
    loadComments(id)
  }
})

async function saveTaskDetails(item: any) {
  savingItem.value = item.id
  const edit = editMap[item.id]
  try {
    const updated = await $fetch<any>(`/api/contractors/${props.contractorId}/work-items/${item.id}`, {
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
</script>
