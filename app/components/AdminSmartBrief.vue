<template>
  <div class="asb-wrap">
    <div v-if="pending" class="asb-loading">Загрузка...</div>
    <template v-else>

      <!-- Section: Family -->
      <div class="asb-section">
        <div class="asb-section-title">состав семьи и образ жизни</div>
        <div class="asb-rows">
          <div v-for="f in familyFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              :placeholder="f.placeholder || ''"
              rows="2"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
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
        <div class="asb-rows">
          <div v-for="f in conceptFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Routines -->
      <div class="asb-section">
        <div class="asb-section-title">ритуалы и распорядок</div>
        <div class="asb-rows">
          <div v-for="f in routineFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Kitchen -->
      <div class="asb-section">
        <div class="asb-section-title">кухня и гастрономия</div>
        <div class="asb-rows">
          <div v-for="f in kitchenFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Sport -->
      <div class="asb-section">
        <div class="asb-section-title">спорт и домашняя активность</div>
        <div class="asb-rows">
          <div v-for="f in sportFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Storage -->
      <div class="asb-section">
        <div class="asb-section-title">хранение и хозяйство</div>
        <div class="asb-rows">
          <div v-for="f in storageFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Lighting -->
      <div class="asb-section">
        <div class="asb-section-title">световые сценарии</div>
        <div class="asb-rows">
          <div v-for="f in lightingFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Tech -->
      <div class="asb-section">
        <div class="asb-section-title">умный дом и технологии</div>
        <div class="asb-rows">
          <div v-for="f in techFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Style -->
      <div class="asb-section">
        <div class="asb-section-title">стиль и эстетика</div>
        <div class="asb-rows">
          <div v-for="f in styleFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
              type="text"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Restrictions -->
      <div class="asb-section">
        <div class="asb-section-title">ограничения и особые условия</div>
        <div class="asb-rows">
          <div v-for="f in restrictFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
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
          <label v-for="req in filteredRequirements" :key="req.key" class="asb-check-item">
            <input
              type="checkbox"
              :checked="!!(form as any)[req.key]"
              @change="toggle(req.key)"
              class="asb-checkbox"
            >
            <span class="asb-check-label">{{ req.label }}</span>
            <span class="asb-check-tag">{{ req.tag }}</span>
          </label>
        </div>
      </div>

      <!-- Generated tags banner -->
      <div class="asb-tags-banner" v-if="autoTags.length">
        <span class="asb-tags-label">теги проекта:</span>
        <span v-for="tag in autoTags" :key="tag" class="asb-tag">{{ tag }}</span>
      </div>
      <div class="asb-tags-banner asb-tags-banner--empty" v-else>
        <span class="asb-tags-label">теги сформируются автоматически по ответам анкеты</span>
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

const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

const objectTypeLabel = computed(() => OBJECT_TYPE_LABELS[form.objectType] || form.objectType)

// объединяем universal + тип объекта
const filteredRequirements = computed(() => {
  const objType = form.objectType || ''
  const specific = BRIEF_REQUIREMENTS[objType] || BRIEF_REQUIREMENTS.apartment
  const common = BRIEF_REQUIREMENTS._common
  // дедупликация по key
  const seen = new Set(specific.map(r => r.key))
  return [...specific, ...common.filter(r => !seen.has(r.key))]
})

const autoTags = computed(() =>
  filteredRequirements.value.filter(r => form[r.key]).map(r => r.tag)
)

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

// ── Form field definitions ────────────────────────────────────────
const familyFields = [
  { key: 'brief_adults_count',    label: 'Взрослых в семье',            placeholder: 'например: 2' },
  { key: 'brief_kids_ages',       label: 'Дети (возраст)',               placeholder: 'например: 4 и 8 лет' },
  { key: 'brief_ergonomics',      label: 'Эргономика (рост, особенности)', placeholder: 'высокий рост, адаптация столешниц...' },
  { key: 'brief_handed',          label: 'Доп. параметры',               placeholder: 'левша, физ. ограничения, инвалидное кресло...' },
  { key: 'brief_pets_desc',       label: 'Питомцы',                      placeholder: 'порода, размер' },
  { key: 'brief_pets_zone_detail',label: 'Зона питомца (детали)',        placeholder: 'лапомойка, миски, лоток, будка...' },
  { key: 'brief_remote_work',     label: 'Удалённая работа',             options: ['нет', 'частично', 'постоянно', 'оба партнёра'] },
  { key: 'brief_guests_freq',     label: 'Частота гостей',               options: ['редко', 'несколько раз в месяц', 'еженедельно', 'постоянно'] },
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
  { key: 'brief_style_prefer',    label: 'Стиль',                        options: ['минимализм', 'скандинавский', 'контемпорари', 'ар-деко', 'неоклассика', 'лофт', 'японский', 'без предпочтений'] },
  { key: 'brief_color_mood',      label: 'Цветовая гамма',               options: ['светлая нейтральная', 'тёплая земляная', 'тёмная насыщенная', 'контрастная', 'без предпочтений'] },
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
const savedAt = ref('')

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form } }
    })
    const now = new Date()
    savedAt.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: #999; }

/* Tags banner */
.asb-tags-banner {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  padding: 12px 16px; margin-bottom: 24px;
  border: 1px solid var(--border, #e0e0e0);
  background: var(--surface, #fafafa);
}
.asb-tags-banner--empty { opacity: .55; }
.asb-tags-label { font-size: .72rem; color: #999; letter-spacing: .6px; text-transform: uppercase; margin-right: 6px; white-space: nowrap; }
.asb-tag {
  font-size: .76rem; padding: 3px 10px;
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
  border-radius: 2px; font-family: monospace; letter-spacing: .3px;
}

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #999;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.asb-type-hint {
  font-size: .7rem; text-transform: none; letter-spacing: 0;
  background: #eef2ff; color: #4f46e5; padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.asb-type-hint--warn { background: #fff7ed; color: #b45309; }

/* Checkboxes grid */
.asb-checks-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px;
}
.asb-check-item {
  display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;
}
.asb-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: var(--text, #1a1a1a); flex-shrink: 0; }
.asb-check-label { font-size: .82rem; color: var(--text, #333); flex: 1; }
.asb-check-tag { font-size: .68rem; font-family: monospace; color: #aaa; white-space: nowrap; }

/* Form rows */
.asb-rows { display: flex; flex-direction: column; gap: 4px; }
.asb-row {
  display: grid; grid-template-columns: 160px 1fr; align-items: start;
  padding: 8px 0; border-bottom: 1px solid var(--border, #f0f0f0);
}
.asb-row:last-child { border-bottom: none; }
.asb-lbl { font-size: .76rem; color: #888; padding-top: 6px; }
.asb-inp {
  border: none; border-bottom: 1px solid var(--border, #ddd);
  padding: 6px 0; font-size: .88rem; background: transparent; outline: none;
  font-family: inherit; color: var(--text, inherit); width: 100%;
}
.asb-inp:focus { border-bottom-color: var(--text, #1a1a1a); }
.asb-ta { resize: vertical; min-height: 36px; }
.asb-select { appearance: none; cursor: pointer; }

/* Footer */
.asb-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-saved { font-size: .76rem; color: #9d9; }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }
</style>
