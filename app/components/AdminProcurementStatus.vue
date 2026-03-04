<template>
  <div class="aps-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status -->
      <div class="aps-status-row">
        <span class="aps-dot" :class="`aps-dot--${statusColor}`"></span>
        <select v-model="form.ps_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_progress">в процессе</option>
          <option value="delayed">задержки</option>
          <option value="almost_done">почти завершено</option>
          <option value="done">всё получено ✓</option>
        </select>
        <span v-if="savedAt" class="aps-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Progress bar -->
      <div class="aps-progress-wrap" v-if="form.ps_orders?.length">
        <div class="aps-progress-bar">
          <div class="aps-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="aps-progress-label">{{ receivedCount }} / {{ form.ps_orders.length }} ({{ progressPct }}%)</span>
      </div>

      <!-- Orders tracking -->
      <div class="aps-section">
        <div class="aps-section-title">отслеживание заказов</div>

        <div class="aps-orders" v-if="form.ps_orders?.length">
          <div v-for="(o, idx) in form.ps_orders" :key="idx" class="aps-order" :class="{ 'aps-order--done': o.status === 'received' }">
            <div class="aps-order-head">
              <span class="aps-order-num">#{{ Number(idx) + 1 }}</span>
              <input v-model="o.name" class="glass-input" placeholder="наименование заказа" @blur="save">
              <button class="aps-del" @click="removeOrder(Number(idx))">×</button>
            </div>
            <div class="aps-order-details">
              <div class="aps-order-field">
                <label class="aps-lbl">поставщик</label>
                <input v-model="o.supplier" class="glass-input" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">номер заказа</label>
                <input v-model="o.orderNumber" class="glass-input" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">статус</label>
                <select v-model="o.status" class="glass-input" @change="save">
                  <option value="">—</option>
                  <option value="pending">ожидание</option>
                  <option value="ordered">заказано</option>
                  <option value="production">в производстве</option>
                  <option value="shipped">отгружено</option>
                  <option value="customs">таможня</option>
                  <option value="delivery">доставка</option>
                  <option value="received">получено ✓</option>
                  <option value="issue">проблема ⚠</option>
                </select>
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">ожидаемая дата</label>
                <AppDatePicker v-model="o.expectedDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">сумма</label>
                <input v-model="o.amount" class="glass-input" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">трек-номер</label>
                <input v-model="o.tracking" class="glass-input" placeholder="трекинг..." @blur="save">
              </div>
            </div>
            <div class="aps-order-notes">
              <textarea v-model="o.notes" class="glass-input u-ta" rows="1" placeholder="заметки..." @blur="save" />
            </div>
          </div>
        </div>
        <div v-else class="aps-empty">Заказы не отслеживаются</div>

        <button class="aps-add-btn" @click="addOrder">+ добавить заказ</button>
      </div>

      <!-- Notes -->
      <div class="aps-section">
        <div class="aps-section-title">общие заметки</div>
        <textarea v-model="form.ps_notes" class="glass-input u-ta" rows="3" @blur="save" placeholder="задержки, альтернативы, приоритеты..." />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  ps_status: '',
  ps_notes:  '',
  ps_orders: [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.ps_orders)) form.ps_orders = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'ps_status')

const receivedCount = computed(() => form.ps_orders.filter((o: any) => o.status === 'received').length)
const progressPct = computed(() => {
  if (!form.ps_orders.length) return 0
  return Math.round((receivedCount.value / form.ps_orders.length) * 100)
})

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addOrder() {
  form.ps_orders.push({
    name: '', supplier: '', orderNumber: '', status: '', expectedDate: '', amount: '', tracking: '', notes: '',
  })
}

function removeOrder(idx: number) {
  form.ps_orders.splice(idx, 1)
  save()
}
</script>

<style scoped>
.aps-wrap { padding: 4px 0 40px; }
.aps-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }

.aps-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.aps-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aps-dot--gray   { background: var(--ds-muted, #ccc); }
.aps-dot--blue   { background: var(--phase-blue, #6b9fd4); }
.aps-dot--yellow { background: var(--ds-warning, #e8b84b); }
.aps-dot--red    { background: var(--ds-error, #d46b6b); }
.aps-dot--green  { background: var(--ds-success, #5caa7f); }
</style>
