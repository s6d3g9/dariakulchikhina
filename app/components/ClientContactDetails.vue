<template>
  <div class="ccd-wrap glass-card">
    <!-- Личные данные -->
    <div class="ccd-section">
      <div class="ccd-title">личные данные</div>
      <div class="ccd-rows">
        <div class="ccd-row">
          <label class="ccd-lbl">ФИО</label>
          <input v-model="form.fio" class="ccd-inp" type="text" placeholder="Фамилия Имя Отчество" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Телефон</label>
          <input v-model="form.phone" class="ccd-inp" type="tel" placeholder="+7 (___) ___-__-__" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Email</label>
          <input v-model="form.email" class="ccd-inp" type="email" placeholder="name@example.com" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Мессенджер</label>
          <div class="ccd-tagsel">
            <span
              v-for="o in MESSENGER_OPTIONS" :key="o"
              class="ccd-tagopt" :class="{ 'ccd-tagopt--on': form.messenger === o }"
              @click="form.messenger = (form.messenger === o ? '' : o); save()"
            >{{ o }}</span>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Ник в мессенджере</label>
          <input v-model="form.messengerNick" class="ccd-inp" type="text" placeholder="@username" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Предпочтительный способ связи</label>
          <div class="ccd-tagsel">
            <span
              v-for="o in PREFERRED_CONTACT_OPTIONS" :key="o"
              class="ccd-tagopt" :class="{ 'ccd-tagopt--on': form.preferredContact === o }"
              @click="form.preferredContact = (form.preferredContact === o ? '' : o); save()"
            >{{ o }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Адреса -->
    <div class="ccd-section">
      <div class="ccd-title">адрес проживания и объекта</div>
      <div class="ccd-rows">
        <div class="ccd-row">
          <label class="ccd-lbl">Адрес проживания</label>
          <AppAddressInput v-model="form.address" input-class="ccd-inp" placeholder="Ваш домашний адрес" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Адрес объекта</label>
          <AppAddressInput v-model="form.objectAddress" input-class="ccd-inp" placeholder="Адрес квартиры / дома" @blur="save" />
        </div>
      </div>
    </div>

    <!-- Параметры объекта -->
    <div class="ccd-section">
      <div class="ccd-title">параметры объекта</div>
      <div class="ccd-rows">
        <div class="ccd-row">
          <label class="ccd-lbl">Тип объекта</label>
          <div class="ccd-tagsel">
            <span
              v-for="o in OBJECT_TYPE_OPTIONS" :key="o"
              class="ccd-tagopt" :class="{ 'ccd-tagopt--on': form.objectType === o }"
              @click="form.objectType = (form.objectType === o ? '' : o); save()"
            >{{ o }}</span>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Площадь (м²)</label>
          <input v-model="form.objectArea" class="ccd-inp" type="text" placeholder="85" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Количество комнат</label>
          <input v-model="form.roomCount" class="ccd-inp" type="text" placeholder="3" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Этаж</label>
          <input v-model="form.floor" class="ccd-inp" type="text" placeholder="7" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Высота потолков (м)</label>
          <input v-model="form.ceilingHeight" class="ccd-inp" type="text" placeholder="2.7" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Балкон / лоджия</label>
          <div class="ccd-tagsel">
            <span
              v-for="o in BALCONY_OPTIONS" :key="o"
              class="ccd-tagopt" :class="{ 'ccd-tagopt--on': form.hasBalcony === o }"
              @click="form.hasBalcony = (form.hasBalcony === o ? '' : o); save()"
            >{{ o }}</span>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Парковка</label>
          <div class="ccd-tagsel">
            <span
              v-for="o in PARKING_OPTIONS" :key="o"
              class="ccd-tagopt" :class="{ 'ccd-tagopt--on': form.parking === o }"
              @click="form.parking = (form.parking === o ? '' : o); save()"
            >{{ o }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ccd-footer">
      <span v-if="savedAt" class="ccd-saved">✓ сохранено {{ savedAt }}</span>
      <button class="ccd-btn" @click="save" :disabled="saving">{{ saving ? 'сохранение...' : 'сохранить' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MESSENGER_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  BALCONY_OPTIONS,
  PARKING_OPTIONS,
} from '~~/shared/constants/profile-fields'

const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({
  fio: '',
  phone: '',
  email: '',
  messenger: '',
  messengerNick: '',
  preferredContact: '',
  address: '',
  objectAddress: '',
  objectType: '',
  objectArea: '',
  roomCount: '',
  floor: '',
  ceilingHeight: '',
  hasBalcony: '',
  parking: '',
})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, {
      fio: p.profile.fio || '',
      phone: p.profile.phone || '',
      email: p.profile.email || '',
      messenger: p.profile.messenger || '',
      messengerNick: p.profile.messengerNick || '',
      preferredContact: p.profile.preferredContact || '',
      address: p.profile.address || '',
      objectAddress: p.profile.objectAddress || '',
      objectType: p.profile.objectType || '',
      objectArea: p.profile.objectArea || '',
      roomCount: p.profile.roomCount || '',
      floor: p.profile.floor || '',
      ceilingHeight: p.profile.ceilingHeight || '',
      hasBalcony: p.profile.hasBalcony || '',
      parking: p.profile.parking || '',
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
.ccd-wrap { padding: 16px; }
.ccd-section { margin-bottom: 20px; }
.ccd-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-text);
  opacity: .5;
  margin-bottom: 12px;
}
.ccd-rows { display: flex; flex-direction: column; gap: 6px; }
.ccd-row {
  display: grid;
  grid-template-columns: 190px 1fr;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--glass-border);
  padding: 8px 0;
}
.ccd-lbl {
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .6;
}
.ccd-inp {
  border: none;
  border-bottom: 1px solid var(--glass-border);
  background: transparent;
  color: var(--glass-text);
  padding: 6px 0;
  font-size: .88rem;
  font-family: inherit;
  outline: none;
}
.ccd-inp:focus { border-bottom-color: var(--glass-text); }

.ccd-row :deep(.aai-wrap) { width: 100%; }

.ccd-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
}
.ccd-saved { font-size: .75rem; color: #8bbf8b; }
.ccd-btn {
  border: none;
  background: var(--glass-bg);
  color: var(--glass-text);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: .82rem;
}
.ccd-btn:disabled { opacity: .6; cursor: default; }

/* Tag selector */
.ccd-tagsel { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }
.ccd-tagopt {
  padding: 4px 10px; font-size: .76rem; cursor: pointer; user-select: none;
  border: 1px solid var(--glass-border, #ddd); color: var(--glass-text); opacity: .6;
  transition: background .12s, color .12s, border-color .12s, opacity .12s;
}
.ccd-tagopt:hover { border-color: var(--glass-text); opacity: .85; }
.ccd-tagopt--on {
  background: var(--glass-text, #1a1a1a); color: var(--glass-bg, #fff);
  border-color: var(--glass-text, #1a1a1a); opacity: 1;
}

@media (max-width: 760px) {
  .ccd-row {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 8px;
  }
}
</style>
