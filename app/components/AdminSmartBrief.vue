<template>
  <div class="asb-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Universal section renderer -->
      <template v-for="section in allSections" :key="section.title">
        <div class="asb-section">
          <div class="asb-section-title">
            {{ section.title }}
            <template v-if="section.title === 'требования к проекту'">
              <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
              <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1)</span>
            </template>
          </div>

          <!-- Requirements section (checkboxes) -->
          <template v-if="section.title === 'требования к проекту'">
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
          </template>

          <!-- Regular fields -->
          <template v-else>
            <div class="ass-upload-zone">
              <div v-for="f in section.fields" :key="f.key" class="ass-upload-row">
                <label class="ass-field-label">{{ f.label }}</label>
                <AppComboTags
                  :model-value="(form as any)[f.key] || ''"
                  :options="f.options || []"
                  :placeholder="f.placeholder || ''"
                  @update:model-value="(v: string) => { (form as any)[f.key] = v }"
                  @change="save"
                />
              </div>
            </div>
          </template>
        </div>
      </template>

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

// ── Form field definitions ────────────────────────────────────────
const familyFields = [
  { key: 'brief_adults_count',    label: 'Взрослых в семье',            options: ['1', '2', '3', '4', '5+'] },
  { key: 'brief_kids_ages',       label: 'Дети (возраст)',               options: ['нет детей', 'до 3 лет', '3–7 лет', '7–12 лет', '12–17 лет', 'совершеннолетние'] },
  { key: 'brief_ergonomics',      label: 'Эргономика (рост, особенности)', options: ['стандартный рост', 'высокий рост (185+)', 'низкий рост', 'адаптация мебели под рост', 'особые потребности'] },
  { key: 'brief_handed',          label: 'Доп. параметры',               options: ['правша', 'левша', 'физические ограничения', 'инвалидное кресло', 'слабое зрение', 'пожилые жильцы'] },
  { key: 'brief_pets_desc',       label: 'Питомцы',                      options: ['нет питомцев', 'собака малая', 'собака крупная', 'кошка', 'птица', 'грызуны', 'рыбки'] },
  { key: 'brief_pets_zone_detail',label: 'Зона питомца (детали)',        options: ['лапомойка', 'встроенные миски', 'скрытый лоток', 'будка / домик', 'когтеточка', 'вольер'] },
  { key: 'brief_remote_work',     label: 'Удалённая работа',             options: [...BRIEF_REMOTE_WORK_OPTIONS] },
  { key: 'brief_guests_freq',     label: 'Частота гостей',               options: [...BRIEF_GUESTS_FREQ_OPTIONS] },
  { key: 'brief_hobbies',         label: 'Хобби и увлечения',            options: ['музыка', 'живопись / рисование', 'спорт', 'йога', 'кулинария', 'коллекционирование', 'рукоделие', 'чтение', 'gaming', 'садоводство', 'фото / видео', 'танцы'] },
]

const routineFields = [
  { key: 'brief_morning_routine', label: 'Утренний ритуал',    options: ['ранний подъём', 'медленное утро', 'кофе в тишине', 'активная зарядка', 'завтрак всей семьёй', 'работа из дома с утра'] },
  { key: 'brief_evening_routine', label: 'Вечерний ритуал',    options: ['ужин дома', 'ужин с гостями', 'кино / сериал', 'чтение', 'йога / медитация', 'спорт вечером', 'тихий отдых'] },
  { key: 'brief_cooking_role',    label: 'Роль кухни',         options: ['готовим каждый день', 'только завтраки', 'по выходным', 'почти не готовим', 'профессиональная готовка', 'заказываем доставку'] },
  { key: 'brief_bedroom_needs',   label: 'Спальня / сон',      options: ['раздельные спальни', 'большая кровать king-size', 'звукоизоляция', 'электрошторы', 'минимум мебели', 'много хранения в спальне', 'гардеробная'] },
  { key: 'brief_acoustic_zones',  label: 'Акустика между зонами', options: ['изоляция кабинета', 'изоляция спальни', 'изоляция детской', 'шумоизоляция от соседей', 'не критично'] },
  { key: 'brief_flex_zones',      label: 'Гибкость / многофункциональность', options: ['гостевая = кабинет', 'зона-трансформер', 'офис дома', 'детская = игровая + учёба', 'столовая = конференц-зона'] },
  { key: 'brief_future_changes',  label: 'Будущие изменения',  options: ['планируем ребёнка', 'родители переедут', 'расширение жилья', 'ремонт через 5–10 лет', 'не планируем изменений'] },
]

const styleFields = [
  { key: 'brief_style_prefer',    label: 'Стиль',                        options: [...BRIEF_STYLE_OPTIONS] },
  { key: 'brief_color_mood',      label: 'Цветовая гамма',               options: [...BRIEF_COLOR_OPTIONS] },
  { key: 'brief_color_palette',   label: 'Цветовая палитра (подробно)',  options: ['нейтральные / бежевые', 'чёрно-белое', 'оттенки серого', 'тёплые', 'холодные', 'терракота / охра', 'сине-зелёные', 'пастельные', 'яркие акценты', 'монохром'] },
  { key: 'brief_like_refs',       label: 'Нравится (ссылки / описание)', placeholder: 'ссылки на Pinterest, описание...', options: [] },
  { key: 'brief_dislike_refs',    label: 'Не нравится',                  placeholder: 'что точно нельзя...', options: [] },
  { key: 'brief_material_prefs',  label: 'Материалы',                    options: ['натуральный камень', 'мрамор', 'массив дерева', 'шпон', 'металл', 'стекло', 'бетон', 'кожа', 'ткань / велюр', 'керамика', 'акрил', 'ламинат'] },
  { key: 'brief_textures',        label: 'Фактуры и текстуры',           options: ['матовое', 'глянцевое', 'рельефное', 'шероховатое', 'бархатное', 'полированное', 'состаренное', 'натуральная фактура'] },
  { key: 'brief_prints',          label: 'Принты / орнаменты',           options: ['без принтов', 'геометрия', 'флора / ботаника', 'анималистик', 'абстракция', 'ретро-паттерны', 'этнические мотивы'] },
  { key: 'brief_art',             label: 'Искусство / арт-объекты',      options: ['картины / принты', 'скульптура', 'инсталляция', 'фотоарт', 'зеркала как арт-объект', 'минималистичные акценты', 'без арт-объектов'] },
]

const conceptFields = [
  { key: 'brief_home_mood',        label: 'Настроение дома',        options: ['уют и тепло', 'строгость и чистота', 'лёгкость и воздух', 'роскошь и статус', 'натуральность / эко', 'городской лофт', 'отель-бутик', 'загородная резиденция'] },
  { key: 'brief_return_emotion',   label: 'Эмоция при возвращении', options: ['покой и тишина', 'радость и энергия', 'вдохновение', 'безопасность', 'свобода', 'уединение'] },
  { key: 'brief_space_image',      label: 'Ассоциативный образ',    options: ['пятизвёздочный отель', 'скандинавский домик', 'японский минимализм', 'лесная усадьба', 'художественная галерея', 'парижская квартира', 'пентхаус NYC'] },
]

const kitchenFields = [
  { key: 'brief_kitchen_intensity', label: 'Интенсивность кухни',     options: ['готовим каждый день', 'только завтраки', 'по выходным', 'почти не готовим', 'профессиональная готовка'] },
  { key: 'brief_kitchen_surfaces',  label: 'Рабочие поверхности',     options: ['прямая столешница', 'угловая планировка', 'П-образная', 'с островом', 'остров = обеденный стол', 'ниша под технику', 'XL рабочая зона'] },
  { key: 'brief_kitchen_cabinets',  label: 'Конфигурация гарнитура',  options: ['шкафы до потолка', 'нижний ряд только', 'открытые полки', 'витрины со стеклом', 'смешанная конфигурация', 'встроенная ниша', 'лифтовые фасады'] },
  { key: 'brief_kitchen_hardware',  label: 'Фурнитура и ручки',       options: ['push-to-open', 'ручки-скобы', 'профиль-рейлинг', 'J-pull профиль', 'точечные ручки', 'фрезерованный паз', 'встроенная подсветка'] },
  { key: 'brief_kitchen_cooktop',   label: 'Варочная панель + вытяжка', options: ['индукция', 'газ', 'газ + электро (комби)', 'встраиваемая вытяжка', 'островная вытяжка', 'телескопическая вытяжка', 'вытяжка в столешницу'] },
  { key: 'brief_kitchen_oven',      label: 'Духовой шкаф и СВЧ',      options: ['встроенный духовой шкаф', 'пиролиз', 'паровая функция', 'комбипароварка', 'СВЧ встроенная', '2 духовки', 'на уровне глаз'] },
  { key: 'brief_kitchen_appliances',label: 'Доп. техника',            options: ['кофемашина встроенная', 'винный шкаф', 'холодильник для напитков', 'льдогенератор', 'тепловой ящик', 'подогрев тарелок', 'вакуумный упаковщик'] },
  { key: 'brief_kitchen_sink',      label: 'Оборудование мойки',      options: ['измельчитель', 'фильтр питьевой воды', 'смеситель pull-out', 'мойка с крылом', 'смеситель с цифровой температурой', 'встроенный дозатор мыла'] },
]

const sportFields = [
  { key: 'brief_sport_zone',    label: 'Зона спорта и тренажёры', options: ['беговая дорожка', 'велотренажёр', 'силовые тренажёры', 'коврик для йоги', 'зеркала на стену', 'боксёрская груша', 'теннисный стол'] },
  { key: 'brief_sport_storage', label: 'Хранение инвентаря',      options: ['крючки для велосипедов', 'лыжи / сноуборды', 'напольные гантели', 'встроенные стойки', 'закрытые шкафы под инвентарь', 'полки-стеллажи'] },
  { key: 'brief_sport_tech',    label: 'Техусловия',              options: ['усиленный пол', 'резиновое покрытие', 'вентиляция / приток', 'TV-точка на стену', 'розетки 220 В', 'водостойкое покрытие'] },
]

const storageFields = [
  { key: 'brief_storage_volume',  label: 'Объём вещей',        options: ['минимальный', 'средний', 'большой (семья)', 'коллекции обуви / одежды', 'сезонное хранение', 'хранение оборудования'] },
  { key: 'brief_storage_hidden',  label: 'Скрытое хранение',   options: ['чемоданы под кроватью', 'стеллаж в кладовой', 'встроенные шкафы', 'антресоли', 'гардеробная комната'] },
  { key: 'brief_utility_zone',    label: 'Хозяйственная зона', options: ['стиральная машина', 'сушильная машина', 'встроенная гладильная доска', 'база робота-пылесоса', 'отдельная хозяйственная комната', 'встроенная в ванную'] },
]

const lightingFields = [
  { key: 'brief_light_modes',      label: 'Световые режимы',  options: ['общий свет', 'рабочий свет', 'уютный / приглушённый', 'ночник', 'праздничный / динамика', 'акцентный на арт'] },
  { key: 'brief_light_dimming',    label: 'Диммирование',     options: ['все зоны с диммером', 'только спальня', 'только гостиная', 'без диммирования', 'умные сцены освещения'] },
  { key: 'brief_light_automation', label: 'Автоматизация',    options: ['датчики движения', 'мастер-выключатель', 'расписание', 'голосовое управление', 'синхронизация со смартфоном', 'без автоматики'] },
]

const techFields = [
  { key: 'brief_smart_control',   label: 'Система управления', options: ['климат (тёплый пол / кондей)', 'электрошторы', 'охранная система', 'голосовое управление', 'централизованный хаб', 'умные замки'] },
  { key: 'brief_acoustics_type',  label: 'Акустика',           options: ['встроенная потолочная', 'напольные колонки', 'настенные колонки', 'мультирум-система', 'домашний кинотеатр', 'компактная Bluetooth'] },
  { key: 'brief_tech_equipment',  label: 'Оборудование',       options: ['NAS / серверный шкаф', 'ИБП', 'скрытые кабель-каналы', 'зарядные станции', 'центр управления умным домом', 'скрытые розетки в полу'] },
]

const restrictFields = [
  { key: 'brief_allergies',        label: 'Аллергии / чувствительность', options: ['на пыль', 'на синтетику', 'на запахи / ЛКМ', 'на формальдегид', 'на латекс', 'нет аллергий', 'астма в анамнезе'] },
  { key: 'brief_deadlines_hard',   label: 'Жёсткие сроки',               options: ['нет жёсткого дедлайна', 'свадьба / мероприятие', 'рождение ребёнка', 'дата заезда в квартиру', 'сдача объекта'] },
  { key: 'brief_budget_limits',    label: 'Бюджет',                       options: ['до 1 млн ₽', '1–2 млн ₽', '2–5 млн ₽', '5–10 млн ₽', 'от 10 млн ₽', 'не регламентирован'] },
  { key: 'brief_budget_priorities',label: 'Приоритеты и компромиссы',    options: ['не экономить: кухня', 'не экономить: сантехника', 'не экономить: освещение', 'компромисс: декор', 'компромисс: бытовая техника', 'компромисс: коридор'] },
  { key: 'brief_special_notes',    label: 'Особые пожелания',            options: [] },
]

// ── Unified section list ─────────────────────────────────────────
const allSections = computed(() => [
  { title: 'состав семьи и образ жизни',    fields: familyFields },
  { title: 'концепция и атмосфера',         fields: conceptFields },
  { title: 'ритуалы и распорядок',          fields: routineFields },
  { title: 'кухня и гастрономия',           fields: kitchenFields },
  { title: 'спорт и домашняя активность',   fields: sportFields },
  { title: 'хранение и хозяйство',          fields: storageFields },
  { title: 'световые сценарии',             fields: lightingFields },
  { title: 'умный дом и технологии',        fields: techFields },
  { title: 'стиль и эстетика',              fields: styleFields },
  { title: 'ограничения и особые условия',  fields: restrictFields },
  { title: 'требования к проекту',          fields: [] },
])

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

/* Tag-style option selector */
.asb-tagsel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}
.asb-tagpicker-title {
  font-size: .58rem;
  text-transform: uppercase;
  letter-spacing: .75px;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
}
.asb-tagpool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.asb-tagopt {
  padding: 4px 10px; font-size: .74rem; cursor: pointer; user-select: none;
  border: none;
  border-radius: 10px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: background .16s, color .16s, transform .16s;
}
.asb-tagopt:hover { color: var(--text, #1a1a1a); }
.asb-tagopt--on {
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
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

/* ── Mobile ── */
@media (max-width: 768px) {
  .asb-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .asb-btn-save { width: 100%; text-align: center; }
  .asb-section-title { flex-direction: column; align-items: flex-start; }
}

</style>
