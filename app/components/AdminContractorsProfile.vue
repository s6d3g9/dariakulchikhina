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
              <span v-if="c.email">{{ c.email }}&nbsp;&nbsp;</span>
              <span>PIN: {{ c.pin || '—' }}</span>
            </div>
            <div v-if="c.workTypes?.length" style="font-size:.72rem;color:#999;margin-top:3px">
              {{ c.workTypes.join(', ') }}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="a-btn-sm" @click="openEdit(c)">изменить</button>
            <button class="a-btn-sm a-btn-danger" @click="del(c.id)">удалить</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="a-modal-backdrop" @click.self="closeModal">
      <div class="a-modal" style="width:600px;max-height:90vh;overflow-y:auto">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">
          {{ editingId ? 'редактировать' : 'добавить' }} подрядчика
        </h3>
        <form @submit.prevent="save">
          <div class="a-section-title">основное</div>
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
              <label>Контактное лицо</label>
              <input v-model="form.contactPerson" class="a-input">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>PIN</label>
              <input v-model="form.pin" class="a-input">
            </div>
            <div class="a-field">
              <label>Виды работ</label>
              <input v-model="workTypesStr" class="a-input" placeholder="через запятую">
            </div>
          </div>

          <div class="a-section-title">контакты</div>
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
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Мессенджер</label>
              <select v-model="form.messenger" class="a-input a-select">
                <option value="">—</option>
                <option value="telegram">telegram</option>
                <option value="whatsapp">whatsapp</option>
                <option value="viber">viber</option>
              </select>
            </div>
            <div class="a-field">
              <label>Ник / номер мессенджера</label>
              <input v-model="form.messengerNick" class="a-input">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Сайт / портфолио</label>
              <input v-model="form.website" class="a-input" placeholder="https://">
            </div>
            <div class="a-field">&nbsp;</div>
          </div>

          <div class="a-section-title">адреса</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Юридический адрес</label>
              <input v-model="form.legalAddress" class="a-input">
            </div>
            <div class="a-field">
              <label>Фактический адрес</label>
              <input v-model="form.factAddress" class="a-input">
            </div>
          </div>

          <div class="a-section-title">реквизиты</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="a-field">
              <label>ИНН</label>
              <input v-model="form.inn" class="a-input">
            </div>
            <div class="a-field">
              <label>КПП</label>
              <input v-model="form.kpp" class="a-input">
            </div>
            <div class="a-field">
              <label>ОГРН / ОГРНИП</label>
              <input v-model="form.ogrn" class="a-input">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Банк</label>
              <input v-model="form.bankName" class="a-input">
            </div>
            <div class="a-field">
              <label>БИК</label>
              <input v-model="form.bik" class="a-input">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Расчётный счёт</label>
              <input v-model="form.settlementAccount" class="a-input">
            </div>
            <div class="a-field">
              <label>Корр. счёт</label>
              <input v-model="form.correspondentAccount" class="a-input">
            </div>
          </div>

          <div class="a-section-title">примечания</div>
          <div class="a-field">
            <textarea v-model="form.notes" class="a-input a-textarea" rows="3" placeholder="заметки о подрядчике"></textarea>
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
const { data: contractors, pending, refresh } = await useFetch<any[]>('/api/contractors')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)

const emptyForm = () => ({
  name: '', slug: '', companyName: '', contactPerson: '',
  pin: '', phone: '', email: '',
  messenger: '', messengerNick: '', website: '',
  legalAddress: '', factAddress: '',
  inn: '', kpp: '', ogrn: '',
  bankName: '', bik: '', settlementAccount: '', correspondentAccount: '',
  notes: '',
  workTypes: [] as string[],
})

const form = reactive(emptyForm())
const workTypesStr = computed({
  get: () => form.workTypes.join(', '),
  set: (value: string) => { form.workTypes = value.split(',').map(s => s.trim()).filter(Boolean) },
})

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  showModal.value = true
}

function openEdit(contractor: any) {
  editingId.value = contractor.id
  const base = emptyForm()
  for (const key of Object.keys(base) as (keyof typeof base)[]) {
    ;(form as any)[key] = contractor[key] ?? (base as any)[key]
  }
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
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: { ...form } })
    } else {
      await $fetch('/api/contractors', { method: 'POST', body: { ...form } })
    }
    closeModal()
    refresh()
  } catch (error: any) {
    formError.value = error.data?.message || 'Ошибка'
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
.a-card {
  --card-bg: #fff;
  --card-border: #e0e0e0;
  --btn-border: #ddd;
  --btn-color: #666;
  --btn-hover-border: #1a1a1a;
  --btn-hover-color: #1a1a1a;
  --danger-color: #c00;
  --save-bg: #1a1a1a;
  --save-color: #fff;
  --save-hover-bg: #333;
  --input-border: #ddd;
  --input-focus: #1a1a1a;
  --input-color: inherit;
  --input-disabled: #aaa;
  --label-color: #888;
  --modal-bg: #fff;
  --modal-border: #e0e0e0;
  --backdrop-bg: rgba(0,0,0,0.3);

  background: var(--card-bg);
  border: 1px solid var(--card-border);
}
.a-section-title {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  margin: 16px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e8e8e8;
}
.a-btn-sm {
  border: 1px solid var(--btn-border); background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
  color: var(--btn-color);
}
.a-btn-sm:hover { border-color: var(--btn-hover-border); color: var(--btn-hover-color); }
.a-btn-danger { color: var(--danger-color); border-color: var(--danger-color); }
.a-btn-danger:hover { background: #c00; color: #fff; }
.a-btn-save {
  border: 1px solid var(--save-bg); background: var(--save-bg); color: var(--save-color);
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: var(--save-hover-bg); }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: var(--label-color); margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid var(--input-border);
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
  color: var(--input-color); background: transparent;
}
.a-input:focus { border-bottom-color: var(--input-focus); }
.a-input:disabled { color: var(--input-disabled); }
.a-select {
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 0;
  padding-right: 18px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
}
.a-textarea {
  resize: vertical;
  border: 1px solid var(--input-border);
  padding: 8px;
  border-radius: 2px;
  line-height: 1.5;
}
.a-modal-backdrop {
  position: fixed; inset: 0; background: var(--backdrop-bg);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: var(--modal-bg); border: 1px solid var(--modal-border);
  padding: 32px; max-width: 90vw;
}
</style>
