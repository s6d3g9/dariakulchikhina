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

<style scoped src="./AdminToRContract.scoped.css"></style>
