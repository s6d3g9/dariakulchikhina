<template>
  <div class="apl-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status -->
      <div class="apl-status-row">
        <span class="apl-dot" :class="`apl-dot--${statusColor}`"></span>
        <select v-model="form.proc_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="collecting">формирование списка</option>
          <option value="quoting">сбор КП</option>
          <option value="ordering">заказ</option>
          <option value="partial">частично получено</option>
          <option value="done">всё закуплено ✓</option>
        </select>
        <span v-if="savedAt" class="apl-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Summary bar -->
      <div class="apl-summary" v-if="form.proc_items?.length">
        <span>всего: <b>{{ form.proc_items.length }}</b></span>
        <span>заказано: <b>{{ orderedCount }}</b></span>
        <span>получено: <b>{{ receivedCount }}</b></span>
        <span>бюджет: <b>{{ totalBudget }}</b> ₽</span>
      </div>

      <!-- Items table -->
      <div class="apl-section">
        <div class="apl-section-title">список закупок</div>

        <div class="apl-table-wrap" v-if="form.proc_items?.length">
          <table class="apl-table">
            <thead>
              <tr>
                <th>№</th>
                <th>категория</th>
                <th>наименование</th>
                <th>кол-во</th>
                <th>поставщик</th>
                <th>цена</th>
                <th>статус</th>
                <th>срок</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in form.proc_items" :key="idx" :class="{ 'apl-row--received': item.status === 'received' }">
                <td class="apl-td-num">{{ Number(idx) + 1 }}</td>
                <td>
                  <select v-model="item.category" class="glass-input glass-input--inline" @change="save">
                    <option value="finish">отделка</option>
                    <option value="plumbing">сантехника</option>
                    <option value="electrical">электрика</option>
                    <option value="lighting">освещение</option>
                    <option value="furniture">мебель</option>
                    <option value="textile">текстиль</option>
                    <option value="decor">декор</option>
                    <option value="hardware">фурнитура</option>
                    <option value="other">прочее</option>
                  </select>
                </td>
                <td><GlassInput v-model="item.name" class="glass-input --inline" @blur="save" /></td>
                <td><GlassInput v-model="item.qty" type="number" min="0" class="glass-input glass-input--inline --xs" @blur="save" /></td>
                <td><GlassInput v-model="item.supplier" class="glass-input --inline" @blur="save" /></td>
                <td><GlassInput v-model="item.price" class="glass-input glass-input--inline --sm" @blur="save" /></td>
                <td>
                  <select v-model="item.status" class="u-status-sel" @change="save">
                    <option value="">—</option>
                    <option value="pending">в ожидании</option>
                    <option value="quoted">КП получено</option>
                    <option value="ordered">заказано</option>
                    <option value="shipped">в пути</option>
                    <option value="received">получено ✓</option>
                    <option value="returned">возврат</option>
                  </select>
                </td>
                <td>
                  <AppDatePicker v-model="item.deadline" model-type="iso" input-class="glass-input glass-input--inline glass-input--sm" @update:model-value="save" />
                </td>
                <td><button class="apl-del" @click="removeItem(Number(idx))">×</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="apl-empty">Список закупок пуст</div>

        <div class="apl-actions">
          <button class="apl-add-btn" @click="addItem">+ добавить позицию</button>
        </div>
      </div>

      <!-- Notes -->
      <div class="apl-section">
        <div class="apl-section-title">заметки</div>
        <textarea v-model="form.proc_notes" class="glass-input u-ta" rows="3" @blur="save" placeholder="примечания по закупкам..." />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  proc_status: '',
  proc_notes:  '',
  proc_items:  [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.proc_items)) form.proc_items = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'proc_status')

const orderedCount = computed(() => form.proc_items.filter((i: any) => ['ordered', 'shipped', 'received'].includes(i.status)).length)
const receivedCount = computed(() => form.proc_items.filter((i: any) => i.status === 'received').length)
const totalBudget = computed(() => {
  const sum = form.proc_items.reduce((s: number, i: any) => {
    return s + (parseFloat(i.price) || 0) * (parseFloat(i.qty) || 1)
  }, 0)
  return sum.toLocaleString('ru')
})

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addItem() {
  form.proc_items.push({
    category: 'finish', name: '', qty: 1, supplier: '', price: '', status: '', deadline: '',
  })
}

function removeItem(idx: number) {
  form.proc_items.splice(idx, 1)
  save()
}
</script>

<style scoped>
.apl-wrap { padding: 4px 0 40px; }
.apl-loading { padding: 40px 0; font-size: .82rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }

.apl-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.apl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.apl-dot--gray   { background: color-mix(in srgb, var(--glass-text) 40%, transparent); }
.apl-dot--blue   { background: var(--ds-accent); }
.apl-dot--yellow { background: var(--ds-warning); }
.apl-dot--red    { background: var(--ds-error); }
.apl-dot--green  { background: var(--ds-success); }
</style>
