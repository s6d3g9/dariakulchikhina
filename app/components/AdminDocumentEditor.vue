<template>
  <div class="de-root">

    <!-- ══ Step selector bar ══ -->
    <div class="de-steps">
      <button v-for="(s, i) in STEPS" :key="i"
        class="de-step" :class="{ 'de-step--active': step === i, 'de-step--done': step > i }"
        @click="goToStep(i)"
      >
        <span class="de-step-num">{{ i + 1 }}</span>
        <span class="de-step-label">{{ s }}</span>
      </button>
    </div>

    <!-- ══ Step 1: Choose template ══ -->
    <div v-if="step === 0" class="de-panel">
      <p class="de-hint">Выберите шаблон документа:</p>
      <div class="de-tpl-grid">
        <button v-for="tpl in templates" :key="tpl.key"
          class="de-tpl-card glass-card"
          :class="{ 'de-tpl-card--active': selectedTpl?.key === tpl.key }"
          @click="selectTemplate(tpl)"
        >
          <span class="de-tpl-icon">{{ tpl.icon }}</span>
          <div class="de-tpl-info">
            <div class="de-tpl-name">{{ tpl.name }}</div>
            <div class="de-tpl-desc">{{ tpl.description }}</div>
          </div>
        </button>
      </div>
      <div class="de-actions">
        <button class="a-btn-sm" @click="$emit('close')">отмена</button>
        <button class="a-btn-save" :disabled="!selectedTpl" @click="step = 1">далее →</button>
      </div>
    </div>

    <!-- ══ Step 2: Pick data sources ══ -->
    <div v-if="step === 1" class="de-panel">
      <p class="de-hint">Подтяните данные из системы:</p>

      <!-- Project picker -->
      <div class="de-source-section">
        <div class="de-source-head">
          <span class="de-source-icon">📁</span>
          <span class="de-source-title">Проект</span>
        </div>
        <select v-model="pickedProjectSlug" class="de-select" @change="loadContext">
          <option value="">— без проекта —</option>
          <option v-for="p in projects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
        </select>
      </div>

      <!-- Client picker -->
      <div class="de-source-section">
        <div class="de-source-head">
          <span class="de-source-icon">👤</span>
          <span class="de-source-title">Клиент</span>
          <span v-if="ctx?.clients?.length" class="de-source-badge">{{ ctx.clients.length }}</span>
        </div>
        <select v-model="pickedClientId" class="de-select" @change="applyClientData">
          <option :value="0">— не выбран —</option>
          <option v-for="c in ctx?.clients || []" :key="c.id" :value="c.id">
            {{ c.name }}{{ c.phone ? ` · ${c.phone}` : '' }}
          </option>
        </select>
        <div v-if="pickedClient" class="de-source-preview">
          <span v-if="pickedClient.phone">📞 {{ pickedClient.phone }}</span>
          <span v-if="pickedClient.email">✉ {{ pickedClient.email }}</span>
          <span v-if="pickedClient.address">📍 {{ pickedClient.address }}</span>
        </div>
      </div>

      <!-- Contractor picker -->
      <div class="de-source-section">
        <div class="de-source-head">
          <span class="de-source-icon">🏗</span>
          <span class="de-source-title">Подрядчик</span>
          <span v-if="ctx?.contractors?.length" class="de-source-badge">{{ ctx.contractors.length }}</span>
        </div>
        <select v-model="pickedContractorId" class="de-select" @change="applyContractorData">
          <option :value="0">— не выбран —</option>
          <option v-for="c in ctx?.contractors || []" :key="c.id" :value="c.id">
            {{ c.name }}{{ c.companyName ? ` (${c.companyName})` : '' }}
          </option>
        </select>
        <div v-if="pickedContractor" class="de-source-preview">
          <span v-if="pickedContractor.companyName">🏢 {{ pickedContractor.companyName }}</span>
          <span v-if="pickedContractor.phone">📞 {{ pickedContractor.phone }}</span>
          <span v-if="pickedContractor.inn">ИНН {{ pickedContractor.inn }}</span>
          <span v-if="pickedContractor.legalAddress">📍 {{ pickedContractor.legalAddress }}</span>
        </div>
      </div>

      <!-- Auto-filled fields -->
      <div class="de-fields-head">Поля документа <span class="de-fields-hint">(заполнены автоматически, можно редактировать)</span></div>
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
        <button class="a-btn-sm" @click="step = 0">← назад</button>
        <button class="a-btn-save" @click="step = 2">редактор →</button>
      </div>
    </div>

    <!-- ══ Step 3: Document editor ══ -->
    <div v-if="step === 2" class="de-panel de-panel--editor">
      <div class="de-editor-toolbar">
        <span class="de-editor-title">{{ selectedTpl?.name }}</span>
        <div class="de-editor-btns">
          <button class="de-tbtn" title="Перезаполнить из данных" @click="regenerateText">⟲ обновить</button>
          <button class="de-tbtn" title="Скачать .txt" @click="downloadTxt">⬇ .txt</button>
          <button class="de-tbtn" title="Скопировать" @click="copyToClipboard">📋 копировать</button>
        </div>
      </div>
      <div class="de-editor-wrap">
        <div
          ref="editorEl"
          class="de-editor"
          contenteditable="true"
          spellcheck="true"
          @input="onEditorInput"
        ></div>
      </div>
      <div v-if="copyMsg" class="de-copy-msg">{{ copyMsg }}</div>
      <div class="de-actions">
        <button class="a-btn-sm" @click="step = 1">← поля</button>
        <button class="a-btn-sm" @click="downloadTxt">⬇ скачать</button>
        <button class="a-btn-save" :disabled="saving" @click="saveDocument">
          {{ saving ? 'сохраняется...' : '✓ сохранить документ' }}
        </button>
      </div>
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
const ctx = ref<any>(null)
const loadingCtx = ref(false)

// ── Computed ──
const pickedClient = computed(() =>
  ctx.value?.clients?.find((c: any) => c.id === pickedClientId.value) || null
)
const pickedContractor = computed(() =>
  ctx.value?.contractors?.find((c: any) => c.id === pickedContractorId.value) || null
)

// ── Template selection ──
function selectTemplate(tpl: typeof props.templates[number]) {
  selectedTpl.value = tpl
  // Init field values
  const vals: Record<string, string> = {}
  const auto: Record<string, boolean> = {}
  for (const f of tpl.fields) {
    vals[f.key] = fieldValues.value[f.key] || ''
    auto[f.key] = false
  }
  // Set today's date for date fields
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
    // Auto-fill project data into fields
    if (ctx.value?.project) {
      applyProjectData()
    }
    // Auto-pick first client if available
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
  }
  applyMap(map)
}

function applyClientData() {
  const c = pickedClient.value
  if (!c || !selectedTpl.value) return
  const map: Record<string, string> = {
    client_name: c.name || '',
    client_address: c.address || '',
  }
  applyMap(map)
}

function applyContractorData() {
  const c = pickedContractor.value
  if (!c || !selectedTpl.value) return
  const companyOrName = c.companyName || c.name || ''
  const map: Record<string, string> = {
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
  }
  applyMap(map)
}

function applyMap(map: Record<string, string>) {
  if (!selectedTpl.value) return
  const fields = selectedTpl.value.fields
  for (const f of fields) {
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
    if (editorEl.value) {
      editorEl.value.innerText = editorContent.value
    }
  })
}

function regenerateText() {
  syncEditorContent()
}

function onEditorInput() {
  if (editorEl.value) {
    editorContent.value = editorEl.value.innerText
  }
}

watch(step, (v) => {
  if (v === 2) syncEditorContent()
})

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
    copyMsg.value = '✗ не удалось скопировать'
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
  } catch (e: any) {
    console.error('Save failed', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Steps ── */
.de-steps {
  display: flex; gap: 4px; margin-bottom: 16px;
}
.de-step {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: none; cursor: pointer;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text); opacity: .45;
  border-radius: var(--chip-radius, 999px);
  font-family: inherit; font-size: var(--ds-text-xs, .74rem);
  transition: all .15s ease;
}
.de-step:hover { opacity: .7; }
.de-step--active {
  opacity: 1;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  color: var(--ds-accent, #6366f1);
}
.de-step--done { opacity: .6; }
.de-step-num {
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .6rem; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.de-step--active .de-step-num {
  background: var(--ds-accent, #6366f1); color: #fff;
}
.de-step--done .de-step-num {
  background: rgba(34, 197, 94, .2); color: #16a34a;
}
.de-step--done .de-step-num::after { content: '✓'; }

/* ── Panel ── */
.de-panel { display: flex; flex-direction: column; gap: 12px; }
.de-panel--editor { gap: 8px; }
.de-hint {
  font-size: var(--ds-text-sm, .82rem); color: var(--glass-text); opacity: .6;
  margin: 0;
}

/* ── Template grid ── */
.de-tpl-grid { display: flex; flex-direction: column; gap: 6px; }
.de-tpl-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; cursor: pointer; border: 1px solid transparent;
  text-align: left; font-family: inherit; color: var(--glass-text);
  transition: all .15s ease;
}
.de-tpl-card:hover { transform: translateY(-1px); }
.de-tpl-card--active {
  border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 8%, transparent) !important;
}
.de-tpl-icon { font-size: 1.4rem; flex-shrink: 0; }
.de-tpl-info { flex: 1; min-width: 0; }
.de-tpl-name { font-size: var(--ds-text-sm, .84rem); font-weight: 500; margin-bottom: 2px; }
.de-tpl-desc { font-size: var(--ds-text-xs, .72rem); opacity: .45; }

/* ── Source sections ── */
.de-source-section {
  padding: 10px 14px; border-radius: var(--card-radius, 10px);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.de-source-head {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.de-source-icon { font-size: 1rem; }
.de-source-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em; opacity: .5;
}
.de-source-badge {
  font-size: .58rem; padding: 0 5px; border-radius: 999px;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  color: var(--ds-accent, #6366f1);
}
.de-select {
  width: 100%; padding: 7px 10px; border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .82rem); font-family: inherit;
  appearance: none; cursor: pointer; outline: none;
}
.de-select:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.de-source-preview {
  display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px;
  font-size: var(--ds-text-xs, .72rem); color: var(--glass-text); opacity: .5;
}

/* ── Fields ── */
.de-fields-head {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .4; margin-top: 4px;
}
.de-fields-hint { font-weight: 400; opacity: .7; text-transform: none; letter-spacing: 0; }
.de-fields-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
@media (max-width: 600px) { .de-fields-grid { grid-template-columns: 1fr; } }
.de-field { display: flex; flex-direction: column; gap: 3px; }
.de-field-label {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--glass-text); opacity: .45; font-weight: 600;
  display: flex; align-items: center; gap: 4px;
}
.de-field-auto {
  color: var(--ds-accent, #6366f1); font-size: .7rem; opacity: 1;
}
.de-field-input {
  border: none; padding: 7px 10px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .82rem); font-family: inherit; outline: none;
  transition: background .15s ease;
}
.de-field-input:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.de-field-input--ta { resize: vertical; min-height: 50px; }

/* ── Editor ── */
.de-editor-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: var(--card-radius, 10px) var(--card-radius, 10px) 0 0;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.de-editor-title {
  font-size: var(--ds-text-sm, .82rem); font-weight: 500; color: var(--glass-text); opacity: .7;
}
.de-editor-btns { display: flex; gap: 4px; }
.de-tbtn {
  border: none; background: none; cursor: pointer;
  font-size: var(--ds-text-xs, .72rem); font-family: inherit;
  color: var(--glass-text); opacity: .4; padding: 4px 8px;
  border-radius: 6px; transition: all .15s ease;
}
.de-tbtn:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }

.de-editor-wrap {
  border: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-top: none;
  border-radius: 0 0 var(--card-radius, 10px) var(--card-radius, 10px);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
  max-height: 420px; overflow-y: auto;
}
.de-editor {
  padding: 16px 20px; min-height: 200px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .76rem); line-height: 1.7;
  color: var(--glass-text); white-space: pre-wrap; outline: none;
}
.de-editor:focus {
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.de-copy-msg {
  font-size: var(--ds-text-xs, .72rem); color: var(--ds-accent, #6366f1);
  text-align: right; padding: 2px 4px;
}

/* ── Actions ── */
.de-actions {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}
</style>
