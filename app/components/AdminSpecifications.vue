<template>
  <div class="aspec-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status row -->
      <div class="aspec-status-row">
        <span class="aspec-dot" :class="`aspec-dot--${statusColor}`"></span>
        <select v-model="form.spec_status" class="u-status-sel" @change="save">
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
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">версия</label>
            <input v-model="form.spec_version" class="glass-input" placeholder="v1..." @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">дата выдачи</label>
            <AppDatePicker v-model="form.spec_issue_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">примечания</label>
            <textarea v-model="form.spec_notes" class="glass-input u-ta" rows="2" @blur="save" />
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
                <td><input v-model="item.name" class="glass-input glass-input--inline" @blur="save"></td>
                <td><input v-model="item.article" class="glass-input glass-input--inline glass-input--sm" @blur="save"></td>
                <td><input v-model="item.qty" type="number" min="0" class="glass-input glass-input--inline glass-input--xs" @blur="save"></td>
                <td><input v-model="item.unit" class="glass-input glass-input--inline glass-input--xs" placeholder="шт" @blur="save"></td>
                <td><input v-model="item.supplier" class="glass-input glass-input--inline" @blur="save"></td>
                <td><input v-model="item.price" class="glass-input glass-input--inline glass-input--sm" @blur="save"></td>
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
.aspec-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }

.aspec-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.aspec-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aspec-dot--gray   { background: var(--ds-muted, #ccc); }
.aspec-dot--blue   { background: var(--phase-blue, #6b9fd4); }
.aspec-dot--yellow { background: var(--ds-warning, #e8b84b); }
.aspec-dot--red    { background: var(--ds-error, #d46b6b); }
.aspec-dot--green  { background: var(--ds-success, #5caa7f); }
</style>
