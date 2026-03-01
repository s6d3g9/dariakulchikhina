<template>
  <div class="aps-wrap">
    <div v-if="pending" class="aps-loading">Загрузка...</div>
    <template v-else>

      <!-- Status -->
      <div class="aps-status-row">
        <span class="aps-dot" :class="`aps-dot--${statusColor}`"></span>
        <select v-model="form.ps_status" class="aps-status-sel" @change="save">
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
              <input v-model="o.name" class="aps-inp aps-order-name" placeholder="наименование заказа" @blur="save">
              <button class="aps-del" @click="removeOrder(Number(idx))">×</button>
            </div>
            <div class="aps-order-details">
              <div class="aps-order-field">
                <label class="aps-lbl">поставщик</label>
                <input v-model="o.supplier" class="aps-inp" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">номер заказа</label>
                <input v-model="o.orderNumber" class="aps-inp" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">статус</label>
                <select v-model="o.status" class="aps-inp" @change="save">
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
                <AppDatePicker v-model="o.expectedDate" model-type="iso" input-class="aps-inp" @update:model-value="save" />
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">сумма</label>
                <input v-model="o.amount" class="aps-inp" @blur="save">
              </div>
              <div class="aps-order-field">
                <label class="aps-lbl">трек-номер</label>
                <input v-model="o.tracking" class="aps-inp" placeholder="трекинг..." @blur="save">
              </div>
            </div>
            <div class="aps-order-notes">
              <textarea v-model="o.notes" class="aps-inp aps-ta" rows="1" placeholder="заметки..." @blur="save" />
            </div>
          </div>
        </div>
        <div v-else class="aps-empty">Заказы не отслеживаются</div>

        <button class="aps-add-btn" @click="addOrder">+ добавить заказ</button>
      </div>

      <!-- Notes -->
      <div class="aps-section">
        <div class="aps-section-title">общие заметки</div>
        <textarea v-model="form.ps_notes" class="aps-inp aps-ta" rows="3" @blur="save" placeholder="задержки, альтернативы, приоритеты..." />
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
.aps-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.aps-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.aps-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aps-dot--gray   { background: #ccc; }
.aps-dot--blue   { background: #6b9fd4; }
.aps-dot--yellow { background: #e8b84b; }
.aps-dot--red    { background: #d46b6b; }
.aps-dot--green  { background: #5caa7f; }
.aps-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.aps-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

/* Progress */
.aps-progress-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.aps-progress-bar { flex: 1; height: 6px; background: var(--border, #e0e0e0); border-radius: 3px; overflow: hidden; }
.aps-progress-fill { height: 100%; background: #5caa7f; border-radius: 3px; transition: width .3s; }
.aps-progress-label { font-size: .72rem; color: #888; white-space: nowrap; }

.aps-section { margin-bottom: 32px; }
.aps-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.aps-lbl { font-size: .72rem; color: #999; margin-bottom: 3px; }
.aps-inp { width: 100%; border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; box-sizing: border-box; }
.aps-inp:focus { border-color: #aaa; }
.aps-ta  { resize: vertical; }

/* Orders */
.aps-orders { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
.aps-order { border: 1px solid var(--border, #e0e0e0); padding: 14px; }
.aps-order--done { opacity: .6; }
.aps-order-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.aps-order-num { font-size: .72rem; color: #aaa; font-weight: 600; }
.aps-order-name { font-weight: 500; }
.aps-order-details { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px; margin-bottom: 8px; }
.aps-order-field { display: flex; flex-direction: column; }
.aps-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1.1rem; margin-left: auto; }
.aps-del:hover { color: #c00; }
.aps-empty { font-size: .78rem; color: #bbb; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); margin-bottom: 12px; }
.aps-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 14px; font-size: .78rem; color: #666; cursor: pointer; font-family: inherit; }
.aps-add-btn:hover { border-color: #aaa; color: inherit; }

@media (max-width: 640px) {
  .aps-order-details { grid-template-columns: 1fr 1fr; }
}
</style>
