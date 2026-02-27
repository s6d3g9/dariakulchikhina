<template>
  <div class="cct-root">
    <div v-if="pending" class="cct-loading"><div class="cct-loading-bar"></div></div>

    <template v-else-if="project">

      <!-- Contract card -->
      <div class="cct-section">
        <div class="cct-section-head">
          <span class="cct-section-title">Договор</span>
          <span class="cct-badge" :class="`cct-badge--${contractStatusColor}`">
            {{ contractStatusLabel }}
          </span>
        </div>
        <div class="cct-grid" v-if="hasContract">
          <div v-if="profile.contract_number" class="cct-cell">
            <span class="cct-cell-lbl">Номер договора</span>
            <span class="cct-cell-val">{{ profile.contract_number }}</span>
          </div>
          <div v-if="profile.contract_date" class="cct-cell">
            <span class="cct-cell-lbl">Дата</span>
            <span class="cct-cell-val">{{ fmtDate(profile.contract_date) }}</span>
          </div>
          <div v-if="profile.contract_parties" class="cct-cell cct-cell--full">
            <span class="cct-cell-lbl">Стороны</span>
            <span class="cct-cell-val">{{ profile.contract_parties }}</span>
          </div>
          <div v-if="profile.tor_scope" class="cct-cell cct-cell--full">
            <span class="cct-cell-lbl">Объём работ</span>
            <span class="cct-cell-val cct-cell-val--pre">{{ profile.tor_scope }}</span>
          </div>
        </div>
        <div v-else class="cct-empty">Договор ещё не заполнен</div>

        <div v-if="profile.contract_file" class="cct-download">
          <a :href="profile.contract_file" target="_blank" class="cct-download-btn">
            ↓ Скачать договор
          </a>
        </div>
      </div>

      <!-- Invoice / Advance -->
      <div class="cct-section">
        <div class="cct-section-head">
          <span class="cct-section-title">Счёт и оплата</span>
          <span class="cct-badge" :class="`cct-badge--${paymentStatusColor}`">
            {{ paymentStatusLabel }}
          </span>
        </div>
        <div class="cct-grid" v-if="hasInvoice">
          <div v-if="profile.invoice_amount" class="cct-cell">
            <span class="cct-cell-lbl">Сумма</span>
            <span class="cct-cell-val">{{ profile.invoice_amount }}</span>
          </div>
          <div v-if="profile.invoice_advance_pct" class="cct-cell">
            <span class="cct-cell-lbl">Аванс</span>
            <span class="cct-cell-val">{{ profile.invoice_advance_pct }}</span>
          </div>
          <div v-if="profile.invoice_date" class="cct-cell">
            <span class="cct-cell-lbl">Дата выставления</span>
            <span class="cct-cell-val">{{ fmtDate(profile.invoice_date) }}</span>
          </div>
          <div v-if="profile.invoice_payment_details" class="cct-cell cct-cell--full">
            <span class="cct-cell-lbl">Реквизиты оплаты</span>
            <span class="cct-cell-val cct-cell-val--pre">{{ profile.invoice_payment_details }}</span>
          </div>
        </div>
        <div v-else class="cct-empty">Счёт ещё не выставлен</div>

        <div v-if="profile.invoice_file" class="cct-download">
          <a :href="profile.invoice_file" target="_blank" class="cct-download-btn">
            ↓ Скачать счёт
          </a>
        </div>
      </div>

      <!-- ToR summary -->
      <div class="cct-section" v-if="profile.tor_timeline || profile.tor_deliverables">
        <div class="cct-section-head">
          <span class="cct-section-title">Техническое задание</span>
        </div>
        <div class="cct-grid">
          <div v-if="profile.tor_timeline" class="cct-cell">
            <span class="cct-cell-lbl">Сроки проектирования</span>
            <span class="cct-cell-val">{{ profile.tor_timeline }}</span>
          </div>
          <div v-if="profile.tor_deliverables" class="cct-cell">
            <span class="cct-cell-lbl">Формат результата</span>
            <span class="cct-cell-val">{{ profile.tor_deliverables }}</span>
          </div>
          <div v-if="profile.tor_exclusions" class="cct-cell cct-cell--full">
            <span class="cct-cell-lbl">Не входит в проект</span>
            <span class="cct-cell-val cct-cell-val--pre">{{ profile.tor_exclusions }}</span>
          </div>
        </div>
      </div>

      <!-- Future payment notice -->
      <div class="cct-future-notice">
        <span class="cct-future-icon">◌</span>
        <span>Онлайн-оплата будет доступна в следующей версии кабинета</span>
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
.cct-root { padding: 4px 0 48px; display: flex; flex-direction: column; gap: 0; }
.cct-loading { padding: 40px 0; }
.cct-loading-bar { height: 2px; width: 60px; background: var(--c-border, #e8e8e4); animation: cc-bar .9s ease infinite alternate; }
@keyframes cc-bar { to { width: 140px; opacity: .4; } }

/* Section */
.cct-section { border: 1px solid var(--c-border, #e8e8e4); margin-bottom: 16px; }
.cct-section-head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--c-border, #e8e8e4);
  background: var(--c-bg2, #f8f8f7);
}
.cct-section-title { font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-muted, #888); }

/* Badge */
.cct-badge {
  font-size: .62rem; padding: 2px 10px; letter-spacing: .5px; text-transform: uppercase; border-radius: 2px;
}
.cct-badge--gray   { background: #f0f0f0; color: #888; }
.cct-badge--blue   { background: #e3f0ff; color: #1565c0; }
.cct-badge--green  { background: #e8f5e9; color: #2e7d32; }
.cct-badge--yellow { background: #fff8e1; color: #c87400; }
.cct-badge--red    { background: #fce4e4; color: #ba2626; }

/* Grid */
.cct-grid { display: grid; grid-template-columns: 1fr 1fr; }
.cct-cell {
  padding: 14px 20px; border-right: 1px solid var(--c-border, #e8e8e4);
  border-bottom: 1px solid var(--c-border, #e8e8e4);
}
.cct-cell:nth-child(2n) { border-right: none; }
.cct-cell--full { grid-column: 1 / -1; border-right: none; }
.cct-cell-lbl { display: block; font-size: .6rem; text-transform: uppercase; letter-spacing: .8px; color: var(--c-muted, #aaa); margin-bottom: 4px; }
.cct-cell-val { font-size: .86rem; color: var(--c-text, #1a1a1a); }
.cct-cell-val--pre { white-space: pre-line; }
.cct-empty { padding: 20px; font-size: .8rem; color: var(--c-muted, #aaa); }

/* Download */
.cct-download { padding: 14px 20px; border-top: 1px solid var(--c-border, #e8e8e4); }
.cct-download-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: .8rem; color: var(--c-text, #1a1a1a); text-decoration: none;
  border: 1px solid var(--c-border, #e8e8e4); padding: 8px 16px;
}
.cct-download-btn:hover { border-color: var(--c-text, #1a1a1a); }

/* Future notice */
.cct-future-notice {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border: 1px dashed var(--c-border, #e8e8e4);
  font-size: .76rem; color: var(--c-muted, #aaa);
}
.cct-future-icon { font-size: 1rem; opacity: .5; }

@media (max-width: 640px) {
  .cct-grid { grid-template-columns: 1fr; }
  .cct-cell:nth-child(2n) { border-right: none; }
}
</style>
