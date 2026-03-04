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
          <select v-model="pickedProjectSlug" class="u-status-sel" @change="loadContext">
            <option value="">— без проекта —</option>
            <option v-for="p in projects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
          </select>
        </div>
        <div class="de-source">
          <label class="de-source-label">
            👤 Клиент
            <span v-if="ctx?.clients?.length" class="de-badge">{{ ctx.clients.length }}</span>
          </label>
          <select v-model="pickedClientId" class="u-status-sel" :disabled="loadingCtx" @change="applyClientData">
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
          <select v-model="pickedContractorId" class="u-status-sel" :disabled="loadingCtx" @change="applyContractorData">
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
          <textarea v-if="field.multiline" v-model="fieldValues[field.key]" rows="3" class="glass-input u-ta" :placeholder="field.placeholder || ''"></textarea>
          <input v-else v-model="fieldValues[field.key]" class="glass-input" :placeholder="field.placeholder || ''" />
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
          <button class="de-tbtn" @click="printDocument">🖨 PDF</button>
          <button class="de-tbtn" @click="downloadTxt">⬇ .txt</button>
          <button class="de-tbtn" @click="copyToClipboard">📋 копировать</button>
          <span class="de-ai-sep">|</span>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'generate' }" @click="onAiGenerate">
            🤖 сгенерировать
          </button>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'improve' }" @click="onAiImprove">
            ✨ улучшить
          </button>
          <button class="de-tbtn de-tbtn--ai" :disabled="aiLoading" :class="{ 'de-tbtn--ai-active': aiAction === 'review' }" @click="onAiReview">
            📋 проверить
          </button>
          <button v-if="aiLoading" class="de-tbtn de-tbtn--abort" @click="abortAi">
            ✕ стоп
          </button>
          <button class="de-tbtn" :class="{ 'de-tbtn--ai-active': chatVisible }" @click="chatVisible = !chatVisible" title="Показать/скрыть чат с Gemma">
            💬 чат
          </button>
        </div>
        <div v-if="aiProgress" class="de-ai-progress">
          <div class="de-ai-progress-row">
            <span v-if="aiLoading" class="de-ai-dot"></span>
            <span v-else class="de-ai-done-icon">✓</span>
            <span class="de-ai-text">{{ aiProgress }}</span>
            <template v-if="aiLoading">
              <span class="de-ai-sep">·</span>
              <span class="de-ai-elapsed">⏱ {{ aiElapsed }}с</span>
              <template v-if="aiTokenCount > 0">
                <span class="de-ai-sep">·</span>
                <span class="de-ai-chars">{{ aiTokenCount.toLocaleString('ru') }} симв</span>
              </template>
            </template>
          </div>
          <!-- Фазовый блок: пока нет токенов -->
          <div v-if="aiLoading && aiTokenCount === 0" class="de-ai-phase">
            <div class="de-ai-phase-track">
              <div class="de-ai-phase-fill" :style="{ width: aiPrefillPct + '%' }"></div>
              <div class="de-ai-phase-labels">
                <span :class="{ active: aiElapsed >= 0 }">&#x25cf; инит</span>
                <span :class="{ active: aiElapsed >= 5 }">&#x25cf; контекст</span>
                <span :class="{ active: aiElapsed >= 15 }">&#x25cf; обработка</span>
                <span :class="{ active: aiElapsed >= 30 }">&#x25cf; генерация</span>
              </div>
            </div>
            <div v-if="aiPhaseHint" class="de-ai-phase-hint">{{ aiPhaseHint }}</div>
          </div>
        </div>
        <div v-else-if="copyMsg" class="de-copy-msg">{{ copyMsg }}</div>
      </div>
      <!-- AI: прогресс-бар -->
      <div v-if="aiLoading" class="de-ai-bar">
        <div class="de-ai-bar-fill"></div>
      </div>

      <!-- ══ Двухколоночный layout: редактор + чат ══ -->
      <div class="de-editor-body" :class="{ 'de-editor-body--with-chat': chatVisible }">
        <div class="de-editor-col">
      <div class="de-editor-wrap glass-card">
        <div
          ref="editorEl"
          class="de-editor"
          contenteditable="true"
          spellcheck="true"
          @input="onEditorInput"
        ></div>
      </div>
        </div><!-- /de-editor-col -->

        <!-- ══ Чат-панель Gemma ══ -->
        <Transition name="de-chat-slide">
          <div v-if="chatVisible" class="de-chat-panel glass-surface">
            <div class="de-chat-header">
              <div class="de-chat-header-left">
                <span class="de-chat-avatar">🤖</span>
                <div>
                  <div class="de-chat-title">Gemma 3 · 27B</div>
                  <div class="de-chat-subtitle">локальная модель · {{ aiLoading ? 'печатает...' : 'онлайн' }}</div>
                </div>
              </div>
              <button class="de-tbtn" @click="clearChat" title="Очистить историю">🗑</button>
            </div>
            <div ref="chatEl" class="de-chat-messages">
              <div v-if="!chatMessages.length" class="de-chat-empty">
                <div class="de-chat-empty-icon">🤖</div>
                <div class="de-chat-empty-text">Нажми <strong>🤖 сгенерировать</strong>, <strong>✨ улучшить</strong> или <strong>📋 проверить</strong> — я напишу результат сюда в реальном времени.</div>
              </div>
              <div v-for="msg in chatMessages" :key="msg.id" class="de-chat-msg" :class="'de-chat-msg--' + msg.role">
                <div v-if="msg.role === 'user'" class="de-chat-bubble de-chat-bubble--user">
                  <span class="de-chat-action-badge">{{ msg.actionLabel }}</span>
                  <span class="de-chat-time">{{ msg.time }}</span>
                </div>
                <div v-else class="de-chat-bubble de-chat-bubble--gemma">
                  <div class="de-chat-bubble-content">
                    <span v-if="msg.streaming && !msg.text" class="de-chat-typing">
                      <span></span><span></span><span></span>
                    </span>
                    <span v-else class="de-chat-text">{{ msg.text }}</span><span v-if="msg.streaming" class="de-chat-cursor">▌</span>
                  </div>
                  <div class="de-chat-bubble-meta">
                    <span v-if="msg.done" class="de-chat-done">✓ {{ msg.charCount }} симв.</span>
                    <span v-else-if="msg.streaming" class="de-chat-writing">{{ msg.charCount > 0 ? msg.charCount + ' симв.' : '' }}</span>
                    <span class="de-chat-time">{{ msg.time }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div><!-- /de-editor-body -->

      <!-- AI: панель замечаний (review) -->
      <Transition name="de-slide">
        <div v-if="aiReviewNotes.length" class="de-ai-review glass-card">
          <div class="de-ai-review-head">
            <span class="de-ai-review-title">📋 Gemma 27B — анализ документа</span>
            <button class="de-tbtn" @click="clearReview">✕</button>
          </div>
          <div v-for="(note, i) in aiReviewNotes" :key="i" class="de-ai-note" :class="'de-ai-note--' + note.type">
            <span class="de-ai-note-icon">{{ note.type === 'error' ? '⚠️' : '💡' }}</span>
            <span class="de-ai-note-text">{{ note.text }}</span>
          </div>
        </div>
      </Transition>

      <!-- AI: правовые источники (RAG citations) -->
      <Transition name="de-slide">
        <div v-if="aiCitations.length" class="de-citations glass-card">
          <div class="de-citations-head">
            <span class="de-citations-title">⚖️ Правовая база — использованные нормы</span>
            <span class="de-citations-count">{{ aiCitations.length }}</span>
            <button class="de-tbtn" @click="clearCitations">✕</button>
          </div>
          <div v-for="(c, i) in aiCitations" :key="i" class="de-citation-row">
            <div class="de-citation-ref">
              <span class="de-citation-source">{{ c.source_name }}</span>
              <span v-if="c.article_num" class="de-citation-article">ст.&nbsp;{{ c.article_num }}</span>
              <span v-if="c.article_title" class="de-citation-title">{{ c.article_title }}</span>
              <span class="de-citation-sim">{{ Math.round(c.similarity * 100) }}% совпадение</span>
            </div>
            <p class="de-citation-text">{{ c.text }}</p>
          </div>
        </div>
      </Transition>

      <!-- AI: ошибка -->
      <Transition name="de-toast">
        <div v-if="aiError" class="de-toast de-toast--err">✗ {{ aiError }}</div>
      </Transition>

      <div class="de-actions">
        <button class="a-btn-sm" @click="step = 1">← поля</button>
        <button class="a-btn-sm" @click="printDocument">🖨 PDF</button>
        <button class="a-btn-sm" @click="downloadTxt">⬇ .txt</button>
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
    client_phone: p.phone || '',
    client_email: p.email || '',
    object_type: p.objectType || '',
    object: `${p.objectType || ''} ${p.objectArea || ''} кв.м, ${p.objectAddress || ''}`.trim(),
    style: p.style || p._profile?.style || '',
    // Passport data from project profile
    client_passport: [p.passport_series, p.passport_number].filter(Boolean).join(' '),
    client_passport_issued: p.passport_issued_by || '',
    client_passport_date: p.passport_issue_date || '',
    client_registration: p.passport_registration_address || '',
    client_inn: p.passport_inn || '',
    penalty_pct: '0,1%',
  }
  applyMap(map)
}

function applyClientData() {
  const c = pickedClient.value
  if (!c || !selectedTpl.value) return
  applyMap({
    client_name: c.name || '',
    client_address: c.address || '',
    client_phone: c.phone || '',
    client_email: c.email || '',
  })
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
  // Auto-compute derived fields before rendering
  computeDerivedFields()
  let text = selectedTpl.value.template
  for (const [k, v] of Object.entries(fieldValues.value)) {
    text = text.split(`{{${k}}}`).join(v || '__________')
  }
  // Replace any {{remaining}} shorthand
  const rem = computedRemaining.value
  text = text.split('{{remaining_amount}}').join(rem || '__________')
  return text
}

// ── Number → Russian words ──────────────────────────────────────────────────
const ONES  = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']
const TENS  = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто']
const HUND  = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот']
const THOU  = ['','одна','две','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']
const THOUS_SFX = (n: number) => {
  if (n >= 11 && n <= 14) return 'тысяч'
  const r = n % 10
  if (r === 1) return 'тысяча'
  if (r >= 2 && r <= 4) return 'тысячи'
  return 'тысяч'
}
const MILL_SFX = (n: number) => {
  if (n >= 11 && n <= 14) return 'миллионов'
  const r = n % 10
  if (r === 1) return 'миллион'
  if (r >= 2 && r <= 4) return 'миллиона'
  return 'миллионов'
}

function threeDigitsToWords(n: number, fem = false): string {
  if (n === 0) return ''
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10
  if (h) parts.push(HUND[h])
  if (t === 1) {
    parts.push(fem ? THOU[t * 10 + o] : ONES[t * 10 + o])
  } else {
    if (t) parts.push(TENS[t])
    if (o) parts.push(fem ? THOU[o] : ONES[o])
  }
  return parts.join(' ')
}

function numberToWords(n: number): string {
  if (n === 0) return 'ноль'
  const parts: string[] = []
  const mill = Math.floor(n / 1_000_000)
  const thou = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  if (mill) {
    parts.push(threeDigitsToWords(mill, false))
    parts.push(MILL_SFX(mill))
  }
  if (thou) {
    parts.push(threeDigitsToWords(thou, true))
    parts.push(THOUS_SFX(thou))
  }
  if (rest || (!mill && !thou)) {
    parts.push(threeDigitsToWords(rest, false))
  }
  return parts.filter(Boolean).join(' ')
}

// Capitalize first letter
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Parse amount from string like "350 000 руб." or "350000" → number
function parseRuAmount(s: string): number {
  const n = parseInt(s.replace(/\s/g, '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

// Format ISO date YYYY-MM-DD → DD.MM.YYYY
function formatIsoDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]}`
  return s
}

// Computed: remaining = price - advance_amount
const computedRemaining = computed<string>(() => {
  const priceNum = parseRuAmount(fieldValues.value['price'] || '')
  const advAmt   = parseRuAmount(fieldValues.value['advance_amount'] || '')
  if (!priceNum || !advAmt) return ''
  const rem = priceNum - advAmt
  if (rem <= 0) return ''
  return `${rem.toLocaleString('ru-RU')} руб.`
})

// Auto-derive advance_amount and price_words when price/advance changes
function computeDerivedFields() {
  const vals = fieldValues.value
  const priceNum = parseRuAmount(vals['price'] || '')

  // advance_amount: if price + advance% filled and advance_amount empty
  if (priceNum && vals['advance'] && !vals['advance_amount']) {
    const pct = parseFloat(vals['advance'].replace('%', '').replace(',', '.'))
    if (!isNaN(pct) && pct > 0 && pct <= 100) {
      const amt = Math.round(priceNum * pct / 100)
      fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
      fieldAutoFilled.value['advance_amount'] = true
    }
  }

  // price_words: if price filled and price_words empty
  if (priceNum && !vals['price_words']) {
    const words = capitalize(numberToWords(priceNum))
    const kopecks = `00 копеек`
    fieldValues.value['price_words'] = `${words} рублей ${kopecks}`
    fieldAutoFilled.value['price_words'] = true
  }

  // Format ISO dates
  for (const key of ['contract_date', 'client_passport_date', 'act_date', 'date', 'delivery_date']) {
    if (vals[key] && /^\d{4}-\d{2}-\d{2}/.test(vals[key])) {
      fieldValues.value[key] = formatIsoDate(vals[key])
      fieldAutoFilled.value[key] = true
    }
  }
}

// Watch price + advance to auto-fill
watch(
  () => [fieldValues.value['price'], fieldValues.value['advance']],
  ([price, advance]) => {
    if (!price) return
    const priceNum = parseRuAmount(price)
    if (!priceNum) return

    const pct = parseFloat((advance || '').replace('%', '').replace(',', '.'))
    if (!isNaN(pct) && pct > 0 && pct <= 100) {
      const amt = Math.round(priceNum * pct / 100)
      fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
      fieldAutoFilled.value['advance_amount'] = true
    }
    if (!fieldValues.value['price_words']) {
      fieldValues.value['price_words'] = `${capitalize(numberToWords(priceNum))} рублей 00 копеек`
      fieldAutoFilled.value['price_words'] = true
    }
  }
)

function syncEditorContent() {
  editorContent.value = generateText()
  nextTick(() => {
    if (editorEl.value) editorEl.value.innerText = editorContent.value
  })
}

function regenerateText() { syncEditorContent() }

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function buildPaymentTable(vals: Record<string,string>): string {
  const price = vals['price'] || '__________'
  const adv   = vals['advance_amount'] || computedRemaining.value ? (vals['advance_amount'] || '__________') : '__________'
  const rem   = computedRemaining.value || '__________'
  const advPct = vals['advance'] || '50'
  const remPct = vals['advance'] ? String(100 - parseFloat(vals['advance'].replace('%','').replace(',','.')) || 50) : '50'
  return `<table class="pay-table">
<thead><tr><th>№</th><th>Платёж</th><th>Сумма, руб.</th><th>Срок</th></tr></thead>
<tbody>
<tr><td>1</td><td>Аванс (${advPct}%)</td><td>${adv}</td><td>При подписании договора</td></tr>
<tr><td>2</td><td>Доплата (${remPct}%)</td><td>${rem}</td><td>По окончании работ</td></tr>
<tr class="total-row"><td colspan="2"><b>Итого</b></td><td colspan="2"><b>${price}</b></td></tr>
</tbody></table>`
}

function renderLinesToHtml(lines: string[], vals: Record<string,string>): string {
  const out: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) { out.push('<div class="doc-gap"></div>'); continue }

    // All-caps section heading: "1. НАЗВАНИЕ РАЗДЕЛА"
    if (/^\d+(\.\d+)?\.\s+[А-ЯЁA-Z «»"\-–—\/]{4,}$/.test(t)) {
      out.push(`<div class="doc-section">${escHtml(t)}</div>`); continue
    }

    // Sub-point: "2.3. текст"
    if (/^\d+\.\d+\./.test(t)) {
      out.push(`<div class="doc-sub">${escHtml(line)}</div>`); continue
    }

    // Bullet / dash
    if (/^[•–—-]\s/.test(t)) {
      out.push(`<div class="doc-bullet">${escHtml(t)}</div>`); continue
    }

    // Payment schedule marker
    if (/оплат|платёж|стоимость.*работ/i.test(t) && t.includes('{{')) {
      out.push(`<div class="doc-line">${escHtml(t)}</div>`)
      out.push(buildPaymentTable(vals))
      continue
    }

    // Total marker — skip the placeholder line if we inserted the table
    if (t.startsWith('|') || /^\+[-+]+\+$/.test(t)) continue

    out.push(`<div class="doc-line">${escHtml(line)}</div>`)
  }
  return out.join('\n')
}

function printDocument() {
  const rawText = editorContent.value || generateText()
  const title   = selectedTpl.value?.name || 'Документ'
  const lines   = rawText.split('\n')
  const vals    = fieldValues.value

  const bodyHtml = renderLinesToHtml(lines, vals)

  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    @page { size: A4; margin: 20mm 20mm 25mm 30mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    .doc-gap    { height: 6pt; }
    .doc-line   { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; }
    .doc-sub    { text-align: justify; white-space: pre-wrap; margin-bottom: 2pt; padding-left: 18pt; }
    .doc-bullet { padding-left: 18pt; margin-bottom: 2pt; }
    .doc-section {
      font-weight: bold; text-transform: uppercase;
      margin-top: 16pt; margin-bottom: 4pt; text-align: center;
    }
    .pay-table {
      width: 100%; border-collapse: collapse; margin: 10pt 0;
      font-size: 12pt;
    }
    .pay-table th, .pay-table td {
      border: 1px solid #000; padding: 4pt 6pt; text-align: left;
    }
    .pay-table thead th { background: #e8e8e8; font-weight: bold; }
    .pay-table .total-row td { font-weight: bold; background: #f5f5f5; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="doc-body">
${bodyHtml}
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(htmlContent)
    win.document.close()
  }
}

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

// ── AI (Gemma 3 27B) ──────────────────────────────────────────────────────
const { aiLoading, aiError, aiAction, aiProgress, aiElapsed, aiTokenCount, aiReviewNotes, aiCitations, streamDocument, reviewDocument, abortAi, clearReview, clearCitations } = useAiDocument()

// Фазовые подсказки пока нет ни одного токена
const aiPhaseHint = computed(() => {
  if (!aiLoading.value || aiTokenCount.value > 0) return ''
  const s = aiElapsed.value
  if (s < 5)  return 'инициализирует запрос...'
  if (s < 15) return 'загружает контекст в память...'
  if (s < 30) return 'оценивает данные проекта...'
  if (s < 50) return 'формирует структуру документа... обычно 30–60с'
  if (s < 80) return 'работает над деталями... почти готово'
  return 'большой документ — продолжает, не останавливайся'
})

// Прогресс 0–100 до первого токена (базовый эстимейт 90с на prefill)
const aiPrefillPct = computed(() => {
  if (aiTokenCount.value > 0 || !aiLoading.value) return 100
  return Math.min(95, Math.round((aiElapsed.value / 90) * 100))
})

// ── Чат-панель ────────────────────────────────────────────────────────────
interface ChatMsg {
  id: number
  role: 'user' | 'gemma'
  actionLabel: string
  text: string
  streaming: boolean
  done: boolean
  time: string
  charCount: number
}
const chatVisible = ref(true)
const chatMessages = ref<ChatMsg[]>([])
const chatEl = ref<HTMLElement | null>(null)
let _chatIdSeq = 0

function _chatNow() {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function _chatScroll() {
  nextTick(() => { if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight })
}
function _chatPushUser(actionLabel: string) {
  chatMessages.value.push({ id: ++_chatIdSeq, role: 'user', actionLabel, text: '', streaming: false, done: true, time: _chatNow(), charCount: 0 })
  _chatScroll()
}
function _chatPushGemma(): ChatMsg {
  const msg: ChatMsg = { id: ++_chatIdSeq, role: 'gemma', actionLabel: '', text: '', streaming: true, done: false, time: _chatNow(), charCount: 0 }
  chatMessages.value.push(msg)
  _chatScroll()
  return msg
}
function _chatToken(msg: ChatMsg, token: string) {
  msg.text += token
  msg.charCount = msg.text.length
  _chatScroll()
}
function _chatDone(msg: ChatMsg) {
  msg.streaming = false
  msg.done = true
  _chatScroll()
}
function clearChat() {
  chatMessages.value = []
}

function buildAiPayload() {
  return {
    templateKey:    selectedTpl.value?.key      || '',
    templateName:   selectedTpl.value?.name     || '',
    templateText:   selectedTpl.value?.template || '',
    fields:         { ...fieldValues.value },
    currentText:    editorContent.value         || generateText(),
    projectSlug:    pickedProjectSlug.value     || '',
    clientId:       pickedClientId.value        || 0,
    contractorId:   pickedContractorId.value    || 0,
  }
}

async function onAiGenerate() {
  if (!selectedTpl.value) return
  clearReview()
  clearCitations()
  editorContent.value = ''
  if (editorEl.value) editorEl.value.innerText = ''
  chatVisible.value = true
  _chatPushUser('🤖 Сгенерировать документ')
  const chatMsg = _chatPushGemma()
  await streamDocument('generate', buildAiPayload(), (token) => {
    editorContent.value += token
    if (editorEl.value) {
      editorEl.value.innerText = editorContent.value
      editorEl.value.scrollTop = editorEl.value.scrollHeight
    }
    _chatToken(chatMsg, token)
  })
  _chatDone(chatMsg)
}

async function onAiImprove() {
  if (!selectedTpl.value) return
  clearReview()
  clearCitations()
  const originalText = editorContent.value || generateText()
  editorContent.value = ''
  if (editorEl.value) editorEl.value.innerText = ''
  chatVisible.value = true
  _chatPushUser('✨ Улучшить текст')
  const chatMsg = _chatPushGemma()
  const ok = await streamDocument('improve', { ...buildAiPayload(), currentText: originalText }, (token) => {
    editorContent.value += token
    if (editorEl.value) {
      editorEl.value.innerText = editorContent.value
      editorEl.value.scrollTop = editorEl.value.scrollHeight
    }
    _chatToken(chatMsg, token)
  })
  _chatDone(chatMsg)
  if (!ok && !editorContent.value) {
    editorContent.value = originalText
    if (editorEl.value) editorEl.value.innerText = originalText
  }
}

async function onAiReview() {
  if (!selectedTpl.value) return
  chatVisible.value = true
  _chatPushUser('📋 Проверить документ')
  const chatMsg = _chatPushGemma()
  const notes = await reviewDocument(buildAiPayload())
  if (notes) {
    aiReviewNotes.value = notes
    chatMsg.text = notes.map(n => `${n.type === 'error' ? '⚠️' : '💡'} ${n.text}`).join('\n')
    chatMsg.charCount = chatMsg.text.length
  } else {
    chatMsg.text = 'Анализ завершён. Замечаний нет.'
    chatMsg.charCount = chatMsg.text.length
  }
  _chatDone(chatMsg)
}

// ── Сохранение ────────────────────────────────────────────────────────────
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

/* ── Editor body: двухколоночный layout ── */
.de-editor-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.de-editor-col {
  flex: 1;
  min-width: 0;
}

/* ── Чат-панель ── */
.de-chat-panel {
  width: 320px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  max-height: 520px;
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.de-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--glass-border);
  gap: 8px;
}
.de-chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.de-chat-avatar {
  font-size: 1.4rem;
  line-height: 1;
}
.de-chat-title {
  font-size: .82rem;
  font-weight: 600;
  color: var(--glass-text);
}
.de-chat-subtitle {
  font-size: .7rem;
  opacity: .45;
}
.de-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
}
.de-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 12px;
  text-align: center;
  opacity: .45;
}
.de-chat-empty-icon { font-size: 2rem; }
.de-chat-empty-text { font-size: .78rem; line-height: 1.5; }
.de-chat-msg { display: flex; flex-direction: column; }
.de-chat-msg--user { align-items: flex-end; }
.de-chat-msg--gemma { align-items: flex-start; }
.de-chat-bubble {
  max-width: 90%;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: .78rem;
  line-height: 1.5;
}
.de-chat-bubble--user {
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 25%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}
.de-chat-action-badge {
  font-weight: 600;
  font-size: .76rem;
  color: var(--ds-accent, #6366f1);
}
.de-chat-bubble--gemma {
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  border: 1px solid var(--glass-border);
  width: 100%;
}
.de-chat-bubble-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--glass-text);
  font-size: .76rem;
  line-height: 1.55;
  max-height: 340px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.de-chat-bubble-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid var(--glass-border);
  gap: 6px;
}
.de-chat-time { font-size: .65rem; opacity: .35; white-space: nowrap; }
.de-chat-done { font-size: .65rem; color: #34d399; }
.de-chat-writing { font-size: .65rem; opacity: .5; }
.de-chat-text { display: inline; }
.de-chat-cursor {
  display: inline-block;
  color: var(--ds-accent, #6366f1);
  opacity: .8;
  animation: de-blink .7s step-end infinite;
  margin-left: 1px;
}
@keyframes de-blink { 0%,100%{opacity:.8} 50%{opacity:0} }
/* Анимация «печатает» три точки */
.de-chat-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 2px;
}
.de-chat-typing span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ds-accent, #6366f1);
  opacity: .5;
  animation: de-typing 1.2s ease-in-out infinite;
}
.de-chat-typing span:nth-child(2) { animation-delay: .2s; }
.de-chat-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes de-typing { 0%,80%,100%{transform:scale(1);opacity:.35} 40%{transform:scale(1.3);opacity:1} }

/* Анимация появления чата */
.de-chat-slide-enter-active, .de-chat-slide-leave-active {
  transition: all .25s ease;
}
.de-chat-slide-enter-from, .de-chat-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
  width: 0;
}

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
.de-editor-btns { display: flex; gap: 2px; }
.de-tbtn {
  border: none; background: none; cursor: pointer;
  font-size: var(--ds-text-xs, .7rem); font-family: inherit;
  color: var(--glass-text); opacity: .35; padding: 4px 8px;
  border-radius: 6px; transition: all .15s ease;
}
.de-tbtn:hover { opacity: .8; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.de-copy-msg { font-size: var(--ds-text-xs, .7rem); color: var(--ds-accent, #6366f1); }

/* ── AI кнопки ── */
.de-ai-sep {
  color: var(--glass-text); opacity: .15; margin: 0 4px; font-size: .8rem; user-select: none;
}
.de-tbtn--ai {
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 80%, var(--glass-text));
  opacity: .55;
}
.de-tbtn--ai:hover:not(:disabled) { opacity: 1; }
.de-tbtn--ai-active {
  opacity: 1 !important;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 12%, transparent) !important;
  animation: de-ai-pulse 1.2s ease-in-out infinite;
}
.de-tbtn--ai:disabled { cursor: not-allowed; opacity: .25; }
@keyframes de-ai-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

/* ── AI кнопка стоп ── */
.de-tbtn--abort {
  color: #f87171;
  opacity: .85;
  border: 1px solid rgba(248,113,113,.3);
}
.de-tbtn--abort:hover { opacity: 1; background: rgba(248,113,113,.12) !important; }

/* ── AI строка прогресса ── */
.de-ai-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: .75rem;
  color: color-mix(in srgb, var(--ds-accent, #6366f1) 70%, var(--glass-text));
  padding: 3px 4px 2px;
}
.de-ai-progress-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.de-ai-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ds-accent, #6366f1);
  animation: de-dot-pulse 1s ease-in-out infinite;
  flex-shrink: 0;
}
.de-ai-done-icon {
  font-size: .7rem;
  color: #22c55e;
  font-weight: 700;
  flex-shrink: 0;
}
.de-ai-text { font-weight: 500; }
.de-ai-sep  { opacity: .35; flex-shrink: 0; }
.de-ai-elapsed { font-variant-numeric: tabular-nums; opacity: .75; }
.de-ai-chars   { font-variant-numeric: tabular-nums; opacity: .75; }
/* ── фазовый блок ── */
.de-ai-phase {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.de-ai-phase-track {
  position: relative;
  height: 18px;
}
.de-ai-phase-fill {
  position: absolute;
  top: 6px; left: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--ds-accent, #6366f1);
  transition: width 1s linear;
  opacity: .6;
}
.de-ai-phase-labels {
  position: relative;
  display: flex;
  justify-content: space-between;
  font-size: .63rem;
  opacity: .4;
  pointer-events: none;
  padding-top: 1px;
}
.de-ai-phase-labels span {
  transition: opacity .4s, color .4s;
}
.de-ai-phase-labels span.active {
  opacity: 1;
  color: var(--ds-accent, #6366f1);
}
.de-ai-phase-hint {
  font-size: .7rem;
  font-style: italic;
  opacity: .6;
  padding-left: 12px;
  animation: de-hint-fade 0.5s ease;
}
@keyframes de-hint-fade {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: .6; transform: translateY(0); }
}
@keyframes de-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: .5; }
}

/* ── AI загрузочная полоса ── */
.de-ai-bar {
  height: 2px;
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 15%, transparent);
  overflow: hidden;
  border-radius: 1px;
}
.de-ai-bar-fill {
  height: 100%;
  width: 40%;
  background: var(--ds-accent, #6366f1);
  border-radius: 1px;
  animation: de-bar-slide 1.4s ease-in-out infinite;
}
@keyframes de-bar-slide {
  0% { transform: translateX(-150%); }
  100% { transform: translateX(350%); }
}

/* ── AI панель замечаний ── */
.de-ai-review {
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, #6366f1) 20%, transparent);
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 4%, transparent) !important;
}
.de-ai-review-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.de-ai-review-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600;
  color: var(--ds-accent, #6366f1); text-transform: uppercase; letter-spacing: .05em;
}
.de-ai-note {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 5px 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
  font-size: var(--ds-text-xs, .72rem);
}
.de-ai-note--error .de-ai-note-text { color: var(--ds-error, #dc2626); }
.de-ai-note--info  .de-ai-note-text { color: var(--glass-text); opacity: .75; }
.de-ai-note-icon { flex-shrink: 0; }
.de-ai-note-text  { line-height: 1.5; }

/* ── Правовые цитаты (RAG) ── */
.de-citations {
  padding: 12px 14px; margin-top: 8px;
  border: 1px solid rgba(22, 163, 74, .2);
  background: rgba(22, 163, 74, .04) !important;
}
.de-citations-head {
  display: flex; align-items: center; gap: 8px; justify-content: space-between;
  margin-bottom: 10px;
}
.de-citations-title {
  font-size: var(--ds-text-xs, .72rem); font-weight: 600; color: #16a34a;
  text-transform: uppercase; letter-spacing: .05em;
}
.de-citations-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 999px;
  background: rgba(22, 163, 74, .15); color: #16a34a;
  font-size: .62rem; font-weight: 700;
  margin-right: auto;
}
html.dark .de-citations { border-color: rgba(134, 239, 172, .15); background: rgba(22, 163, 74, .07) !important; }
html.dark .de-citations-title { color: #86efac; }
html.dark .de-citations-count { background: rgba(134, 239, 172, .15); color: #86efac; }
.de-citation-row {
  padding: 7px 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.de-citation-ref {
  display: flex; flex-wrap: wrap; gap: 5px; align-items: baseline;
  margin-bottom: 3px;
}
.de-citation-source {
  font-size: .65rem; font-weight: 600; color: var(--glass-text); opacity: .7;
}
.de-citation-article {
  font-size: .65rem; font-weight: 700;
  color: #16a34a; background: rgba(22, 163, 74, .1);
  padding: 1px 5px; border-radius: 3px;
}
html.dark .de-citation-article { color: #86efac; background: rgba(134, 239, 172, .1); }
.de-citation-title {
  font-size: .65rem; color: var(--glass-text); opacity: .6;
}
.de-citation-sim {
  font-size: .58rem; color: var(--glass-text); opacity: .4; margin-left: auto;
}
.de-citation-text {
  font-size: .68rem; line-height: 1.55; color: var(--glass-text); opacity: .7;
  margin: 0;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}

/* transitions */
.de-slide-enter-active, .de-slide-leave-active { transition: all .25s ease; }
.de-slide-enter-from, .de-slide-leave-to { opacity: 0; transform: translateY(-8px); }

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
  background: color-mix(in srgb, var(--ds-error, #dc2626) 10%, transparent); color: var(--ds-error, #dc2626);
  border: 1px solid rgba(220, 38, 38, .2);
}
html.dark .de-toast--ok { background: rgba(34, 197, 94, .15); color: #86efac; }
html.dark .de-toast--err { background: rgba(220, 38, 38, .15); color: #fca5a5; }

.de-toast-enter-active, .de-toast-leave-active { transition: all .25s ease; }
.de-toast-enter-from, .de-toast-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
