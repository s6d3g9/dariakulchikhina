<template>
  <div class="ws-admin">
    <div class="ws-header">
      <span class="ws-count">{{ items?.length || 0 }} задач</span>
      <div class="ws-header-actions">
        <button class="ws-btn" @click="addItem">+ добавить</button>
        <button class="ws-btn ws-btn--save" @click="save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </div>
    <div v-if="pending" class="ws-loading">Загрузка...</div>
    <div v-else class="ws-list">
      <div v-for="(item, idx) in items" :key="idx" class="ws-card">
        <!-- row 1: title + status -->
        <div class="ws-row">
          <div class="ws-field ws-field--wide">
            <label class="ws-lbl">задача</label>
            <input v-model="item.title" class="ws-inp" placeholder="название задачи" />
          </div>
          <div class="ws-field ws-field--sm">
            <label class="ws-lbl">статус</label>
            <select v-model="item.status" class="ws-inp ws-select">
              <option value="pending">ожидание</option>
              <option value="planned">запланировано</option>
              <option value="in_progress">в работе</option>
              <option value="done">выполнено</option>
              <option value="paused">на паузе</option>
              <option value="cancelled">отменено</option>
            </select>
          </div>
        </div>
        <!-- row 1b: work type -->
        <div class="ws-row">
          <div class="ws-field">
            <label class="ws-lbl">вид работ</label>
            <select v-model="item.workType" class="ws-inp ws-select">
              <option :value="null">— не указан —</option>
              <option v-for="w in WORK_TYPE_OPTIONS" :key="w.value" :value="w.value">{{ w.label }}</option>
            </select>
          </div>
        </div>
        <!-- row 2: dates + budget + contractor -->
        <div class="ws-row">
          <div class="ws-field">
            <label class="ws-lbl">начало</label>
            <AppDatePicker v-model="item.dateStart" input-class="ws-inp" />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">конец</label>
            <AppDatePicker v-model="item.dateEnd" input-class="ws-inp" />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">бюджет</label>
            <input v-model="item.budget" class="ws-inp" placeholder="0 руб." />
          </div>
          <div class="ws-field">
            <label class="ws-lbl">подрядчик</label>
            <select v-model="item.contractorId" class="ws-inp ws-select">
              <option :value="null">—</option>
              <option v-for="c in contractors" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <!-- row 3: notes -->
        <div class="ws-row">
          <div class="ws-field ws-field--full">
            <label class="ws-lbl">примечание</label>
            <textarea v-model="item.notes" class="ws-inp ws-ta" rows="2" placeholder="комментарий к задаче"></textarea>
          </div>
        </div>
        <div class="ws-del-row">
          <button class="ws-del" @click="items.splice(idx, 1)">удалить задачу</button>
        </div>
      </div>
    </div>
    <p v-if="error" class="ws-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'
const WORK_TYPE_OPTIONS = CONTRACTOR_WORK_TYPE_OPTIONS
const props = defineProps<{ slug: string }>()

const { data: rawItems, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/work-status`, { server: false }
)
const { data: contractors } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`, { server: false, default: () => [] }
)

const items = ref<any[]>([])
const saving = ref(false)
const error = ref('')

watch(rawItems, (v) => {
  items.value = (v || []).map((i: any) => ({ ...i, contractorId: i.contractorId ?? null }))
}, { immediate: true })

function addItem() {
  items.value.push({ title: '', status: 'pending', workType: null, dateStart: '', dateEnd: '', budget: '', notes: '', contractorId: null })
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/work-status`, {
      method: 'PUT',
      body: { items: items.value }
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ws-admin { padding: 4px 0; }
.ws-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ws-count { font-size: .78rem; color: #999; text-transform: uppercase; letter-spacing: .5px; }
.ws-header-actions { display: flex; gap: 8px; }
.ws-loading { font-size: .86rem; color: #999; padding: 12px 0; }
.ws-error { font-size: .8rem; color: #c00; margin-top: 12px; }

.ws-btn {
  padding: 6px 14px; border: 1px solid #ddd; background: transparent;
  font-size: .8rem; cursor: pointer; font-family: inherit; border-radius: 4px;
  color: #555; transition: border-color .12s;
}
.ws-btn:hover { border-color: #999; }
.ws-btn--save { background: #1a1a1a; border-color: #1a1a1a; color: #fff; }
.ws-btn--save:hover { background: #333; }
.ws-btn--save:disabled { opacity: .5; cursor: not-allowed; }
.dark .ws-btn { border-color: #3a3a3a; color: #bbb; }
.dark .ws-btn--save { background: #6366f1; border-color: #6366f1; color: #fff; }

.ws-list { display: grid; gap: 10px; }
.ws-card {
  border: 1px solid #e4e4e4;
  padding: 16px;
  background: #fff;
  border-radius: 2px;
}
.dark .ws-card { border-color: #2a2a2a; background: #1c1c1e; }

.ws-row { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-end; flex-wrap: wrap; }
.ws-row:last-of-type { margin-bottom: 0; }
.ws-field { display: flex; flex-direction: column; min-width: 120px; flex: 1; }
.ws-field--wide { flex: 2; }
.ws-field--sm  { flex: 0 0 180px; min-width: 140px; }
.ws-field--full { flex: 1 0 100%; }

.ws-lbl { font-size: .68rem; color: #aaa; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.ws-inp {
  border: 1px solid #e0e0e0; border-radius: 2px;
  padding: 6px 8px; font-size: .86rem; font-family: inherit;
  background: transparent; color: inherit; outline: none;
}
.ws-inp:focus { border-color: #6366f1; }
.dark .ws-inp { border-color: #3a3a3a; }
.ws-select {
  cursor: pointer; -webkit-appearance: none; appearance: none;
  padding-right: 22px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 6px center;
}
.ws-ta { resize: vertical; line-height: 1.5; }
.ws-del-row { text-align: right; margin-top: 8px; }
.ws-del { background: none; border: none; font-size: .76rem; color: #c00; cursor: pointer; font-family: inherit; }
.ws-del:hover { text-decoration: underline; }
</style>
