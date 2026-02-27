<template>
  <div>
    <div class="a-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;margin-bottom:16px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">подрядчики</span>
      <button class="a-btn-save" @click="openCreate" style="padding:7px 18px;font-size:.82rem">+ добавить</button>
    </div>

    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else>
      <div
        v-for="c in contractors"
        :key="c.id"
        class="a-card"
        style="padding:16px 20px;margin-bottom:8px"
      >
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div>
            <div style="font-size:.9rem;font-weight:500;color:#1a1a1a;margin-bottom:3px">{{ c.name }}</div>
            <div v-if="c.companyName" style="font-size:.78rem;color:#888">{{ c.companyName }}</div>
            <div style="font-size:.76rem;color:#aaa;margin-top:2px">
              <span v-if="c.phone">{{ c.phone }}&nbsp;&nbsp;</span>
              <span>PIN: {{ c.pin || '—' }}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="a-btn-sm" @click="openEdit(c)">изменить</button>
            <button class="a-btn-sm a-btn-danger" @click="del(c.id)">удалить</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Форма создания/редактирования -->
    <div v-if="showModal" class="a-modal-backdrop" @click.self="closeModal">
      <div class="a-modal" style="width:460px">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">
          {{ editingId ? 'редактировать' : 'добавить' }} подрядчика
        </h3>
        <form @submit.prevent="save">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Название *</label>
              <input v-model="form.name" class="a-input" required>
            </div>
            <div class="a-field">
              <label>Slug *</label>
              <input v-model="form.slug" class="a-input" required :disabled="!!editingId">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Компания</label>
              <input v-model="form.companyName" class="a-input">
            </div>
            <div class="a-field">
              <label>PIN</label>
              <input v-model="form.pin" class="a-input">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Телефон</label>
              <input v-model="form.phone" class="a-input">
            </div>
            <div class="a-field">
              <label>Email</label>
              <input v-model="form.email" class="a-input">
            </div>
          </div>
          <div class="a-field">
            <label>Типы работ подрядчика</label>
            <select v-model="form.workTypes" class="a-input" multiple size="6" style="border:1px solid #ddd;padding:8px">
              <option v-for="opt in CONTRACTOR_WORK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <p v-if="formError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ formError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="closeModal">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: contractors, pending, refresh } = await useFetch<any[]>('/api/contractors')

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)
const form = reactive({ name: '', slug: '', companyName: '', pin: '', phone: '', email: '', workTypes: [] as string[] })

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', slug: '', companyName: '', pin: '', phone: '', email: '', workTypes: [] })
  showModal.value = true
}

function openEdit(c: any) {
  editingId.value = c.id
  form.name = c.name
  form.slug = c.slug
  form.companyName = c.companyName || ''
  form.pin = c.pin || ''
  form.phone = c.phone || ''
  form.email = c.email || ''
  form.workTypes = Array.isArray(c.workTypes) ? [...c.workTypes] : []
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/contractors', { method: 'POST', body: form })
    }
    closeModal()
    refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('Удалить подрядчика?')) return
  await $fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  refresh()
}
</script>

<style scoped>
.a-card { background: #fff; border: 1px solid #e0e0e0; }
.a-btn-sm {
  border: 1px solid #ddd; background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
}
.a-btn-sm:hover { border-color: #1a1a1a; }
.a-btn-danger { color: #c00; border-color: #c00; }
.a-btn-danger:hover { background: #c00; color: #fff; }
.a-btn-save {
  border: 1px solid #1a1a1a; background: #1a1a1a; color: #fff;
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: #333; }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: #888; margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid #ddd;
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
}
.a-input:focus { border-bottom-color: #1a1a1a; }
.a-input:disabled { color: #aaa; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal { background: #fff; border: 1px solid #e0e0e0; padding: 32px; max-width: 90vw; }
</style>
