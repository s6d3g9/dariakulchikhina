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
              <span>PIN: {{ c.pin || '\u2014' }}</span>
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

    <!-- modal -->
    <div v-if="showModal" class="a-modal-backdrop" @click.self="closeModal">
      <div class="a-modal" style="width:600px;max-height:90vh;overflow-y:auto">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">
          {{ editingId ? 'редактировать' : 'добавить' }} подрядчика
        </h3>
        <form @submit.prevent="save">
          <!-- section: main -->
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

          <!-- section: contacts -->
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
                <option value="">\u2014</option>
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

          <!-- section: addresses -->
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

          <!-- section: requisites -->
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

          <!-- section: notes -->
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
definePageMeta({ layout: 'admin', middleware: ['admin'] })

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
  set: (v: string) => { form.workTypes = v.split(',').map(s => s.trim()).filter(Boolean) },
})

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  showModal.value = true
}

function openEdit(c: any) {
  editingId.value = c.id
  const empty = emptyForm()
  for (const key of Object.keys(empty) as (keyof typeof empty)[]) {
    ;(form as any)[key] = c[key] ?? (empty as any)[key]
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
  } catch (e: any) {
    formError.value = e.data?.message || '\u041e\u0448\u0438\u0431\u043a\u0430'
  } finally {
    saving.value = false
  }
}

async function del(id: number) {
  if (!confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0430?')) return
  await $fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  refresh()
}
</script>

<style scoped>
/* ── Card ──────────────────────────────────────────────── */
.a-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
  border-radius: 14px;
}

/* ── Section title ─────────────────────────────────────── */
.a-section-title {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-text);
  opacity: .35;
  margin: 18px 0 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--glass-border);
}

/* ── Buttons ───────────────────────────────────────────── */
.a-btn-sm {
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 5px 12px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 8px;
  color: var(--glass-text);
  opacity: .75;
  white-space: nowrap;
  transition: opacity .15s, box-shadow .15s;
}
.a-btn-sm:hover {
  opacity: 1;
  box-shadow: 0 3px 10px rgba(0,0,0,.1);
}
.a-btn-danger {
  color: rgba(200,40,40,1);
  border-color: rgba(200,40,40,.35);
  background: rgba(200,40,40,.07);
  opacity: 1;
}
.a-btn-danger:hover { background: rgba(200,40,40,.85); color: #fff; border-color: transparent; box-shadow: none; }

.a-btn-save {
  border: 1px solid var(--glass-border);
  background: var(--glass-text);
  color: var(--glass-page-bg);
  padding: 9px 22px;
  font-size: .82rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-radius: 9px;
  transition: opacity .15s;
}
.a-btn-save:hover { opacity: .82; }
.a-btn-save:disabled { opacity: .45; cursor: default; }

/* ── Form ──────────────────────────────────────────────── */
.a-field { margin-bottom: 14px; }
.a-field label {
  display: block;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: var(--glass-text);
  opacity: .45;
  margin-bottom: 6px;
}
.a-input {
  display: block; width: 100%; box-sizing: border-box;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  padding: 8px 12px;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  color: var(--glass-text);
  border-radius: 8px;
  transition: border-color .15s;
}
.a-input:focus { border-color: var(--glass-text); }
.a-input:disabled { opacity: .4; cursor: default; }
.a-select {
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  padding-right: 18px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.a-textarea {
  resize: vertical;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.5;
  color: var(--glass-text);
  font-family: inherit;
  font-size: .88rem;
  width: 100%; box-sizing: border-box;
}

/* ── Modal ─────────────────────────────────────────────── */
.a-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.a-modal {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
  border-radius: 18px;
  padding: 28px 30px;
  max-width: 90vw;
}
</style>