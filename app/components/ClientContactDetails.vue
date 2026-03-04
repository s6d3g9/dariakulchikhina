<template>
  <div class="ccd-wrap glass-card">
    <!-- Личные данные -->
    <div class="ccd-section">
      <div class="ccd-title">личные данные</div>
      <div class="ccd-rows">
        <div class="ccd-row">
          <label class="ccd-lbl">ФИО</label>
          <input v-model="form.fio" class="glass-input" type="text" placeholder="Фамилия Имя Отчество" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Телефон</label>
          <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Email</label>
          <input v-model="form.email" class="glass-input" type="email" placeholder="name@example.com" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Мессенджер</label>
          <div class="ccd-tagsel">
            <div class="ccd-tagpicker-title">Выбрано</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in selectedSingleOption(form.messenger)"
                :key="`messenger-selected-${option}`"
                type="button"
                class="ccd-tagopt ccd-tagopt--on"
                @click="toggleSingleChoiceAndSave('messenger', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
            <div class="ccd-tagpicker-title" style="margin-top: 8px">Доступно</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in availableSingleOptions(MESSENGER_OPTIONS, form.messenger)"
                :key="`messenger-available-${option}`"
                type="button"
                class="ccd-tagopt"
                @click="toggleSingleChoiceAndSave('messenger', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Ник в мессенджере</label>
          <input v-model="form.messengerNick" class="glass-input" type="text" placeholder="@username" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Предпочтительный способ связи</label>
          <div class="ccd-tagsel">
            <div class="ccd-tagpicker-title">Выбрано</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in selectedSingleOption(form.preferredContact)"
                :key="`preferred-selected-${option}`"
                type="button"
                class="ccd-tagopt ccd-tagopt--on"
                @click="toggleSingleChoiceAndSave('preferredContact', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
            <div class="ccd-tagpicker-title" style="margin-top: 8px">Доступно</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in availableSingleOptions(PREFERRED_CONTACT_OPTIONS, form.preferredContact)"
                :key="`preferred-available-${option}`"
                type="button"
                class="ccd-tagopt"
                @click="toggleSingleChoiceAndSave('preferredContact', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
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
          <AppAddressInput v-model="form.address" input-class="glass-input" placeholder="Ваш домашний адрес" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Адрес объекта</label>
          <AppAddressInput v-model="form.objectAddress" input-class="glass-input" placeholder="Адрес квартиры / дома" @blur="save" />
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
            <div class="ccd-tagpicker-title">Выбрано</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in selectedSingleOption(form.objectType)"
                :key="`object-type-selected-${option}`"
                type="button"
                class="ccd-tagopt ccd-tagopt--on"
                @click="toggleSingleChoiceAndSave('objectType', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
            <div class="ccd-tagpicker-title" style="margin-top: 8px">Доступно</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in availableSingleOptions(OBJECT_TYPE_OPTIONS, form.objectType)"
                :key="`object-type-available-${option}`"
                type="button"
                class="ccd-tagopt"
                @click="toggleSingleChoiceAndSave('objectType', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Площадь (м²)</label>
          <input v-model="form.objectArea" class="glass-input" type="text" placeholder="85" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Количество комнат</label>
          <input v-model="form.roomCount" class="glass-input" type="text" placeholder="3" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Этаж</label>
          <input v-model="form.floor" class="glass-input" type="text" placeholder="7" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Высота потолков (м)</label>
          <input v-model="form.ceilingHeight" class="glass-input" type="text" placeholder="2.7" @blur="save" />
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Балкон / лоджия</label>
          <div class="ccd-tagsel">
            <div class="ccd-tagpicker-title">Выбрано</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in selectedSingleOption(form.hasBalcony)"
                :key="`balcony-selected-${option}`"
                type="button"
                class="ccd-tagopt ccd-tagopt--on"
                @click="toggleSingleChoiceAndSave('hasBalcony', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
            <div class="ccd-tagpicker-title" style="margin-top: 8px">Доступно</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in availableSingleOptions(BALCONY_OPTIONS, form.hasBalcony)"
                :key="`balcony-available-${option}`"
                type="button"
                class="ccd-tagopt"
                @click="toggleSingleChoiceAndSave('hasBalcony', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
          </div>
        </div>
        <div class="ccd-row">
          <label class="ccd-lbl">Парковка</label>
          <div class="ccd-tagsel">
            <div class="ccd-tagpicker-title">Выбрано</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in selectedSingleOption(form.parking)"
                :key="`parking-selected-${option}`"
                type="button"
                class="ccd-tagopt ccd-tagopt--on"
                @click="toggleSingleChoiceAndSave('parking', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
            <div class="ccd-tagpicker-title" style="margin-top: 8px">Доступно</div>
            <TransitionGroup name="tag-shift" tag="div" class="ccd-tagpool">
              <button
                v-for="option in availableSingleOptions(PARKING_OPTIONS, form.parking)"
                :key="`parking-available-${option}`"
                type="button"
                class="ccd-tagopt"
                @click="toggleSingleChoiceAndSave('parking', option)"
              >
                #{{ option }}
              </button>
            </TransitionGroup>
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

const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

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

function selectedSingleOption(value: string) {
  return value ? [value] : []
}

function availableSingleOptions(options: readonly string[], selected: string) {
  return options.filter(option => option !== selected)
}

function toggleSingleChoiceAndSave(field: string, option: string) {
  form[field] = form[field] === option ? '' : option
  save()
}

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
.ccd-saved { font-size: .75rem; color: var(--ds-success, #8bbf8b); }
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
.ccd-tagsel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}
.ccd-tagpicker-title {
  font-size: .58rem;
  text-transform: uppercase;
  letter-spacing: .75px;
  color: var(--glass-text);
  opacity: .5;
}
.ccd-tagpool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ccd-tagopt {
  padding: 4px 10px;
  font-size: .76rem;
  cursor: pointer;
  user-select: none;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: var(--glass-text);
  opacity: .7;
  transition: background .16s, color .16s, transform .16s, opacity .16s;
}
.ccd-tagopt:hover { opacity: .95; }
.ccd-tagopt--on {
  background: var(--glass-text, #1a1a1a); color: var(--glass-bg, #fff);
  opacity: 1;
}

.tag-shift-enter-active,
.tag-shift-leave-active {
  transition: all .2s ease;
}

.tag-shift-enter-from,
.tag-shift-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(.98);
}

.tag-shift-move {
  transition: transform .2s ease;
}

@media (max-width: 760px) {
  .ccd-row {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 8px;
  }
}
</style>
