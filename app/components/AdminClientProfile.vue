<template>
  <div>
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>
      <div class="acp-card" style="margin-bottom:12px">
        <div class="acp-section-title" style="margin-top:0">выбор клиента</div>
        <div class="acp-row">
          <label class="acp-lbl">клиент из CRM:</label>
          <select v-model="selectedClientId" class="glass-input">
            <option value="">— выберите клиента —</option>
            <option v-for="c in clients" :key="c.id" :value="String(c.id)">
              {{ c.name }}
              <template v-if="c.phone"> · {{ c.phone }}</template>
              <template v-else-if="c.email"> · {{ c.email }}</template>
            </option>
          </select>
          <button class="acp-link-btn" :disabled="!selectedClientId || linkingClient" @click="linkSelectedClient">
            {{ linkingClient ? '...' : 'привязать' }}
          </button>
        </div>
        <p v-if="linkError" class="acp-link-error">{{ linkError }}</p>
        <p v-else-if="linkSuccess" class="acp-link-success">{{ linkSuccess }}</p>
      </div>

      <div class="acp-card">
        <!-- photo upload -->
        <div class="acp-upload-row" style="margin-bottom:20px">
          <label class="acp-lbl" style="width:140px">фото клиента:</label>
          <input v-model="form.photo" class="glass-input" type="text" placeholder="имя файла">
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
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="glass-input u-ta" rows="2" />
          <AppDatePicker
            v-else-if="field.date"
            v-model="(form as any)[field.key]"
            input-class="glass-input"
          />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="glass-input">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: contacts -->
        <div class="acp-section-title">контакты</div>

        <div v-for="field in contactFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="glass-input u-ta" rows="2" />
          <AppAddressInput v-else-if="field.address" v-model="(form as any)[field.key]" input-class="glass-input" @blur="save" />
          <input v-else v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: object -->
        <div class="acp-section-title">объект</div>

        <div v-for="field in objectFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="glass-input u-ta" rows="2" />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="glass-input">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <AppAddressInput v-else-if="field.address" v-model="(form as any)[field.key]" input-class="glass-input" @blur="save" />
          <input v-else v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: project -->
        <div class="acp-section-title">проект</div>

        <div v-for="field in projectFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="glass-input u-ta" rows="2" />
          <AppDatePicker
            v-else-if="field.date"
            v-model="(form as any)[field.key]"
            input-class="glass-input"
          />
          <select v-else-if="field.options" v-model="(form as any)[field.key]" class="glass-input">
            <option value="">—</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: lifestyle -->
        <div class="acp-section-title">образ жизни и предпочтения</div>

        <div v-for="field in lifestyleFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="glass-input u-ta" rows="2" />
          <input v-else v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: passport -->
        <div class="acp-section-title">
          🔒 паспортные данные
          <span class="acp-section-hint">(для договоров)</span>
        </div>

        <div v-for="field in passportFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <input v-model="(form as any)[field.key]" class="glass-input" type="text">
        </div>

        <!-- section: project params catalog -->
        <div class="acp-section-title">параметры проекта</div>

        <div v-for="field in catalogSelectFields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <select v-model="(form as any)[field.key]" class="glass-input">
            <option value="">—</option>
            <option v-for="opt in field.opts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- section: multi-select chips -->
        <div class="acp-section-title">услуги и виды работ</div>

        <div v-for="cf in chipsFields" :key="cf.key" class="acp-row acp-chips-row">
          <label class="acp-lbl">{{ cf.label }}:</label>
          <div class="acp-chip-pools">
            <div class="acp-chips">
              <button
                v-for="opt in cf.opts"
                :key="`${cf.key}-${opt.value}`"
                type="button"
                class="acp-chip"
                :class="{ 'acp-chip--on': getChips(cf.key).includes(opt.value) }"
                @click.prevent="toggleChip(cf.key, opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="acp-actions">
        <p v-if="error" style="color:var(--ds-error, #c00);font-size:.8rem;margin-right:auto">{{ error }}</p>
        <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  CLIENT_TYPE_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  DESIGNER_SERVICE_TYPE_OPTIONS,
  CONTRACTOR_WORK_TYPE_OPTIONS,
} from '~~/shared/types/catalogs'

interface FieldDef {
  key: string
  label: string
  multi?: boolean
  date?: boolean
  options?: string[]
  address?: boolean
}

interface CatalogFieldDef {
  key: string
  label: string
  opts: { value: string; label: string }[]
}

interface ChipsFieldDef {
  key: string
  label: string
  opts: { value: string; label: string }[]
}

const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { data: clientsData } = await useFetch<any[]>('/api/clients', { default: () => [] })
const saving = ref(false)
const error = ref('')
const linkingClient = ref(false)
const linkError = ref('')
const linkSuccess = ref('')
const selectedClientId = ref('')

const clients = computed(() => clientsData.value || [])

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
  { key: 'address', label: 'адрес проживания', address: true },
]

const objectFields: FieldDef[] = [
  { key: 'objectAddress', label: 'адрес объекта', address: true },
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

const passportFields: FieldDef[] = [
  { key: 'passport_series', label: 'серия паспорта' },
  { key: 'passport_number', label: 'номер паспорта' },
  { key: 'passport_issued_by', label: 'кем выдан' },
  { key: 'passport_issue_date', label: 'дата выдачи' },
  { key: 'passport_department_code', label: 'код подразделения' },
  { key: 'passport_birth_place', label: 'место рождения' },
  { key: 'passport_registration_address', label: 'адрес регистрации' },
  { key: 'passport_inn', label: 'ИНН' },
  { key: 'passport_snils', label: 'СНИЛС' },
]

const catalogSelectFields: CatalogFieldDef[] = [
  { key: 'clientType',        label: 'тип клиента',          opts: CLIENT_TYPE_OPTIONS },
  { key: 'objectTypeCode',    label: 'тип объекта (код)',     opts: OBJECT_TYPE_OPTIONS },
  { key: 'projectPriority',   label: 'приоритет проекта',    opts: PROJECT_PRIORITY_OPTIONS },
  { key: 'paymentType',       label: 'тип оплаты',           opts: PAYMENT_TYPE_OPTIONS },
  { key: 'contractType',      label: 'тип договора',         opts: CONTRACT_TYPE_OPTIONS },
]

const chipsFields: ChipsFieldDef[] = [
  { key: 'designerServiceTypes', label: 'услуги дизайнера',   opts: DESIGNER_SERVICE_TYPE_OPTIONS },
  { key: 'contractorWorkTypes',  label: 'виды работ (план)',  opts: CONTRACTOR_WORK_TYPE_OPTIONS },
]

const allFields = [...personalFields, ...contactFields, ...objectFields, ...projectFields, ...lifestyleFields, ...passportFields]

const formInit: Record<string, string | string[]> = { photo: '' }
for (const f of allFields) formInit[f.key] = ''
for (const f of catalogSelectFields) formInit[f.key] = ''
for (const f of chipsFields) formInit[f.key] = []
const form = reactive<Record<string, string | string[]>>(formInit)

function getChips(key: string): string[] {
  const v = form[key]
  return Array.isArray(v) ? v : []
}

function toggleChip(key: string, value: string) {
  const arr = getChips(key)
  const idx = arr.indexOf(value)
  if (idx === -1) form[key] = [...arr, value]
  else form[key] = arr.filter(v => v !== value)
}

watch(project, (p) => {
  if (p?.profile) {
    for (const [k, v] of Object.entries(p.profile)) {
      // preserve array type for chips fields
      const isChips = chipsFields.some(f => f.key === k)
      if (isChips) {
        form[k] = Array.isArray(v) ? v : (v ? [v] : [])
      } else {
        form[k] = (v as string) ?? ''
      }
    }
    selectedClientId.value = String(p.profile.client_id || '')
  }
}, { immediate: true })

async function linkSelectedClient() {
  if (!selectedClientId.value) return
  linkingClient.value = true
  linkError.value = ''
  linkSuccess.value = ''
  try {
    await $fetch(`/api/clients/${selectedClientId.value}/link-project`, {
      method: 'POST',
      body: { projectSlug: props.slug },
    })
    await refresh()
    linkSuccess.value = 'Клиент привязан к проекту'
  } catch (e: any) {
    linkError.value = e?.data?.statusMessage || 'Не удалось привязать клиента'
  } finally {
    linkingClient.value = false
  }
}

async function uploadPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    form.photo = res.filename
  } catch { error.value = 'Ошибка загрузки' }
  finally { (e.target as HTMLInputElement).value = '' }
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
.acp-row :deep(.aai-wrap) { flex: 1; min-width: 0; }
.acp-row :deep(.aai-wrap input) {
  flex: 1;
  width: 100%;
}

.acp-card {
  --acp-bg: var(--glass-page-bg, #fff);
  --acp-border: var(--glass-border, #e0e0e0);
  --acp-row-border: color-mix(in srgb, var(--glass-text) 5%, transparent);
  --acp-lbl: color-mix(in srgb, var(--glass-text) 55%, transparent);
  --acp-btn-border: var(--glass-text);
  --acp-btn-color: var(--glass-text);
  --acp-btn-hover-bg: var(--glass-text);
  --acp-btn-hover-color: var(--glass-page-bg);
  --acp-img-border: color-mix(in srgb, var(--glass-text) 20%, transparent);

  background: var(--acp-bg);
  border: 1px solid var(--acp-border);
  padding: 24px;
  margin-bottom: 16px;
}
.acp-section-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  margin: 20px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--glass-border, #e0e0e0);
}
.acp-section-title:first-child { margin-top: 0; }
.acp-section-hint {
  font-size: .62rem; font-weight: 400; letter-spacing: .02em;
  text-transform: none; opacity: .5; margin-left: 4px;
}
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
/* Input styles unified → glass-input */
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
  border: none;
  border-radius: 2px;
}
/* chips */
.acp-chips-row { align-items: flex-start; }
.acp-chip-pools {
  flex: 1;
  padding-top: 4px;
}
.acp-chip-pool-title {
  font-size: .64rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: color-mix(in srgb, var(--glass-text) 52%, transparent);
  margin-bottom: 6px;
}
.acp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.acp-chip {
  display: inline-block;
  padding: var(--chip-padding-v, 5px) var(--chip-padding-h, 12px);
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: .78rem;
  cursor: pointer;
  user-select: none;
  transition: all .18s ease;
  color: var(--glass-text);
  font-family: inherit;
}
.acp-chip:hover { opacity: .9; }
.acp-chip--on {
  background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent);
  color: var(--ds-accent, #6366f1);
  border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, var(--glass-border));
}
.tag-shift-move,
.tag-shift-enter-active,
.tag-shift-leave-active {
  transition: all .22s ease;
}
.tag-shift-enter-from,
.tag-shift-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.97);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .acp-card { padding: 14px; }
  .acp-row {
    flex-direction: column;
    gap: 4px;
    align-items: stretch;
  }
  .acp-lbl {
    width: auto;
    padding-top: 0;
  }
  .acp-upload-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .acp-chips {
    gap: 4px;
  }
  .acp-chip {
    font-size: .72rem;
    padding: 4px 8px;
  }
  .acp-actions {
    flex-direction: column;
    gap: 8px;
  }
  .acp-actions .a-btn-save {
    width: 100%;
  }
  .acp-section-title {
    font-size: .66rem;
    margin: 14px 0 8px;
  }
  .acp-img-prev {
    max-width: 80px;
    max-height: 60px;
  }
}

.acp-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
}
.acp-link-btn {
  border: none;
  background: var(--glass-text);
  color: var(--glass-page-bg);
  padding: 6px 12px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
}
.acp-link-btn:disabled { opacity: .55; cursor: default; }
.acp-link-error { margin: 6px 0 0; color: var(--ds-error, #c00); font-size: .78rem; }
.acp-link-success { margin: 6px 0 0; color: var(--ds-success, #5caa7f); font-size: .78rem; }
</style>
