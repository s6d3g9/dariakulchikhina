<template>
  <div class="apl-wrap">
    <div v-if="pending" class="apl-loading">Загрузка...</div>
    <template v-else>

      <!-- Status -->
      <div class="apl-status-row">
        <span class="apl-dot" :class="`apl-dot--${statusColor}`"></span>
        <select v-model="form.proc_status" class="apl-status-sel" @change="save">
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
                  <select v-model="item.category" class="apl-cell" @change="save">
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
                <td><input v-model="item.name" class="apl-cell" @blur="save"></td>
                <td><input v-model="item.qty" type="number" min="0" class="apl-cell apl-cell-xs" @blur="save"></td>
                <td><input v-model="item.supplier" class="apl-cell" @blur="save"></td>
                <td><input v-model="item.price" class="apl-cell apl-cell-sm" @blur="save"></td>
                <td>
                  <select v-model="item.status" class="apl-cell apl-cell-status" @change="save">
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
                  <AppDatePicker v-model="item.deadline" model-type="iso" input-class="apl-cell apl-cell-sm" @update:model-value="save" />
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
        <textarea v-model="form.proc_notes" class="apl-inp apl-ta" rows="3" @blur="save" placeholder="примечания по закупкам..." />
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
.apl-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.apl-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.apl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.apl-dot--gray   { background: #ccc; }
.apl-dot--blue   { background: #6b9fd4; }
.apl-dot--yellow { background: #e8b84b; }
.apl-dot--red    { background: #d46b6b; }
.apl-dot--green  { background: #5caa7f; }
.apl-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.apl-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.apl-summary { display: flex; gap: 24px; font-size: .78rem; color: #888; margin-bottom: 24px; padding: 10px 0; border-bottom: 1px solid var(--border, #ececec); }

.apl-section { margin-bottom: 32px; }
.apl-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.apl-inp { width: 100%; border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; box-sizing: border-box; }
.apl-inp:focus { border-color: #aaa; }
.apl-ta  { resize: vertical; }

.apl-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.apl-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
.apl-table th { font-size: .66rem; text-transform: uppercase; letter-spacing: .05em; color: #aaa; font-weight: 500; text-align: left; padding: 6px 4px 8px; border-bottom: 1px solid var(--border, #e0e0e0); white-space: nowrap; }
.apl-table td { padding: 4px 4px; border-bottom: 1px solid var(--border, #f0f0f0); vertical-align: middle; }
.apl-td-num { font-size: .68rem; color: #bbb; text-align: center; width: 28px; }
.apl-cell { width: 100%; border: 1px solid transparent; background: none; padding: 4px 6px; font-size: .78rem; font-family: inherit; color: inherit; outline: none; }
.apl-cell:focus { border-color: var(--border, #e0e0e0); }
.apl-cell-sm { max-width: 100px; }
.apl-cell-xs { max-width: 60px; }
.apl-cell-status { min-width: 110px; }
.apl-row--received { opacity: .6; }
.apl-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1rem; }
.apl-del:hover { color: #c00; }
.apl-empty { font-size: .78rem; color: #bbb; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); margin-bottom: 12px; }

.apl-actions { display: flex; gap: 10px; margin-bottom: 12px; }
.apl-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 14px; font-size: .78rem; color: #666; cursor: pointer; font-family: inherit; }
.apl-add-btn:hover { border-color: #aaa; color: inherit; }
</style>
