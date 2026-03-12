/**
 * shared/constants/brief-sections.ts
 *
 * Архитектура брифинга: каждая секция = заголовок + массив полей.
 * Пресеты определяют, какие секции показываются для каждого типа объекта.
 *
 * Структура:
 *   BriefSectionDef { key, title, type: 'fields' | 'requirements', fields? }
 *   BriefFieldDef   { key, label, type: 'text' | 'textarea' | 'options', options? }
 *   BRIEF_SECTIONS  — реестр всех секций
 *   BRIEF_SECTION_PRESETS — маппинг projectType → BriefSectionKey[]
 *   getBriefSections(projectType) — хелпер для компонента
 */

import {
  BRIEF_GUESTS_FREQ_OPTIONS,
  BRIEF_REMOTE_WORK_OPTIONS,
  BRIEF_STYLE_OPTIONS,
  BRIEF_COLOR_OPTIONS,
} from './profile-fields'
import type { ProjectPresetKey } from './presets'

// ─────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────

/** Способ отображения поля */
export type BriefFieldType = 'text' | 'textarea' | 'options'

/** Определение одного поля внутри секции */
export interface BriefFieldDef {
  key: string
  label: string
  placeholder?: string
  type: BriefFieldType
  options?: readonly string[]
}

/**
 * Тип секции:
 *  - 'fields'       — обычный список полей
 *  - 'requirements' — специальная сетка тегов (обрабатывается компонентом отдельно)
 */
export type BriefSectionType = 'fields' | 'requirements'

/** Определение одной секции брифинга */
export interface BriefSectionDef {
  key: string
  title: string
  type: BriefSectionType
  fields?: BriefFieldDef[]
}

// ─────────────────────────────────────────────────────────────────
// Жилые секции
// ─────────────────────────────────────────────────────────────────

const SECTION_FAMILY: BriefSectionDef = {
  key: 'family',
  title: 'состав семьи и образ жизни',
  type: 'fields',
  fields: [
    { key: 'brief_adults_count',     label: 'Взрослых в семье',               type: 'text',     placeholder: 'например: 2' },
    { key: 'brief_kids_ages',        label: 'Дети (возраст)',                  type: 'text',     placeholder: 'например: 4 и 8 лет' },
    { key: 'brief_ergonomics',       label: 'Эргономика (рост, особенности)', type: 'textarea', placeholder: 'высокий рост, адаптация столешниц...' },
    { key: 'brief_handed',           label: 'Доп. параметры',                 type: 'textarea', placeholder: 'левша, физ. ограничения, инвалидное кресло...' },
    { key: 'brief_pets_desc',        label: 'Питомцы',                        type: 'text',     placeholder: 'порода, размер' },
    { key: 'brief_pets_zone_detail', label: 'Зона питомца (детали)',          type: 'textarea', placeholder: 'лапомойка, миски, лоток, будка...' },
    { key: 'brief_remote_work',      label: 'Работа из дома',                 type: 'options',  options: BRIEF_REMOTE_WORK_OPTIONS },
    { key: 'brief_guests_freq',      label: 'Частота гостей',                 type: 'options',  options: BRIEF_GUESTS_FREQ_OPTIONS },
    { key: 'brief_hobbies',          label: 'Хобби и увлечения',              type: 'textarea', placeholder: 'музыка, живопись, спорт...' },
  ],
}

const SECTION_CONCEPT: BriefSectionDef = {
  key: 'concept',
  title: 'концепция и атмосфера',
  type: 'fields',
  fields: [
    { key: 'brief_home_mood',      label: 'Настроение дома',        type: 'textarea', placeholder: 'как выглядит идеальное пространство, ощущения...' },
    { key: 'brief_return_emotion', label: 'Эмоция при возвращении', type: 'textarea', placeholder: 'что хочется чувствовать, открывая дверь...' },
    { key: 'brief_space_image',    label: 'Ассоциативный образ',    type: 'textarea', placeholder: 'это пространство как... (отель, лес, галерея...)' },
  ],
}

const SECTION_ROUTINES: BriefSectionDef = {
  key: 'routines',
  title: 'ритуалы и распорядок',
  type: 'fields',
  fields: [
    { key: 'brief_morning_routine', label: 'Утренний ритуал',                  type: 'textarea', placeholder: 'кофе в тишине, утренняя пробежка, завтрак всей семьёй...' },
    { key: 'brief_evening_routine', label: 'Вечерний ритуал',                  type: 'textarea', placeholder: 'кино, ужин с гостями, чтение, йога...' },
    { key: 'brief_cooking_role',    label: 'Роль кухни',                       type: 'textarea', placeholder: 'готовим сами, заказываем, профессиональная готовка...' },
    { key: 'brief_bedroom_needs',   label: 'Спальня / сон',                    type: 'textarea', placeholder: 'раздельные спальни, звукоизоляция, электрошторы...' },
    { key: 'brief_acoustic_zones',  label: 'Акустика между зонами',            type: 'textarea', placeholder: 'нужна изоляция кабинета от детской, спальни от кухни...' },
    { key: 'brief_flex_zones',      label: 'Гибкость / многофункциональность', type: 'textarea', placeholder: 'зона-трансформер, гостевая = кабинет...' },
    { key: 'brief_future_changes',  label: 'Будущие изменения',                type: 'textarea', placeholder: 'планируем ребёнка, родители переедут, расширение...' },
  ],
}

const SECTION_KITCHEN: BriefSectionDef = {
  key: 'kitchen',
  title: 'кухня и гастрономия',
  type: 'fields',
  fields: [
    { key: 'brief_kitchen_intensity',  label: 'Интенсивность кухни',    type: 'textarea', placeholder: 'готовим каждый день, каждые выходные...' },
    { key: 'brief_kitchen_surfaces',   label: 'Рабочие поверхности',    type: 'textarea', placeholder: 'длина, материал, остров, ниша под технику...' },
    { key: 'brief_kitchen_cabinets',   label: 'Конфигурация гарнитура', type: 'textarea', placeholder: 'шкафы до потолка, открытые полки, витрины...' },
    { key: 'brief_kitchen_hardware',   label: 'Фурнитура и ручки',      type: 'textarea', placeholder: 'тип открывания, материал...' },
    { key: 'brief_kitchen_cooktop',    label: 'Варочная панель + вытяжка', type: 'textarea', placeholder: 'газ/индукция, встраиваемая/островная вытяжка...' },
    { key: 'brief_kitchen_oven',       label: 'Духовой шкаф и СВЧ',    type: 'textarea', placeholder: 'встроенные, высота расположения, паровая функция...' },
    { key: 'brief_kitchen_appliances', label: 'Доп. техника',           type: 'textarea', placeholder: 'винный шкаф, кофемашина, холодильник для напитков...' },
    { key: 'brief_kitchen_sink',       label: 'Оборудование мойки',     type: 'textarea', placeholder: 'измельчитель, фильтр питьевой воды, тип крана...' },
  ],
}

const SECTION_SPORT: BriefSectionDef = {
  key: 'sport',
  title: 'спорт и домашняя активность',
  type: 'fields',
  fields: [
    { key: 'brief_sport_zone',    label: 'Зона спорта и тренажёры', type: 'textarea', placeholder: 'кардио, силовые, коврик, зеркала...' },
    { key: 'brief_sport_storage', label: 'Хранение инвентаря',      type: 'textarea', placeholder: 'велосипеды, лыжи, мячи, коврики, гантели...' },
    { key: 'brief_sport_tech',    label: 'Техусловия',              type: 'textarea', placeholder: 'усиленный пол, вентиляция, розетки, TV-точка...' },
  ],
}

const SECTION_STORAGE: BriefSectionDef = {
  key: 'storage',
  title: 'хранение и хозяйство',
  type: 'fields',
  fields: [
    { key: 'brief_storage_volume', label: 'Объём вещей',        type: 'textarea', placeholder: 'сколько людей, много сезонного, коллекции, оборудование...' },
    { key: 'brief_storage_hidden', label: 'Скрытое хранение',   type: 'textarea', placeholder: 'чемоданы, инвентарь, «неприкосновенный запас»...' },
    { key: 'brief_utility_zone',   label: 'Хозяйственная зона', type: 'textarea', placeholder: 'стирка, сушка, база пылесоса, глажка...' },
  ],
}

// ─────────────────────────────────────────────────────────────────
// Универсальные секции (жилые + коммерческие)
// ─────────────────────────────────────────────────────────────────

const SECTION_LIGHTING: BriefSectionDef = {
  key: 'lighting',
  title: 'световые сценарии',
  type: 'fields',
  fields: [
    { key: 'brief_light_modes',      label: 'Световые режимы', type: 'textarea', placeholder: 'общий, рабочий, уютный, ночной, праздничный...' },
    { key: 'brief_light_dimming',    label: 'Диммирование',    type: 'textarea', placeholder: 'зоны с регулировкой яркости, предпочтения...' },
    { key: 'brief_light_automation', label: 'Автоматизация',   type: 'textarea', placeholder: 'датчики движения, мастер-выключатель, расписание...' },
  ],
}

const SECTION_TECH: BriefSectionDef = {
  key: 'tech',
  title: 'умный дом и технологии',
  type: 'fields',
  fields: [
    { key: 'brief_smart_control',  label: 'Система управления', type: 'textarea', placeholder: 'климат, шторы, безопасность, голосовое управление...' },
    { key: 'brief_acoustics_type', label: 'Акустика',           type: 'textarea', placeholder: 'встроенная (потолочная), напольная, мультирум...' },
    { key: 'brief_tech_equipment', label: 'Оборудование',       type: 'textarea', placeholder: 'центр управления, кабель-каналы, ИБП, NAS...' },
  ],
}

const SECTION_STYLE: BriefSectionDef = {
  key: 'style',
  title: 'стиль и эстетика',
  type: 'fields',
  fields: [
    { key: 'brief_style_prefer',   label: 'Стиль',                       type: 'options',  options: BRIEF_STYLE_OPTIONS },
    { key: 'brief_color_mood',     label: 'Цветовая гамма',               type: 'options',  options: BRIEF_COLOR_OPTIONS },
    { key: 'brief_color_palette',  label: 'Цветовая палитра (подробно)', type: 'textarea', placeholder: 'любимые сочетания, акцентные цвета, табу-цвета...' },
    { key: 'brief_like_refs',      label: 'Нравится (ссылки / описание)', type: 'textarea', placeholder: 'ссылки на Pinterest, описание...' },
    { key: 'brief_dislike_refs',   label: 'Не нравится',                  type: 'textarea', placeholder: 'что точно нельзя...' },
    { key: 'brief_material_prefs', label: 'Материалы',                    type: 'textarea', placeholder: 'натуральный камень, дерево, металл...' },
    { key: 'brief_textures',       label: 'Фактуры и текстуры',           type: 'text',     placeholder: 'матовое, глянцевое, рельефное, шероховатое...' },
    { key: 'brief_prints',         label: 'Принты / орнаменты',           type: 'text',     placeholder: 'отношение к узорам, паттернам, геометрии...' },
    { key: 'brief_art',            label: 'Искусство / арт-объекты',      type: 'text',     placeholder: 'картины, скульптура, инсталляция, принт...' },
  ],
}

const SECTION_RESTRICTIONS: BriefSectionDef = {
  key: 'restrictions',
  title: 'ограничения и особые условия',
  type: 'fields',
  fields: [
    { key: 'brief_allergies',          label: 'Аллергии / чувствительность', type: 'text',     placeholder: 'на запахи, пыль, материалы...' },
    { key: 'brief_deadlines_hard',     label: 'Жёсткие сроки',               type: 'text',     placeholder: 'дата заезда, мероприятие...' },
    { key: 'brief_budget_limits',      label: 'Бюджет',                      type: 'text',     placeholder: 'общий бюджет на реализацию...' },
    { key: 'brief_budget_priorities',  label: 'Приоритеты и компромиссы',    type: 'textarea', placeholder: 'на чём не экономить, где допустим компромисс...' },
    { key: 'brief_special_notes',      label: 'Особые пожелания',            type: 'textarea', placeholder: 'любые важные детали...' },
  ],
}

/** Специальная секция: сетка тегов-требований (обрабатывается компонентом отдельно) */
const SECTION_REQUIREMENTS: BriefSectionDef = {
  key: 'requirements',
  title: 'требования к проекту',
  type: 'requirements',
}

// ─────────────────────────────────────────────────────────────────
// Коммерческие секции
// ─────────────────────────────────────────────────────────────────

const SECTION_PROJECT_CONCEPT: BriefSectionDef = {
  key: 'project_concept',
  title: 'концепция проекта',
  type: 'fields',
  fields: [
    { key: 'brief_project_idea',      label: 'Идея и позиционирование',      type: 'textarea', placeholder: 'что это за объект, для кого, ключевая идея...' },
    { key: 'brief_target_audience',   label: 'Целевая аудитория',            type: 'textarea', placeholder: 'кто клиенты / посетители / сотрудники...' },
    { key: 'brief_brand_values',      label: 'Ценности и настроение бренда', type: 'textarea', placeholder: 'слова-ориентиры: уют, премиум, лаконичность...' },
    { key: 'brief_competitors_refs',  label: 'Референсы и конкуренты',       type: 'textarea', placeholder: 'примеры которые нравятся / не нравятся...' },
    { key: 'brief_unique_selling',    label: 'Уникальность объекта',         type: 'textarea', placeholder: 'что выделяет среди конкурентов...' },
  ],
}

const SECTION_WORKSPACE: BriefSectionDef = {
  key: 'workspace',
  title: 'рабочее пространство',
  type: 'fields',
  fields: [
    { key: 'brief_ws_workstations',  label: 'Рабочие места',                  type: 'textarea', placeholder: 'количество, конфигурация (open space, кабинеты, hot desk)...' },
    { key: 'brief_ws_meeting_rooms', label: 'Переговорные комнаты',           type: 'textarea', placeholder: 'количество, вместимость, оснащение (AV, экраны)...' },
    { key: 'brief_ws_focus_zones',   label: 'Зоны тишины / фокус-зоны',      type: 'textarea', placeholder: 'звукоизолированные кабины, телефонные будки...' },
    { key: 'brief_ws_lounge',        label: 'Зона отдыха и общения',          type: 'textarea', placeholder: 'кухня, неформальные переговоры, релакс...' },
    { key: 'brief_ws_reception',     label: 'Ресепшн / входная зона',         type: 'textarea', placeholder: 'приём гостей, пропускной режим, репрезентативность...' },
    { key: 'brief_ws_brand',         label: 'Брендинг и корпоративный стиль', type: 'textarea', placeholder: 'фирменные цвета, логотипы, дресс-код пространства...' },
  ],
}

const SECTION_KITCHEN_PRO: BriefSectionDef = {
  key: 'kitchen_pro',
  title: 'профессиональная кухня',
  type: 'fields',
  fields: [
    { key: 'brief_kp_concept',      label: 'Концепция кухни',               type: 'textarea', placeholder: 'тип кухни, меню, количество позиций, смены...' },
    { key: 'brief_kp_capacity',     label: 'Производительность',            type: 'text',     placeholder: 'блюд в час, посадочных мест на обслуживание...' },
    { key: 'brief_kp_equipment',    label: 'Профессиональное оборудование', type: 'textarea', placeholder: 'конвектомат, пароварка, гриль, фритюр...' },
    { key: 'brief_kp_workflow',     label: 'Рабочий процесс',               type: 'textarea', placeholder: 'линии подачи, станции (холодный цех, горячий, кондитерский)...' },
    { key: 'brief_kp_cold_storage', label: 'Холодовая цепь',                type: 'textarea', placeholder: 'объём морозильных камер, шоковая заморозка...' },
    { key: 'brief_kp_delivery',     label: 'Загрузка и приёмка',            type: 'textarea', placeholder: 'зона приёмки товара, мусоропровод, частота поставок...' },
  ],
}

const SECTION_SERVICE_ZONES: BriefSectionDef = {
  key: 'service_zones',
  title: 'зоны обслуживания гостей',
  type: 'fields',
  fields: [
    { key: 'brief_sz_guest_capacity', label: 'Вместимость гостей',      type: 'text',     placeholder: 'количество посадочных мест / гостей...' },
    { key: 'brief_sz_service_style',  label: 'Стиль обслуживания',      type: 'textarea', placeholder: 'самообслуживание, официанты, прилавок, шведский стол...' },
    { key: 'brief_sz_bar_zone',       label: 'Барная зона',             type: 'textarea', placeholder: 'бар, витрина, кофемашина, выдача на стойку...' },
    { key: 'brief_sz_outdoor',        label: 'Летняя терраса / веранда', type: 'textarea', placeholder: 'площадь, сезонность, мебель, обогрев...' },
    { key: 'brief_sz_private_rooms',  label: 'Приватные зоны / VIP',   type: 'textarea', placeholder: 'банкетный зал, кабинки, VIP-зоны...' },
    { key: 'brief_sz_staff_areas',    label: 'Зоны персонала',          type: 'textarea', placeholder: 'раздевалка, туалет, хранение формы...' },
  ],
}

const SECTION_ROOMS_CONFIG: BriefSectionDef = {
  key: 'rooms_config',
  title: 'номерной фонд и размещение',
  type: 'fields',
  fields: [
    { key: 'brief_rc_room_count',   label: 'Количество номеров',      type: 'text',     placeholder: 'например: 12 номеров + 2 люкса' },
    { key: 'brief_rc_room_types',   label: 'Типы номеров',            type: 'textarea', placeholder: 'стандарт, делюкс, студия, сьют, апартаменты...' },
    { key: 'brief_rc_amenities',    label: 'Удобства номеров',        type: 'textarea', placeholder: 'кондиционер, TV, мини-кухня, балкон, сейф...' },
    { key: 'brief_rc_common_areas', label: 'Лобби и общие зоны',      type: 'textarea', placeholder: 'ресепшн, лаундж, коворкинг, зона для детей...' },
    { key: 'brief_rc_spa_gym',      label: 'СПА / фитнес',            type: 'textarea', placeholder: 'сауна, бассейн, тренажёры, кабинеты процедур...' },
    { key: 'brief_rc_breakfast',    label: 'Зона завтрака / ресторан', type: 'textarea', placeholder: 'шведский стол, à la carte, включён ли завтрак...' },
  ],
}

const SECTION_RETAIL: BriefSectionDef = {
  key: 'retail',
  title: 'торговая концепция',
  type: 'fields',
  fields: [
    { key: 'brief_rt_product_category', label: 'Категория товара / услуги', type: 'textarea', placeholder: 'одежда, электроника, косметика, продукты...' },
    { key: 'brief_rt_display_type',     label: 'Тип выкладки',              type: 'textarea', placeholder: 'стеллажи, витрины, подиумы, открытая выкладка...' },
    { key: 'brief_rt_customer_flow',    label: 'Клиентский маршрут',        type: 'textarea', placeholder: 'вход, зоны навигации, кассовая зона...' },
    { key: 'brief_rt_storage_back',     label: 'Склад и подсобные зоны',    type: 'textarea', placeholder: 'объём, доступ персонала, погрузка...' },
    { key: 'brief_rt_fitting_rooms',    label: 'Примерочные',               type: 'text',     placeholder: 'количество, размер, освещение, зеркала...' },
    { key: 'brief_rt_checkout',         label: 'Кассовая зона',             type: 'textarea', placeholder: 'количество касс, самообслуживание, выдача заказов...' },
  ],
}

// ─────────────────────────────────────────────────────────────────
// Реестр всех секций
// ─────────────────────────────────────────────────────────────────

export type BriefSectionKey =
  | 'family' | 'concept' | 'routines' | 'kitchen' | 'sport' | 'storage'
  | 'lighting' | 'tech' | 'style' | 'restrictions' | 'requirements'
  | 'project_concept' | 'workspace' | 'kitchen_pro' | 'service_zones'
  | 'rooms_config' | 'retail'

export const BRIEF_SECTIONS: Record<BriefSectionKey, BriefSectionDef> = {
  // Жилые
  family:          SECTION_FAMILY,
  concept:         SECTION_CONCEPT,
  routines:        SECTION_ROUTINES,
  kitchen:         SECTION_KITCHEN,
  sport:           SECTION_SPORT,
  storage:         SECTION_STORAGE,
  // Универсальные
  lighting:        SECTION_LIGHTING,
  tech:            SECTION_TECH,
  style:           SECTION_STYLE,
  restrictions:    SECTION_RESTRICTIONS,
  requirements:    SECTION_REQUIREMENTS,
  // Коммерческие
  project_concept: SECTION_PROJECT_CONCEPT,
  workspace:       SECTION_WORKSPACE,
  kitchen_pro:     SECTION_KITCHEN_PRO,
  service_zones:   SECTION_SERVICE_ZONES,
  rooms_config:    SECTION_ROOMS_CONFIG,
  retail:          SECTION_RETAIL,
}

// ─────────────────────────────────────────────────────────────────
// Пресеты: какие секции для каждого типа объекта
// ─────────────────────────────────────────────────────────────────

const RESIDENTIAL: BriefSectionKey[] = [
  'family', 'concept', 'routines', 'kitchen', 'sport', 'storage',
  'lighting', 'tech', 'style', 'restrictions', 'requirements',
]

export const BRIEF_SECTION_PRESETS: Record<ProjectPresetKey, BriefSectionKey[]> = {
  apartment:        RESIDENTIAL,
  house:            RESIDENTIAL,
  cottage:          RESIDENTIAL,
  townhouse:        RESIDENTIAL,
  office:           ['project_concept', 'workspace',   'lighting', 'tech', 'style', 'restrictions'],
  commercial_space: ['project_concept', 'retail',      'lighting', 'tech', 'style', 'restrictions'],
  restaurant:       ['project_concept', 'kitchen_pro', 'service_zones', 'lighting', 'tech', 'style', 'restrictions'],
  cafe:             ['project_concept', 'kitchen_pro', 'service_zones', 'lighting', 'tech', 'style', 'restrictions'],
  hotel:            ['project_concept', 'rooms_config', 'kitchen_pro', 'service_zones', 'lighting', 'tech', 'style', 'restrictions'],
  guest_house:      ['project_concept', 'rooms_config', 'service_zones', 'lighting', 'tech', 'style', 'restrictions'],
  other:            ['project_concept', 'lighting', 'tech', 'style', 'restrictions'],
}

/** Возвращает упорядоченный список секций для заданного типа объекта */
export function getBriefSections(projectType: string): BriefSectionDef[] {
  const keys = BRIEF_SECTION_PRESETS[projectType as ProjectPresetKey] ?? RESIDENTIAL
  return keys.map(k => BRIEF_SECTIONS[k])
}
