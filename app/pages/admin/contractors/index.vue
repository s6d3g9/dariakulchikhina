<template>
  <div>
    <div class="a-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;margin-bottom:16px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">подрядчики</span>
      <button class="a-btn-save" @click="openCreate" style="padding:7px 18px;font-size:.82rem">+ добавить</button>
    </div>

    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else>
      <!-- ── Компании-подрядчики с мастерами ──────────────── -->
      <div v-for="company in companies" :key="company.id" class="a-company-group">
        <div class="a-card" style="padding:14px 20px;margin-bottom:4px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span class="a-type-badge a-type-company">подрядчик</span>
                <span style="font-size:.9rem;font-weight:500">{{ company.name }}</span>
              </div>
              <div v-if="company.companyName" style="font-size:.78rem;color:#888">{{ company.companyName }}</div>
              <div style="font-size:.76rem;color:#aaa;margin-top:2px">
                <span v-if="company.phone">{{ company.phone }}&nbsp;&nbsp;</span>
                <span v-if="company.email">{{ company.email }}&nbsp;&nbsp;</span>
                <span style="color:#888">ID: <b>{{ company.id }}</b></span>
              </div>
              <div v-if="company.linkedProjectTitles?.length" class="a-linked-projects">
                <span v-for="t in company.linkedProjectTitles" :key="t" class="a-linked-proj-chip">{{ t }}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="a-btn-sm a-btn-add-master" @click="openCreateMaster(company.id)">+ мастер</button>
              <NuxtLink :to="`/contractor/${company.id}`" target="_blank" class="a-btn-sm a-btn-cabinet">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                кабинет
              </NuxtLink>
              <button class="a-btn-sm" @click="openEdit(company)">изменить</button>
              <button class="a-btn-sm a-btn-danger" @click="del(company.id)">удалить</button>
            </div>
          </div>
        </div>

        <!-- Мастера данной компании -->
        <div
          v-for="m in (mastersByParent.get(company.id) || [])" :key="m.id"
          class="a-card a-master-row"
          style="padding:12px 20px 12px 44px;margin-bottom:4px"
        >
          <div style="display:flex;align-items:flex-start;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                <span class="a-type-badge a-type-master">мастер</span>
                <span style="font-size:.88rem;font-weight:500">{{ m.name }}</span>
              </div>
              <div style="font-size:.76rem;color:#aaa;margin-top:2px">
                <span v-if="m.phone">{{ m.phone }}&nbsp;&nbsp;</span>
                <span v-if="m.email">{{ m.email }}&nbsp;&nbsp;</span>
                <span style="color:#888">ID: <b>{{ m.id }}</b></span>
              </div>
              <div v-if="m.linkedProjectTitles?.length" class="a-linked-projects">
                <span v-for="t in m.linkedProjectTitles" :key="t" class="a-linked-proj-chip">{{ t }}</span>
              </div>
              <div v-if="m.workTypes?.length" style="font-size:.72rem;color:#999;margin-top:2px">{{ m.workTypes.join(', ') }}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <NuxtLink :to="`/contractor/${m.id}`" target="_blank" class="a-btn-sm a-btn-cabinet">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                кабинет
              </NuxtLink>
              <button class="a-btn-sm" @click="openEdit(m)">изменить</button>
              <button class="a-btn-sm a-btn-danger" @click="del(m.id)">удалить</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Самозанятые мастера (без компании) ────────────── -->
      <div v-if="standaloneMasters.length" style="margin-top:20px">
        <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.8px;color:#aaa;margin-bottom:8px;padding:0 4px">
          частные мастера / самозанятые
        </div>
        <div
          v-for="m in standaloneMasters" :key="m.id"
          class="a-card"
          style="padding:14px 20px;margin-bottom:6px"
        >
          <div style="display:flex;align-items:flex-start;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span class="a-type-badge a-type-master">мастер</span>
                <span style="font-size:.9rem;font-weight:500">{{ m.name }}</span>
              </div>
              <div style="font-size:.76rem;color:#aaa;margin-top:2px">
                <span v-if="m.phone">{{ m.phone }}&nbsp;&nbsp;</span>
                <span v-if="m.email">{{ m.email }}&nbsp;&nbsp;</span>
                <span style="color:#888">ID: <b>{{ m.id }}</b></span>
              </div>
              <div v-if="m.linkedProjectTitles?.length" class="a-linked-projects">
                <span v-for="t in m.linkedProjectTitles" :key="t" class="a-linked-proj-chip">{{ t }}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <NuxtLink :to="`/contractor/${m.id}`" target="_blank" class="a-btn-sm a-btn-cabinet">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                кабинет
              </NuxtLink>
              <button class="a-btn-sm" @click="openEdit(m)">изменить</button>
              <button class="a-btn-sm a-btn-danger" @click="del(m.id)">удалить</button>
            </div>
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
          <!-- section: type -->
          <div class="a-section-title">тип участника</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
            <div class="a-field">
              <label>Тип</label>
              <select v-model="form.contractorType" class="a-input a-select">
                <option value="master">Мастер (частный специалист)</option>
                <option value="company">Подрядчик (организация)</option>
              </select>
            </div>
            <div v-if="form.contractorType === 'master'" class="a-field">
              <label>Компания-работодатель</label>
              <select v-model="form.parentId" class="a-input a-select">
                <option :value="null">— самозанятый —</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <!-- section: projects (edit only) -->
          <template v-if="isEditMode">
            <div class="a-section-title">проекты</div>
            <div v-if="projectsLoading" style="font-size:.8rem;color:#aaa;margin-bottom:12px">Загрузка проектов...</div>
            <div v-else-if="projectsError" style="font-size:.8rem;color:#c00;margin-bottom:12px">{{ projectsError }}</div>
            <div v-else-if="!allProjects.length" style="font-size:.8rem;color:#aaa;margin-bottom:12px">Нет проектов</div>
            <div v-else class="a-projects-grid">
              <label
                v-for="p in allProjects" :key="p.id"
                class="a-project-check"
                :class="{ 'a-project-check--on': selectedProjectIds.includes(p.id) }"
                @click.prevent="toggleProject(p.id)"
              >
                <span class="a-project-check-dot" />
                <span>{{ p.title }}</span>
              </label>
            </div>
          </template>
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
const isEditMode = ref(false)
const selectedProjectIds = ref<number[]>([])
const originalProjectIds = ref<number[]>([])
const allProjects = ref<any[]>([])
const projectsLoading = ref(false)
const projectsError = ref('')

function toggleProject(id: number) {
  const idx = selectedProjectIds.value.indexOf(id)
  if (idx === -1) selectedProjectIds.value = [...selectedProjectIds.value, id]
  else selectedProjectIds.value = selectedProjectIds.value.filter(x => x !== id)
}

const emptyForm = () => ({
  name: '', slug: '', companyName: '', contactPerson: '',
  pin: '', phone: '', email: '',
  messenger: '', messengerNick: '', website: '',
  legalAddress: '', factAddress: '',
  inn: '', kpp: '', ogrn: '',
  bankName: '', bik: '', settlementAccount: '', correspondentAccount: '',
  notes: '',
  workTypes: [] as string[],
  contractorType: 'master' as 'master' | 'company',
  parentId: null as number | null,
})

const form = reactive(emptyForm())

const companies = computed(() =>
  (contractors.value || []).filter((c: any) => c.contractorType === 'company')
)

const mastersByParent = computed(() => {
  const map = new Map<number, any[]>()
  for (const c of contractors.value || []) {
    if (c.contractorType === 'master' && c.parentId) {
      if (!map.has(c.parentId)) map.set(c.parentId, [])
      map.get(c.parentId)!.push(c)
    }
  }
  return map
})

const standaloneMasters = computed(() =>
  (contractors.value || []).filter((c: any) => c.contractorType === 'master' && !c.parentId)
)

const workTypesStr = computed({
  get: () => form.workTypes.join(', '),
  set: (v: string) => { form.workTypes = v.split(',').map(s => s.trim()).filter(Boolean) },
})

function openCreate() {
  editingId.value = null
  isEditMode.value = false
  Object.assign(form, emptyForm())
  showModal.value = true
}

function openCreateMaster(companyId: number) {
  editingId.value = null
  isEditMode.value = false
  Object.assign(form, emptyForm())
  form.contractorType = 'master'
  form.parentId = companyId
  showModal.value = true
}

async function openEdit(c: any) {
  editingId.value = c.id
  isEditMode.value = true
  const empty = emptyForm()
  for (const key of Object.keys(empty) as (keyof typeof empty)[]) {
    ;(form as any)[key] = c[key] ?? (empty as any)[key]
  }
  selectedProjectIds.value = []
  originalProjectIds.value = []
  allProjects.value = []
  projectsLoading.value = true
  projectsError.value = ''
  showModal.value = true
  try {
    const [projs, linked] = await Promise.all([
      $fetch<any[]>('/api/projects'),
      $fetch<any[]>(`/api/contractors/${c.id}/projects`),
    ])
    allProjects.value = projs
    const ids = linked.map((p: any) => Number(p.id))
    selectedProjectIds.value = ids
    originalProjectIds.value = [...ids]
  } catch (e: any) {
    projectsError.value = e?.data?.message || 'Ошибка загрузки проектов'
  } finally {
    projectsLoading.value = false
  }
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  isEditMode.value = false
  selectedProjectIds.value = []
  originalProjectIds.value = []
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: { ...form } })      // sync project links
      const toAdd = [...selectedProjectIds.value].filter(id => !originalProjectIds.value.includes(id))
      const toRemove = [...originalProjectIds.value].filter(id => !selectedProjectIds.value.includes(id))
      const projectMap = Object.fromEntries((allProjects.value || []).map((p: any) => [p.id, p.slug]))
      await Promise.all([
        ...toAdd.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors`, { method: 'POST', body: { contractorId: editingId.value } })),
        ...toRemove.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors/${editingId.value}`, { method: 'DELETE' })),
      ])    } else {
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
.a-btn-cabinet {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  font-family: inherit;
  color: var(--glass-page-bg);
  background: var(--glass-text);
  border: none;
  opacity: .75;
  transition: opacity .15s;
}
.a-btn-cabinet:hover { opacity: 1; box-shadow: none; background: var(--glass-text); }

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

/* ── Type badges ────────────────────────────────────────── */
.a-type-badge {
  display: inline-block;
  font-size: .65rem;
  text-transform: uppercase;
  letter-spacing: .6px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.a-type-company {
  background: rgba(160,110,30,0.12);
  color: rgba(140,90,15,1);
  border: 1px solid rgba(160,110,30,0.25);
}
.dark .a-type-company { background: rgba(200,160,60,0.15); color: rgba(200,160,60,1); }
.a-type-master {
  background: rgba(60,100,200,0.1);
  color: rgba(50,90,190,1);
  border: 1px solid rgba(60,100,200,0.22);
}
.dark .a-type-master { background: rgba(100,140,255,0.15); color: rgba(130,165,255,1); }

/* ── Add master button ──────────────────────────────────── */
.a-btn-add-master {
  color: rgba(50,90,190,1);
  border-color: rgba(60,100,200,0.3);
  background: rgba(60,100,200,0.06);
}
.a-btn-add-master:hover { background: rgba(60,100,200,0.15); }

/* ── Company group indent ───────────────────────────────── */
.a-company-group { margin-bottom: 12px; }
.a-master-row {
  border-left: 3px solid rgba(60,100,200,0.2);
  border-radius: 0 10px 10px 0 !important;
  margin-left: 16px;
}

/* ── Project checkboxes ─────────────────────────────────── */
.a-projects-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 4px;
}
.a-project-check {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: .8rem;
  color: var(--glass-text);
  opacity: .6;
  transition: all .12s;
  user-select: none;
}
.a-project-check:hover { opacity: .9; }
.a-project-check--on {
  border-color: #6366f1;
  background: rgba(99,102,241,.08);
  color: #6366f1;
  opacity: 1;
}
.dark .a-project-check--on { background: rgba(99,102,241,.15); color: #818cf8; }
.a-project-check-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  flex-shrink: 0;
  transition: background .12s;
}
.a-project-check--on .a-project-check-dot {
  background: #6366f1;
  border-color: #6366f1;
}
.dark .a-project-check--on { background: rgba(99,102,241,.15); color: #818cf8; }
.dark .a-project-check--on .a-project-check-dot { background: #818cf8; border-color: #818cf8; }

/* ── Linked project chips on cards ─────────────────────── */
.a-linked-projects { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.a-linked-proj-chip {
  font-size: .68rem; padding: 2px 7px;
  border: 1px solid rgba(99,102,241,.25);
  border-radius: 10px;
  color: #6366f1;
  background: rgba(99,102,241,.07);
}
.dark .a-linked-proj-chip { background: rgba(99,102,241,.13); }
</style>