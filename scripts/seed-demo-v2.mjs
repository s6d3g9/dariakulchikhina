/**
 * Демо-данные v2 — через API сайта (как браузер)
 * Создаёт: клиент, проект, подрядчик (компания), мастер (физлицо), дизайнер
 * Привязывает всё к проекту, заполняет все страницы и статусы работ.
 *
 * Запуск: node scripts/seed-demo-v2.mjs
 */

import postgres from 'postgres'

const BASE = 'http://localhost:3000'
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme'
const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'

// ─── Простой API-клиент с куки ────────────────────────────────────────────────
let cookie = ''

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  const res = await fetch(`${BASE}${path}`, opts)
  // Сохраняем куки сессии (admin_session)
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const match = setCookie.match(/(admin_session=[^;]+)/)
    if (match) cookie = match[1]
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

// ─── 0. Чистим старые демо-данные ────────────────────────────────────────────
console.log('🗑  Удаляем старые демо-данные...')
const db = postgres(DB_URL, { max: 1 })

// Удаляем только наши предыдущие демо-записи по известным slug
await db`DELETE FROM work_status_items WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'ivanov-%')`
await db`DELETE FROM page_content         WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'ivanov-%')`
await db`DELETE FROM project_contractors  WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'ivanov-%')`
await db`DELETE FROM designer_projects    WHERE project_id IN (SELECT id FROM projects WHERE slug LIKE 'ivanov-%')`.catch(() => {})
await db`DELETE FROM projects WHERE slug LIKE 'ivanov-%'`
await db`DELETE FROM contractors WHERE slug IN ('petrov-remont-2026','master-smirnov-2026','stroyteh-demo-2026')`
await db`DELETE FROM designers   WHERE email = 'karaseva@design-studio.ru'`
await db`DELETE FROM clients     WHERE phone = '+7 (916) 305-47-82'`
await db.end()
console.log('  ✅ Готово')

// ─── 1. Авторизация ──────────────────────────────────────────────────────────
console.log('\n🔐 Авторизуемся...')
await api('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
console.log('  ✅ Сессия получена')

// ─── 2. Клиент ───────────────────────────────────────────────────────────────
console.log('\n👤 Создаём клиента...')
const client = await api('POST', '/api/clients', {
  name:          'Иванов Иван Иванович',
  phone:         '+7 (916) 305-47-82',
  email:         'ivanov.ivan@gmail.com',
  messenger:     'telegram',
  messengerNick: '@ivanov_ivan',
  address:       'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  notes:         'Педантичен, любит чёткие сроки. Коммуникация через Telegram. Встречи — по записи.',
})
console.log(`  ✅ Клиент ID: ${client.id} — ${client.name}`)

// ─── 3. Проект ───────────────────────────────────────────────────────────────
console.log('\n🏠 Создаём проект...')
const project = await api('POST', '/api/projects', {
  slug:  'ivanov-profsoiuznaya-82',
  title: 'Квартира Иванова — ул. Профсоюзная, 82 м²',
})
console.log(`  ✅ Проект ID: ${project.id} — ${project.slug}`)

// ─── 4. Заполняем профиль проекта (до привязки клиента!) ─────────────────────
console.log('\n📝 Заполняем профиль проекта...')
await api('PUT', `/api/projects/${project.slug}`, {
  title: 'Квартира Иванова — ул. Профсоюзная, 82 м²',
  status: 'active',
  profile: {
    // ── Личные данные (schema fields) ──────────────────────────
    fio:                        'Иванов Иван Иванович',
    phone:                      '+7 (916) 305-47-82',
    email:                      'ivanov.ivan@gmail.com',
    messenger:                  'telegram',
    messengerNick:              '@ivanov_ivan',
    address:                    'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    familyStatus:               'Женат',
    children:                   '1 (сын, 7 лет)',
    pets:                       'Нет',
    preferredContact:           'Telegram',
    referralSource:             'Instagram',
    previousExperience:         'Первый опыт ремонта с дизайнером. Ранее делали сами.',
    notes:                      'Педантичен, любит чёткие сроки. Встречи по записи.',
    // ── Объект ──────────────────────────────────────────────────
    objectAddress:              'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    objectType:                 'Квартира',
    objectArea:                 '82',
    roomCount:                  '4',
    floor:                      '8',
    ceilingHeight:              '2,8 м',
    objectCondition:            'Черновая отделка (под ключ)',
    hasBalcony:                 'Да — присоединение к гостиной согласовано',
    // ── Проект ──────────────────────────────────────────────────
    budget:                     '4 500 000 ₽',
    deadline:                   '01.10.2026',
    stylePreferences:           'Современный минимализм, Скандинавский стиль',
    colorPreferences:           'Белый, светло-серый, тёплый дуб, акценты тёмной стали',
    dislikes:                   'Яркие цвета, барокко, хай-тек',
    priorities:                 'Качество материалов, функциональность, долговечность',
    // ── Бриф ──────────────────────────────────────────────────
    brief_work_from_home:       true,
    brief_kids_room:            true,
    brief_smart_home:           true,
    brief_storage:              true,
    brief_soundproofing:        true,
    brief_adults_count:         '2',
    brief_kids_ages:            '7 лет',
    brief_remote_work:          'Отдельный кабинет, тихая зона',
    brief_guests_freq:          '1-2 раза в месяц',
    brief_style_prefer:         'Современный минимализм, тёплые текстуры',
    brief_color_palette:        'Белый, серый, дерево, металл',
    brief_material_prefs:       'Натуральное дерево, камень, лён, металл',
    brief_light_modes:          'Рабочий свет, расслабляющий свет, ночник',
    brief_light_dimming:        'Да — везде диммеры',
    brief_light_automation:     'Да — управление через приложение',
    brief_acoustics_type:       'Звукоизоляция кабинета и спальни',
    brief_kitchen_intensity:    'Готовим каждый день, важна функциональность',
    brief_storage_volume:       'Много — 4 человека плюс гости',
    brief_deadlines_hard:       '01.10.2026 — жёсткий дедлайн (школа)',
    brief_budget_priorities:    'Кухня, ванные, полы — на них не экономим',
    brief_special_notes:        'Без порогов в санузлах (пожилые родители часто в гостях)',
    brief_completed:            true,
    // ── Обследование ──────────────────────────────────────────
    survey_status:              'completed',
    survey_date:                '25.01.2026',
    survey_engineer:            'Карасёва М.В.',
    survey_address:             'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    survey_area:                '82 м²',
    survey_ceiling:             '2,82 м',
    survey_mep_notes:           '3-фаз. ввод 380В. Стояки ХВС/ГВС — PP-R 32 мм без замечаний.',
    survey_issues:              '1. Неравномерность стяжки до 18 мм → нивелир-масса. 2. Промерзание угла в детской → Пеноплекс 50 мм.',
    survey_recommendations:     'Согласование перепланировки (балкон+гостиная) до начала работ.',
    mep_ventilation:            true,
    mep_plumbing:               true,
    mep_electrical:             true,
    mep_heating:                true,
    mep_smart:                  true,
    mep_balcony:                true,
    // ── Договор ───────────────────────────────────────────────
    contract_number:            'ДД-2026-0142',
    contract_date:              '01.02.2026',
    contract_status:            'signed',
    contract_parties:           'Бюро «Kara» (исполнитель) — Иванов И.И. (заказчик)',
    contract_notes:             'Договор на дизайн-проект + авторский надзор.',
    invoice_amount:             '350 000 ₽',
    invoice_advance_pct:        '50',
    invoice_date:               '01.02.2026',
    payment_status:             'advance_paid',
    invoice_payment_details:    'Оплата Сбербанк — 175 000 ₽ получено 03.02.2026',
    tor_scope:                  'Дизайн-проект 82 м² + Авторский надзор',
    tor_exclusions:             'Строительные работы, закупка материалов',
    tor_timeline:               'Проект — 45 рабочих дней. Надзор — до 01.10.2026.',
    tor_deliverables:           'PDF + DWG + 3D-визуализация (каждое помещение)',
    // ── Паспортные данные (passthrough) ───────────────────────
    passport_series:            '4512',
    passport_number:            '345678',
    passport_issued_by:         'ОВД Черёмушки г. Москвы',
    passport_issue_date:        '20.04.2010',
    passport_department_code:   '770-045',
    passport_registration_address: 'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    passport_inn:               '771234567890',
    snils:                      '123-456-789 00',
  },
})
console.log('  ✅ Профиль заполнен')

// ─── 5. Привязываем клиента к проекту (поверх профиля — добавит client_ids) ──
console.log('\n🔗 Привязываем клиента к проекту...')
await api('POST', `/api/clients/${client.id}/link-project`, {
  projectSlug: project.slug,
})
console.log('  ✅ Клиент ↔ Проект')

// ─── 6. Подрядчик (компания) ─────────────────────────────────────────────────
console.log('\n🏗  Создаём подрядчика (компания)...')
const contractor = await api('POST', '/api/contractors', {
  slug:           'stroyteh-demo-2026',
  name:           'ООО «СтройТех»',
  contractorType: 'company',
})
// Заполняем полные реквизиты через PUT
await api('PUT', `/api/contractors/${contractor.id}`, {
  name:                 'ООО «СтройТех»',
  companyName:          'ООО «СтройТех»',
  contactPerson:        'Петров Сергей Николаевич',
  phone:                '+7 (495) 987-65-43',
  email:                'info@stroyteh.ru',
  inn:                  '7743812345',
  kpp:                  '774301001',
  ogrn:                 '1234567890123',
  bankName:             'ПАО Сбербанк',
  bik:                  '044525225',
  settlementAccount:    '40702810400001234567',
  correspondentAccount: '30101810400000000225',
  legalAddress:         'г. Москва, ул. Строителей, д. 12, офис 301',
  factAddress:          'г. Москва, ул. Строителей, д. 12, офис 301',
  workTypes:            ['Черновые работы','Чистовые работы','Электрика','Сантехника','Плиточные работы','Малярные работы'],
  roleTypes:            ['Генеральный подрядчик'],
  contractorType:       'company',
  taxSystem:            'УСН (доходы 6%)',
  city:                 'Москва',
  experienceYears:      15,
  telegram:             '@stroyteh_msk',
  notes:                'Надёжный генподрядчик. 15 лет опыта. Лицензия ФСБ. Гарантия 2 года на все работы.',
})
console.log(`  ✅ Подрядчик ID: ${contractor.id} — ООО «СтройТех»`)

// ─── 7. Мастер (физлицо) ─────────────────────────────────────────────────────
console.log('\n👷 Создаём мастера (физлицо)...')
const master = await api('POST', '/api/contractors', {
  slug:           'master-smirnov-2026',
  name:           'Смирнов Дмитрий Александрович',
  contractorType: 'master',
  parentId:       contractor.id,
})
await api('PUT', `/api/contractors/${master.id}`, {
  name:                    'Смирнов Дмитрий Александрович',
  contractorType:          'master',
  parentId:                contractor.id,
  phone:                   '+7 (903) 412-88-21',
  email:                   'smirnov.dm@mail.ru',
  telegram:                '@smirnov_master',
  passportSeries:          '4515',
  passportNumber:          '234567',
  passportIssuedBy:        'ОМВД России по р-ну Хамовники г. Москвы',
  passportIssueDate:       '10.08.2015',
  passportDepartmentCode:  '770-042',
  birthDate:               '23.05.1987',
  birthPlace:              'г. Москва',
  registrationAddress:     'г. Москва, ул. Остоженка, д. 8, кв. 34',
  snils:                   '987-654-321 00',
  inn:                     '771098765432',
  taxSystem:               'Самозанятый',
  workTypes:               ['Плиточные работы','Малярные работы','Чистовые работы'],
  roleTypes:               ['Отделочник'],
  city:                    'Москва',
  experienceYears:         8,
  notes:                   'Специализируется на плитке и чистовой отделке. Аккуратный, пунктуальный. Самозанятый.',
})
console.log(`  ✅ Мастер ID: ${master.id} — Смирнов Д.А.`)

// ─── 8. Дизайнер ─────────────────────────────────────────────────────────────
console.log('\n🎨 Создаём дизайнера...')
const designer = await api('POST', '/api/designers', {
  name:            'Карасёва Мария Викторовна',
  companyName:     'Бюро дизайна интерьера «Kara»',
  phone:           '+7 (916) 200-35-77',
  email:           'karaseva@design-studio.ru',
  telegram:        '@karaseva_design',
  website:         'https://kara-design.ru',
  city:            'Москва',
  experience:      '12 лет в дизайне интерьеров, более 80 реализованных проектов',
  about:           'Специализируюсь на современном минимализме и скандинавском стиле. Работаю с комплексными объектами от концепции до авторского надзора.',
  specializations: ['Residential','Минимализм','Scandi','Перепланировка'],
  services:        [
    { name: 'Концепция', price: '50 000 ₽' },
    { name: 'Рабочие чертежи', price: '150 000 ₽' },
    { name: 'Спецификации', price: '50 000 ₽' },
    { name: 'Авторский надзор', price: '15 000 ₽/мес' },
  ],
  packages:        [
    { name: 'Полный проект', price: '350 000 ₽', description: 'Концепция + рабочка + спецификации + 3D' },
    { name: 'Авторский надзор', price: '80 000 ₽/мес', description: 'Еженедельные выезды + управление подрядчиками' },
  ],
})
console.log(`  ✅ Дизайнер ID: ${designer.id} — ${designer.name}`)

// ─── 9. Привязываем к проекту: подрядчик + мастер + дизайнер ─────────────────
console.log('\n🔗 Привязываем участников к проекту...')
await api('POST', `/api/projects/${project.slug}/contractors`, { contractorId: contractor.id })
await api('POST', `/api/projects/${project.slug}/contractors`, { contractorId: master.id })
await api('POST', `/api/projects/${project.slug}/designers`, { designerId: designer.id })
console.log('  ✅ Подрядчик + Мастер + Дизайнер привязаны')

// ─── 10. Контент страниц через PUT /api/projects/:slug/page-content ───────────
console.log('\n📄 Заполняем страницы проекта...')

async function putPage(pageSlug, content) {
  await api('PUT', `/api/projects/${project.slug}/page-content`, { pageSlug, content })
  console.log(`  ✅ ${pageSlug}`)
}

await putPage('first-contact', {
  contact_date:       '12.01.2026',
  contact_channel:    'Instagram',
  client_name:        'Иванов Иван Иванович',
  phone:              '+7 (916) 305-47-82',
  email:              'ivanov.ivan@gmail.com',
  object_type:        'Квартира',
  object_address:     'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  object_area:        '82',
  rooms:              '4',
  budget:             '4 500 000 ₽',
  deadline:           '01.10.2026',
  style_preference:   'Современный минимализм, светлые тона',
  source:             'Instagram',
  first_meeting_date: '18.01.2026',
  meeting_format:     'Очная встреча на объекте',
  notes:              'Клиент увидел наши работы в Instagram. Ремонт «под ключ». Требования: функциональность и долговечность.',
})

await putPage('smart-brief', {
  style:             'Современный минимализм',
  color_palette:     'Белый #FAFAFA, светло-серый #E8E4E0, тёплый дуб #C4956A, тёмная сталь #2C2C2C',
  avoid:             'Яркие цвета, хай-тек, барокко, золото',
  inspiration:       'Скандинавский стиль с тёплыми деревянными акцентами — Norm Architects, Bolia',
  comfort_priority:  'Тёплый пол во всех санузлах и на кухне',
  lighting:          'Максимум естественного света, скрытая LED-подсветка по периметру, диммеры везде',
  storage:           'Встроенные шкафы-купе в каждой спальне, отдельная гардеробная',
  kitchen_style:     'Островная кухня, каменная столешница, матовые фасады Blum',
  bathroom_count:    '2',
  bathroom_style:    'Крупноформатная белая плитка, встроенные ниши, хромированная фурнитура Grohe',
  children_zone:     'Детская для мальчика 7 лет — рабочая зона + зона сна',
  home_office:       'Отдельный кабинет, звукоизоляция Rw ≥ 54 дБ',
  smart_home:        'Базовый умный дом — управление освещением и электрошторами',
  materials_quality: 'Высокий — HARMO, Farrow&Ball, Grohe, Miele',
  family:            'Двое взрослых + ребёнок 7 лет',
  pets:              'Нет',
  special_needs:     'Без порогов в санузлах (пожилые родители в гостях)',
})

await putPage('client-tz', {
  project_name:       'Дизайн квартиры Иванова. ул. Профсоюзная, д. 45, кв. 17',
  object_address:     'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  object_area:        '82 м²',
  floor:              '8',
  ceiling_height:     '2,8 м (после монтажа — 2,6 м в зонах с ГКЛ)',
  building_type:      'Монолитный жилой дом 2018 г.',
  scope_of_work:      'Дизайн-проект + Авторский надзор + Комплектация',
  rooms:              'Прихожая, гостиная-столовая, кухня-остров, мастер-спальня с гардеробной, детская, кабинет, санузел совмещённый, санузел гостевой, постирочная',
  walls_condition:    'Монолитные несущие. Ненесущие кирпич — снос согласован.',
  floor_condition:    'Черновая стяжка 60–65 мм. Дефектов нет.',
  windows:            '6 окон Rehau 2018. Балкон — присоединение к гостиной согласовано.',
  existing_furniture: 'Нет — чистовая отделка с нуля',
  design_stages:      'Концепция → Рабочие чертежи → Спецификации → Авторский надзор',
  delivery_format:    'PDF + DWG + 3D-визуализация каждого помещения',
  timeline_design:    '45 рабочих дней с момента подписания договора',
  timeline_repair:    'Март–октябрь 2026 (7 месяцев)',
  budget_design:      '350 000 ₽',
  budget_repair:      '4 150 000 ₽',
  payment_schedule:   '50% аванс — 30% после рабочих чертежей — 20% при сдаче',
  warranty:           'Авторский надзор: еженедельные выезды в период ремонта',
  special_requirements: 'Перепланировка: балкон + гостиная. Шумоизоляция кабинета. Тёплый пол: 3 помещения.',
})

await putPage('moodboard', {
  concept_name:        'Северный свет',
  concept_description: 'Пространство вдохновлено скандинавской архитектурой и принципом «ма» — осознанная пустота. Природные материалы: дуб, лён, металл. Много воздуха, каждый предмет функционален.',
  color_main:          'Белый #FAFAFA, светло-серый #E8E4E0',
  color_accent:        'Тёплый дуб #C4956A, тёмная сталь #2C2C2C',
  color_detail:        'Медь #B87333, терракота #C07F5A (в текстиле)',
  materials_floor:     'Инженерная доска HARMO "Nordic Oak" 15/4×200×1500',
  materials_walls:     'Farrow & Ball "Pointing" 2003. Кабинет — акустическая панель шпон дуб.',
  materials_kitchen:   'Столешница Neolith "Calacatta Gold". Фасады Leicht — матовая ламинация белый.',
  materials_bath:      'FAP Ceramiche "Evoque" 60×120 белая. Фурнитура Grohe Brushed Cool Sunrise.',
  furniture_style:     'Современная европейская. Мягкая мебель Bolia (Дания). Кухня Leicht (Германия).',
  lighting_concept:    'Бестеневое — LED-профили по периметру потолка. Точечное акцентное. Диммер на все зоны.',
  references:          'Norm Architects Studio, Bolia Interiors, бюро SL*Project',
})

await putPage('specifications', {
  floor_covering:   'Инженерная доска HARMO Nordic Oak 15/4×200×1500 — 82 м²',
  floor_warm:       'Тёплый пол DEVI DEVIheat 10T — санузел 1 + санузел 2 + постирочная (18 м²)',
  tile_bath1:       'FAP Evoque White 60×120 — 42 м², затирка Mapei Ultracolor Plus белая',
  tile_bath2:       'FAP Evoque White 30×60 — 24 м²',
  paint_walls:      'Farrow & Ball Pointing 2003 — гостиная, спальни, коридор. Jotun Lady — детская.',
  ceiling_system:   'Descor Elite матовый белый — прихожая + гостиная. Knauf ГКЛ — остальные.',
  doors_interior:   'Profil Doors X — дуб натуральный, скрытое полотно × 8 шт.',
  door_entrance:    'Тorex Снегирь с шумоизоляцией, отделка дуб',
  kitchen:          'Leicht Atelier M Magnolia матовый + Frame дуб. Встроенная техника Miele.',
  appliances:       'Духовой шкаф Miele H7264B, варочная Miele KM7697, холодильник Liebherr CNef5735',
  plumbing:         'Смесители Grohe Essence Brushed Cool Sunrise. Душ — Grohe Rain Shower.',
  radiators:        'Kermi Profil-V FTV22, горизонтальные, 6 секций',
  insulation:       'Кабинет: Rockwool Акустик Баттс 50 мм + Isover 25 мм',
  sockets:          'Legrand Valena Life белый матовый — по схеме электрики',
  smart_home:       'Fibaro Home Center 3 Lite — освещение, шторы, климат',
})

await putPage('space-planning', {
  layout_concept:    'Перепланировка согласована в Мосжилинспекции (проект ТП-2026-0341). Балкон объединён с гостиной.',
  total_area:        '82 м²',
  living_zone:       'Гостиная-столовая — 41,5 м²',
  kitchen_area:      '18,2 м² (в составе гостиной)',
  master_bedroom:    '16,4 м² + гардеробная 3,5 м²',
  childrens_room:    '11,8 м²',
  office:            '10,3 м²',
  bathroom1:         '8,6 м² (совмещённый, мастер)',
  bathroom2:         '4,4 м² (гостевой)',
  laundry:           '3,2 м²',
  hallway:           '6,1 м²',
  storage_solutions: 'Встроенные шкафы-купе глубина 60 см. Гардеробная. Кладовка под лестницей.',
  zoning:            'Гостиная зонирована диваном Bolia: ТВ-зона + переговорная зона.',
  height_after:      'Объединённая зона: 3,1 м (убрали перегородку балкона)',
  notes:             'Вся разводка инженерных сетей — скрытая. Коридор расширен за счёт ненесущей перегородки.',
})

await putPage('procurement-list', {
  item_01: 'Инженерная доска HARMO Nordic Oak 90 м² → 342 000 ₽ | Паркет-холл',
  item_02: 'Клей Bona R848 + грунт Bona P → 50 000 ₽ | Паркет-холл',
  item_03: 'Тёплый пол DEVI 10T + терморегулятор × 3 → 42 500 ₽ | OBI',
  item_04: 'Плитка FAP Evoque White 45 м² → 198 000 ₽ | Kerama Marazzi',
  item_05: 'Краска Farrow & Ball Pointing 5л × 6 банок → 78 000 ₽ | PaintDeco',
  item_06: 'Кухня Leicht Atelier M + встройка Miele × 1 компл → 1 240 000 ₽ | Leicht Moscow',
  item_07: 'Profil Doors X × 8 шт → 184 000 ₽ | ПрофильДоорс',
  item_08: 'Дверь Тorex Снегирь → 85 000 ₽ | Тorex',
  item_09: 'Смесители Grohe Essence × 4 + душ Grohe Rain → 96 000 ₽ | Grohe-shop',
  item_10: 'Натяжные потолки Descor Elite 52 м² → 78 000 ₽ | Потолок.рф',
  item_11: 'Fibaro HC3 Lite + умные розетки × 12 → 68 000 ₽ | Smart House',
  item_12: 'Мебель Bolia: диван, кресла, обеденная группа → 680 000 ₽ | Bolia Moscow',
  total:   '3 141 500 ₽',
  reserve: 'Остаток 1 008 500 ₽ — резерв + авторский надзор',
})

// ─── 11. Статусы работ ────────────────────────────────────────────────────────
console.log('\n📋 Создаём статусы работ...')
await api('PUT', `/api/projects/${project.slug}/work-status`, {
  items: [
    { contractorId: master.id,      title: 'Демонтажные работы',              workType: 'demo',      status: 'done',        dateStart: '01.03.2026', dateEnd: '04.03.2026', budget: '85 000 ₽',   notes: 'Снос перегородок, вынос мусора, отбивка плитки в санузлах', sortOrder: 0 },
    { contractorId: contractor.id,  title: 'Электрика (разводка + щит)',       workType: 'electric',  status: 'done',        dateStart: '05.03.2026', dateEnd: '09.03.2026', budget: '180 000 ₽',  notes: 'Замена щита ABB. Кабели NYM в штробы. 68 точек подключения.', sortOrder: 1 },
    { contractorId: contractor.id,  title: 'Стяжка + тёплый пол',             workType: 'concrete',  status: 'in-progress', dateStart: '10.03.2026', dateEnd: '21.03.2026', budget: '130 000 ₽',  notes: 'Нивелир-масса Knauf 25–43 мм. DEVI под санузлы и кухню. Сохнет 21 день.', sortOrder: 2 },
    { contractorId: contractor.id,  title: 'Сантехника (разводка ХВС/ГВС)',   workType: 'plumbing',  status: 'pending',     dateStart: '22.03.2026', dateEnd: '28.03.2026', budget: '95 000 ₽',   notes: 'PP-R 32 мм. Отводы под тёплый пол и сантехприборы.', sortOrder: 3 },
    { contractorId: contractor.id,  title: 'Штукатурные работы',              workType: 'plaster',   status: 'pending',     dateStart: '29.03.2026', dateEnd: '12.04.2026', budget: '220 000 ₽',  notes: 'Knauf Rotband 8–12 мм по маякам. Все помещения кроме санузлов.', sortOrder: 4 },
    { contractorId: master.id,      title: 'Плитка — санузлы',                workType: 'tile',      status: 'pending',     dateStart: '13.04.2026', dateEnd: '02.05.2026', budget: '160 000 ₽',  notes: 'FAP Evoque 60×120. Затирка Mapei. Ниши и полочки встроенные.', sortOrder: 5 },
    { contractorId: master.id,      title: 'Малярные работы',                 workType: 'paint',     status: 'pending',     dateStart: '03.05.2026', dateEnd: '28.05.2026', budget: '140 000 ₽',  notes: 'Farrow & Ball Pointing 2003. Потолки — Dulux. 3 слоя.', sortOrder: 6 },
    { contractorId: contractor.id,  title: 'Монтаж инженерной доски',         workType: 'floor',     status: 'pending',     dateStart: '29.05.2026', dateEnd: '10.06.2026', budget: '95 000 ₽',   notes: 'HARMO Nordic Oak на клей Bona R848. Масло Bona Traffic.', sortOrder: 7 },
    { contractorId: contractor.id,  title: 'Натяжные потолки',                workType: 'ceiling',   status: 'pending',     dateStart: '11.06.2026', dateEnd: '20.06.2026', budget: '78 000 ₽',   notes: 'Descor Elite матовый — гостиная + прихожая. Остальное — ГКЛ.', sortOrder: 8 },
    { contractorId: contractor.id,  title: 'Монтаж кухни Leicht',             workType: 'furniture', status: 'pending',     dateStart: '21.06.2026', dateEnd: '30.06.2026', budget: '120 000 ₽',  notes: 'Сборка + установка. Подключение Miele. Вытяжной вентилятор.', sortOrder: 9 },
    { contractorId: master.id,      title: 'Дверные полотна + откосы',        workType: 'doors',     status: 'pending',     dateStart: '01.07.2026', dateEnd: '10.07.2026', budget: '45 000 ₽',   notes: 'Profil Doors X × 8. Скрытые петли. Откосы ГКЛ + покраска.', sortOrder: 10 },
    { contractorId: contractor.id,  title: 'Умный дом Fibaro',                workType: 'other',     status: 'pending',     dateStart: '11.07.2026', dateEnd: '20.07.2026', budget: '68 000 ₽',   notes: 'Fibaro HC3 Lite. Сценарии. Обучение клиента.', sortOrder: 11 },
    { contractorId: null,           title: 'Финишная уборка + сдача объекта', workType: 'other',     status: 'pending',     dateStart: '30.09.2026', dateEnd: '01.10.2026', budget: '20 000 ₽',   notes: 'Профессиональная уборка. Акт приёма-передачи. Фотосессия.', sortOrder: 12 },
  ],
})
console.log(`  ✅ 13 позиций создано`)

// ─── Итог ─────────────────────────────────────────────────────────────────────
console.log(`
═══════════════════════════════════════════════
🎉 ДЕМО-ДАННЫЕ СОЗДАНЫ ЧЕРЕЗ API

  👤 Клиент:      Иванов Иван Иванович (ID: ${client.id})
                  Код входа в ЛК: ivanov-profsoiuznaya-82

  🏠 Проект:      ${project.title}
                  Slug: ${project.slug}

  🏗  Подрядчик:  ООО «СтройТех» (ID: ${contractor.id})
                  Тип: Компания / Генподрядчик

  👷 Мастер:      Смирнов Дмитрий Александрович (ID: ${master.id})
                  Тип: Физлицо (подчинён ООО СтройТех)

  🎨 Дизайнер:    Карасёва Мария Викторовна (ID: ${designer.id})
                  Бюро «Kara»

  Страниц:        9 (first-contact, smart-brief, client-tz, moodboard,
                     specifications, space-planning, procurement-list,
                     + профиль и work-status)
  Позиций работ: 13

  Открыть в админке: /admin/projects/${project.slug}
  Клиентский вход:   /login → код «${project.slug}»
═══════════════════════════════════════════════
`)
