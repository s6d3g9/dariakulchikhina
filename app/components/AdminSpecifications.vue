<template>
  <div class="aspec-wrap">
    <div v-if="pending" class="aspec-loading">Загрузка...</div>
    <template v-else>

      <!-- Status row -->
      <div class="aspec-status-row">
        <span class="aspec-dot" :class="`aspec-dot--${statusColor}`"></span>
        <select v-model="form.spec_status" class="aspec-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="collecting">сбор данных</option>
          <option value="in_work">составление</option>
          <option value="review">проверка</option>
          <option value="sent_to_client">отправлены клиенту</option>
          <option value="approved">согласованы ✓</option>
        </select>
        <span v-if="savedAt" class="aspec-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Info -->
      <div class="aspec-section">
        <div class="aspec-section-title">общие сведения</div>
        <div class="aspec-rows">
          <div class="aspec-row">
            <label class="aspec-lbl">версия</label>
            <input v-model="form.spec_version" class="aspec-inp" placeholder="v1..." @blur="save">
          </div>
          <div class="aspec-row">
            <label class="aspec-lbl">дата выдачи</label>
            <AppDatePicker v-model="form.spec_issue_date" model-type="iso" input-class="aspec-inp" @update:model-value="save" />
          </div>
          <div class="aspec-row aspec-row--full">
            <label class="aspec-lbl">примечания</label>
            <textarea v-model="form.spec_notes" class="aspec-inp aspec-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Specification items -->
      <div class="aspec-section">
        <div class="aspec-section-title">позиции спецификации</div>

        <div class="aspec-table-wrap" v-if="form.spec_items?.length">
          <table class="aspec-table">
            <thead>
              <tr>
                <th>№</th>
                <th>категория</th>
                <th>наименование</th>
                <th>артикул</th>
                <th>кол-во</th>
                <th>ед.</th>
                <th>поставщик</th>
                <th>цена</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in form.spec_items" :key="idx">
                <td class="aspec-td-num">{{ Number(idx) + 1 }}</td>
                <td>
                  <select v-model="item.category" class="aspec-cell-inp" @change="save">
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
                <td><input v-model="item.name" class="aspec-cell-inp" @blur="save"></td>
                <td><input v-model="item.article" class="aspec-cell-inp aspec-cell-sm" @blur="save"></td>
                <td><input v-model="item.qty" type="number" min="0" class="aspec-cell-inp aspec-cell-xs" @blur="save"></td>
                <td><input v-model="item.unit" class="aspec-cell-inp aspec-cell-xs" placeholder="шт" @blur="save"></td>
                <td><input v-model="item.supplier" class="aspec-cell-inp" @blur="save"></td>
                <td><input v-model="item.price" class="aspec-cell-inp aspec-cell-sm" @blur="save"></td>
                <td><button class="aspec-del" @click="removeItem(Number(idx))" title="удалить">×</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="aspec-empty">Позиции ещё не добавлены</div>

        <div class="aspec-actions">
          <button class="aspec-add-btn" @click="addItem">+ добавить позицию</button>
        </div>

        <div v-if="form.spec_items?.length" class="aspec-summary">
          <span>позиций: <b>{{ form.spec_items.length }}</b></span>
          <span>итого: <b>{{ totalPrice }}</b> ₽</span>
        </div>
      </div>

      <!-- Section: Files -->
      <div class="aspec-section">
        <div class="aspec-section-title">файлы спецификаций</div>
        <div class="aspec-files" v-if="form.spec_files?.length">
          <div v-for="(f, idx) in form.spec_files" :key="idx" class="aspec-file">
            <a :href="f.url" target="_blank" class="aspec-file-name">📄 {{ f.filename }}</a>
            <button class="aspec-del" @click="removeFile(Number(idx))">×</button>
          </div>
        </div>
        <label class="aspec-upload-btn" :class="{ 'aspec-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ добавить файл' }}
          <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.dwg" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const form = reactive<any>({
  spec_status:      '',
  spec_version:     '',
  spec_issue_date:  '',
  spec_notes:       '',
  spec_items:       [] as any[],
  spec_files:       [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.spec_items)) form.spec_items = []
  if (!Array.isArray(form.spec_files)) form.spec_files = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'spec_status')

const totalPrice = computed(() => {
  const sum = form.spec_items.reduce((s: number, i: any) => {
    const price = parseFloat(i.price) || 0
    const qty = parseFloat(i.qty) || 1
    return s + price * qty
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
  form.spec_items.push({
    category: 'finish', name: '', article: '', qty: 1, unit: 'шт', supplier: '', price: '',
  })
}

function removeItem(idx: number) {
  form.spec_items.splice(idx, 1)
  save()
}

async function onFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.spec_files.push({ url: res.url, filename: f.name })
  }
  uploading.value = false
  save()
}

function removeFile(idx: number) {
  form.spec_files.splice(idx, 1)
  save()
}
</script>

<style scoped>
.aspec-wrap { padding: 4px 0 40px; }
.aspec-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.aspec-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.aspec-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aspec-dot--gray   { background: #ccc; }
.aspec-dot--blue   { background: #6b9fd4; }
.aspec-dot--yellow { background: #e8b84b; }
.aspec-dot--red    { background: #d46b6b; }
.aspec-dot--green  { background: #5caa7f; }
.aspec-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.aspec-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.aspec-section { margin-bottom: 32px; }
.aspec-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.aspec-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.aspec-row { display: flex; flex-direction: column; gap: 5px; }
.aspec-row--full { grid-column: 1 / -1; }
.aspec-lbl { font-size: .72rem; color: #999; }
.aspec-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.aspec-inp:focus { border-color: #aaa; }
.aspec-ta  { resize: vertical; }

/* Table */
.aspec-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.aspec-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
.aspec-table th { font-size: .66rem; text-transform: uppercase; letter-spacing: .05em; color: #aaa; font-weight: 500; text-align: left; padding: 6px 6px 8px; border-bottom: 1px solid var(--border, #e0e0e0); }
.aspec-table td { padding: 4px 4px; border-bottom: 1px solid var(--border, #f0f0f0); vertical-align: middle; }
.aspec-td-num { font-size: .68rem; color: #bbb; text-align: center; width: 28px; }
.aspec-cell-inp { width: 100%; border: 1px solid transparent; background: none; padding: 4px 6px; font-size: .78rem; font-family: inherit; color: inherit; outline: none; }
.aspec-cell-inp:focus { border-color: var(--border, #e0e0e0); }
.aspec-cell-sm { max-width: 100px; }
.aspec-cell-xs { max-width: 60px; }
.aspec-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1rem; }
.aspec-del:hover { color: #c00; }
.aspec-empty { font-size: .78rem; color: #bbb; margin-bottom: 10px; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); }

.aspec-actions { display: flex; gap: 10px; margin-bottom: 12px; }
.aspec-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 14px; font-size: .78rem; color: #666; cursor: pointer; font-family: inherit; }
.aspec-add-btn:hover { border-color: #aaa; color: inherit; }

.aspec-summary { display: flex; gap: 24px; font-size: .78rem; color: #888; padding: 10px 0; border-top: 1px solid var(--border, #ececec); }

/* Files */
.aspec-files { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.aspec-file { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid var(--border, #e0e0e0); }
.aspec-file-name { font-size: .78rem; color: inherit; text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aspec-file-name:hover { text-decoration: underline; }
.aspec-upload-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.aspec-upload-btn:hover { border-color: #aaa; color: inherit; }
.aspec-upload-btn--loading { opacity: .6; cursor: wait; }
</style>
