/**
 * Дополнение демо-данных: бриф, паспорта, профили участников
 * Запуск: node scripts/seed-demo-enrich.mjs
 *
 * Предполагает что seed-demo-v2.mjs уже был запущен.
 */

const BASE = 'http://localhost:3000'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme'
const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'

// ─── API клиент ───────────────────────────────────────────────────────────────
let cookie = ''
let csrfToken = ''

async function api(method, path, body) {
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(isMutating && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  for (const line of (res.headers.getSetCookie?.() ?? [])) {
    const m1 = line.match(/(daria_admin_session=[^;]+)/)
    if (m1) {
      cookie = cookie.includes('daria_admin_session=')
        ? cookie.replace(/daria_admin_session=[^;]+/, m1[1])
        : (cookie ? cookie + '; ' + m1[1] : m1[1])
    }
    const m2 = line.match(/csrf_token=([^;]+)/)
    if (m2) {
      csrfToken = decodeURIComponent(m2[1])
      const cp = `csrf_token=${m2[1]}`
      cookie = cookie.includes('csrf_token=')
        ? cookie.replace(/csrf_token=[^;]+/, cp)
        : (cookie ? cookie + '; ' + cp : cp)
    }
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.headers.get('content-type')?.includes('json') ? res.json() : res.text()
}

// ─── Авторизация ──────────────────────────────────────────────────────────────
console.log('🔐 Авторизуемся...')
// Сначала GET чтобы получить csrf_token
await api('GET', '/api/auth/me')
await api('POST', '/api/auth/login', { password: ADMIN_PASSWORD })
console.log('  ✅ OK\n')

// ─── Находим наши демо-сущности ───────────────────────────────────────────────
import postgres from '/opt/daria-nuxt/node_modules/postgres/src/index.js'
const db = postgres(DB_URL, { max: 1 })

const [{ id: clientId }]      = await db`SELECT id FROM clients WHERE phone = '+7 (916) 305-47-82' LIMIT 1`
const [{ id: contractorId }]  = await db`SELECT id FROM contractors WHERE slug = 'stroyteh-demo-2026' LIMIT 1`
const [{ id: masterId }]      = await db`SELECT id FROM contractors WHERE slug = 'master-smirnov-2026' LIMIT 1`
const [{ id: designerId }]    = await db`SELECT id FROM designers WHERE email = 'karaseva@design-studio.ru' LIMIT 1`
const [{ id: projectId, slug: projectSlug }] = await db`SELECT id, slug FROM projects WHERE slug = 'ivanov-profsoiuznaya-82' LIMIT 1`
await db.end()

console.log(`Клиент: ${clientId} | Подрядчик: ${contractorId} | Мастер: ${masterId} | Дизайнер: ${designerId} | Проект: ${projectSlug}\n`)

// ─── 1. Клиент — заполняем brief + обогащаем notes ───────────────────────────
console.log('👤 Обновляем клиента (brief + notes)...')
await api('PUT', `/api/clients/${clientId}`, {
  name:          'Иванов Иван Иванович',
  phone:         '+7 (916) 305-47-82',
  email:         'ivanov.ivan@gmail.com',
  messenger:     'telegram',
  messengerNick: '@ivanov_ivan',
  address:       'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  notes:         'Педантичен, любит чёткие сроки. Коммуникация через Telegram. Встречи строго по записи. Решения принимает совместно с женой. В выходные недоступен.',
  brief: {
    // Личное
    fio:              'Иванов Иван Иванович',
    birthday:         '12.07.1982',
    age:              '43',
    familyStatus:     'Женат — Иванова Елена Сергеевна',
    children:         'Сын Артём, 7 лет (1 класс)',
    pets:             'Нет',
    occupation:       'Финансовый директор, ООО «ТехноИнвест»',
    income_range:     'Высокий (от 600 000 ₽/мес)',
    // Объект
    objectAddress:    'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    objectType:       'Квартира 4-к',
    objectArea:       '82 м²',
    floor:            '8/24',
    building:         'Монолитный дом 2018 г. постройки',
    ownership:        'Собственность (ипотека закрыта в 2024)',
    // Стиль
    style:            'Современный минимализм, тёплый скандинавский',
    colorPalette:     'Белый, светло-серый, тёплый дуб, тёмная сталь',
    avoid:            'Яркие цвета, хай-тек металлик, барочные декоры',
    // Приоритеты
    priorities:       ['Качество материалов', 'Функциональность', 'Долговечность', 'Соблюдение сроков'],
    must_have:        ['Тёплый пол в санузлах и кухне', 'Умный дом (свет + шторы)', 'Звукоизоляция кабинета', 'Встроенные шкафы'],
    nice_to_have:     ['Гардеробная в мастер-спальне', 'Кухонный остров', 'Акустические панели', 'Панорамный душ'],
    // Бюджет
    budgetTotal:      '4 500 000 ₽',
    budgetDesign:     '350 000 ₽',
    budgetRepair:     '4 150 000 ₽',
    paymentMethod:    'Безналичный перевод',
    advancePaid:      '175 000 ₽ (03.02.2026)',
    // Режим работы
    workSchedule:     'Заказчик работает Пн–Пт с 9 до 19. Встречи на объекте — Сб до 14:00.',
    decisionMakers:   'Иван Иванович + супруга Елена. Финальное слово за ИИ.',
    communicationNote:'WhatsApp — только текст, не звонки. Telegram — для быстрых ответов.',
    // Срок
    deadline:         '01.10.2026 — жёсткий (дети идут в школу, нужна детская)',
    // Дополнительно
    special_notes:    'Без порогов в санузлах — пожилые родители гостят раз в месяц. Запасной ключ — у консьержа зд.',
  },
})
console.log('  ✅ brief заполнен')

// ─── 2. Проект — дозаполняем профиль ─────────────────────────────────────────
console.log('\n🏠 Дозаполняем профиль проекта (birthday, lifestyle, passport_birth_place, каталожные поля)...')
await api('PUT', `/api/projects/${projectSlug}`, {
  profile: {
    // Личное (добавляем то, чего не было)
    fio:               'Иванов Иван Иванович',
    birthday:          '12.07.1982',
    age:               '43',
    familyStatus:      'женат / замужем',
    children:          'Сын Артём, 7 лет',
    pets:              'Нет',
    // Контакты
    phone:             '+7 (916) 305-47-82',
    phoneExtra:        '+7 (925) 412-09-23 (Элена, супруга)',
    email:             'ivanov.ivan@gmail.com',
    messenger:         'telegram',
    messengerNick:     '@ivanov_ivan',
    preferredContact:  'мессенджер',
    address:           'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    // Объект
    objectAddress:     'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    objectType:        'квартира',
    objectCondition:   'новостройка без отделки',
    objectArea:        '82',
    roomCount:         '4',
    floor:             '8',
    ceilingHeight:     '2,8 м',
    hasBalcony:        'балкон',
    parking:           'подземная',
    // Проект
    budget:            '4 500 000 ₽',
    budgetIncluded:    'Дизайн-проект, авторский надзор, строительно-отделочные работы, материалы, мебель (частично)',
    deadline:          '01.10.2026',
    paymentMethod:     'перевод',
    referralSource:    'instagram',
    previousExperience:'Первый опыт работы с дизайнером. Ранее делали ремонт самостоятельно.',
    // Лайфстайл
    lifestyle:         'Активный городской. Частые командировки. По выходным — за город.',
    hobbies:           'Горные лыжи, теннис, чтение, приготовление еды в выходные.',
    stylePreferences:  'Современный минимализм, Скандинавский стиль, Japandi',
    colorPreferences:  'Белый, светло-серый, тёплый дуб, матовый металл',
    allergies:         'Нет аллергий. Жена — лёгкая непереносимость запаха масляных красок.',
    priorities:        'Качество, функциональность, долговечность, соблюдение сроков',
    dislikes:          'Яркие цвета, барокко, чрезмерный декор, хай-тек металлик, открытые полки в кухне',
    notes:             'Решения принимаются совместно с супругой. Финальное слово за Иваном. Звонки только по предварительной договорённости.',
    // Паспорт — дополняем пропущенные поля
    passport_series:               '4512',
    passport_number:               '345678',
    passport_issued_by:            'ОВД Черёмушки г. Москвы',
    passport_issue_date:           '20.04.2010',
    passport_department_code:      '770-045',
    passport_birth_place:          'г. Москва',
    passport_registration_address: 'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    passport_inn:                  '771234567890',
    passport_snils:                '123-456-789 00',
    // Каталожные поля (catalog selects)
    clientType:       'owner',
    objectTypeCode:   'apartment',
    projectPriority:  'quality',
    paymentType:      'bank_transfer',
    contractType:     'full_service',
    // Чипсы (массивы)
    designerServiceTypes: ['design_project', 'author_supervision', 'procurement'],
    contractorWorkTypes:  ['demolition', 'electrical', 'plumbing', 'plaster', 'tile', 'paint', 'flooring', 'ceiling', 'furniture_assembly'],
    // Бриф (smart-brief поля)
    brief_smart_home:            true,
    brief_kids_room:             true,
    brief_work_from_home:        true,
    brief_soundproofing:         true,
    brief_storage:               true,
    brief_adults_count:          '2',
    brief_kids_ages:             '7',
    brief_remote_work:           'Отдельный кабинет с хорошей звукоизоляцией, быстрый интернет',
    brief_guests_freq:           '1-2 раза в месяц (родители + друзья)',
    brief_hobbies:               'Горные лыжи, теннис, готовка',
    brief_morning_routine:       'Завтрак на кухне вместе с семьёй, после — работа',
    brief_evening_routine:       'Совместный ужин, зона отдыха в гостиной, ТВ',
    brief_cooking_role:          'Готовит преимущественно в выходные, хочет хороший остров',
    brief_bedroom_needs:         'Тишина, темнота, кондиционер, гардеробная рядом',
    brief_acoustic_zones:        'Кабинет (звукоизоляция), детская (звукоизоляция от общих зон)',
    brief_flex_zones:            'Гостиная трансформируется для гостей (диван-кровать)',
    brief_future_changes:        'Через 5 лет ребёнок подрастёт — переделка детской под подростка',
    brief_style_prefer:          'Северный минимализм, тёплые текстуры дерева и льна',
    brief_color_palette:         'Белый #FAFAFA, светло-серый #E8E4E0, дуб #C4956A, сталь #2C2C2C',
    brief_material_prefs:        'Натуральное дерево, камень (neolith), лён, матовый металл',
    brief_textures:              'Матовые поверхности. Никакого глянца. Тёплые текстильные акценты.',
    brief_light_modes:           '3 сценария: дневной рабочий, вечерний расслабляющий, ночной',
    brief_light_dimming:         'Да — все основные зоны с диммерами',
    brief_light_automation:      'Да — Fibaro, управление с телефона и голосом',
    brief_smart_control:         'Телефон + голос (Алиса). Планшет в кухне.',
    brief_acoustics_type:        'Звукоизоляция кабинета (офис) и детской (школа)',
    brief_tech_equipment:        'Проектор в кабинете, ТВ 77" в гостиной на подъёмном кронштейне',
    brief_storage_volume:        'Большое — 4 человека + частые гости, много сезонной одежды',
    brief_deadlines_hard:        '01.10.2026 — ребёнок должен жить там к началу 2 класса',
    brief_budget_limits:         'Кухня, ванные, полы — no limit. Кабинет и коридор — экономно.',
    brief_budget_priorities:     'Кухня Leicht (30%), ванные (15%), полы HARMO (10%), умный дом (5%)',
    brief_special_notes:         'Без порогов в санузлах. Пандус не нужен, но перепад 0 мм.',
    brief_completed:             true,
    // Обследование
    survey_status:               'completed',
    survey_date:                 '25.01.2026',
    survey_engineer:             'Архитектор Карасёва М.В.',
    survey_address:              'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    survey_area:                 '82 м²',
    survey_ceiling:              '2,82 м (среднее по всем комнатам)',
    survey_mep_notes:            '3-фазный ввод 380В, счётчик Меркурий 230. Стояки ХВС/ГВС PP-R 32 мм без замечаний. Вытяжка в санузлах и кухне — принудительная.',
    survey_issues:               '1. Неравномерность стяжки до 18 мм → нивелир-масса Knauf. 2. Промерзание угла в детской → Пеноплекс 50 мм + штукатурка. 3. Конденсат на окне в ванной → вентиляция усилить.',
    survey_recommendations:      'Разрешение на перепланировку (балкон+гостиная) получено 10.02.2026. Приточная установка Turkov Zenit 550 — монтаж в постирочной.',
    mep_ventilation:             true,
    mep_plumbing:                true,
    mep_electrical:              true,
    mep_heating:                 true,
    mep_smart:                   true,
    mep_balcony:                 true,
    // Договор
    contract_number:             'ДД-2026-0142',
    contract_date:               '01.02.2026',
    contract_status:             'signed',
    contract_parties:            'ИП Карасёва М.В. (исполнитель) — Иванов И.И. (заказчик)',
    contract_notes:              'Договор на дизайн-проект + авторский надзор. 45 р.д. на проект, надзор до 01.10.2026.',
    invoice_amount:              '350 000 ₽',
    invoice_advance_pct:         '50',
    invoice_date:                '01.02.2026',
    payment_status:              'advance_paid',
    invoice_payment_details:     'Авансовый платёж 175 000 ₽ получен 03.02.2026 (Сбербанк, перевод)',
    tor_scope:                   'Дизайн-проект квартиры 82 м² + Авторский надзор в период ремонта',
    tor_exclusions:              'Строительные работы, закупка материалов, управление подрядчиками',
    tor_timeline:                '45 рабочих дней (проект) + ремонт Март–Октябрь 2026',
    tor_deliverables:            'PDF-альбом + DWG рабочие чертежи + 3D-визуализация каждого помещения + спецификации',
  },
})
console.log('  ✅ Профиль проекта дополнен')

// ─── 3. Подрядчик ООО «СтройТех» — реквизиты компании (нет паспорта!) ────────
console.log('\n🏗  Обновляем ООО «СтройТех» (полные реквизиты)...')
await api('PUT', `/api/contractors/${contractorId}`, {
  name:                 'ООО «СтройТех»',
  companyName:          'Общество с ограниченной ответственностью «СтройТех»',
  contactPerson:        'Петров Сергей Николаевич',
  phone:                '+7 (495) 987-65-43',
  email:                'info@stroyteh.ru',
  telegram:             '@stroyteh_msk',
  website:              'https://stroyteh.ru',
  city:                 'Москва',
  inn:                  '7743812345',
  kpp:                  '774301001',
  ogrn:                 '1234567890123',
  bankName:             'ПАО Сбербанк России',
  bik:                  '044525225',
  settlementAccount:    '40702810400001234567',
  correspondentAccount: '30101810400000000225',
  legalAddress:         'г. Москва, ул. Строителей, д. 12, офис 301, 117997',
  factAddress:          'г. Москва, ул. Строителей, д. 12, офис 301',
  contractorType:       'company',
  workTypes:            ['Черновые работы', 'Чистовые работы', 'Электрика', 'Сантехника', 'Плиточные работы', 'Малярные работы', 'Демонтаж', 'Полы', 'Потолки'],
  roleTypes:            ['Генеральный подрядчик', 'Строительная компания'],
  taxSystem:            'УСН (доходы 6%)',
  paymentMethods:       ['Безналичный расчёт', 'Наличные'],
  hasInsurance:         true,
  insuranceDetails:     'Страховка ответственности СК «Согласие» до 01.01.2027, лимит 5 000 000 ₽',
  experienceYears:      15,
  notes:                'Надёжный генподрядчик. 15 лет на рынке. СРО СтройРосс МОС-С-2022-0341. Гарантия 2 года на все виды работ. Работает с командой 12 специалистов.',
})
console.log('  ✅ ООО «СтройТех» обновлён')

// ─── 4. Мастер Смирнов — полные паспортные данные ─────────────────────────────
console.log('\n👷 Обновляем Смирнова (паспортные данные, физлицо)...')
await api('PUT', `/api/contractors/${masterId}`, {
  name:                    'Смирнов Дмитрий Александрович',
  contractorType:          'master',
  parentId:                contractorId,
  phone:                   '+7 (903) 412-88-21',
  email:                   'smirnov.dm@mail.ru',
  telegram:                '@smirnov_master',
  city:                    'Москва',
  workRadius:              '50 км от МКАД',
  // Паспортные данные
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
  // Финансовые
  taxSystem:               'Самозанятый (НПД)',
  paymentMethods:          ['Перевод на карту', 'Наличные'],
  hourlyRate:              '2 500 ₽/час',
  hasInsurance:            false,
  // Профессиональные
  workTypes:               ['Плиточные работы', 'Малярные работы', 'Чистовые работы', 'Шпаклёвка', 'Поклейка обоев'],
  roleTypes:               ['Мастер-отделочник'],
  experienceYears:         8,
  education:               'СПО — Московский строительный колледж, специальность «Отделочные строительные работы», 2007',
  certifications:          ['Сертификат Mapei — укладка плитки (2019)', 'Сертификат Knauf — работа с ГКЛ (2021)'],
  notes:                   'Аккуратный, пунктуальный мастер. Специализируется на плитке и чистовой отделке. Самозанятый, чек по каждой оплате. Отзывы: 4.9/5 по 47 оценкам.',
})
console.log('  ✅ Смирнов Д.А. обновлён')

// ─── 5. Дизайнер Карасёва — полный профиль + подписки ────────────────────────
console.log('\n🎨 Обновляем дизайнера (полный профиль, услуги, подписки)...')
await api('PUT', `/api/designers/${designerId}`, {
  name:            'Карасёва Мария Викторовна',
  companyName:     'Дизайн-бюро «Kara Studio»',
  phone:           '+7 (916) 200-35-77',
  email:           'karaseva@design-studio.ru',
  telegram:        '@karaseva_design',
  website:         'https://kara-design.ru',
  city:            'Москва',
  experience:      '12 лет. Более 80 реализованных проектов в Москве, Сочи, Дубае.',
  about:           'Specialization — современный минимализм и скандинавский стиль. Работаю комплексно: от концепции до ключа. Каждый проект — это история конкретной семьи, переведённая в пространство. Люблю натуральные материалы, честную конструкцию и функцию, которая не видна.',
  specializations: ['Residential', 'Современный минимализм', 'Scandi / Japandi', 'Перепланировка и согласование', 'Авторский надзор', 'Комплектация'],
  services: [
    { name: 'Обмерный план',               price: '15 000 ₽',      unit: 'объект',    description: 'Выезд, замеры лазером, обмерный чертёж DWG' },
    { name: 'Концепция интерьера',          price: '50 000 ₽',      unit: 'этап',      description: 'Мудборд, планировочные решения (3 варианта), 3D-визуализация 2-3 зон' },
    { name: 'Рабочая документация',         price: '150 000 ₽',     unit: 'объект',    description: 'Полный комплект чертежей DWG (полы, потолки, развёртки, электрика, сантехника)' },
    { name: 'Спецификации и комплектация',  price: '50 000 ₽',      unit: 'объект',    description: 'Ведомость материалов, подбор и заказ мебели, светильников, декора' },
    { name: '3D-визуализация',              price: '8 000 ₽',       unit: 'помещение', description: 'Фотореалистичный рендер каждого помещения (камера × 2)' },
    { name: 'Авторский надзор',             price: '15 000 ₽/мес',  unit: 'месяц',     description: 'Еженедельный выезд + контроль соответствия проекту + TZ для подрядчиков' },
    { name: 'Экспресс-консультация',        price: '5 000 ₽',       unit: 'час',       description: '1-часовая консультация онлайн или офлайн по любому вопросу интерьера' },
  ],
  packages: [
    {
      name:        'Базовый',
      price:       '120 000 ₽',
      description: 'Обмеры + Концепция + 2D-планировка. Без надзора.',
      includes:    ['Обмерный план', 'Концепция', 'Планировка']
    },
    {
      name:        'Полный дизайн-проект',
      price:       '350 000 ₽',
      description: 'Полный комплект: концепция, рабочка, 3D, спецификации. Без надзора.',
      includes:    ['Обмеры', 'Концепция', 'Рабочая документация', '3D × все помещения', 'Спецификации']
    },
    {
      name:        'Под ключ',
      price:       'от 500 000 ₽',
      description: 'Полный проект + авторский надзор на весь период ремонта.',
      includes:    ['Полный дизайн-проект', 'Авторский надзор', 'Комплектация', 'Координация подрядчиков']
    },
  ],
  subscriptions: [
    {
      name:          'Авторский надзор',
      price:         '15 000 ₽/мес',
      billingPeriod: 'monthly',
      description:   'Еженедельный выезд на объект. Фотоотчёт. Замечания подрядчикам.',
      active:        true,
      startDate:     '01.03.2026',
      endDate:       '01.10.2026',
      projectSlug:   'ivanov-profsoiuznaya-82',
    },
    {
      name:          'Онлайн-консультации',
      price:         '8 000 ₽/мес',
      billingPeriod: 'monthly',
      description:   'До 4 часов консультаций в месяц в Telegram/Zoom.',
      active:        false,
    },
  ],
})
console.log('  ✅ Карасёва М.В. обновлена')

// ─── 6. Страница profile_customer (паспорт клиента — видно в разделе "Профиль")
console.log('\n📄 Заполняем page_content profile_customer...')
async function putPage(pageSlug, content) {
  await api('PUT', `/api/projects/${projectSlug}/page-content`, { pageSlug, content })
  console.log(`  ✅ ${pageSlug}`)
}

await putPage('profile_customer', {
  // Личные данные
  fio:                   'Иванов Иван Иванович',
  birthday:              '12.07.1982',
  age:                   '43',
  family_status:         'Женат — Иванова Елена Сергеевна (супруга)',
  children:              'Сын Артём Иванов, 12.04.2018 г.р., 7 лет',
  occupation:            'Финансовый директор, ООО «ТехноИнвест», ИНН 7701234567',
  // Паспорт
  passport_series:       '4512',
  passport_number:       '345678',
  passport_issued_by:    'ОВД Черёмушки г. Москвы',
  passport_issue_date:   '20.04.2010',
  passport_dept_code:    '770-045',
  birth_date:            '12.07.1982',
  birth_place:           'г. Москва',
  registration_address:  'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  actual_address:        'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  inn:                   '771234567890',
  snils:                 '123-456-789 00',
  // Контакты
  phone:                 '+7 (916) 305-47-82',
  phone2:                '+7 (925) 412-09-23 (Елена, супруга)',
  email:                 'ivanov.ivan@gmail.com',
  telegram:              '@ivanov_ivan',
  preferred_contact:     'Telegram (текст). Звонки — только по предварительной договорённости.',
  // Объект
  object_address:        'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  object_type:           'Квартира, 4-комнатная',
  object_area:           '82 м²',
  floor_building:        '8/24',
  ownership:             'Собственность (Свидетельство № 77-АА 1234567 от 15.06.2022)',
  cadastral_number:      '77:05:0011234:567',
})

// ─── 7. Страница profile_contractors ─────────────────────────────────────────
await putPage('profile_contractors', {
  // Генподрядчик (компания)
  contractor_1_type:          'Юридическое лицо',
  contractor_1_name:          'ООО «СтройТех»',
  contractor_1_full_name:     'Общество с ограниченной ответственностью «СтройТех»',
  contractor_1_contact:       'Петров Сергей Николаевич (директор)',
  contractor_1_phone:         '+7 (495) 987-65-43',
  contractor_1_email:         'info@stroyteh.ru',
  contractor_1_inn:           '7743812345',
  contractor_1_kpp:           '774301001',
  contractor_1_ogrn:          '1234567890123',
  contractor_1_bank:          'ПАО Сбербанк России',
  contractor_1_bik:           '044525225',
  contractor_1_account:       '40702810400001234567',
  contractor_1_corr_account:  '30101810400000000225',
  contractor_1_legal_address: 'г. Москва, ул. Строителей, д. 12, офис 301, 117997',
  contractor_1_fact_address:  'г. Москва, ул. Строителей, д. 12, офис 301',
  contractor_1_tax:           'УСН (доходы 6%)',
  contractor_1_sro:           'СРО СтройРосс МОС-С-2022-0341',
  contractor_1_insurance:     'СК «Согласие», ответственность до 5 000 000 ₽, до 01.01.2027',
  contractor_1_scope:         'Генеральный подрядчик. Демонтаж, электрика, сантехника, стяжка, штукатурка, плитка, малярка, полы, потолки, монтаж кухни.',
  // Мастер-отделочник (физлицо / самозанятый)
  contractor_2_type:          'Самозанятый',
  contractor_2_name:          'Смирнов Дмитрий Александрович',
  contractor_2_phone:         '+7 (903) 412-88-21',
  contractor_2_email:         'smirnov.dm@mail.ru',
  contractor_2_telegram:      '@smirnov_master',
  contractor_2_birth_date:    '23.05.1987',
  contractor_2_birth_place:   'г. Москва',
  contractor_2_passport_series:   '4515',
  contractor_2_passport_number:   '234567',
  contractor_2_passport_issued_by:'ОМВД России по р-ну Хамовники г. Москвы',
  contractor_2_passport_date:     '10.08.2015',
  contractor_2_passport_code:     '770-042',
  contractor_2_registration:      'г. Москва, ул. Остоженка, д. 8, кв. 34',
  contractor_2_inn:               '771098765432',
  contractor_2_snils:             '987-654-321 00',
  contractor_2_tax:               'Самозанятый (НПД), приложение «Мой налог»',
  contractor_2_scope:             'Плиточные работы, малярные работы, чистовая отделка, шпаклёвка. Гарантия 1 год.',
  contractor_2_bank:              'Сбербанк, карта 4276 **** **** 7834',
  // Дизайнер (ИП)
  designer_1_type:            'ИП (Индивидуальный предприниматель)',
  designer_1_name:            'Карасёва Мария Викторовна',
  designer_1_company:         'Бюро «Kara Studio»',
  designer_1_phone:           '+7 (916) 200-35-77',
  designer_1_email:           'karaseva@design-studio.ru',
  designer_1_telegram:        '@karaseva_design',
  designer_1_website:         'https://kara-design.ru',
  designer_1_inn:             '772812301234',
  designer_1_ogrnip:          '314774609102345',
  designer_1_tax:             'УСН 6%',
  designer_1_bank:            'Тинькофф Банк, р/с 40802810500002345678',
  designer_1_bik:             '044525974',
  designer_1_contract:        'ДД-2026-0142 от 01.02.2026',
  designer_1_scope:           'Дизайн-проект 82 м² + Авторский надзор март–октябрь 2026',
  designer_1_fee:             '350 000 ₽ (аванс 50% оплачен 03.02.2026)',
})

// ─── Итог ─────────────────────────────────────────────────────────────────────
console.log(`
═══════════════════════════════════════
✅ ДАННЫЕ ОБОГАЩЕНЫ

  👤 Клиент:        brief заполнен, notes обновлены
  🏠 Профиль:       birthday, lifestyle, passport_birth_place, passport_snils,
                    cadastral selects, chips, обследование, договор — всё заполнено
  🏗  ООО «СтройТех»: ОГРН, полные реквизиты, страховка, СРО
  👷 Смирнов Д.А.:  паспорт, СНИЛС, ИНН, образование, сертификаты
  🎨 Карасёва М.В.: 7 услуг, 3 пакета, 2 подписки, полное «о себе»
  📄 Страницы:      profile_customer, profile_contractors — заполнены
═══════════════════════════════════════
`)
