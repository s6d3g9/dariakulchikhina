<template>
  <div class="ws-admin">
    <div class="ws-header">
      <span class="ws-count">{{ items?.length || 0 }} задач</span>
      <div class="ws-header-actions">
        <button class="ws-btn" @click="addItem">+ добавить</button>
        <button class="ws-btn ws-btn--save" @click="save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </div>
    <!-- Stats bar -->
    <div v-if="!pending && items.length" class="ws-stats-bar">
      <button class="ws-filter-btn" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">Все <span class="ws-filter-n">{{ items.length }}</span></button>
      <button class="ws-filter-btn ws-filter-btn--blue" :class="{ active: statusFilter === 'in_progress' }" @click="statusFilter = 'in_progress'">В работе <span class="ws-filter-n">{{ statCounts.in_progress }}</span></button>
      <button class="ws-filter-btn ws-filter-btn--red" :class="{ active: statusFilter === 'overdue' }" @click="statusFilter = 'overdue'">Просрочено <span class="ws-filter-n">{{ statCounts.overdue }}</span></button>
      <button class="ws-filter-btn ws-filter-btn--green" :class="{ active: statusFilter === 'done' }" @click="statusFilter = 'done'">Выполнено <span class="ws-filter-n">{{ statCounts.done }}</span></button>
      <div class="ws-stats-spacer"></div>
      <div v-if="totalBudget" class="ws-total-budget">Итого: <strong>{{ totalBudget }}</strong></div>
    </div>

    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <div v-else class="ws-list">
      <div v-if="filteredItems.length === 0" class="ws-empty">Нет задач с выбранным фильтром</div>
      <div v-for="(item, idx) in filteredItems" :key="item.__origIdx" class="ws-card" :class="{ 'ws-card--done': item.status === 'done', 'ws-card--active': detailItem?.idx === item.__origIdx, 'ws-card--overdue': isOverdue(item) }">
        <!-- row 1: title + status + detail btn -->
        <div class="ws-row">
          <div class="ws-field ws-field--wide">
            <label class="ws-lbl">задача</label>
            <GlassInput v-model="item.title"  placeholder="название задачи" />
          </div>
          <div class="ws-field ws-field--sm">
            <label class="ws-lbl">статус</label>
            <select v-model="item.status" class="glass-input">
              <option value="pending">ожидание</option>
              <option value="planned">запланировано</option>
              <option value="in_progress">в работе</option>
              <option value="done">выполнено</option>
              <option value="paused">на паузе</option>
              <option value="cancelled">отменено</option>
            </select>
          </div>
          <div class="ws-field ws-field--auto">
            <label class="ws-lbl">&nbsp;</label>
            <button
              v-if="item.id"
              class="ws-detail-btn"
              :class="{ active: detailItem?.idx === item.__origIdx }"
              @click="openDetail(item, item.__origIdx)"
            >
              <span v-if="item.photoCount || item.commentCount" class="ws-detail-counts">
                <span v-if="item.photoCount">📷{{ item.photoCount }}</span>
                <span v-if="item.commentCount">💬{{ item.commentCount }}</span>
              </span>
              <span v-else>💬</span>
            </button>
          </div>
        </div>
        <!-- row 1b: work type -->
        <div class="ws-row">
          <div class="ws-field">
            <label class="ws-lbl">вид работ</label>
            <select v-model="item.workType" class="glass-input">
              <option :value="null">— не указан —</option>
              <option v-for="w in WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
            </select>
          </div>
        </div>
        <!-- row 2: dates + budget + contractor -->
        <div class="ws-row">
          <div class="ws-field">
            <label class="ws-lbl">начало</label>
            <AppDatePicker v-model="item.dateStart" input-class="glass-input" />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">конец</label>
            <AppDatePicker v-model="item.dateEnd" input-class="glass-input" />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">бюджет</label>
            <GlassInput v-model="item.budget"  placeholder="0 руб." />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">подрядчик</label>
            <select v-model="item.contractorId" class="glass-input">
              <option :value="null">—</option>
              <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <!-- row 3: notes -->
        <div class="ws-row">
          <div class="ws-field ws-field--full">
            <label class="ws-lbl">примечание</label>
            <textarea v-model="item.notes" class="glass-input u-ta" rows="2" placeholder="комментарий к задаче"></textarea>
          </div>
        </div>
        <div class="ws-del-row">
          <button class="ws-del" @click="items.splice(item.__origIdx, 1)">удалить задачу</button>
        </div>
      </div>
    </div>
    <p v-if="error" class="ws-error">{{ error }}</p>

    <!-- ── Detail Panel (slide-in from right) ───────────────────── -->
    <Teleport to="body">
      <div v-if="detailItem" class="ws-detail-overlay" @click.self="closeDetail">
        <div class="ws-detail-panel">
          <div class="ws-detail-head">
            <div class="ws-detail-title">{{ detailItem.item.title || 'Задача без названия' }}</div>
            <div class="ws-detail-meta">
              <span class="ws-detail-status" :class="'ws-s--' + detailItem.item.status">{{ STATUS_LABELS[detailItem.item.status] || detailItem.item.status }}</span>
              <span v-if="detailItem.item.contractorName" class="ws-detail-contractor">{{ detailItem.item.contractorName }}</span>
              <span v-if="detailItem.item.dateEnd" class="ws-detail-date">до {{ detailItem.item.dateEnd }}</span>
            </div>
            <button class="ws-detail-close" @click="closeDetail">✕</button>
          </div>

          <!-- Фото -->
          <div class="ws-detail-section">
            <div class="ws-detail-section-title">Фото выполнения</div>
            <div v-if="detailPhotos.length" class="ws-photos-grid">
              <div v-for="ph in detailPhotos" :key="ph.id" class="ws-photo-thumb" @click="lightboxUrl = ph.url">
                <img :src="ph.url" />
              </div>
            </div>
            <div v-else class="ws-detail-empty">Подрядчик ещё не прикрепил фото</div>
          </div>

          <!-- Комментарии -->
          <div class="ws-detail-section ws-detail-section--grow">
            <div class="ws-detail-section-title">Переписка с подрядчиком</div>
            <div class="ws-comments-list" ref="commentsList">
              <div
                v-for="c in detailComments" :key="c.id"
                class="ws-comment"
                :class="'ws-comment--' + c.authorType"
              >
                <div class="ws-comment-top">
                  <span class="ws-comment-author">{{ c.authorName }}</span>
                  <span class="ws-comment-time">{{ fmtTime(c.createdAt) }}</span>
                </div>
                <div class="ws-comment-text">{{ c.text }}</div>
              </div>
              <div v-if="!detailComments.length" class="ws-detail-empty">Комментариев нет</div>
            </div>
            <div class="ws-comment-form">
              <textarea
                v-model="newComment"
                class="glass-input u-ta"
                rows="2"
                placeholder="Напишите сообщение подрядчику… (Ctrl+Enter — отправить)"
                @keydown.ctrl.enter.prevent="postComment"
              />
              <button
                class="ws-btn ws-btn--save ws-comment-send"
                :disabled="sendingComment || !newComment.trim()"
                @click="postComment"
              >{{ sendingComment ? '…' : 'Отправить' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxUrl" class="ws-lightbox" @click="lightboxUrl = null">
        <button class="ws-lightbox-close" @click.stop="lightboxUrl = null">✕</button>
        <img :src="lightboxUrl" class="ws-lightbox-img" @click.stop />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'
const WORK_TYPE_OPTIONS = CONTRACTOR_WORK_TYPE_OPTIONS
const props = defineProps<{ slug: string }>()

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидание', planned: 'Запланировано', in_progress: 'В работе',
  done: 'Выполнено', paused: 'На паузе', cancelled: 'Отменено',
}

const { data: rawItems, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/work-status`, { server: false }
)
const { data: contractors } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`, { server: false, default: () => [] }
)
const items = ref<any[]>([])
const saving = ref(false)
const error = ref('')
const statusFilter = ref('all')

watch(rawItems, (v) => {
  items.value = (v || []).map((i: any) => ({
    ...i,
    contractorId: i.contractorId ?? null,
  }))
}, { immediate: true })

function parseDate(s: string): Date | null {
  if (!s) return null
  // DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (dmyMatch) return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]))
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function isOverdue(item: any): boolean {
  if (!item.dateEnd || item.status === 'done' || item.status === 'cancelled') return false
  const due = parseDate(item.dateEnd)
  if (!due) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}

const statCounts = computed(() => ({
  in_progress: items.value.filter(i => i.status === 'in_progress').length,
  done: items.value.filter(i => i.status === 'done').length,
  overdue: items.value.filter(i => isOverdue(i)).length,
}))

const filteredItems = computed(() => {
  const withIdx = items.value.map((item, idx) => ({ ...item, __origIdx: idx }))
  if (statusFilter.value === 'all') return withIdx
  if (statusFilter.value === 'overdue') return withIdx.filter(i => isOverdue(i))
  return withIdx.filter(i => i.status === statusFilter.value)
})

const totalBudget = computed(() => {
  const nums = items.value
    .filter(i => statusFilter.value === 'all' || i.status === statusFilter.value || (statusFilter.value === 'overdue' && isOverdue(i)))
    .map(i => parseFloat(String(i.budget || '').replace(/[^\d.]/g, '')))
    .filter(n => !isNaN(n) && n > 0)
  if (!nums.length) return ''
  const sum = nums.reduce((a, b) => a + b, 0)
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(sum)
})

function addItem() {
  items.value.push({
    title: '', status: 'pending', workType: null,
    dateStart: '', dateEnd: '', budget: '', notes: '', contractorId: null,
  })
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const saved = await $fetch<any[]>(`/api/projects/${props.slug}/work-status`, {
      method: 'PUT',
      body: { items: items.value }
    })
    if (saved) {
      for (let i = 0; i < Math.min(items.value.length, saved.length); i++) {
        if (!items.value[i].id && saved[i]?.id) {
          items.value[i] = { ...items.value[i], ...saved[i] }
        }
      }
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}

// ── Detail panel ─────────────────────────────────────────────────
const detailItem = ref<{ item: any; idx: number } | null>(null)
const detailPhotos = ref<any[]>([])
const detailComments = ref<any[]>([])
const newComment = ref('')
const sendingComment = ref(false)
const lightboxUrl = ref<string | null>(null)
const commentsList = ref<HTMLElement | null>(null)

async function openDetail(item: any, idx: number) {
  if (detailItem.value?.idx === idx) { closeDetail(); return }
  detailItem.value = { item, idx }
  detailPhotos.value = []
  detailComments.value = []
  newComment.value = ''
  const [photos, comments] = await Promise.all([
    $fetch<any[]>(`/api/projects/${props.slug}/work-status/${item.id}/photos`),
    $fetch<any[]>(`/api/projects/${props.slug}/work-status/${item.id}/comments`),
  ])
  detailPhotos.value = photos
  detailComments.value = comments
  await nextTick()
  scrollComments()
}

function closeDetail() {
  detailItem.value = null
  lightboxUrl.value = null
}

async function postComment() {
  const text = newComment.value.trim()
  if (!text || sendingComment.value || !detailItem.value) return
  sendingComment.value = true
  try {
    const c = await $fetch<any>(
      `/api/projects/${props.slug}/work-status/${detailItem.value.item.id}/comments`,
      { method: 'POST', body: { text } }
    )
    detailComments.value.push(c)
    newComment.value = ''
    const item = items.value[detailItem.value.idx]
    if (item) item.commentCount = (item.commentCount || 0) + 1
    await nextTick()
    scrollComments()
  } finally {
    sendingComment.value = false
  }
}

function scrollComments() {
  if (commentsList.value) commentsList.value.scrollTop = commentsList.value.scrollHeight
}

function fmtTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
</script>

<style scoped>
.ws-admin { padding: 4px 0; }
.ws-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ws-count { font-size: .78rem; color: var(--ds-muted, color-mix(in srgb, var(--glass-text) 60%, transparent)); text-transform: uppercase; letter-spacing: .5px; }
.ws-header-actions { display: flex; gap: 8px; }
.ws-loading { font-size: .86rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); padding: 12px 0; }
.ws-error { font-size: .8rem; color: var(--ds-error, var(--ds-error)); margin-top: 12px; }

.ws-btn {
  padding: 6px 14px; border: none; background: color-mix(in srgb, var(--glass-bg, #fff) 90%, transparent);
  font-size: .8rem; cursor: pointer; font-family: inherit; border-radius: 4px;
  color: color-mix(in srgb, var(--glass-text) 60%, transparent); transition: border-color .12s;
}
.ws-btn:hover { opacity: .9; }
.ws-btn--save { background: var(--ds-accent, var(--ds-accent)); border-color: var(--ds-accent, var(--ds-accent)); color: #fff; }
.ws-btn--save:hover { opacity: .85; }
.ws-btn--save:disabled { opacity: .5; cursor: not-allowed; }

/* Stats / filter bar */
.ws-stats-bar {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-bottom: 14px; padding-bottom: 12px;
  border-bottom: none;
}
.ws-stats-spacer { flex: 1; }
.ws-total-budget { font-size: .8rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }
.ws-total-budget strong { color: var(--glass-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }

.ws-filter-btn {
  padding: 4px 10px; border: none; border-radius: 20px;
  font-size: .76rem; font-family: inherit; cursor: pointer;
  background: color-mix(in srgb, var(--glass-bg, #fff) 90%, transparent); color: color-mix(in srgb, var(--glass-text) 55%, transparent); transition: all .12s;
}
.ws-filter-btn:hover { color: var(--glass-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }
.ws-filter-btn.active { background: var(--glass-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); color: var(--glass-page-bg, #f4f4f2); }
.ws-filter-btn--blue.active { background: color-mix(in srgb, var(--ds-accent) 10%, transparent); color: var(--ds-accent); }
.ws-filter-btn--red.active { background: color-mix(in srgb, var(--ds-error) 7%, transparent); color: var(--ds-error); }
.ws-filter-btn--green.active { background: color-mix(in srgb, var(--ds-success) 8%, transparent); color: var(--ds-success); }
.ws-filter-n { opacity: .65; margin-left: 3px; }

.ws-empty { font-size: .84rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); padding: 12px 0; }

.ws-list { display: grid; gap: 10px; }
.ws-card--overdue { border-left: 3px solid #e53e3e !important; }
.ws-card {
  border: none; padding: 16px;
  background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--card-radius, 10px); transition: opacity .15s;
}
.ws-card--active { opacity: 1 !important; }
.ws-card--done { opacity: 0.7; }

.ws-row { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-end; flex-wrap: wrap; }
.ws-row:last-of-type { margin-bottom: 0; }
.ws-field { display: flex; flex-direction: column; min-width: 120px; flex: 1; }
.ws-field--wide { flex: 2; }
.ws-field--sm  { flex: 0 0 180px; min-width: 140px; }
.ws-field--full { flex: 1 0 100%; }
.ws-field--auto { flex: 0 0 auto; min-width: unset; }

.ws-lbl { font-size: .68rem; color: color-mix(in srgb, var(--glass-text) 50%, transparent); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
/* Input styles unified → glass-input */
.ws-del-row { text-align: right; margin-top: 8px; }
.ws-del { background: none; border: none; font-size: .76rem; color: var(--ds-error, var(--ds-error)); cursor: pointer; font-family: inherit; }
.ws-del:hover { text-decoration: underline; }

/* Detail button */
.ws-detail-btn {
  padding: 5px 10px; border: none; border-radius: 4px;
  background: transparent; cursor: pointer; font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  font-family: inherit; white-space: nowrap; transition: border-color .12s, background .12s;
}
.ws-detail-btn:hover, .ws-detail-btn.active { color: var(--ds-accent); background: color-mix(in srgb, var(--ds-accent) 5%, transparent); }
.ws-detail-counts { display: flex; gap: 6px; }

/* Detail panel */
.ws-detail-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.3); display: flex; justify-content: flex-end;
}
.ws-detail-panel {
  width: 480px; max-width: 96vw; height: 100%;
  background: var(--glass-bg); color: var(--glass-text);
  backdrop-filter: blur(20px) saturate(var(--glass-saturation, 145%));
  -webkit-backdrop-filter: blur(20px) saturate(var(--glass-saturation, 145%));
  display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,0.20);
  animation: wsSlideIn .2s ease;
}
@keyframes wsSlideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.ws-detail-head {
  padding: 20px 20px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  position: relative; flex-shrink: 0;
}
.ws-detail-title { font-size: 1rem; font-weight: 700; margin-bottom: 6px; padding-right: 36px; }
.ws-detail-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ws-detail-status {
  font-size: .72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent); color: color-mix(in srgb, var(--glass-text) 60%, transparent);
}
.ws-s--in_progress { background: color-mix(in srgb, var(--ds-accent, var(--ds-accent)) 12%, transparent) !important; color: var(--ds-accent, var(--ds-accent)) !important; }
.ws-s--done { background: color-mix(in srgb, var(--ds-success, #2ea86a) 12%, transparent) !important; color: var(--ds-success, #2ea86a) !important; }
.ws-s--cancelled { background: color-mix(in srgb, var(--ds-error) 10%, transparent) !important; color: var(--ds-error) !important; }
.ws-detail-contractor { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }
.ws-detail-date { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); }
.ws-detail-close {
  position: absolute; top: 18px; right: 16px;
  background: none; border: none; font-size: 1rem; cursor: pointer; opacity: .45; padding: 4px 8px;
}
.ws-detail-close:hover { opacity: 1; }

.ws-detail-section {
  padding: 16px 20px; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); flex-shrink: 0;
}
.ws-detail-section--grow { flex: 1; display: flex; flex-direction: column; overflow: hidden; border-bottom: none; }
.ws-detail-section-title {
  font-size: .68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: color-mix(in srgb, var(--glass-text) 50%, transparent); margin-bottom: 10px;
}
.ws-detail-empty { font-size: .82rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); }

/* Photos */
.ws-photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
.ws-photo-thumb { aspect-ratio: 1; border-radius: 6px; overflow: hidden; cursor: pointer; }
.ws-photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .2s; }
.ws-photo-thumb:hover img { transform: scale(1.06); }

/* Comments */
.ws-comments-list {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  gap: 8px; padding-right: 2px; margin-bottom: 12px; min-height: 60px;
}
.ws-comment { padding: 9px 12px; border-radius: 7px; background: color-mix(in srgb, var(--glass-text) 4%, transparent); }
.ws-comment--admin { background: color-mix(in srgb, var(--ds-accent) 8%, transparent); border-left: 2px solid var(--ds-accent); }
.ws-comment-top { display: flex; gap: 8px; align-items: center; margin-bottom: 3px; }
.ws-comment-author { font-size: .74rem; font-weight: 700; color: color-mix(in srgb, var(--glass-text) 60%, transparent); }
.ws-comment--admin .ws-comment-author { color: var(--ds-accent); }
.ws-comment-time { font-size: .68rem; color: color-mix(in srgb, var(--glass-text) 40%, transparent); }
.ws-comment-text { font-size: .87rem; line-height: 1.45; white-space: pre-wrap; }

.ws-comment-form { display: flex; gap: 8px; align-items: flex-end; padding-top: 2px; }
.ws-comment-input { flex: 1; resize: none; min-height: 50px; }
.ws-comment-send { white-space: nowrap; align-self: flex-end; padding: 7px 16px; }

/* Lightbox */
.ws-lightbox {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.88); display: flex; align-items: center; justify-content: center;
}
.ws-lightbox-img { max-width: 92vw; max-height: 90vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.ws-lightbox-close {
  position: absolute; top: 20px; right: 24px;
  background: rgba(255,255,255,.12); border: none; color: #fff;
  font-size: 1.2rem; width: 40px; height: 40px; border-radius: 50%;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.ws-lightbox-close:hover { background: rgba(255,255,255,.22); }

/* ── Mobile ── */
@media (max-width: 768px) {
  .ws-header { flex-wrap: wrap; gap: 8px; }
  .ws-header-actions { width: 100%; justify-content: flex-end; }
  .ws-stats-bar { gap: 4px; }
  .ws-filter-btn { padding: 4px 8px; font-size: .7rem; }
  .ws-row { gap: 8px; }
  .ws-field--sm { flex: 1 1 100%; min-width: 0; }
  .ws-field { min-width: 0; }
  .ws-card { padding: 12px; }
  .ws-detail-panel { width: 100%; max-width: 100vw; }
  .ws-detail-head { padding: 16px 14px 12px; }
  .ws-detail-section { padding: 12px 14px; }
  .ws-comment-form { flex-direction: column; gap: 8px; }
  .ws-comment-send { width: 100%; text-align: center; }
  .ws-btn { padding: 6px 10px; font-size: .76rem; }
}
@media (max-width: 400px) {
  .ws-field { flex: 1 1 100%; }
  .ws-field--wide { flex: 1 1 100%; }
}
</style>
