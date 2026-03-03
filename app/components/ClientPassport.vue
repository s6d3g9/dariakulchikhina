<template>
  <div class="cpp-wrap glass-card">
    <div class="cpp-section">
      <div class="cpp-title">🔒 паспортные данные</div>
      <p class="cpp-hint">Для оформления договоров и юридических документов. Данные хранятся конфиденциально и не передаются третьим лицам.</p>

      <div class="cpp-rows">
        <div class="cpp-row">
          <label class="cpp-lbl">Серия паспорта</label>
          <input v-model="form.passport_series" class="cpp-inp" type="text" placeholder="45 09" maxlength="5" @blur="save" />
        </div>
        <div class="cpp-row">
          <label class="cpp-lbl">Номер паспорта</label>
          <input v-model="form.passport_number" class="cpp-inp" type="text" placeholder="123456" maxlength="6" @blur="save" />
        </div>
        <div class="cpp-row cpp-row--full">
          <label class="cpp-lbl">Кем выдан</label>
          <input v-model="form.passport_issued_by" class="cpp-inp" type="text" placeholder="ГУ МВД России по г. Москве" @blur="save" />
        </div>
        <div class="cpp-row">
          <label class="cpp-lbl">Дата выдачи</label>
          <input v-model="form.passport_issue_date" class="cpp-inp" type="text" placeholder="01.03.2020" @blur="save" />
        </div>
        <div class="cpp-row">
          <label class="cpp-lbl">Код подразделения</label>
          <input v-model="form.passport_department_code" class="cpp-inp" type="text" placeholder="770-001" maxlength="7" @blur="save" />
        </div>
        <div class="cpp-row cpp-row--full">
          <label class="cpp-lbl">Место рождения</label>
          <input v-model="form.passport_birth_place" class="cpp-inp" type="text" placeholder="г. Москва" @blur="save" />
        </div>
        <div class="cpp-row cpp-row--full">
          <label class="cpp-lbl">Адрес регистрации (прописка)</label>
          <input v-model="form.passport_registration_address" class="cpp-inp" type="text" placeholder="г. Москва, ул. Пушкина, д. 10, кв. 5" @blur="save" />
        </div>
      </div>
    </div>

    <div class="cpp-section">
      <div class="cpp-title">ИНН и СНИЛС</div>
      <div class="cpp-rows">
        <div class="cpp-row">
          <label class="cpp-lbl">ИНН</label>
          <input v-model="form.passport_inn" class="cpp-inp" type="text" placeholder="770000000000" maxlength="12" @blur="save" />
        </div>
        <div class="cpp-row">
          <label class="cpp-lbl">СНИЛС</label>
          <input v-model="form.passport_snils" class="cpp-inp" type="text" placeholder="000-000-000 00" maxlength="14" @blur="save" />
        </div>
      </div>
    </div>

    <div class="cpp-footer">
      <span v-if="savedAt" class="cpp-saved">✓ сохранено {{ savedAt }}</span>
      <button class="cpp-btn" :disabled="saving" @click="save">{{ saving ? 'сохранение...' : 'сохранить' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const form = reactive<Record<string, any>>({
  passport_series: '',
  passport_number: '',
  passport_issued_by: '',
  passport_issue_date: '',
  passport_department_code: '',
  passport_birth_place: '',
  passport_registration_address: '',
  passport_inn: '',
  passport_snils: '',
})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, {
      passport_series: p.profile.passport_series || '',
      passport_number: p.profile.passport_number || '',
      passport_issued_by: p.profile.passport_issued_by || '',
      passport_issue_date: p.profile.passport_issue_date || '',
      passport_department_code: p.profile.passport_department_code || '',
      passport_birth_place: p.profile.passport_birth_place || '',
      passport_registration_address: p.profile.passport_registration_address || '',
      passport_inn: p.profile.passport_inn || '',
      passport_snils: p.profile.passport_snils || '',
    })
  }
}, { immediate: true })

const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  if (pending.value) return
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/client-profile`, {
      method: 'PUT',
      body: { ...form },
    })
    if (project.value?.profile) {
      Object.assign(project.value.profile, { ...form })
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cpp-wrap { padding: 16px; }
.cpp-section { margin-bottom: 20px; }
.cpp-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-text);
  opacity: .5;
  margin-bottom: 8px;
}
.cpp-hint {
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .45;
  margin: 0 0 14px;
  line-height: 1.5;
  padding: 10px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.cpp-rows { display: flex; flex-direction: column; gap: 6px; }
.cpp-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: center;
  gap: 8px;
}
.cpp-row--full {
  grid-template-columns: 200px 1fr;
}
.cpp-lbl {
  font-size: .76rem;
  color: var(--glass-text);
  opacity: .6;
  text-align: right;
  padding-right: 6px;
}
.cpp-inp {
  border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text);
  padding: 8px 10px;
  border-radius: var(--input-radius, 8px);
  font-size: .82rem;
  font-family: inherit;
  outline: none;
  transition: background .15s ease;
}
.cpp-inp:focus {
  background: color-mix(in srgb, var(--glass-text) 9%, transparent);
}
.cpp-inp::placeholder { opacity: .3; }
.cpp-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
}
.cpp-saved {
  font-size: .72rem;
  color: var(--glass-text);
  opacity: .4;
}
.cpp-btn {
  padding: 8px 20px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border: none;
  border-radius: var(--input-radius, 8px);
  background: var(--ds-accent, #6366f1);
  color: #fff;
  transition: opacity .15s;
}
.cpp-btn:hover { opacity: .85; }
.cpp-btn:disabled { opacity: .45; cursor: default; }

@media (max-width: 640px) {
  .cpp-row { grid-template-columns: 1fr; }
  .cpp-lbl { text-align: left; padding: 0; }
}
</style>
