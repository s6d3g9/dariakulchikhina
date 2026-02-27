<template>
  <div>
    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <template v-else>
      <div class="acp-card">
        <!-- photo upload -->
        <div class="acp-upload-row" style="margin-bottom:20px">
          <label class="acp-lbl" style="width:140px">фото клиента:</label>
          <input v-model="form.photo" class="acp-inp" type="text" placeholder="имя файла">
          <label class="acp-btn-upload">
            загрузить
            <input type="file" accept="image/*" style="display:none" @change="uploadPhoto">
          </label>
          <img v-if="form.photo" :src="form.photo.startsWith('/') ? form.photo : `/uploads/${form.photo}`" class="acp-img-prev">
        </div>

        <!-- section: personal -->
        <div class="acp-section-title">личные данные</div>

        <div v-for="field in personalFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <AppDatePicker
            v-else-if="field.date"
            v-model="(form as any)[field.key]"
            input-class="acp-inp"
          />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="acp-inp acp-select">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>

        <!-- section: contacts -->
        <div class="acp-section-title">контакты</div>

        <div v-for="field in contactFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>

        <!-- section: object -->
        <div class="acp-section-title">объект</div>

        <div v-for="field in objectFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="acp-inp acp-select">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>

        <!-- section: project -->
        <div class="acp-section-title">проект</div>

        <div v-for="field in projectFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <AppDatePicker
            v-else-if="field.date"
            v-model="(form as any)[field.key]"
            input-class="acp-inp"
          />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="acp-inp acp-select">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>

        <!-- section: lifestyle -->
        <div class="acp-section-title">образ жизни и предпочтения</div>

        <div v-for="field in lifestyleFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>
      </div>

      <div class="acp-actions">
        <p v-if="error" style="color:#c00;font-size:.8rem;margin-right:auto">{{ error }}</p>
        <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface FieldDef {
  key: string
  label: string
  multi?: boolean
  date?: boolean
  options?: string[]
}

const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(`/api/projects/${props.slug}`)
const saving = ref(false)
const error = ref('')

const personalFields: FieldDef[] = [
  { key: 'fio', label: 'фио' },
  { key: 'birthday', label: 'дата рождения', date: true },
  { key: 'age', label: 'возраст' },
  { key: 'familyStatus', label: 'семейное положение', options: ['не женат / не замужем', 'женат / замужем', 'в разводе', 'в гражданском браке'] },
  { key: 'children', label: 'дети' },
  { key: 'pets', label: 'питомцы' },
]

const contactFields: FieldDef[] = [
  { key: 'phone', label: 'телефон' },
  { key: 'phoneExtra', label: 'доп. телефон' },
  { key: 'email', label: 'email' },
  { key: 'messenger', label: 'мессенджер', options: ['telegram', 'whatsapp', 'viber', 'signal'] },
  { key: 'messengerNick', label: 'ник / номер мессенджера' },
  { key: 'preferredContact', label: 'предпочтительный способ связи', options: ['телефон', 'email', 'мессенджер'] },
  { key: 'address', label: 'адрес проживания' },
]

const objectFields: FieldDef[] = [
  { key: 'objectAddress', label: 'адрес объекта' },
  { key: 'objectType', label: 'тип объекта', options: ['квартира', 'дом', 'таунхаус', 'апартаменты', 'коммерческое помещение', 'офис'] },
  { key: 'objectCondition', label: 'состояние объекта', options: ['новостройка без отделки', 'новостройка с отделкой', 'вторичное жилье', 'требует ремонта', 'частичный ремонт'] },
  { key: 'objectArea', label: 'общая площадь (м²)' },
  { key: 'roomCount', label: 'количество комнат' },
  { key: 'floor', label: 'этаж' },
  { key: 'ceilingHeight', label: 'высота потолков (м)' },
  { key: 'hasBalcony', label: 'балкон / лоджия', options: ['нет', 'балкон', 'лоджия', 'терраса', 'несколько'] },
  { key: 'parking', label: 'парковка', options: ['нет', 'подземная', 'наземная', 'гараж'] },
]

const projectFields: FieldDef[] = [
  { key: 'budget', label: 'бюджет' },
  { key: 'budgetIncluded', label: 'что входит в бюджет', multi: true },
  { key: 'deadline', label: 'желаемые сроки', date: true },
  { key: 'paymentMethod', label: 'способ оплаты', options: ['наличные', 'перевод', 'рассрочка', 'ипотечные средства'] },
  { key: 'referralSource', label: 'откуда узнали', options: ['рекомендация', 'instagram', 'сайт', 'реклама', 'другое'] },
  { key: 'previousExperience', label: 'опыт ремонта / работы с дизайнером', multi: true },
]

const lifestyleFields: FieldDef[] = [
  { key: 'lifestyle', label: 'образ жизни', multi: true },
  { key: 'hobbies', label: 'хобби и увлечения', multi: true },
  { key: 'stylePreferences', label: 'предпочтения по стилю', multi: true },
  { key: 'colorPreferences', label: 'предпочтения по цветам', multi: true },
  { key: 'allergies', label: 'аллергии / ограничения' },
  { key: 'priorities', label: 'приоритеты в интерьере', multi: true },
  { key: 'dislikes', label: 'что не нравится / антипримеры', multi: true },
  { key: 'notes', label: 'дополнительно', multi: true },
]

const allFields = [...personalFields, ...contactFields, ...objectFields, ...projectFields, ...lifestyleFields]

const formInit: Record<string, string> = { photo: '' }
for (const f of allFields) formInit[f.key] = ''
const form = reactive<Record<string, string>>(formInit)

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

async function uploadPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    form.photo = res.filename
  } catch { error.value = 'Ошибка загрузки' }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...form } }
    })
    refresh()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.acp-card {
  --acp-bg: #fff;
  --acp-border: #e0e0e0;
  --acp-row-border: #f5f5f5;
  --acp-lbl: #888;
  --acp-inp-border: #ddd;
  --acp-inp-focus: #1a1a1a;
  --acp-inp-color: inherit;
  --acp-ta-border: #ddd;
  --acp-btn-border: #1a1a1a;
  --acp-btn-color: #1a1a1a;
  --acp-btn-hover-bg: #1a1a1a;
  --acp-btn-hover-color: #fff;
  --acp-img-border: #ddd;

  background: var(--acp-bg);
  border: 1px solid var(--acp-border);
  padding: 24px;
  margin-bottom: 16px;
}
.acp-section-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  margin: 20px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e0e0e0;
}
.acp-section-title:first-child { margin-top: 0; }
.acp-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--acp-row-border);
  padding-bottom: 10px;
}
.acp-lbl {
  font-size: .78rem;
  color: var(--acp-lbl);
  width: 200px;
  flex-shrink: 0;
  padding-top: 6px;
}
.acp-inp {
  flex: 1;
  border: none;
  border-bottom: 1px solid var(--acp-inp-border);
  padding: 6px 0;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  background: transparent;
  color: var(--acp-inp-color);
}
.acp-inp:focus { border-bottom-color: var(--acp-inp-focus); }
.acp-select {
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 0;
  padding-right: 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
}
.acp-ta {
  resize: vertical;
  border: 1px solid var(--acp-ta-border);
  padding: 6px 8px;
  border-radius: 2px;
  line-height: 1.5;
  color: var(--acp-inp-color);
}
.acp-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.acp-btn-upload {
  border: 1px solid var(--acp-btn-border);
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  white-space: nowrap;
  color: var(--acp-btn-color);
}
.acp-btn-upload:hover { background: var(--acp-btn-hover-bg); color: var(--acp-btn-hover-color); }
.acp-img-prev {
  max-width: 120px;
  max-height: 90px;
  object-fit: cover;
  border: 1px solid var(--acp-img-border);
  border-radius: 2px;
}
.acp-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
}
</style>
