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

      <!-- ── Contract ─────────────────────────────────────────────── -->
      <div class="ator-section">
        <div class="ator-section-title">договор и ТЗ</div>

        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">номер договора</label>
            <input v-model="form.contract_number" class="glass-input" placeholder="ДОГ-2025-001" @blur="save">
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
            <input v-model="form.contract_parties" class="glass-input" placeholder="ИП Иванова — ООО Заказчик" @blur="save">
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
            <input v-model="form.contract_notes" class="glass-input" @blur="save" />
          </div>
        </div>
      </div>

      <!-- ── Invoice / Advance ───────────────────────────────────── -->
      <div class="ator-section">
        <div class="ator-section-title">инвойс · аванс (этап 1)</div>

        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">сумма инвойса</label>
            <input v-model="form.invoice_amount" class="glass-input" type="text" placeholder="₽ 250 000" @blur="save">
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">% аванса</label>
            <input v-model="form.invoice_advance_pct" class="glass-input" type="text" placeholder="50%" @blur="save">
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
            <input v-model="form.invoice_payment_details" class="glass-input"
              placeholder="счёт, банк, назначение платежа..." @blur="save" />
          </div>
        </div>
      </div>

      <!-- ── ToR Scope ───────────────────────────────────────────── -->
      <div class="ator-section">
        <div class="ator-section-title">содержание ТЗ (Terms of Reference)</div>
        <div class="ass-upload-zone">
          <div class="ass-upload-row">
            <label class="ass-field-label">объём работ</label>
            <input v-model="form.tor_scope" class="glass-input"
              placeholder="что входит в проект: концепция, 3D, РД, авторский надзор..." @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">исключения</label>
            <input v-model="form.tor_exclusions" class="glass-input"
              placeholder="что не входит..." @blur="save" />
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">сроки проектирования</label>
            <input v-model="form.tor_timeline" class="glass-input" placeholder="например: 8 недель от старта" @blur="save">
          </div>
          <div class="ass-upload-row">
            <label class="ass-field-label">формат результата</label>
            <input v-model="form.tor_deliverables" class="glass-input"
              placeholder="PDF, DWG, 3D-файлы, BIM..." @blur="save" />
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
const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({
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

watch(project, (p) => {
  if (p?.profile) {
    const prefixes = ['contract_', 'invoice_', 'payment_', 'tor_']
    Object.entries(p.profile).forEach(([k, v]) => {
      if (prefixes.some(pf => k.startsWith(pf))) form[k] = v as any
    })
  }
}, { immediate: true })

// ── Status choices ────────────────────────────────────────────────
const contractStatuses = [
  { value: 'draft',  label: 'черновик',  color: '#9e9e9e' },
  { value: 'sent',   label: 'отправлен', color: '#2196f3' },
  { value: 'signed', label: 'подписан ✓', color: '#4caf50' },
  { value: 'rejected', label: 'отклонён', color: '#f44336' },
]
const paymentStatuses = [
  { value: 'pending',  label: 'ожидает',   color: '#9e9e9e' },
  { value: 'partial',  label: 'частично',  color: '#ffb300' },
  { value: 'paid',     label: 'оплачен ✓', color: '#4caf50' },
]

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
.ator-loading { font-size: .88rem; color: #999; }

/* Transition banner */
.ator-transition-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 18px; margin-bottom: 24px;
  border: 1px solid #4caf50; background: #f1f8f1;
  flex-wrap: wrap;
}
.ator-banner-text { font-size: .85rem; color: #2e7d32; }
.ator-btn-transition {
  border: 1px solid #2e7d32; background: #2e7d32; color: #fff;
  padding: 8px 18px; font-size: .82rem; cursor: pointer; font-family: inherit;
  white-space: nowrap;
}
.ator-btn-transition:hover { background: #1b5e20; }
.ator-btn-transition:disabled { opacity: .55; cursor: default; }

/* Sections */
.ator-section { margin-bottom: 28px; }
.ator-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #999;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
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
.ator-file-link { font-size: .82rem; color: var(--text, #333); text-decoration: none; }
.ator-file-link:hover { text-decoration: underline; }
.ator-upload-btn {
  border: 1px solid var(--border, #ddd); padding: 5px 12px;
  font-size: .78rem; cursor: pointer; color: var(--text, #555);
}
.ator-upload-btn:hover { border-color: var(--text, #1a1a1a); }
.ator-uploading { font-size: .76rem; color: #999; }

/* Footer */
.ator-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec);
}
.ator-saved { font-size: .76rem; color: #9d9; }
.ator-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
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
