<template>
  <div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">Мой профиль</h1>
    </div>

    <div v-if="pending" class="page-loading">Загрузка…</div>
    <template v-else-if="designer">

      <div class="tabs-nav">
        <button v-for="t in tabs" :key="t.key" @click="activeTab=t.key"
          class="tab-btn" :class="{ active: activeTab===t.key }">
          {{ t.label }}
        </button>
      </div>

      <!-- Tab: О себе -->
      <div v-if="activeTab==='about'" class="tab-panel glass-surface">
        <form @submit.prevent="saveAbout">
          <div class="field-row">
            <div class="field">
              <label>Имя / ФИО</label>
              <input v-model="ab.name" class="input" />
            </div>
            <div class="field">
              <label>Город</label>
              <input v-model="ab.city" class="input" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Телефон</label>
              <input v-model="ab.phone" type="tel" class="input" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model="ab.email" type="email" class="input" />
            </div>
            <div class="field">
              <label>Telegram</label>
              <input v-model="ab.telegram" class="input" placeholder="@username" />
            </div>
            <div class="field">
              <label>Сайт</label>
              <input v-model="ab.website" class="input" placeholder="https://…" />
            </div>
          </div>
          <div class="field">
            <label>Специализации (через запятую)</label>
            <input v-model="specializationsText" class="input" placeholder="Квартиры, Офисы, Загородные дома…" />
          </div>
          <div class="field">
            <label>Стаж</label>
            <input v-model="ab.experience" class="input" placeholder="8 лет" />
          </div>
          <div class="field">
            <label>О себе</label>
            <textarea v-model="ab.about" rows="4" class="input" placeholder="Расскажите о себе…"></textarea>
          </div>
          <div class="field">
            <label>Доступность</label>
            <select v-model="ab.availabilityStatus" class="input">
              <option value="free">Свободен</option>
              <option value="busy">Занят</option>
              <option value="paused">Пауза</option>
            </select>
          </div>
          <div class="form-actions">
            <span v-if="abSaved" class="saved-msg">✓ Сохранено</span>
            <button type="submit" :disabled="abSaving" class="btn-primary">
              {{ abSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Tab: Услуги -->
      <div v-if="activeTab==='services'" class="tab-panel glass-surface">
        <!-- Packages -->
        <div class="services-block">
          <h2 class="block-title">Пакеты услуг</h2>
          <div v-for="(pkg, i) in packages" :key="i" class="service-item">
            <div class="field-row">
              <div class="field"><label>Название</label><input v-model="pkg.name" class="input" /></div>
              <div class="field"><label>Цена за м², ₽</label><input v-model.number="pkg.pricePerSqm" type="number" class="input" /></div>
              <div class="field field-wide"><label>Описание</label><input v-model="pkg.description" class="input" /></div>
              <div class="field-action">
                <button @click="packages.splice(i,1)" class="btn-icon-danger">✕</button>
              </div>
            </div>
          </div>
          <button @click="packages.push({name:'',pricePerSqm:0,description:''})" class="btn-add">+ Добавить пакет</button>
        </div>

        <!-- Services -->
        <div class="services-block">
          <h2 class="block-title">Прайс услуг</h2>
          <div v-for="(svc, i) in services" :key="i" class="service-item">
            <div class="field-row">
              <div class="field field-wide"><label>Услуга</label><input v-model="svc.name" class="input" /></div>
              <div class="field"><label>Цена</label><input v-model="svc.price" class="input" placeholder="от 3000 ₽/м²" /></div>
              <div class="field-action">
                <button @click="services.splice(i,1)" class="btn-icon-danger">✕</button>
              </div>
            </div>
          </div>
          <button @click="services.push({name:'',price:''})" class="btn-add">+ Добавить услугу</button>
        </div>

        <div class="form-actions">
          <span v-if="svcSaved" class="saved-msg">✓ Сохранено</span>
          <button @click="saveServices" :disabled="svcSaving" class="btn-primary">
            {{ svcSaving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'designer', middleware: 'designer' })

const { data: designer, pending, refresh } = await useFetch<any>('/api/designer/me')

const tabs = [
  { key: 'about', label: 'О себе' },
  { key: 'services', label: 'Услуги и пакеты' },
]
const activeTab = ref('about')

// About form
const ab = reactive({
  name: '',
  city: '',
  phone: '',
  email: '',
  telegram: '',
  website: '',
  experience: '',
  about: '',
  availabilityStatus: 'free',
})
const specializationsText = ref('')
const abSaving = ref(false)
const abSaved = ref(false)

// Services
const packages = ref<any[]>([])
const services = ref<any[]>([])
const svcSaving = ref(false)
const svcSaved = ref(false)

watch(designer, (d) => {
  if (!d) return
  Object.assign(ab, {
    name: d.name || '',
    city: d.city || '',
    phone: d.phone || '',
    email: d.email || '',
    telegram: d.telegram || '',
    website: d.website || '',
    experience: d.experience || '',
    about: d.about || '',
    availabilityStatus: d.availabilityStatus || 'free',
  })
  specializationsText.value = (d.specializations || []).join(', ')
  packages.value = JSON.parse(JSON.stringify(d.packages || []))
  services.value = JSON.parse(JSON.stringify(d.services || []))
}, { immediate: true })

async function saveAbout() {
  abSaving.value = true
  try {
    await $fetch('/api/designer/me', {
      method: 'PUT',
      body: {
        ...ab,
        specializations: specializationsText.value.split(',').map((s: string) => s.trim()).filter(Boolean),
      },
    })
    abSaved.value = true
    setTimeout(() => { abSaved.value = false }, 2000)
    await refresh()
  } finally {
    abSaving.value = false
  }
}

async function saveServices() {
  svcSaving.value = true
  try {
    await $fetch('/api/designer/me', {
      method: 'PUT',
      body: { packages: packages.value, services: services.value },
    })
    svcSaved.value = true
    setTimeout(() => { svcSaved.value = false }, 2000)
    await refresh()
  } finally {
    svcSaving.value = false
  }
}
</script>

<style scoped>
.profile-page { padding: 0; }
.page-loading { padding: 3rem; text-align: center; color: var(--glass-label,#888); }

.page-header { margin-bottom: 1.25rem; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--glass-text,#111); }

.tabs-nav {
  display: flex;
  border-bottom: 2px solid var(--glass-border,#eee);
  margin-bottom: 1rem;
}
.tab-btn {
  padding: 0.65rem 1.1rem;
  background: none; border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer; font-size: 0.875rem; font-weight: 500;
  color: var(--glass-label,#888); transition: color 0.15s;
}
.tab-btn:hover { color: var(--glass-text,#333); }
.tab-btn.active { color: var(--glass-accent,#6366f1); border-bottom-color: var(--glass-accent,#6366f1); font-weight: 600; }

.tab-panel { border-radius: 12px; padding: 1.5rem; }

.field { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 140px; }
.field label { font-size: 0.78rem; font-weight: 500; color: var(--glass-label,#666); }
.field-wide { flex: 2; }
.field-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem; }
.field-action { display: flex; align-items: flex-end; padding-bottom: 0.1rem; }

.input {
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border,#ddd);
  background: var(--glass-input-bg,rgba(255,255,255,0.6));
  color: var(--glass-text,#111);
  font-size: 0.875rem;
  outline: none; width: 100%; box-sizing: border-box;
  transition: border-color 0.15s;
}
.input:focus { border-color: var(--glass-accent,#6366f1); }
textarea.input { resize: vertical; }

.form-actions {
  display: flex; justify-content: flex-end;
  align-items: center; gap: 1rem; margin-top: 0.75rem;
}
.saved-msg { font-size: 0.85rem; color: #16a34a; }

.btn-primary {
  padding: 0.5rem 1.1rem; background: var(--glass-accent,#6366f1);
  color: #fff; border: none; border-radius: 8px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-icon-danger {
  background: none; border: none; color: #dc2626;
  cursor: pointer; font-size: 0.9rem; padding: 0.25rem; opacity: 0.5; transition: opacity 0.1s;
}
.btn-icon-danger:hover { opacity: 1; }

.services-block { margin-bottom: 1.5rem; }
.block-title { font-size: 0.95rem; font-weight: 700; margin: 0 0 0.75rem; color: var(--glass-text,#111); }
.service-item { margin-bottom: 0.5rem; }

.btn-add {
  background: none; border: 1px dashed var(--glass-border,#ddd);
  color: var(--glass-accent,#6366f1); cursor: pointer;
  padding: 0.45rem 0.9rem; border-radius: 8px; font-size: 0.85rem;
  transition: background 0.1s;
}
.btn-add:hover { background: color-mix(in srgb, var(--glass-accent,#6366f1) 6%, transparent); }
</style>
