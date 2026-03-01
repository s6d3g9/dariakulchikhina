<template>
  <div class="asup-wrap">
    <div v-if="pending" class="asup-loading">Загрузка...</div>
    <template v-else>

      <!-- Status -->
      <div class="asup-status-row">
        <span class="asup-dot" :class="`asup-dot--${statusColor}`"></span>
        <select v-model="form.sup_status" class="asup-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="searching">поиск поставщиков</option>
          <option value="quoting">сбор КП</option>
          <option value="selected">выбраны</option>
          <option value="contracted">договоры заключены ✓</option>
        </select>
        <span v-if="savedAt" class="asup-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Suppliers list -->
      <div class="asup-section">
        <div class="asup-section-title">поставщики</div>

        <div class="asup-cards" v-if="form.sup_items?.length">
          <div v-for="(s, idx) in form.sup_items" :key="idx" class="asup-card">
            <div class="asup-card-header">
              <input v-model="s.name" class="asup-inp asup-card-name" placeholder="название компании" @blur="save">
              <button class="asup-del" @click="removeSupplier(Number(idx))">×</button>
            </div>
            <div class="asup-card-rows">
              <div class="asup-card-row">
                <label class="asup-lbl">категория</label>
                <select v-model="s.category" class="asup-inp" @change="save">
                  <option value="">—</option>
                  <option value="finish">отделка</option>
                  <option value="plumbing">сантехника</option>
                  <option value="electrical">электрика</option>
                  <option value="lighting">освещение</option>
                  <option value="furniture">мебель</option>
                  <option value="textile">текстиль</option>
                  <option value="decor">декор</option>
                  <option value="other">прочее</option>
                </select>
              </div>
              <div class="asup-card-row">
                <label class="asup-lbl">контакт</label>
                <input v-model="s.contact" class="asup-inp" placeholder="имя, телефон..." @blur="save">
              </div>
              <div class="asup-card-row">
                <label class="asup-lbl">email</label>
                <input v-model="s.email" type="email" class="asup-inp" @blur="save">
              </div>
              <div class="asup-card-row">
                <label class="asup-lbl">сайт</label>
                <input v-model="s.website" class="asup-inp" placeholder="https://..." @blur="save">
              </div>
              <div class="asup-card-row">
                <label class="asup-lbl">статус</label>
                <select v-model="s.status" class="asup-inp" @change="save">
                  <option value="">—</option>
                  <option value="potential">рассматривается</option>
                  <option value="quoted">КП получено</option>
                  <option value="selected">выбран</option>
                  <option value="contracted">договор ✓</option>
                  <option value="rejected">отклонён</option>
                </select>
              </div>
              <div class="asup-card-row asup-card-row--full">
                <label class="asup-lbl">заметки</label>
                <textarea v-model="s.notes" class="asup-inp asup-ta" rows="1" @blur="save" />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="asup-empty">Поставщики не добавлены</div>

        <button class="asup-add-btn" @click="addSupplier">+ добавить поставщика</button>
      </div>

      <!-- Notes -->
      <div class="asup-section">
        <div class="asup-section-title">общие заметки</div>
        <textarea v-model="form.sup_notes" class="asup-inp asup-ta" rows="3" @blur="save" placeholder="критерии выбора, особые условия..." />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  sup_status: '',
  sup_notes:  '',
  sup_items:  [] as any[],
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
  if (!Array.isArray(form.sup_items)) form.sup_items = []
}, { immediate: true })

const statusColor = useStatusColor(form, 'sup_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

function addSupplier() {
  form.sup_items.push({
    name: '', category: '', contact: '', email: '', website: '', status: '', notes: '',
  })
}

function removeSupplier(idx: number) {
  form.sup_items.splice(idx, 1)
  save()
}
</script>

<style scoped>
.asup-wrap { padding: 4px 0 40px; }
.asup-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.asup-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.asup-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.asup-dot--gray   { background: #ccc; }
.asup-dot--blue   { background: #6b9fd4; }
.asup-dot--yellow { background: #e8b84b; }
.asup-dot--red    { background: #d46b6b; }
.asup-dot--green  { background: #5caa7f; }
.asup-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.asup-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.asup-section { margin-bottom: 32px; }
.asup-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.asup-lbl { font-size: .72rem; color: #999; margin-bottom: 3px; }
.asup-inp { width: 100%; border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; box-sizing: border-box; }
.asup-inp:focus { border-color: #aaa; }
.asup-ta  { resize: vertical; }

/* Cards */
.asup-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.asup-card { border: 1px solid var(--border, #e0e0e0); padding: 14px; }
.asup-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.asup-card-name { font-weight: 500; }
.asup-card-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.asup-card-row { display: flex; flex-direction: column; }
.asup-card-row--full { grid-column: 1 / -1; }
.asup-del { background: none; border: none; cursor: pointer; color: #aaa; font-size: 1.1rem; }
.asup-del:hover { color: #c00; }
.asup-empty { font-size: .78rem; color: #bbb; padding: 20px 0; text-align: center; border: 1px dashed var(--border, #e0e0e0); margin-bottom: 12px; }
.asup-add-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 6px 14px; font-size: .78rem; color: #666; cursor: pointer; font-family: inherit; }
.asup-add-btn:hover { border-color: #aaa; color: inherit; }

@media (max-width: 640px) {
  .asup-cards { grid-template-columns: 1fr; }
}
</style>
