<template>
  <div class="cct-root glass-card">
    <div v-if="pending" class="cct-loading">Загрузка...</div>

    <template v-else-if="project">

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
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const profile = computed(() => project.value?.profile || {})

const hasContract = computed(() => !!(
  profile.value.contract_number || profile.value.contract_date ||
  profile.value.contract_parties || profile.value.tor_scope
))
const hasInvoice = computed(() => !!(
  profile.value.invoice_amount || profile.value.invoice_date || profile.value.invoice_payment_details
))

const contractStatusMap: Record<string, { label: string; color: string }> = {
  draft:    { label: 'черновик',   color: 'gray'  },
  sent:     { label: 'отправлен',  color: 'blue'  },
  signed:   { label: 'подписан',   color: 'green' },
  rejected: { label: 'отклонён',   color: 'red'   },
}
const paymentStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'ожидает оплаты',  color: 'gray'   },
  partial: { label: 'частично оплачен', color: 'yellow' },
  paid:    { label: 'оплачен',         color: 'green'  },
}

const contractStatusLabel = computed(() => contractStatusMap[profile.value.contract_status]?.label || 'не заполнен')
const contractStatusColor = computed(() => contractStatusMap[profile.value.contract_status]?.color || 'gray')
const paymentStatusLabel  = computed(() => paymentStatusMap[profile.value.payment_status]?.label   || 'не выставлен')
const paymentStatusColor  = computed(() => paymentStatusMap[profile.value.payment_status]?.color   || 'gray')

function fmtDate(d: string) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}
</script>

<style scoped>
.cct-root { padding: 16px; }
.cct-loading { font-size: .85rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); }

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
.cct-badge--blue   { background: rgba(37,99,235,.08); color: #2563eb; }
.cct-badge--green  { background: rgba(22,163,74,.08); color: #16a34a; }
.cct-badge--yellow { background: rgba(200,116,0,.08); color: #c87400; }
.cct-badge--red    { background: rgba(220,38,38,.08); color: #dc2626; }

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
