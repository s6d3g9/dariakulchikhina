<template>
  <div class="de-root">

    <!-- ══ Header ══ -->
    <div class="de-head">
      <button class="de-back" @click="handleBack">
        ← {{ step === 0 ? 'к списку' : 'назад' }}
      </button>
      <div class="de-steps">
        <button v-for="(s, i) in STEPS" :key="i"
          class="de-step" :class="{ 'de-step--active': step === i, 'de-step--done': step > i }"
          @click="goToStep(i)"
        >
          <span class="de-step-num">{{ i + 1 }}</span>
          <span class="de-step-label">{{ s }}</span>
        </button>
      </div>
    </div>

    <!-- ══ Step 1: Choose template ══ -->
    <div v-if="step === 0" class="de-panel">
      <div class="de-section-title">Выберите шаблон документа</div>
      <div class="de-tpl-grid">
        <button v-for="tpl in templates" :key="tpl.key"
          class="de-tpl-card glass-card"
          :class="{ 'de-tpl-card--active': selectedTpl?.key === tpl.key }"
          @click="selectTemplate(tpl); step = 1"
        >
          <span class="de-tpl-icon">{{ tpl.icon }}</span>
          <div class="de-tpl-info">
            <div class="de-tpl-name">{{ tpl.name }}</div>
            <div class="de-tpl-desc">{{ tpl.description }}</div>
          </div>
          <span class="de-tpl-arrow">→</span>
        </button>
      </div>
    </div>

    <!-- ══ Step 2: Pick data sources + fields ══ -->
    <div v-if="step === 1" class="de-panel">
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— заполнение данных</span>
      </div>

      <!-- Sources row -->
      <div class="de-sources">
        <div class="de-source">
          <label class="de-source-label">📁 Проект</label>
          <select v-model="pickedProjectSlug" class="de-select" @change="loadContext">
            <option value="">— без проекта —</option>
            <option v-for="p in projects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">
            👤 Клиент
            <span v-if="ctx?.clients?.length" class="de-badge">{{ ctx.clients.length }}</span>
          </label>
          <select v-model="pickedClientId" class="de-select" :disabled="loadingCtx" @change="applyClientData">
            <option :value="0">{{ loadingCtx ? 'загрузка...' : '— не выбран —' }}</option>
            <option v-for="c in ctx?.clients || []" :key="c.id" :value="c.id">
              {{ c.name }}{{ c.phone ? ` · ${c.phone}` : '' }}
            </option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">
            🏗 Подрядчик
            <span v-if="ctx?.contractors?.length" class="de-badge">{{ ctx.contractors.length }}</span>
          </label>
          <select v-model="pickedContractorId" class="de-select" :disabled="loadingCtx" @change="applyContractorData">
            <option :value="0">{{ loadingCtx ? 'загрузка...' : '— не выбран —' }}</option>
            <option v-for="c in ctx?.contractors || []" :key="c.id" :value="c.id">
              {{ c.name }}{{ c.companyName ? ` (${c.companyName})` : '' }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="loadingCtx" class="de-loading-bar">
        <div class="de-loading-fill"></div>
      </div>

      <!-- Entity previews -->
      <div v-if="pickedClient || pickedContractor" class="de-preview-row">
        <div v-if="pickedClient" class="de-preview-chip">
          👤 {{ pickedClient.name }}
          <span v-if="pickedClient.phone"> · {{ pickedClient.phone }}</span>
          <span v-if="pickedClient.email"> · {{ pickedClient.email }}</span>
        </div>
        <div v-if="pickedContractor" class="de-preview-chip">
          🏗 {{ pickedContractor.companyName || pickedContractor.name }}
          <span v-if="pickedContractor.inn"> · ИНН {{ pickedContractor.inn }}</span>
          <span v-if="pickedContractor.phone"> · {{ pickedContractor.phone }}</span>
        </div>
      </div>

      <!-- Fields -->
      <div class="de-fields-divider">
        <span>поля документа</span>
      </div>
      <div class="de-fields-grid">
        <div v-for="field in selectedTpl?.fields || []" :key="field.key" class="de-field">
          <label class="de-field-label">
            {{ field.label }}
            <span v-if="fieldAutoFilled[field.key]" class="de-field-auto" title="заполнено из данных">⚡</span>
          </label>
          <textarea v-if="field.multiline" v-model="fieldValues[field.key]" rows="3" class="de-field-input de-field-input--ta" :placeholder="field.placeholder || ''"></textarea>
          <input v-else v-model="fieldValues[field.key]" class="de-field-input" :placeholder="field.placeholder || ''" />
        </div>
      </div>

      <div class="de-actions">
        <button class="a-btn-sm" @click="step = 0">← шаблоны</button>
        <button class="a-btn-save" @click="step = 2">редактор →</button>
      </div>
    </div>

    <!-- ══ Step 3: Document editor ══ -->
    <div v-if="step === 2" class="de-panel de-panel--editor">
      <div class="de-section-title">
        {{ selectedTpl?.icon }} {{ selectedTpl?.name }}
        <span class="de-section-subtitle">— редактор</span>
      </div>
      <div class="de-editor-toolbar">
        <div class="de-editor-btns">
          <button class="de-tbtn" @click="regenerateText">⟲ обновить</button>
          <button class="de-tbtn" @click="downloadTxt">⬇ .txt</button>
          <button class="de-tbtn" @click="copyToClipboard">📋 копировать</button>
        </div>
        <div v-if="copyMsg" class="de-copy-msg">{{ copyMsg }}</div>
      </div>
      <div class="de-editor-wrap glass-card">
        <div
          ref="editorEl"
          class="de-editor"
          contenteditable="true"
          spellcheck="true"
          @input="onEditorInput"
        ></div>
      </div>
      <div class="de-actions">
        <button class="a-btn-sm" @click="step = 1">← поля</button>
        <button class="a-btn-sm" @click="downloadTxt">⬇ скачать</button>
        <button class="a-btn-save" :disabled="saving" @click="saveDocument">
          {{ saving ? 'сохраняется...' : '✓ сохранить документ' }}
        </button>
      </div>
      <Transition name="de-toast">
        <div v-if="saveMsg" class="de-toast" :class="saveMsgType === 'ok' ? 'de-toast--ok' : 'de-toast--err'">
          {{ saveMsg }}
        </div>
      </Transition>
    </div>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  templates: Array<{
    key: string
    name: string
    icon: string
    description: string
    category: string
    fields: Array<{ key: string; label: string; placeholder?: string; multiline?: boolean }>
    template: string
  }>
  projects: Array<{ slug: string; title: string }>
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const STEPS = ['Шаблон', 'Данные', 'Редактор']

// ── State ──
const step = ref(0)
const selectedTpl = ref<typeof props.templates[number] | null>(null)
const pickedProjectSlug = ref('')
const pickedClientId = ref(0)
const pickedContractorId = ref(0)
const fieldValues = ref<Record<string, string>>({})
const fieldAutoFilled = ref<Record<string, boolean>>({})
const editorContent = ref('')
const editorEl = ref<HTMLDivElement | null>(null)
const saving = ref(false)
const copyMsg = ref('')
const saveMsg = ref('')
const saveMsgType = ref<'ok' | 'err'>('ok')
const ctx = ref<any>(null)
const loadingCtx = ref(false)

// ── Computed ──
const pickedClient = computed(() =>
  ctx.value?.clients?.find((c: any) => c.id === pickedClientId.value) || null
)
const pickedContractor = computed(() =>
  ctx.value?.contractors?.find((c: any) => c.id === pickedContractorId.value) || null
)

// ── Navigation ──
function handleBack() {
  if (step.value > 0) { step.value-- }
  else { emit('close') }
}

// ── Template selection ──
function selectTemplate(tpl: typeof props.templates[number]) {
  selectedTpl.value = tpl
  const vals: Record<string, string> = {}
  const auto: Record<string, boolean> = {}
  for (const f of tpl.fields) {
    vals[f.key] = fieldValues.value[f.key] || ''
    auto[f.key] = false
  }
  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  for (const f of tpl.fields) {
    if ((f.key.includes('date') || f.key === 'date') && !vals[f.key]) {
      vals[f.key] = today
      auto[f.key] = true
    }
  }
  fieldValues.value = vals
  fieldAutoFilled.value = auto
}

function goToStep(i: number) {
  if (i === 0) { step.value = 0; return }
  if (i >= 1 && !selectedTpl.value) return
  if (i === 2) syncEditorContent()
  step.value = i
}

// ── Load context from API ──
async function loadContext() {
  loadingCtx.value = true
  try {
    ctx.value = await $fetch('/api/documents/context', {
      query: { projectSlug: pickedProjectSlug.value || '' },
    })
    if (ctx.value?.project) {
      applyProjectData()
    }
    if (ctx.value?.clients?.length === 1) {
      pickedClientId.value = ctx.value.clients[0].id
      applyClientData()
    }
  } catch (e) {
    console.error('Failed to load context', e)
  } finally {
    loadingCtx.value = false
  }
}

function applyProjectData() {
  if (!ctx.value?.project || !selectedTpl.value) return
  const p = ctx.value.project
  const map: Record<string, string> = {
    object_address: p.objectAddress || '',
    delivery_address: p.objectAddress || '',
    area: p.objectArea || '',
    budget: p.budget || '',
    deadline: p.deadline || '',
    client_name: p.client_name || '',
    client_address: p.objectAddress || '',
    object: `${p.objectType || ''} ${p.objectArea || ''} кв.м, ${p.objectAddress || ''}`.trim(),
    style: p.style || p._profile?.style || '',
    // Passport data from project profile
    client_passport: [p.passport_series, p.passport_number].filter(Boolean).join(' '),
    client_passport_issued: p.passport_issued_by || '',
    client_passport_date: p.passport_issue_date || '',
    client_registration: p.passport_registration_address || '',
    client_inn: p.passport_inn || '',
  }
  applyMap(map)
}

function applyClientData() {
  const c = pickedClient.value
  if (!c || !selectedTpl.value) return
  applyMap({ client_name: c.name || '', client_address: c.address || '' })
}

function applyContractorData() {
  const c = pickedContractor.value
  if (!c || !selectedTpl.value) return
  const companyOrName = c.companyName || c.name || ''
  applyMap({
    contractor_name: companyOrName,
    contractor: companyOrName,
    supplier_name: companyOrName,
    contractor_inn: c.inn || '',
    contractor_address: c.legalAddress || c.factAddress || '',
    contractor_phone: c.phone || '',
    contractor_email: c.email || '',
    contractor_bank: c.bankName || '',
    contractor_bik: c.bik || '',
    contractor_account: c.settlementAccount || '',
  })
}

function applyMap(map: Record<string, string>) {
  if (!selectedTpl.value) return
  for (const f of selectedTpl.value.fields) {
    if (map[f.key] && (!fieldValues.value[f.key] || fieldAutoFilled.value[f.key])) {
      fieldValues.value[f.key] = map[f.key]
      fieldAutoFilled.value[f.key] = true
    }
  }
}

// ── Editor ──
function generateText(): string {
  if (!selectedTpl.value) return ''
  let text = selectedTpl.value.template
  for (const [k, v] of Object.entries(fieldValues.value)) {
    text = text.split(`{{${k}}}`).join(v || `[${k}]`)
  }
  return text
}

function syncEditorContent() {
  editorContent.value = generateText()
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = editorContent.value
  })
}

function regenerateText() { syncEditorContent() }

function onEditorInput() {
  if (editorEl.value) editorContent.value = editorEl.value.innerText
}

watch(step, (v) => { if (v === 2) syncEditorContent() })

// ── Actions ──
function downloadTxt() {
  const text = editorContent.value || generateText()
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${selectedTpl.value?.name || 'document'}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(editorContent.value)
    copyMsg.value = '✓ скопировано'
    setTimeout(() => { copyMsg.value = '' }, 2000)
  } catch {
    copyMsg.value = '✗ ошибка'
    setTimeout(() => { copyMsg.value = '' }, 2000)
  }
}

async function saveDocument() {
  if (!selectedTpl.value) return
  saving.value = true
  try {
    const text = editorContent.value || generateText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const file = new File([blob], `${selectedTpl.value.name}.txt`, { type: 'text/plain' })
    const fd = new FormData()
    fd.append('file', file)
    const { url, filename } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })

    const project = props.projects.find(p => p.slug === pickedProjectSlug.value)
    await $fetch('/api/documents', {
      method: 'POST',
      body: {
        title: selectedTpl.value.name + (project ? ` · ${project.title}` : ''),
        category: selectedTpl.value.category,
        projectSlug: pickedProjectSlug.value || undefined,
        url,
        filename,
        notes: `Создан из шаблона · ${new Date().toLocaleDateString('ru-RU')}` +
          (pickedClient.value ? ` · Клиент: ${pickedClient.value.name}` : '') +
          (pickedContractor.value ? ` · Подрядчик: ${pickedContractor.value.name || pickedContractor.value.companyName}` : ''),
      },
    })

    emit('saved')
    saveMsg.value = '✓ документ сохранён'
    saveMsgType.value = 'ok'
    setTimeout(() => { saveMsg.value = '' }, 3000)
  } catch (e: any) {
    console.error('Save failed', e)
    saveMsg.value = '✗ ошибка сохранения'
    saveMsgType.value = 'err'
    setTimeout(() => { saveMsg.value = '' }, 4000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Header + Steps ── */
.de-head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.de-back {
  background: none; border: none; cursor: pointer;
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5;
  font-family: inherit; padding: 4px 0; transition: opacity .15s;
}
.de-back:hover { opacity: 1; }
.de-steps {
  display: flex; gap: 4px; margin-left: auto;
}
.de-step {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border: none; cursor: pointer;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text); opacity: .4;
  border-radius: var(--chip-radius, 999px);
  font-family: inherit; font-size: var(--ds-text-xs, .7rem);
  transition: all .15s ease;
}
.de-step:hover { opacity: .65; }
.de-step--active {
  opacity: 1;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent);
  color: var(--ds-accent, #6366f1);
}
.de-step--done { opacity: .55; }
.de-step-num {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .55rem; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.de-step--active .de-step-num { background: var(--ds-accent, #6366f1); color: #fff; }
.de-step--done .de-step-num { background: rgba(34, 197, 94, .2); color: #16a34a; }

/* ── Section title ── */
.de-section-title {
  font-size: var(--ds-text-sm, .88rem); font-weight: var(--ds-heading-weight, 600);
  color: var(--glass-text); margin-bottom: 4px;
}
.de-section-subtitle { font-weight: 400; opacity: .4; font-size: .78rem; }

/* ── Panel ── */
.de-panel { display: flex; flex-direction: column; gap: 12px; }
.de-panel--editor { gap: 8px; }

/* ── Template grid ── */
.de-tpl-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 700px) { .de-tpl-grid { grid-template-columns: 1fr; } }
.de-tpl-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; cursor: pointer; border: 1px solid transparent;
  text-align: left; font-family: inherit; color: var(--glass-text);
  transition: all .15s ease;
}
.de-tpl-card:hover { transform: translateY(-1px); }
.de-tpl-card--active {
  border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 8%, transparent) !important;
}
.de-tpl-icon { font-size: 1.3rem; flex-shrink: 0; }
.de-tpl-info { flex: 1; min-width: 0; }
.de-tpl-name { font-size: var(--ds-text-sm, .82rem); font-weight: 500; }
.de-tpl-desc { font-size: var(--ds-text-xs, .68rem); opacity: .4; margin-top: 1px; }
.de-tpl-arrow { opacity: .2; font-size: .9rem; flex-shrink: 0; }

/* ── Sources row ── */
.de-sources {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
}
@media (max-width: 700px) { .de-sources { grid-template-columns: 1fr; } }
.de-source { display: flex; flex-direction: column; gap: 4px; }
.de-source-label {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .45; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-badge {
  font-size: .5rem; padding: 0 4px; border-radius: 999px; line-height: 1.5;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  color: var(--ds-accent, #6366f1); opacity: 1;
}
.de-select {
  width: 100%; padding: 7px 10px; border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .8rem); font-family: inherit;
  appearance: none; cursor: pointer; outline: none;
}
.de-select:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.de-select:disabled { opacity: .4; cursor: not-allowed; }

/* Loading bar */
.de-loading-bar {
  height: 2px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
}
.de-loading-fill {
  height: 100%; width: 30%; border-radius: 2px;
  background: var(--ds-accent, #6366f1);
  animation: de-load-slide 1.2s ease-in-out infinite;
}
@keyframes de-load-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* Preview chips */
.de-preview-row { display: flex; flex-wrap: wrap; gap: 6px; }
.de-preview-chip {
  font-size: var(--ds-text-xs, .7rem); color: var(--glass-text); opacity: .5;
  padding: 3px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

/* ── Fields ── */
.de-fields-divider {
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}
.de-fields-divider::before,
.de-fields-divider::after {
  content: ''; flex: 1; height: 1px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.de-fields-divider span {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .3; font-weight: 600;
}
.de-fields-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 600px) { .de-fields-grid { grid-template-columns: 1fr; } }
.de-field { display: flex; flex-direction: column; gap: 3px; }
.de-field-label {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .4; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-field-auto { color: var(--ds-accent, #6366f1); font-size: .65rem; opacity: 1; }
.de-field-input {
  border: none; padding: 7px 10px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .8rem); font-family: inherit; outline: none;
  transition: background .15s ease;
}
.de-field-input:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.de-field-input--ta { resize: vertical; min-height: 50px; }

/* ── Editor ── */
.de-editor-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.de-editor-btns { display: flex; gap: 2px; }
.de-tbtn {
  border: none; background: none; cursor: pointer;
  font-size: var(--ds-text-xs, .7rem); font-family: inherit;
  color: var(--glass-text); opacity: .35; padding: 4px 8px;
  border-radius: 6px; transition: all .15s ease;
}
.de-tbtn:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.de-copy-msg { font-size: var(--ds-text-xs, .7rem); color: var(--ds-accent, #6366f1); }

.de-editor-wrap {
  padding: 0; overflow: hidden;
  max-height: calc(100vh - 340px); overflow-y: auto;
}
.de-editor {
  padding: 20px 24px; min-height: 250px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .74rem); line-height: 1.75;
  color: var(--glass-text); white-space: pre-wrap; outline: none;
}
.de-editor:focus {
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Actions ── */
.de-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Toast ── */
.de-toast {
  margin-top: 8px; padding: 8px 14px;
  border-radius: var(--card-radius, 10px);
  font-size: var(--ds-text-sm, .8rem); font-weight: 500;
  text-align: center;
}
.de-toast--ok {
  background: rgba(34, 197, 94, .1); color: #16a34a;
  border: 1px solid rgba(34, 197, 94, .2);
}
.de-toast--err {
  background: rgba(220, 38, 38, .1); color: #dc2626;
  border: 1px solid rgba(220, 38, 38, .2);
}
html.dark .de-toast--ok { background: rgba(34, 197, 94, .15); color: #86efac; }
html.dark .de-toast--err { background: rgba(220, 38, 38, .15); color: #fca5a5; }

.de-toast-enter-active, .de-toast-leave-active { transition: all .25s ease; }
.de-toast-enter-from, .de-toast-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
