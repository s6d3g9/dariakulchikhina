<template>
  <div class="cct-root glass-card">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>

    <template v-else-if="project">

      <!-- ── Тариф ── -->
      <div class="cct-tariff-section">
        <div class="cct-section-title">
          тариф
          <span v-if="pendingRequest" class="cct-tariff-pending-badge">запрос отправлен ↗</span>
        </div>

        <!-- Pending request banner -->
        <div v-if="pendingRequest" class="cct-tariff-pending">
          <div class="cct-tariff-pending-info">
            <span class="cct-tariff-pending-icon">⏳</span>
            <span>запрос на <strong>{{ pendingRequest.label }}</strong> ожидает подтверждения дизайнера</span>
          </div>
          <button type="button" class="cct-tariff-cancel-btn" :disabled="reqSaving" @click="cancelRequest">
            {{ reqSaving ? '...' : 'отменить запрос' }}
          </button>
        </div>

        <!-- All tariff cards -->
        <div class="cct-tariff-grid">
          <button
            v-for="t in DESIGNER_TARIFFS"
            :key="t.key"
            type="button"
            class="cct-tariff-card"
            :class="{
              'cct-tariff-card--active':   t.key === profile.service_tariff,
              'cct-tariff-card--selected': t.key === selectedTariff && t.key !== profile.service_tariff,
              'cct-tariff-card--pending':  t.key === profile.service_tariff_request && t.key !== profile.service_tariff,
            }"
            :style="`--tc: ${t.color}`"
            :disabled="!!pendingRequest"
            @click="selectTariff(t.key)"
          >
            <div class="cct-tariff-card-top">
              <span class="cct-tariff-card-name">{{ t.label }}</span>
              <span class="cct-tariff-card-price">{{ t.priceHint }}</span>
              <span v-if="t.key === profile.service_tariff" class="cct-tariff-card-cur">текущий</span>
            </div>
            <p class="cct-tariff-card-desc">{{ t.description }}</p>
            <div class="cct-tariff-card-chips">
              <span v-for="s in t.services" :key="s" class="cct-tariff-card-chip">{{ serviceLabel(s) }}</span>
            </div>
          </button>
        </div>

        <!-- Send request row -->
        <div v-if="selectedTariff && selectedTariff !== profile.service_tariff && !pendingRequest" class="cct-tariff-req-row">
          <span class="cct-tariff-req-hint">выбран <strong>{{ DESIGNER_TARIFFS.find(t => t.key === selectedTariff)?.label }}</strong> — отправьте запрос дизайнеру</span>
          <button type="button" class="cct-tariff-req-btn" :disabled="reqSaving" @click="sendRequest">
            {{ reqSaving ? '...' : 'запросить тариф →' }}
          </button>
        </div>

        <p v-if="!profile.service_tariff && !pendingRequest" class="cct-tariff-hint">тариф ещё не выбран дизайнером — вы можете запросить предпочтительный</p>
      </div>

      <!-- ── Договор ── -->
      <div class="cct-section">
        <div class="cct-section-title">
          договор
          <span class="cct-badge" :class="`cct-badge--${contractStatusColor}`">{{ contractStatusLabel }}</span>
        </div>
        <div class="cct-rows" v-if="hasContract">
          <div v-if="profile.contract_number" class="cct-row">
            <span class="cct-lbl">Номер договора</span>
            <span class="cct-val">{{ profile.contract_number }}</span>
          </div>
          <div v-if="profile.contract_date" class="cct-row">
            <span class="cct-lbl">Дата</span>
            <span class="cct-val">{{ fmtDate(profile.contract_date) }}</span>
          </div>
          <div v-if="profile.contract_parties" class="cct-row">
            <span class="cct-lbl">Стороны</span>
            <span class="cct-val">{{ profile.contract_parties }}</span>
          </div>
          <div v-if="profile.tor_scope" class="cct-row">
            <span class="cct-lbl">Объём работ</span>
            <span class="cct-val cct-val--pre">{{ profile.tor_scope }}</span>
          </div>
        </div>
        <div v-else class="cct-empty">Договор ещё не заполнен</div>
        <div v-if="profile.contract_file" class="cct-dl">
          <a :href="profile.contract_file" target="_blank" class="cct-dl-btn">↓ Скачать договор</a>
        </div>
      </div>

      <!-- ── Счёт и оплата ── -->
      <div class="cct-section">
        <div class="cct-section-title">
          счёт и оплата
          <span class="cct-badge" :class="`cct-badge--${paymentStatusColor}`">{{ paymentStatusLabel }}</span>
        </div>
        <div class="cct-rows" v-if="hasInvoice">
          <div v-if="profile.invoice_amount" class="cct-row">
            <span class="cct-lbl">Сумма</span>
            <span class="cct-val">{{ profile.invoice_amount }}</span>
          </div>
          <div v-if="profile.invoice_advance_pct" class="cct-row">
            <span class="cct-lbl">Аванс</span>
            <span class="cct-val">{{ profile.invoice_advance_pct }}</span>
          </div>
          <div v-if="profile.invoice_date" class="cct-row">
            <span class="cct-lbl">Дата выставления</span>
            <span class="cct-val">{{ fmtDate(profile.invoice_date) }}</span>
          </div>
          <div v-if="profile.invoice_payment_details" class="cct-row">
            <span class="cct-lbl">Реквизиты оплаты</span>
            <span class="cct-val cct-val--pre">{{ profile.invoice_payment_details }}</span>
          </div>
        </div>
        <div v-else class="cct-empty">Счёт ещё не выставлен</div>
        <div v-if="profile.invoice_file" class="cct-dl">
          <a :href="profile.invoice_file" target="_blank" class="cct-dl-btn">↓ Скачать счёт</a>
        </div>
      </div>

      <!-- ── ТЗ (краткое) ── -->
      <div class="cct-section" v-if="profile.tor_timeline || profile.tor_deliverables || profile.tor_exclusions">
        <div class="cct-section-title">техническое задание</div>
        <div class="cct-rows">
          <div v-if="profile.tor_timeline" class="cct-row">
            <span class="cct-lbl">Сроки проектирования</span>
            <span class="cct-val">{{ profile.tor_timeline }}</span>
          </div>
          <div v-if="profile.tor_deliverables" class="cct-row">
            <span class="cct-lbl">Формат результата</span>
            <span class="cct-val">{{ profile.tor_deliverables }}</span>
          </div>
          <div v-if="profile.tor_exclusions" class="cct-row">
            <span class="cct-lbl">Не входит в проект</span>
            <span class="cct-val cct-val--pre">{{ profile.tor_exclusions }}</span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { CONTRACT_STATUS_MAP, PAYMENT_STATUS_MAP } from '~~/shared/utils/status-maps'
import { DESIGNER_TARIFFS, DESIGNER_SERVICE_TYPE_OPTIONS } from '~~/shared/types/catalogs'
const props = defineProps<{ slug: string }>()
const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const profile = computed(() => project.value?.profile || {})

const svcLabelMap = Object.fromEntries(DESIGNER_SERVICE_TYPE_OPTIONS.map(o => [o.value, o.label]))
function serviceLabel(s: string) { return svcLabelMap[s] || s }

// ── Tariff request ────────────────────────────────────────────────
const selectedTariff = ref<string>('')
const reqSaving = ref(false)
const reqDone = ref(false)

watch(profile, (p) => {
  // pre-select pending request if any, else current tariff
  selectedTariff.value = p.service_tariff_request || p.service_tariff || ''
}, { immediate: true })

const pendingRequest = computed(() => {
  const req = profile.value.service_tariff_request
  if (!req || req === profile.value.service_tariff) return null
  return DESIGNER_TARIFFS.find(t => t.key === req) || null
})

function selectTariff(key: string) {
  if (pendingRequest.value) return
  selectedTariff.value = selectedTariff.value === key ? '' : key
}

async function sendRequest() {
  if (!selectedTariff.value || selectedTariff.value === profile.value.service_tariff) return
  reqSaving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/client-profile`, {
      method: 'PUT',
      body: { service_tariff_request: selectedTariff.value },
    })
    await refresh()
    reqDone.value = true
  } finally {
    reqSaving.value = false
  }
}

async function cancelRequest() {
  reqSaving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/client-profile`, {
      method: 'PUT',
      body: { service_tariff_request: '' },
    })
    await refresh()
    selectedTariff.value = profile.value.service_tariff || ''
    reqDone.value = false
  } finally {
    reqSaving.value = false
  }
}

const hasContract = computed(() => !!(
  profile.value.contract_number || profile.value.contract_date ||
  profile.value.contract_parties || profile.value.tor_scope
))
const hasInvoice = computed(() => !!(
  profile.value.invoice_amount || profile.value.invoice_date || profile.value.invoice_payment_details
))

const contractStatusLabel = computed(() => CONTRACT_STATUS_MAP[profile.value.contract_status]?.label || 'не заполнен')
const contractStatusColor = computed(() => CONTRACT_STATUS_MAP[profile.value.contract_status]?.token || 'gray')
const paymentStatusLabel  = computed(() => PAYMENT_STATUS_MAP[profile.value.payment_status]?.label   || 'не выставлен')
const paymentStatusColor  = computed(() => PAYMENT_STATUS_MAP[profile.value.payment_status]?.token   || 'gray')

function fmtDate(d: string) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}
</script>

<style scoped>
.cct-root { padding: 16px; }
.cct-loading { font-size: .85rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); }

/* Tariff banner */
/* ── Tariff section ── */
.cct-tariff-section { margin-bottom: 28px; }

.cct-tariff-pending-badge {
  font-size: .6rem; padding: 2px 8px; border-radius: 3px;
  background: color-mix(in srgb, var(--ds-warning) 15%, transparent);
  color: #e65100; font-weight: 600; text-transform: none; letter-spacing: 0;
}

.cct-tariff-pending {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px; margin-bottom: 14px;
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 35%, transparent);
  border-radius: 6px; font-size: .8rem;
}
.cct-tariff-pending-info { display: flex; align-items: center; gap: 8px; }
.cct-tariff-pending-icon { font-size: 1rem; }
.cct-tariff-cancel-btn {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--glass-text) 25%, transparent);
  color: color-mix(in srgb, var(--glass-text) 60%, transparent);
  padding: 4px 12px; font-size: .72rem; cursor: pointer; border-radius: 4px;
  font-family: inherit;
}
.cct-tariff-cancel-btn:hover { border-color: var(--glass-text); color: var(--glass-text); }
.cct-tariff-cancel-btn:disabled { opacity: .5; cursor: default; }

/* Tariff grid */
.cct-tariff-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.cct-tariff-card {
  --tc: #78909c;
  text-align: left; cursor: pointer; font-family: inherit;
  padding: 12px 14px;
  border: 1.5px solid color-mix(in srgb, var(--tc) 22%, var(--glass-border, #e5e5e5));
  background: color-mix(in srgb, var(--tc) 4%, transparent);
  border-radius: 8px;
  transition: background .13s, border-color .13s;
  opacity: .7;
}
.cct-tariff-card:hover:not(:disabled) {
  background: color-mix(in srgb, var(--tc) 9%, transparent);
  border-color: color-mix(in srgb, var(--tc) 55%, transparent);
  opacity: 1;
}
.cct-tariff-card:disabled { cursor: default; }
.cct-tariff-card--active {
  border-color: var(--tc);
  background: color-mix(in srgb, var(--tc) 10%, transparent);
  opacity: 1;
}
.cct-tariff-card--selected {
  border-color: color-mix(in srgb, var(--tc) 70%, transparent);
  background: color-mix(in srgb, var(--tc) 7%, transparent);
  opacity: 1;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 25%, transparent);
}
.cct-tariff-card--pending {
  border-color: var(--ds-warning);
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
  opacity: 1;
}
.cct-tariff-card-top {
  display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
  margin-bottom: 5px;
}
.cct-tariff-card-name {
  font-size: .85rem; font-weight: 700; color: var(--tc);
}
.cct-tariff-card-price {
  font-size: .68rem;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  margin-left: auto;
}
.cct-tariff-card-cur {
  font-size: .6rem; padding: 1px 6px; border-radius: 3px;
  background: color-mix(in srgb, var(--tc) 15%, transparent);
  color: var(--tc); font-weight: 600;
}
.cct-tariff-card-desc {
  font-size: .72rem; margin: 0 0 8px;
  color: color-mix(in srgb, var(--glass-text) 65%, transparent);
  line-height: 1.4;
}
.cct-tariff-card-chips {
  display: flex; flex-wrap: wrap; gap: 3px;
}
.cct-tariff-card-chip {
  font-size: .58rem; padding: 2px 6px; border-radius: 3px;
  background: color-mix(in srgb, var(--tc) 12%, transparent);
  color: color-mix(in srgb, var(--tc) 80%, var(--glass-text));
}

/* Request row */
.cct-tariff-req-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 6px; font-size: .78rem;
}
.cct-tariff-req-hint { color: color-mix(in srgb, var(--glass-text) 65%, transparent); }
.cct-tariff-req-btn {
  background: var(--glass-text); color: var(--glass-page-bg, #fff);
  border: none; padding: 7px 18px; font-size: .78rem;
  cursor: pointer; font-family: inherit; border-radius: 4px; white-space: nowrap;
}
.cct-tariff-req-btn:hover:not(:disabled) { opacity: .85; }
.cct-tariff-req-btn:disabled { opacity: .5; cursor: default; }

.cct-tariff-hint {
  font-size: .72rem; margin: 8px 0 0;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
}
@media (max-width: 560px) {
  .cct-tariff-grid { grid-template-columns: 1fr; }
}

.cct-section { margin-bottom: 24px; }
.cct-section-title {
  display: flex; align-items: center; gap: 10px;
  font-size: .68rem; text-transform: uppercase; letter-spacing: 1px;
  color: var(--glass-text); opacity: .45; margin-bottom: 14px;
  padding-bottom: 8px; border-bottom: 1px solid var(--glass-border);
}

.cct-rows { display: flex; flex-direction: column; gap: 12px; }
.cct-row { display: flex; flex-direction: column; gap: 3px; }
.cct-lbl {
  font-size: .68rem; text-transform: uppercase; letter-spacing: .5px;
  color: var(--glass-text); opacity: .4;
}
.cct-val { font-size: .88rem; color: var(--glass-text); line-height: 1.5; }
.cct-val--pre { white-space: pre-wrap; }

.cct-empty { font-size: .85rem; color: var(--glass-text); opacity: .35; padding: 4px 0; }

/* Badge */
.cct-badge {
  font-size: .62rem; padding: 2px 10px; letter-spacing: .4px;
  text-transform: uppercase; border-radius: 999px; opacity: 1;
}
.cct-badge--gray   { background: color-mix(in srgb, var(--glass-text) 8%, transparent); color: color-mix(in srgb, var(--glass-text) 50%, transparent); }
.cct-badge--blue   { background: color-mix(in srgb, var(--phase-blue, var(--ds-accent)) 8%, transparent); color: var(--phase-blue, var(--ds-accent)); }
.cct-badge--green  { background: color-mix(in srgb, var(--ds-success, var(--ds-success)) 8%, transparent); color: var(--ds-success, var(--ds-success)); }
.cct-badge--yellow { background: color-mix(in srgb, var(--ds-warning, #c87400) 8%, transparent); color: var(--ds-warning, #c87400); }
.cct-badge--red    { background: color-mix(in srgb, var(--ds-error, var(--ds-error)) 8%, transparent); color: var(--ds-error, var(--ds-error)); }

/* Download */
.cct-dl { margin-top: 12px; }
.cct-dl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .8rem; text-decoration: none;
  color: var(--glass-page-bg); background: var(--glass-text);
  padding: 6px 14px; border-radius: 8px;
  transition: opacity .15s;
}
.cct-dl-btn:hover { opacity: .8; }
</style>
