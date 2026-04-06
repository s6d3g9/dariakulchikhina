<template>
  <div class="ator-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Phase transition banner -->
      <div v-if="canTransition" class="ator-transition-banner">
        <div class="ator-banner-text">
          <strong>Договор подписан, аванс получен.</strong>
          Фазу можно переводить в «Эскиз».
        </div>
        <button class="ator-btn-transition" @click="moveToConceptPhase" :disabled="transitioning">
          {{ transitioning ? '...' : 'Перевести в фазу → Эскиз' }}
        </button>
      </div>

      <!-- ── Tariff selector ──────────────────────────────────────── -->
      <div class="ator-section" :class="{ 'ator-section--expanded': isSectionExpanded('tariff') }">
        <div class="ator-section-head">
          <button type="button" class="ator-section-toggle" :aria-expanded="isSectionExpanded('tariff') ? 'true' : 'false'" @click="toggleSection('tariff')">
            <span class="ator-section-title">тариф дизайнера</span>
            <span class="ator-section-chevron" :class="{ 'ator-section-chevron--expanded': isSectionExpanded('tariff') }">⌄</span>
          </button>
        </div>

        <div v-show="isSectionExpanded('tariff')" class="ator-section-panel">

        <!-- Client tariff request alert -->
        <div v-if="pendingTariffRequest" class="ator-tariff-req-alert">
          <div class="ator-tariff-req-alert-text">
            <span class="ator-tariff-req-dot"></span>
            клиент запросил смену тарифа на <strong :style="`color:${pendingTariffRequest.color}`">{{ pendingTariffRequest.label }}</strong>
            <span class="ator-tariff-req-price">{{ pendingTariffRequest.priceHint }}</span>
          </div>
          <div class="ator-tariff-req-alert-actions">
            <button class="ator-tariff-req-accept" :disabled="reqActing" @click="acceptTariffRequest">принять</button>
            <button class="ator-tariff-req-reject" :disabled="reqActing" @click="rejectTariffRequest">отклонить</button>
          </div>
        </div>

        <div class="ator-tariff-grid">
          <button
            v-for="t in DESIGNER_TARIFFS"
            :key="t.key"
            type="button"
            class="ator-tariff-card"
            :class="{ 'ator-tariff-card--selected': form.service_tariff === t.key }"
            :style="`--tariff-color: ${t.color}`"
            @click="pickTariff(t.key)"
          >
            <div class="ator-tariff-top">
              <span class="ator-tariff-name">{{ t.label }}</span>
              <span class="ator-tariff-check" v-if="form.service_tariff === t.key">✓</span>
              <span class="ator-tariff-price">{{ t.priceHint }}</span>
            </div>
            <p class="ator-tariff-desc">{{ t.description }}</p>
            <div class="ator-tariff-services">
              <span v-for="s in t.services" :key="s" class="ator-tariff-chip">
                {{ serviceLabelMap[s] || s }}
              </span>
            </div>
          </button>
        </div>
      </div>
      </div>

      <!-- ── Contract ─────────────────────────────────────────────── -->
      <div class="ator-section" :class="{ 'ator-section--expanded': isSectionExpanded('contract') }">
        <div class="ator-section-head">
          <button type="button" class="ator-section-toggle" :aria-expanded="isSectionExpanded('contract') ? 'true' : 'false'" @click="toggleSection('contract')">
            <span class="ator-section-title">договор и ТЗ</span>
            <span class="ator-section-chevron" :class="{ 'ator-section-chevron--expanded': isSectionExpanded('contract') }">⌄</span>
          </button>
        </div>

        <div v-show="isSectionExpanded('contract')" class="ator-section-panel">

        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">номер договора</label>
            <GlassInput v-model="form.contract_number"  placeholder="ДОГ-2025-001" @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">дата договора</label>
            <AppDatePicker v-model="form.contract_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">статус</label>
            <div class="ator-status-wrap">
              <div class="ator-status-flow">
                <button
                  v-for="s in contractStatuses"
                  :key="s.value"
                  class="ator-status-btn"
                  :class="{ 'ator-status-btn--active': form.contract_status === s.value }"
                  :style="form.contract_status === s.value ? `--accent:${s.color}` : ''"
                  @click="setContractStatus(s.value)"
                >{{ s.label }}</button>
              </div>
            </div>
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">стороны договора</label>
            <GlassInput v-model="form.contract_parties"  placeholder="ИП Иванова — ООО Заказчик" @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">файл договора</label>
            <div class="ator-file-row">
              <a v-if="form.contract_file" :href="form.contract_file" target="_blank" class="ator-file-link">
                📄 {{ form.contract_filename || 'открыть' }}
              </a>
              <label class="ator-upload-btn">
                {{ form.contract_file ? 'заменить' : '📎 загрузить PDF' }}
                <input type="file" accept=".pdf,.docx" style="display:none" @change="onContractFileChange">
              </label>
              <span v-if="uploading === 'contract'" class="ator-uploading">загрузка...</span>
            </div>
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">примечания</label>
            <GlassInput v-model="form.contract_notes"  @blur="save" />
          </div>
        </div>
        </div>
      </div>

      <!-- ── Invoice / Advance ───────────────────────────────────── -->
      <div class="ator-section" :class="{ 'ator-section--expanded': isSectionExpanded('invoice') }">
        <div class="ator-section-head">
          <button type="button" class="ator-section-toggle" :aria-expanded="isSectionExpanded('invoice') ? 'true' : 'false'" @click="toggleSection('invoice')">
            <span class="ator-section-title">инвойс · аванс (этап 1)</span>
            <span class="ator-section-chevron" :class="{ 'ator-section-chevron--expanded': isSectionExpanded('invoice') }">⌄</span>
          </button>
        </div>

        <div v-show="isSectionExpanded('invoice')" class="ator-section-panel">

        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">сумма инвойса</label>
            <GlassInput v-model="form.invoice_amount"  type="text" placeholder="₽ 250 000" @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">% аванса</label>
            <GlassInput v-model="form.invoice_advance_pct"  type="text" placeholder="50%" @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">дата выставления</label>
            <AppDatePicker v-model="form.invoice_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">статус оплаты</label>
            <div class="ator-status-flow">
              <button
                v-for="s in paymentStatuses"
                :key="s.value"
                class="ator-status-btn"
                :class="{ 'ator-status-btn--active': form.payment_status === s.value }"
                :style="form.payment_status === s.value ? `--accent:${s.color}` : ''"
                @click="setPaymentStatus(s.value)"
              >{{ s.label }}</button>
            </div>
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">файл инвойса</label>
            <div class="ator-file-row">
              <a v-if="form.invoice_file" :href="form.invoice_file" target="_blank" class="ator-file-link">
                📄 {{ form.invoice_filename || 'открыть' }}
              </a>
              <label class="ator-upload-btn">
                {{ form.invoice_file ? 'заменить' : '📎 загрузить PDF' }}
                <input type="file" accept=".pdf" style="display:none" @change="onInvoiceFileChange">
              </label>
              <span v-if="uploading === 'invoice'" class="ator-uploading">загрузка...</span>
            </div>
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">реквизиты оплаты</label>
            <GlassInput v-model="form.invoice_payment_details" 
              placeholder="счёт, банк, назначение платежа..." @blur="save" />
          </div>
        </div>
        </div>
      </div>

      <!-- ── ToR Scope ───────────────────────────────────────────── -->
      <div class="ator-section" :class="{ 'ator-section--expanded': isSectionExpanded('scope') }">
        <div class="ator-section-head">
          <button type="button" class="ator-section-toggle" :aria-expanded="isSectionExpanded('scope') ? 'true' : 'false'" @click="toggleSection('scope')">
            <span class="ator-section-title">содержание ТЗ (Terms of Reference)</span>
            <span class="ator-section-chevron" :class="{ 'ator-section-chevron--expanded': isSectionExpanded('scope') }">⌄</span>
          </button>
        </div>

        <div v-show="isSectionExpanded('scope')" class="ator-section-panel">
        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">объём работ</label>
            <GlassInput v-model="form.tor_scope" 
              placeholder="что входит в проект: концепция, 3D, РД, авторский надзор..." @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">исключения</label>
            <GlassInput v-model="form.tor_exclusions" 
              placeholder="что не входит..." @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">сроки проектирования</label>
            <GlassInput v-model="form.tor_timeline"  placeholder="например: 8 недель от старта" @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">формат результата</label>
            <GlassInput v-model="form.tor_deliverables" 
              placeholder="PDF, DWG, 3D-файлы, BIM..." @blur="save" />
          </div>
        </div>
        </div>
      </div>

      <div class="ator-footer">
        <span v-if="savedAt" class="ator-saved">✓ {{ savedAt }}</span>
        <button class="ator-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { CONTRACT_STATUSES, PAYMENT_STATUSES } from '~~/shared/utils/status-maps'
import { DESIGNER_TARIFFS, DESIGNER_SERVICE_TYPE_OPTIONS } from '~~/shared/types/catalogs'

// template aliases
const contractStatuses = CONTRACT_STATUSES
const paymentStatuses  = PAYMENT_STATUSES

const serviceLabelMap = Object.fromEntries(DESIGNER_SERVICE_TYPE_OPTIONS.map(o => [o.value, o.label]))
const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({
  service_tariff: '',
  contract_number: '',
  contract_date: '',
  contract_status: 'draft',
  contract_parties: '',
  contract_file: '',
  contract_filename: '',
  contract_notes: '',
  invoice_amount: '',
  invoice_advance_pct: '',
  invoice_date: '',
  payment_status: 'pending',
  invoice_file: '',
  invoice_filename: '',
  invoice_payment_details: '',
  tor_scope: '',
  tor_exclusions: '',
  tor_timeline: '',
  tor_deliverables: '',
})

type ToRAccordionSectionKey = 'tariff' | 'contract' | 'invoice' | 'scope'

const expandedSectionKey = ref<ToRAccordionSectionKey | null>('tariff')

function isSectionExpanded(sectionKey: ToRAccordionSectionKey) {
  return expandedSectionKey.value === sectionKey
}

function toggleSection(sectionKey: ToRAccordionSectionKey) {
  expandedSectionKey.value = expandedSectionKey.value === sectionKey ? null : sectionKey
}

watch(project, (p) => {
  if (p?.profile) {
    const prefixes = ['contract_', 'invoice_', 'payment_', 'tor_', 'service_']
    Object.entries(p.profile).forEach(([k, v]) => {
      if (prefixes.some(pf => k.startsWith(pf))) form[k] = v as any
    })
  }
}, { immediate: true })

function pickTariff(key: string) {
  form.service_tariff = form.service_tariff === key ? '' : key
  save()
}

// ── Client tariff request ────────────────────────────────────────────────
const reqActing = ref(false)

const pendingTariffRequest = computed(() => {
  const req = project.value?.profile?.service_tariff_request
  if (!req || req === form.service_tariff) return null
  return DESIGNER_TARIFFS.find(t => t.key === req) || null
})

async function acceptTariffRequest() {
  const req = project.value?.profile?.service_tariff_request
  if (!req) return
  reqActing.value = true
  try {
    form.service_tariff = req
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, service_tariff: req, service_tariff_request: '' } }
    })
    await refresh()
    markSaved()
  } finally { reqActing.value = false }
}

async function rejectTariffRequest() {
  reqActing.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, service_tariff_request: '' } }
    })
    await refresh()
  } finally { reqActing.value = false }
}

// ── Status choices ────────────────────────────────────────────────
function setContractStatus(v: string) { form.contract_status = v; save() }
function setPaymentStatus(v: string)  { form.payment_status = v; save() }

// ── Phase transition check ────────────────────────────────────────
const canTransition = computed(() =>
  form.contract_status === 'signed' && form.payment_status !== 'pending'
)

const transitioning = ref(false)
async function moveToConceptPhase() {
  transitioning.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { status: 'concept' }
    })
    refresh()
  } finally {
    transitioning.value = false
  }
}

// ── File uploads ──────────────────────────────────────────────────
const uploading = ref<string | null>(null)

async function uploadDoc(e: Event, target: 'contract' | 'invoice') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = target
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res: any = await $fetch('/api/upload', { method: 'POST', body: fd })
    form[`${target}_file`] = res.url
    form[`${target}_filename`] = file.name
    save()
  } finally {
    uploading.value = null
  }
}

function onContractFileChange(e: Event) {
  uploadDoc(e, 'contract')
}

function onInvoiceFileChange(e: Event) {
  uploadDoc(e, 'invoice')
}

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form } }
    })
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ator-wrap { padding: 4px 0 48px; }
.ator-loading { font-size: .88rem; color: var(--ds-muted, color-mix(in srgb, var(--glass-text) 60%, transparent)); }

/* ── Client tariff request alert ── */
.ator-tariff-req-alert {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; margin-bottom: 14px;
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 40%, transparent);
  border-radius: 6px; font-size: .8rem;
}
.ator-tariff-req-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 999px;
  background: var(--ds-warning); margin-right: 6px; vertical-align: middle;
  animation: ator-req-pulse 1.6s ease-in-out infinite;
}
@keyframes ator-req-pulse {
  0%, 100% { opacity: 1; } 50% { opacity: .35; }
}
.ator-tariff-req-price {
  margin-left: 6px; font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent);
}
.ator-tariff-req-alert-text { flex: 1; }
.ator-tariff-req-alert-actions { display: flex; gap: 8px; }
.ator-tariff-req-accept {
  background: var(--ds-success); color: #fff;
  border: none; padding: 5px 14px; font-size: .76rem;
  cursor: pointer; font-family: inherit; border-radius: 4px;
}
.ator-tariff-req-accept:hover:not(:disabled) { background: var(--ds-success); }
.ator-tariff-req-reject {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--glass-text) 25%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  padding: 5px 14px; font-size: .76rem;
  cursor: pointer; font-family: inherit; border-radius: 4px;
}
.ator-tariff-req-reject:hover:not(:disabled) { border-color: var(--glass-text); color: var(--glass-text); }
.ator-tariff-req-accept:disabled,
.ator-tariff-req-reject:disabled { opacity: .5; cursor: default; }

/* ── Tariff selector ── */
.ator-tariff-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ator-tariff-card {
  --tariff-color: #78909c;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border: 1.5px solid color-mix(in srgb, var(--tariff-color) 30%, var(--border, #e5e5e5));
  background: color-mix(in srgb, var(--tariff-color) 4%, transparent);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--glass-text);
  border-radius: 2px;
  transition: border-color .15s, background .15s;
}
.ator-tariff-card:hover {
  border-color: color-mix(in srgb, var(--tariff-color) 60%, transparent);
  background: color-mix(in srgb, var(--tariff-color) 8%, transparent);
}
.ator-tariff-card--selected {
  border-color: var(--tariff-color);
  background: color-mix(in srgb, var(--tariff-color) 10%, transparent);
}
.ator-tariff-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.ator-tariff-name {
  font-size: .88rem;
  font-weight: 600;
  color: var(--tariff-color);
}
.ator-tariff-check {
  font-size: .8rem;
  color: var(--tariff-color);
  font-weight: 700;
}
.ator-tariff-price {
  margin-left: auto;
  font-size: .7rem;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  white-space: nowrap;
}
.ator-tariff-desc {
  font-size: .76rem;
  color: color-mix(in srgb, var(--glass-text) 65%, transparent);
  margin: 0;
  line-height: 1.45;
}
.ator-tariff-services {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.ator-tariff-chip {
  font-size: .62rem;
  padding: 2px 7px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--tariff-color) 12%, transparent);
  color: color-mix(in srgb, var(--tariff-color) 85%, var(--glass-text));
  white-space: nowrap;
}
@media (max-width: 620px) {
  .ator-tariff-grid { grid-template-columns: 1fr; }
}

/* Transition banner */
.ator-transition-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 18px; margin-bottom: 24px;
  border: 1px solid color-mix(in srgb, var(--ds-success, var(--ds-success)) 50%, transparent); background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 6%, transparent);
  flex-wrap: wrap;
}
.ator-banner-text { font-size: .85rem; color: var(--ds-success, var(--ds-success)); }
.ator-btn-transition {
  border: 1px solid var(--ds-success, var(--ds-success)); background: var(--ds-success, var(--ds-success)); color: #fff;
  padding: 8px 18px; font-size: .82rem; cursor: pointer; font-family: inherit;
  white-space: nowrap;
}
.ator-btn-transition:hover { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 80%, #000); }
.ator-btn-transition:disabled { opacity: .55; cursor: default; }

/* Sections */
.ator-section {
  margin-bottom: 18px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 92%, transparent);
  overflow: hidden;
}
.ator-section-head {
  display: flex;
  align-items: stretch;
}
.ator-section--expanded .ator-section-head {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.ator-section-toggle {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.ator-section-toggle:hover {
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.ator-section-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ds-muted, color-mix(in srgb, var(--glass-text) 60%, transparent));
}
.ator-section-chevron {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
  transition: transform .18s ease, color .18s ease;
}
.ator-section-chevron--expanded {
  transform: rotate(180deg);
  color: var(--glass-text);
}
.ator-section-panel {
  padding: 16px 18px 18px;
}

.ator-section-panel .ass-upload-zone {
  gap: 12px;
}

.ator-section-panel .ass-upload-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.ator-section-panel .ass-field-label {
  min-width: 0;
}

.ator-section-panel :deep(.glass-field),
.ator-section-panel :deep(.glass-input),
.ator-section-panel :deep(.dp-wrap) {
  width: 100%;
}

.ator-section-panel .ator-status-wrap,
.ator-section-panel .ator-file-row {
  width: 100%;
}

/* Rows */

/* Status flow */
.ator-status-wrap { padding: 4px 0; }
.ator-status-flow { display: flex; flex-wrap: wrap; gap: 6px; }
.ator-status-btn {
  --accent: #bdbdbd;
  border: 1px solid var(--accent); color: var(--accent);
  background: transparent; padding: 4px 12px; font-size: .78rem;
  cursor: pointer; font-family: inherit; border-radius: 2px;
}
.ator-status-btn:hover { opacity: .8; }
.ator-status-btn--active {
  background: var(--accent); color: #fff;
}

/* File row */
.ator-file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 4px 0; }
.ator-file-link { font-size: .82rem; color: var(--text, color-mix(in srgb, var(--glass-text) 20%, transparent)); text-decoration: none; }
.ator-file-link:hover { text-decoration: underline; }
.ator-upload-btn {
  border: 1px solid var(--border, color-mix(in srgb, var(--glass-text) 87%, transparent)); padding: 5px 12px;
  font-size: .78rem; cursor: pointer; color: var(--text, color-mix(in srgb, var(--glass-text) 35%, transparent));
}
.ator-upload-btn:hover { border-color: var(--text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }
.ator-uploading { font-size: .76rem; color: var(--ds-muted, color-mix(in srgb, var(--glass-text) 60%, transparent)); }

/* Footer */
.ator-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec);
}
.ator-saved { font-size: .76rem; color: var(--ds-success, #99dd99); }
.ator-btn-save {
  border: 1px solid var(--text, color-mix(in srgb, var(--glass-text) 10%, transparent)); background: var(--text, color-mix(in srgb, var(--glass-text) 10%, transparent));
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.ator-btn-save:disabled { opacity: .55; cursor: default; }
.ator-btn-save:hover:not(:disabled) { opacity: .85; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .ator-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .ator-btn-save { width: 100%; text-align: center; }
}
</style>
