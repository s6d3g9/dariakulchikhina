<template>
  <div class="apl-wrap">
    <div v-if="pending" class="apl-loading">Загрузка...</div>
    <template v-else>

      <div class="apl-status-row">
        <span class="apl-dot" :class="`apl-dot--${statusColor}`"></span>
        <select v-model="form.pl_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_progress">идёт проверка</option>
          <option value="revision">устранение замечаний</option>
          <option value="done">все замечания устранены ✓</option>
        </select>
        <span class="apl-stat">{{ openCount }} открытых · {{ doneCount }} закрыто</span>
        <span v-if="savedAt" class="apl-saved">✓ {{ savedAt }}</span>
      </div>

      <div class="apl-section">
        <div class="apl-section-title">
          замечания
          <button class="apl-add-btn" @click="addItem">+ замечание</button>
        </div>

        <div v-if="form.pl_items.length" class="apl-list">
          <div v-for="(item, i) in form.pl_items" :key="i" class="apl-item" :class="{ 'apl-item--done': item.status === 'fixed' }">
            <div class="apl-item-head">
              <span class="apl-num">{{ i + 1 }}</span>
              <input v-model="item.location" class="u-inline-inp" placeholder="помещение / зона..." @blur="save">
              <select v-model="item.status" class="u-status-sel" @change="save">
                <option value="open">открыто</option>
                <option value="in_progress">устраняется</option>
                <option value="fixed">устранено ✓</option>
              </select>
              <button class="apl-del" @click="removeItem(i)">×</button>
            </div>
            <textarea v-model="item.description" class="u-inline-inp u-inline-inp--ta" rows="2" placeholder="описание дефекта..." @blur="save" />
            <div class="apl-item-foot">
              <label class="u-field__label">виновная сторона:</label>
              <input v-model="item.responsible" class="u-inline-inp" placeholder="подрядчик / поставщик..." @blur="save">
              <label class="u-field__label">срок устранения:</label>
              <AppDatePicker v-model="item.deadline" model-type="iso" input-class="apl-date" @update:model-value="save" />
            </div>
          </div>
        </div>
        <div v-else class="apl-empty">Замечания не добавлены</div>
      </div>

      <div class="apl-section">
        <div class="apl-section-title">итоговый акт</div>
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">дата осмотра</label>
            <AppDatePicker v-model="form.pl_inspection_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата устранения замечаний</label>
            <AppDatePicker v-model="form.pl_resolution_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">примечания</label>
            <textarea v-model="form.pl_notes" class="glass-input u-ta" rows="3" @blur="save" />
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  pl_status: '',
  pl_items: [] as any[],
  pl_inspection_date: '',
  pl_resolution_date: '',
  pl_notes: '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => { if (pf[k] !== undefined) (form as any)[k] = pf[k] })
  if (!Array.isArray(form.pl_items)) form.pl_items = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'pl_status')
const openCount = computed(() => form.pl_items.filter((i: any) => i.status !== 'fixed').length)
const doneCount = computed(() => form.pl_items.filter((i: any) => i.status === 'fixed').length)

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addItem() {
  form.pl_items.push({ location: '', description: '', status: 'open', responsible: '', deadline: '' })
}
function removeItem(i: number) {
  form.pl_items.splice(i, 1)
  save()
}
</script>

<style scoped>
.apl-wrap { padding: 4px 0 40px; }
.apl-loading { padding: 40px 0; font-size: .82rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }
.apl-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
.apl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.apl-dot--gray   { background: color-mix(in srgb, var(--glass-text) 40%, transparent); }
.apl-dot--blue   { background: var(--ds-accent); }
.apl-dot--yellow { background: var(--ds-warning); }
.apl-dot--green  { background: var(--ds-success); }
</style>
