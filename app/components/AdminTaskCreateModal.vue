<template>
  <Teleport to="body">
    <div v-if="modelValue" class="task-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="task-modal glass-surface glass-card">
        <!-- Header -->
        <div class="task-modal-header">
          <span class="task-modal-title">{{ editId ? 'Редактировать задание' : 'Новое задание' }}</span>
          <button class="task-modal-close" @click="$emit('update:modelValue', false)">✕</button>
        </div>

        <!-- Body -->
        <div class="task-modal-body">
          <!-- Title -->
          <div class="tm-field">
            <label class="tm-label">Что сделать <span class="tm-req">*</span></label>
            <input v-model="form.title" class="glass-input tm-input" placeholder="Название задания" />
          </div>

          <!-- Description -->
          <div class="tm-field">
            <label class="tm-label">Описание</label>
            <textarea v-model="form.description" class="glass-input tm-textarea" rows="3"
              placeholder="Подробное описание работ..." />
          </div>

          <!-- Row: workType + serviceDescription -->
          <div class="tm-row">
            <div class="tm-field">
              <label class="tm-label">Вид работ</label>
              <select v-model="form.workType" class="glass-input tm-select">
                <option value="">— не выбрано —</option>
                <option v-for="wt in WORK_TYPES" :key="wt.value" :value="wt.value">{{ wt.label }}</option>
              </select>
            </div>
            <div class="tm-field">
              <label class="tm-label">Описание услуги</label>
              <input v-model="form.serviceDescription" class="glass-input tm-input" placeholder="Напр. укладка плитки" />
            </div>
          </div>

          <!-- Row: dates -->
          <div class="tm-row">
            <div class="tm-field">
              <label class="tm-label">Начало</label>
              <input v-model="form.dateStart" type="date" class="glass-input tm-input" />
            </div>
            <div class="tm-field">
              <label class="tm-label">Конец</label>
              <input v-model="form.dateEnd" type="date" class="glass-input tm-input" />
            </div>
          </div>

          <!-- Row: address + budget -->
          <div class="tm-row">
            <div class="tm-field tm-field--2x">
              <label class="tm-label">Адрес</label>
              <input v-model="form.address" class="glass-input tm-input" placeholder="ул. Пушкина, д. 1" />
            </div>
            <div class="tm-field">
              <label class="tm-label">Бюджет ₽</label>
              <input v-model="form.budget" type="number" class="glass-input tm-input" placeholder="0" />
            </div>
          </div>

          <!-- Requirements checkboxes -->
          <div class="tm-field">
            <label class="tm-label">Требования</label>
            <div class="tm-checks">
              <label class="tm-check">
                <input v-model="form.req_photo" type="checkbox" />
                Фотоотчёт
              </label>
              <label class="tm-check">
                <input v-model="form.req_act" type="checkbox" />
                Акт выполненных работ
              </label>
            </div>
          </div>

          <!-- Notes -->
          <div class="tm-field">
            <label class="tm-label">Примечания</label>
            <textarea v-model="form.notes" class="glass-input tm-textarea" rows="2" placeholder="Доп. информация..." />
          </div>

          <!-- Executor suggestion -->
          <div class="tm-field">
            <label class="tm-label">Исполнитель</label>

            <!-- Auto-suggest section -->
            <div v-if="form.workType && !loadingSuggestions" class="tm-suggest-wrap">
              <div v-if="suggestions.length" class="tm-suggest-label">Рекомендованные исполнители:</div>
              <div class="tm-suggest-list">
                <button
                  v-for="s in suggestions"
                  :key="s.contractor.id"
                  class="tm-suggest-card"
                  :class="{ 'tm-suggest-card--selected': form.assignedContractorId === s.contractor.id }"
                  type="button"
                  @click="selectContractor(s.contractor)"
                >
                  <div class="tm-sc-name">{{ s.contractor.name }}</div>
                  <div class="tm-sc-meta">
                    <span v-if="s.contractor.city" class="tm-sc-city">{{ s.contractor.city }}</span>
                    <span v-if="s.contractor.rating" class="tm-sc-rating">★ {{ s.contractor.rating }}</span>
                    <span v-if="s.contractor.verified" class="tm-sc-badge">✓</span>
                  </div>
                  <div class="tm-sc-score">
                    <span class="tm-sc-score-total">{{ s.score }} баллов</span>
                    <span v-for="(v, k) in s.breakdown" :key="k" class="tm-sc-score-item" :title="String(k)">
                      {{ shortBreakdownKey(k) }}: {{ v }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Manual search -->
            <div class="tm-executor-search">
              <input
                v-model="contractorSearch"
                class="glass-input tm-input"
                placeholder="Поиск подрядчика по имени..."
                @input="onContractorSearch"
              />
              <div v-if="contractorResults.length" class="tm-contractor-results">
                <button
                  v-for="c in contractorResults"
                  :key="c.id"
                  class="tm-cr-item"
                  type="button"
                  @click="selectContractor(c); contractorSearch = ''; contractorResults = []"
                >
                  {{ c.name }}<span v-if="c.city" class="tm-cr-city">{{ c.city }}</span>
                </button>
              </div>
            </div>

            <!-- Selected executor badge -->
            <div v-if="selectedContractor" class="tm-executor-selected">
              <span class="tm-executor-name">{{ selectedContractor.name }}</span>
              <button type="button" class="tm-executor-clear" @click="clearContractor">✕</button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="task-modal-footer">
          <div class="task-modal-summary">
            <span v-if="form.budget">₽ {{ Number(form.budget).toLocaleString('ru') }}</span>
            <span v-if="form.dateStart">с {{ form.dateStart }}</span>
            <span v-if="form.dateEnd">по {{ form.dateEnd }}</span>
          </div>
          <div class="task-modal-actions">
            <button class="a-btn-sm" @click="$emit('update:modelValue', false)">Отмена</button>
            <button class="a-btn-sm a-btn-primary" :disabled="saving || !form.title" @click="submit">
              {{ saving ? '...' : (editId ? 'Сохранить' : 'Создать') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Contractor { id: number; name: string; city?: string | null; rating?: string | null; verified?: boolean; workTypes?: string[] }
interface Suggestion { contractor: Contractor; score: number; breakdown: Record<string, number>; activeTasks: number }

const props = defineProps<{
  modelValue: boolean
  projectId?: number | null
  editTask?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', task: any): void
}>()

const WORK_TYPES = [
  { value: 'demolition',    label: 'Демонтаж' },
  { value: 'wiring',        label: 'Электрика' },
  { value: 'plumbing',      label: 'Сантехника' },
  { value: 'plastering',    label: 'Штукатурка' },
  { value: 'tiling',        label: 'Укладка плитки' },
  { value: 'flooring',      label: 'Полы' },
  { value: 'painting',      label: 'Покраска' },
  { value: 'ceiling',       label: 'Потолки' },
  { value: 'furniture',     label: 'Мебель' },
  { value: 'doors',         label: 'Двери/окна' },
  { value: 'finishing',     label: 'Чистовая отделка' },
  { value: 'general',       label: 'Общестроительные' },
]

const STATUSES = ['new', 'in_progress', 'review', 'approval', 'done', 'cancelled']

const editId = computed(() => props.editTask?.id ?? null)

const defaultForm = () => ({
  title: '',
  description: '',
  workType: '',
  serviceDescription: '',
  dateStart: '',
  dateEnd: '',
  address: '',
  budget: '',
  notes: '',
  req_photo: false,
  req_act: false,
  assignedContractorId: null as number | null,
  status: 'new',
})

const form = reactive(defaultForm())

watch(() => props.modelValue, (open) => {
  if (open) {
    if (props.editTask) {
      Object.assign(form, {
        title:               props.editTask.title ?? '',
        description:         props.editTask.description ?? '',
        workType:            props.editTask.workType ?? '',
        serviceDescription:  props.editTask.serviceDescription ?? '',
        dateStart:           props.editTask.dateStart ?? '',
        dateEnd:             props.editTask.dateEnd ?? '',
        address:             props.editTask.address ?? '',
        budget:              props.editTask.budget ?? '',
        notes:               props.editTask.notes ?? '',
        req_photo:           props.editTask.requirements?.photoReport ?? false,
        req_act:             props.editTask.requirements?.workAct ?? false,
        assignedContractorId: props.editTask.assignedContractorId ?? null,
        status:              props.editTask.status ?? 'new',
      })
      if (props.editTask.assignedContractorId) {
        selectedContractor.value = { id: props.editTask.assignedContractorId, name: props.editTask.contractorName ?? '' }
      }
    } else {
      Object.assign(form, defaultForm())
      selectedContractor.value = null
    }
    if (form.workType) loadSuggestions()
  }
})

// ── Contractor suggestion ──
const suggestions     = ref<Suggestion[]>([])
const loadingSuggestions = ref(false)
const selectedContractor = ref<Contractor | null>(null)

async function loadSuggestions() {
  if (!form.workType) { suggestions.value = []; return }
  loadingSuggestions.value = true
  try {
    suggestions.value = await $fetch('/api/tasks/suggest-executors', { query: { workType: form.workType } })
  } finally {
    loadingSuggestions.value = false
  }
}
watch(() => form.workType, loadSuggestions)

function selectContractor(c: Contractor) {
  form.assignedContractorId = c.id
  selectedContractor.value  = c
  contractorSearch.value    = ''
  contractorResults.value   = []
}
function clearContractor() {
  form.assignedContractorId = null
  selectedContractor.value  = null
}

// ── Manual search ──
const allContractors      = ref<Contractor[]>([])
const contractorSearch    = ref('')
const contractorResults   = ref<Contractor[]>([])

async function ensureContractors() {
  if (allContractors.value.length) return
  const rows: any[] = await $fetch('/api/contractors')
  allContractors.value = rows.map(r => ({
    id: r.id, name: r.name, city: r.city ?? null,
    rating: r.rating ?? null, verified: r.verified ?? false,
    workTypes: r.workTypes ?? [],
  }))
}

watch(() => props.modelValue, (open) => { if (open) ensureContractors() })

function onContractorSearch() {
  const q = contractorSearch.value.toLowerCase().trim()
  if (q.length < 2) { contractorResults.value = []; return }
  contractorResults.value = allContractors.value
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 8)
}

function shortBreakdownKey(k: string): string {
  const m: Record<string, string> = {
    'Специализация': 'Спец',
    'Рейтинг': 'Рейт',
    'Загруженность': 'Загр',
    'Верификация': 'Вер',
  }
  return m[k] ?? k
}

// ── Save ──
const saving = ref(false)

async function submit() {
  if (!form.title) return
  saving.value = true
  try {
    const body = {
      title:                form.title,
      description:          form.description   || null,
      projectId:            props.projectId    ?? null,
      status:               form.status,
      workType:             form.workType       || null,
      serviceDescription:   form.serviceDescription || null,
      dateStart:            form.dateStart      || null,
      dateEnd:              form.dateEnd        || null,
      address:              form.address        || null,
      budget:               form.budget         || null,
      notes:                form.notes          || null,
      assignedContractorId: form.assignedContractorId,
      requirements: {
        photoReport: form.req_photo,
        workAct:     form.req_act,
      },
    }
    let saved: any
    if (editId.value) {
      saved = await $fetch(`/api/tasks/${editId.value}`, { method: 'PUT', body })
    } else {
      saved = await $fetch('/api/tasks', { method: 'POST', body })
    }
    emit('saved', saved)
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.task-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.task-modal {
  width: 100%; max-width: 640px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
}
.task-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .9rem 1.2rem;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.task-modal-title { font-weight: 600; font-size: 1rem; }
.task-modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary); font-size: 1.1rem; padding: .2rem .4rem;
}
.task-modal-body {
  flex: 1; overflow-y: auto;
  padding: 1rem 1.2rem;
  display: flex; flex-direction: column; gap: .75rem;
}
.task-modal-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1.2rem;
  border-top: 1px solid var(--glass-border);
  flex-shrink: 0;
  gap: .5rem;
}
.task-modal-summary {
  display: flex; gap: .75rem;
  font-size: .82rem; color: var(--text-secondary);
}
.task-modal-actions { display: flex; gap: .5rem; }

/* Form fields */
.tm-field { display: flex; flex-direction: column; gap: .3rem; }
.tm-label { font-size: .8rem; font-weight: 500; color: var(--text-secondary); }
.tm-req { color: var(--color-danger, #e34); }
.tm-input, .tm-textarea, .tm-select { width: 100%; }
.tm-textarea { resize: vertical; }

.tm-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
}
.tm-field--2x { grid-column: span 1; }
@media (max-width: 500px) { .tm-row { grid-template-columns: 1fr; } }

.tm-checks { display: flex; gap: 1rem; flex-wrap: wrap; }
.tm-check {
  display: flex; align-items: center; gap: .35rem;
  font-size: .85rem; cursor: pointer;
}

/* Suggestions */
.tm-suggest-wrap { margin-bottom: .5rem; }
.tm-suggest-label { font-size: .78rem; color: var(--text-secondary); margin-bottom: .4rem; }
.tm-suggest-list { display: flex; gap: .5rem; flex-wrap: wrap; }
.tm-suggest-card {
  display: flex; flex-direction: column; gap: .2rem;
  padding: .5rem .75rem;
  border: 1.5px solid var(--glass-border);
  border-radius: 10px;
  background: var(--glass-bg, rgba(255,255,255,.05));
  cursor: pointer; text-align: left;
  transition: border-color .15s, background .15s;
  min-width: 140px;
}
.tm-suggest-card:hover { border-color: var(--color-accent, #4f8cff); }
.tm-suggest-card--selected {
  border-color: var(--color-accent, #4f8cff);
  background: rgba(79,140,255,.12);
}
.tm-sc-name { font-size: .88rem; font-weight: 600; }
.tm-sc-meta { display: flex; gap: .4rem; font-size: .75rem; color: var(--text-secondary); }
.tm-sc-rating { color: #f1a600; }
.tm-sc-badge { color: #2da870; font-weight: 700; }
.tm-sc-score { display: flex; gap: .3rem; flex-wrap: wrap; margin-top: .2rem; }
.tm-sc-score-total { font-size: .78rem; font-weight: 700; color: var(--color-accent, #4f8cff); }
.tm-sc-score-item { font-size: .72rem; color: var(--text-tertiary, var(--text-secondary)); }

/* Manual search */
.tm-executor-search { position: relative; }
.tm-contractor-results {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--surface-bg, #1e1e2f);
  max-height: 200px; overflow-y: auto;
  box-shadow: 0 6px 24px rgba(0,0,0,.3);
}
.tm-cr-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: .5rem .75rem;
  background: none; border: none; cursor: pointer;
  text-align: left; font-size: .88rem;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary, #eee);
}
.tm-cr-item:last-child { border-bottom: none; }
.tm-cr-item:hover { background: rgba(255,255,255,.06); }
.tm-cr-city { font-size: .76rem; color: var(--text-secondary); margin-left: .3rem; }

/* Selected executor */
.tm-executor-selected {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .3rem .6rem;
  border-radius: 20px;
  border: 1.5px solid var(--color-accent, #4f8cff);
  background: rgba(79,140,255,.12);
  font-size: .85rem;
  margin-top: .35rem;
}
.tm-executor-name { font-weight: 600; }
.tm-executor-clear {
  background: none; border: none; cursor: pointer;
  color: var(--text-secondary); font-size: .8rem; padding: 0 .1rem;
  line-height: 1;
}
</style>
