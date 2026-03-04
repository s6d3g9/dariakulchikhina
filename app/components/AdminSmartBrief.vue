<template>
  <div class="asb-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Section: Family -->
      <div class="asb-section">
        <div class="asb-section-title">состав семьи и образ жизни</div>
        <div class="ass-upload-zone">
          <div v-for="f in familyFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="glass-input"
              :placeholder="f.placeholder || ''"

              @blur="save"
            />
            <div v-else-if="f.options" class="asb-btngroup">
              <button
                v-for="option in f.options"
                :key="`${f.key}-${option}`"
                type="button"
                class="asb-btnopt"
                :class="{ 'asb-btnopt--on': (form as any)[f.key] === option }"
                @click="toggleSingleChoiceAndSave(f.key, option)"
              >{{ option }}</button>
            </div>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="glass-input"
              type="text"
              :placeholder="f.placeholder || ''"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Concept -->
      <div class="asb-section">
        <div class="asb-section-title">концепция и атмосфера</div>
        <div class="ass-upload-zone">
          <div v-for="f in conceptFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Routines -->
      <div class="asb-section">
        <div class="asb-section-title">ритуалы и распорядок</div>
        <div class="ass-upload-zone">
          <div v-for="f in routineFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Kitchen -->
      <div class="asb-section">
        <div class="asb-section-title">кухня и гастрономия</div>
        <div class="ass-upload-zone">
          <div v-for="f in kitchenFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Sport -->
      <div class="asb-section">
        <div class="asb-section-title">спорт и домашняя активность</div>
        <div class="ass-upload-zone">
          <div v-for="f in sportFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Storage -->
      <div class="asb-section">
        <div class="asb-section-title">хранение и хозяйство</div>
        <div class="ass-upload-zone">
          <div v-for="f in storageFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Lighting -->
      <div class="asb-section">
        <div class="asb-section-title">световые сценарии</div>
        <div class="ass-upload-zone">
          <div v-for="f in lightingFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Tech -->
      <div class="asb-section">
        <div class="asb-section-title">умный дом и технологии</div>
        <div class="ass-upload-zone">
          <div v-for="f in techFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Style -->
      <div class="asb-section">
        <div class="asb-section-title">стиль и эстетика</div>
        <div class="ass-upload-zone">
          <div v-for="f in styleFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
            <div v-else-if="f.options" class="asb-btngroup">
              <button
                v-for="option in f.options"
                :key="`${f.key}-${option}`"
                type="button"
                class="asb-btnopt"
                :class="{ 'asb-btnopt--on': (form as any)[f.key] === option }"
                @click="toggleSingleChoiceAndSave(f.key, option)"
              >{{ option }}</button>
            </div>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="glass-input"
              type="text"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Restrictions -->
      <div class="asb-section">
        <div class="asb-section-title">ограничения и особые условия</div>
        <div class="ass-upload-zone">
          <div v-for="f in restrictFields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <input
              v-model="(form as any)[f.key]"
              class="glass-input"

              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Requirements -->
      <div class="asb-section">
        <div class="asb-section-title">
          требования к проекту
          <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
          <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1) для точных тегов</span>
        </div>
        <div class="asb-checks-grid">
          <button
            v-for="req in filteredRequirements"
            :key="req.key"
            type="button"
            class="asb-tagopt"
            :class="{ 'asb-tagopt--on': !!(form as any)[req.key] }"
            @click="toggle(req.key)"
          >{{ req.label }}</button>
        </div>
      </div>

      <!-- Footer -->
      <div class="asb-footer">
        <span v-if="savedAt" class="asb-saved">✓ сохранено {{ savedAt }}</span>
        <button class="asb-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить бриф' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { BRIEF_REQUIREMENTS, OBJECT_TYPE_LABELS } from '~/utils/brief-requirements'
import { BRIEF_REMOTE_WORK_OPTIONS, BRIEF_GUESTS_FREQ_OPTIONS, BRIEF_STYLE_OPTIONS, BRIEF_COLOR_OPTIONS } from '~~/shared/constants/profile-fields'

const props = withDefaults(defineProps<{ slug: string; clientMode?: boolean }>(), {
  clientMode: false,
})

// Forward cookies so SSR works both in admin context and when embedded in client cabinet via ClientBrief.vue
const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

const objectTypeLabel = computed(() => {
  const key = String((form as any).objectType || '') as keyof typeof OBJECT_TYPE_LABELS
  return OBJECT_TYPE_LABELS[key] || String((form as any).objectType || '')
})

// объединяем universal + тип объекта
const filteredRequirements = computed(() => {
  const objType = String((form as any).objectType || '') as keyof typeof BRIEF_REQUIREMENTS
  const specific = BRIEF_REQUIREMENTS[objType] || BRIEF_REQUIREMENTS.apartment || []
  const common = BRIEF_REQUIREMENTS._common || []
  // дедупликация по key
  const seen = new Set(specific.map((r: { key: string }) => r.key))
  return [...specific, ...common.filter((r: { key: string }) => !seen.has(r.key))]
})

const autoTags = computed(() =>
  filteredRequirements.value.filter(r => form[r.key]).map(r => r.tag)
)

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

function toggleSingleChoiceAndSave(key: string, option: string) {
  form[key] = form[key] === option ? '' : option
  save()
}

// ── Form field definitions ────────────────────────────────────────
const familyFields = [
  { key: 'brief_adults_count',    label: 'Взрослых в семье',            placeholder: 'например: 2' },
  { key: 'brief_kids_ages',       label: 'Дети (возраст)',               placeholder: 'например: 4 и 8 лет' },
  { key: 'brief_ergonomics',      label: 'Эргономика (рост, особенности)', placeholder: 'высокий рост, адаптация столешниц...', multi: true },
  { key: 'brief_handed',          label: 'Доп. параметры',               placeholder: 'левша, физ. ограничения, инвалидное кресло...', multi: true },
  { key: 'brief_pets_desc',       label: 'Питомцы',                      placeholder: 'порода, размер' },
  { key: 'brief_pets_zone_detail',label: 'Зона питомца (детали)',        placeholder: 'лапомойка, миски, лоток, будка...', multi: true },
  { key: 'brief_guests_freq',     label: 'Частота гостей',               options: BRIEF_GUESTS_FREQ_OPTIONS },
  { key: 'brief_hobbies',         label: 'Хобби и увлечения',            placeholder: 'музыка, живопись, спорт...', multi: true },
]

const routineFields = [
  { key: 'brief_morning_routine', label: 'Утренний ритуал',           placeholder: 'кофе в тишине, утренняя пробежка, завтрак всей семьёй...' },
  { key: 'brief_evening_routine', label: 'Вечерний ритуал',           placeholder: 'кино, ужин с гостями, чтение, йога...' },
  { key: 'brief_cooking_role',    label: 'Роль кухни',                placeholder: 'готовим сами, заказываем, профессиональная готовка...' },
  { key: 'brief_bedroom_needs',   label: 'Спальня / сон',             placeholder: 'раздельные спальни, звукоизоляция, электрошторы...' },
  { key: 'brief_acoustic_zones',  label: 'Акустика между зонами',     placeholder: 'нужна изоляция кабинета от детской, спальни от кухни...' },
  { key: 'brief_flex_zones',      label: 'Гибкость / многофункциональность', placeholder: 'зона-трансформер, гостевая = кабинет...' },
  { key: 'brief_future_changes',  label: 'Будущие изменения',         placeholder: 'планируем ребёнка, родители переедут, расширение...' },
]

const styleFields = [
  { key: 'brief_style_prefer',    label: 'Стиль',                        options: BRIEF_STYLE_OPTIONS },
  { key: 'brief_color_mood',      label: 'Цветовая гамма',               options: BRIEF_COLOR_OPTIONS },
  { key: 'brief_color_palette',   label: 'Цветовая палитра (подробно)', placeholder: 'любимые сочетания, акцентные цвета, табу-цвета...' },
  { key: 'brief_like_refs',       label: 'Нравится (ссылки / описание)', multi: true, placeholder: 'ссылки на Pinterest, описание...' },
  { key: 'brief_dislike_refs',    label: 'Не нравится',                  multi: true, placeholder: 'что точно нельзя...' },
  { key: 'brief_material_prefs',  label: 'Материалы',                    multi: true, placeholder: 'натуральный камень, дерево, металл...' },
  { key: 'brief_textures',        label: 'Фактуры и текстуры',           placeholder: 'матовое, глянцевое, рельефное, шероховатое...' },
  { key: 'brief_prints',          label: 'Принты / орнаменты',           placeholder: 'отношение к узорам, паттернам, геометрии...' },
  { key: 'brief_art',             label: 'Искусство / арт-объекты',      placeholder: 'картины, скульптура, инсталляция, принт...' },
]

const conceptFields = [
  { key: 'brief_home_mood',        label: 'Настроение дома',           placeholder: 'как выглядит идеальное пространство, ощущения...' },
  { key: 'brief_return_emotion',   label: 'Эмоция при возвращении',    placeholder: 'что хочется чувствовать, открывая дверь...' },
  { key: 'brief_space_image',      label: 'Ассоциативный образ',       placeholder: 'это пространство как... (отель, лес, галерея...)' },
]

const kitchenFields = [
  { key: 'brief_kitchen_intensity', label: 'Интенсивность кухни',     placeholder: 'готовим каждый день, каждые выходные, профессиональная готовка...' },
  { key: 'brief_kitchen_surfaces',  label: 'Рабочие поверхности',     placeholder: 'длина, материал, остров, ниша под технику...' },
  { key: 'brief_kitchen_cabinets',  label: 'Конфигурация гарнитура',  placeholder: 'шкафы до потолка, открытые полки, витрины...' },
  { key: 'brief_kitchen_hardware',  label: 'Фурнитура и ручки',       placeholder: 'тип открывания (push-to-open, ручки, профиль), материал...' },
  { key: 'brief_kitchen_cooktop',   label: 'Варочная панель + вытяжка',placeholder: 'газ/индукция, встраиваемая/островная вытяжка...' },
  { key: 'brief_kitchen_oven',      label: 'Духовой шкаф и СВЧ',      placeholder: 'встроенные, высота расположения, паровая функция...' },
  { key: 'brief_kitchen_appliances',label: 'Доп. техника',            placeholder: 'винный шкаф, кофемашина, холодильник для напитков...' },
  { key: 'brief_kitchen_sink',      label: 'Оборудование мойки',      placeholder: 'измельчитель, фильтр питьевой воды, тип крана...' },
]

const sportFields = [
  { key: 'brief_sport_zone',         label: 'Зона спорта и тренажёры', placeholder: 'кардио, силовые, коврик, зеркала...' },
  { key: 'brief_sport_storage',      label: 'Хранение инвентаря',      placeholder: 'велосипеды, лыжи, мячи, коврики, гантели...' },
  { key: 'brief_sport_tech',         label: 'Техусловия',              placeholder: 'усиленный пол, вентиляция, розетки, TV-точка...' },
]

const storageFields = [
  { key: 'brief_storage_volume',     label: 'Объём вещей',             placeholder: 'сколько людей, много сезонного, коллекции, оборудование...' },
  { key: 'brief_storage_hidden',     label: 'Скрытое хранение',        placeholder: 'чемоданы, инвентарь, «неприкосновенный запас»...' },
  { key: 'brief_utility_zone',       label: 'Хозяйственная зона',      placeholder: 'стирка, сушка, база пылесоса, глажка...' },
]

const lightingFields = [
  { key: 'brief_light_modes',        label: 'Световые режимы',         placeholder: 'общий, рабочий, уютный, ночной, праздничный...' },
  { key: 'brief_light_dimming',      label: 'Диммирование',            placeholder: 'зоны с регулировкой яркости, предпочтения...' },
  { key: 'brief_light_automation',   label: 'Автоматизация',           placeholder: 'датчики движения, мастер-выключатель, расписание...' },
]

const techFields = [
  { key: 'brief_smart_control',      label: 'Система управления',      placeholder: 'климат, шторы, безопасность, голосовое управление...' },
  { key: 'brief_acoustics_type',     label: 'Акустика',                placeholder: 'встроенная (потолочная), напольная, мультирум...' },
  { key: 'brief_tech_equipment',     label: 'Оборудование',            placeholder: 'центр управления, кабель-каналы, ИБП, NAS...' },
]

const restrictFields = [
  { key: 'brief_allergies',       label: 'Аллергии / чувствительность', placeholder: 'на запахи, пыль, материалы...' },
  { key: 'brief_deadlines_hard',  label: 'Жёсткие сроки',               placeholder: 'дата заезда, мероприятие...' },
  { key: 'brief_budget_limits',   label: 'Бюджет',                       placeholder: 'общий бюджет на реализацию...' },
  { key: 'brief_budget_priorities',label: 'Приоритеты и компромиссы',   placeholder: 'на чём не экономить, где допустим компромисс...' },
  { key: 'brief_special_notes',   label: 'Особые пожелания',            placeholder: 'любые важные детали...' },
]

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  saving.value = true
  try {
    // Проверяем — достаточно ли полей заполнено чтобы считать бриф завершённым
    const filledCount = Object.entries(form)
      .filter(([k, v]) => k.startsWith('brief_') && typeof v === 'string' && v.trim())
      .length
    const briefCompleted = filledCount >= 4 || (form as any).brief_completed
    if (props.clientMode) {
      await $fetch(`/api/projects/${props.slug}/client-profile`, {
        method: 'PUT',
        body: { ...form, brief_completed: briefCompleted },
      })
      if (project.value?.profile) {
        Object.assign(project.value.profile, { ...form, brief_completed: briefCompleted })
      }
    } else {
      await $fetch(`/api/projects/${props.slug}`, {
        method: 'PUT',
        body: { profile: { ...project.value?.profile, ...form, brief_completed: briefCompleted } }
      })
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.asb-type-hint {
  font-size: .7rem; text-transform: none; letter-spacing: 0;
  background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent); padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.asb-type-hint--warn { background: color-mix(in srgb, var(--ds-warning) 12%, transparent); color: var(--ds-warning); }

/* Requirements tag cloud */
.asb-checks-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}


/* Form rows */

/* Footer */
.asb-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-saved { font-size: .76rem; color: var(--ds-success); }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }

/* Button group — single choice */
.asb-btngroup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.asb-btnopt {
  padding: 6px 14px; font-size: .76rem; cursor: pointer; user-select: none;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 999px; font-family: inherit;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: background .16s, color .16s, border-color .16s;
}
.asb-btnopt:hover { color: var(--text, #1a1a1a); border-color: var(--text, #1a1a1a); }
.asb-btnopt--on {
  background: transparent;
  color: var(--glass-text, #1a1a1a);
  border: 2px solid var(--glass-text, #1a1a1a);
  font-weight: 600;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .asb-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .asb-btn-save { width: 100%; text-align: center; }
  .asb-section-title { flex-direction: column; align-items: flex-start; }
}

</style>
