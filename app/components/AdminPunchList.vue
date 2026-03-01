<template>
  <div class="apl-wrap">
    <div v-if="pending" class="apl-loading">Загрузка...</div>
    <template v-else>

      <div class="apl-status-row">
        <span class="apl-dot" :class="`apl-dot--${statusColor}`"></span>
        <select v-model="form.pl_status" class="apl-status-sel" @change="save">
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
              <input v-model="item.location" class="apl-loc" placeholder="помещение / зона..." @blur="save">
              <select v-model="item.status" class="apl-item-status" @change="save">
                <option value="open">открыто</option>
                <option value="in_progress">устраняется</option>
                <option value="fixed">устранено ✓</option>
              </select>
              <button class="apl-del" @click="removeItem(i)">×</button>
            </div>
            <textarea v-model="item.description" class="apl-desc" rows="2" placeholder="описание дефекта..." @blur="save" />
            <div class="apl-item-foot">
              <label class="apl-lbl">виновная сторона:</label>
              <input v-model="item.responsible" class="apl-resp" placeholder="подрядчик / поставщик..." @blur="save">
              <label class="apl-lbl">срок устранения:</label>
              <AppDatePicker v-model="item.deadline" model-type="iso" input-class="apl-date" @update:model-value="save" />
            </div>
          </div>
        </div>
        <div v-else class="apl-empty">Замечания не добавлены</div>
      </div>

      <div class="apl-section">
        <div class="apl-section-title">итоговый акт</div>
        <div class="apl-rows">
          <div class="apl-row">
            <label class="apl-lbl">дата осмотра</label>
            <AppDatePicker v-model="form.pl_inspection_date" model-type="iso" input-class="apl-inp" @update:model-value="save" />
          </div>
          <div class="apl-row">
            <label class="apl-lbl">дата устранения замечаний</label>
            <AppDatePicker v-model="form.pl_resolution_date" model-type="iso" input-class="apl-inp" @update:model-value="save" />
          </div>
          <div class="apl-row apl-row--full">
            <label class="apl-lbl">примечания</label>
            <textarea v-model="form.pl_notes" class="apl-inp apl-ta" rows="3" @blur="save" />
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
.apl-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }
.apl-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
.apl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.apl-dot--gray   { background: #ccc; }
.apl-dot--blue   { background: #6b9fd4; }
.apl-dot--yellow { background: #e8b84b; }
.apl-dot--green  { background: #5caa7f; }
.apl-status-sel { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.apl-stat { font-size: .72rem; color: #999; margin-left: 4px; }
.apl-saved { font-size: .72rem; color: #5caa7f; margin-left: auto; }
.apl-section { margin-bottom: 32px; }
.apl-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); display: flex; align-items: center; gap: 10px; }
.apl-add-btn { margin-left: auto; border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .7rem; padding: 3px 8px; cursor: pointer; font-family: inherit; }
.apl-add-btn:hover { border-color: #aaa; }
.apl-list { display: flex; flex-direction: column; gap: 10px; }
.apl-item { border: 1px solid var(--border, #ececec); padding: 12px 14px; }
.apl-item--done { opacity: .55; }
.apl-item-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.apl-num { font-size: .7rem; color: #bbb; width: 18px; flex-shrink: 0; }
.apl-loc { flex: 1; border: none; border-bottom: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-family: inherit; font-size: .8rem; padding: 3px 0; outline: none; }
.apl-item-status { border: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .74rem; padding: 3px 6px; cursor: pointer; }
.apl-del { background: none; border: none; cursor: pointer; color: #bbb; font-size: 1.1rem; line-height: 1; flex-shrink: 0; }
.apl-del:hover { color: #c00; }
.apl-desc { width: 100%; border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: none; color: inherit; font-family: inherit; outline: none; resize: vertical; margin-bottom: 8px; box-sizing: border-box; }
.apl-item-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.apl-lbl { font-size: .7rem; color: #999; white-space: nowrap; }
.apl-resp { border: none; border-bottom: 1px solid var(--border, #e0e0e0); background: none; color: inherit; font-size: .78rem; padding: 3px 0; outline: none; font-family: inherit; min-width: 120px; flex: 1; }
.apl-date { border: 1px solid var(--border, #e0e0e0); padding: 4px 8px; font-size: .76rem; background: none; color: inherit; font-family: inherit; outline: none; }
.apl-empty { font-size: .8rem; color: #bbb; padding: 30px 0; text-align: center; border: 1px dashed var(--border, #ececec); }
.apl-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.apl-row { display: flex; flex-direction: column; gap: 5px; }
.apl-row--full { grid-column: 1 / -1; }
.apl-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: none; color: inherit; font-family: inherit; outline: none; }
.apl-ta { resize: vertical; }
</style>
