/**
 * Демо-данные: Иванов Иван Иванович
 * Создаёт клиента, подрядчика, проект, все страницы контента и статусы работ.
 *
 * Запуск: node scripts/seed-demo-ivanov.mjs
 */
import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://daria:daria_secret_2026@localhost:5433/daria_admin'
const db = postgres(DB_URL, { max: 1 })

// ─── Вспомогательные ─────────────────────────────────────────────────────────
async function upsertPageContent(projectId, pageSlug, content) {
  await db`
    INSERT INTO page_content (project_id, page_slug, content, updated_at)
    VALUES (${projectId}, ${pageSlug}, ${db.json(content)}, NOW())
    ON CONFLICT ON CONSTRAINT page_content_project_page
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `
}

// ─── 1. Клиент ───────────────────────────────────────────────────────────────
console.log('👤 Создаём клиента...')
const [client] = await db`
  INSERT INTO clients (name, phone, email, messenger, messenger_nick, address, notes, brief)
  VALUES (
    'Иванов Иван Иванович',
    '+7 (916) 305-47-82',
    'ivanov.ivan@gmail.com',
    'telegram',
    '@ivanov_ivan',
    'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
    'Клиент педантичен, любит чёткие сроки. Предпочитает коммуникацию через Telegram.',
    ${db.json({
      style: 'современный минимализм',
      budget: '4 500 000 ₽',
      deadline: '01.10.2026',
      rooms: 4,
      area: 82,
      wishes: 'Светлые оттенки, много естественного света, функциональное хранение, тёплый пол в санузлах',
    })}
  )
  RETURNING id
`
console.log(`  ✅ Клиент ID: ${client.id}`)

// ─── 2. Подрядчик ────────────────────────────────────────────────────────────
console.log('🏗  Создаём подрядчика...')
const [contractor] = await db`
  INSERT INTO contractors (
    slug, name, company_name, contact_person, phone, email,
    inn, kpp, ogrn,
    bank_name, bik, settlement_account, correspondent_account,
    legal_address, fact_address,
    work_types, role_types, contractor_type,
    passport_series, passport_number, passport_issued_by,
    passport_issue_date, passport_department_code,
    birth_date, birth_place, registration_address,
    snils, tax_system, city,
    experience_years, notes, telegram
  ) VALUES (
    'petrov-remont-2026',
    'Петров Сергей Николаевич',
    'ООО «ПетровСтрой»',
    'Петров Сергей Николаевич',
    '+7 (903) 145-22-67',
    'petrov.sergey@petrovstroy.ru',
    '7743812345', '774301001', '1234567890123',
    'ПАО Сбербанк', '044525225', '40702810400001234567', '30101810400000000225',
    'г. Москва, ул. Строителей, д. 12, офис 301',
    'г. Москва, ул. Строителей, д. 12, офис 301',
    ARRAY['Черновые работы','Чистовые работы','Электрика','Сантехника','Плиточные работы','Малярные работы'],
    ARRAY['Генеральный подрядчик','Отделочник'],
    'company',
    '4512', '678934',
    'ГУ МВД России по г. Москве',
    '15.03.2015', '770-045',
    '12.07.1981', 'г. Москва',
    'г. Москва, ул. Строителей, д. 12, кв. 45',
    '126-098-765 43', 'УСН (доходы 6%)',
    'Москва', 15,
    'Надёжный подрядчик. 15 лет опыта. Работает с лицензированными материалами. Гарантия 2 года.',
    '@petrov_sergey_stroy'
  )
  ON CONFLICT (slug) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    phone = EXCLUDED.phone,
    notes = EXCLUDED.notes
  RETURNING id
`
console.log(`  ✅ Подрядчик ID: ${contractor.id}`)

// ─── 3. Проект ───────────────────────────────────────────────────────────────
console.log('🏠 Создаём проект...')
const [project] = await db`
  INSERT INTO projects (slug, title, status, profile, pages)
  VALUES (
    'ivanov-profsoiuznaya-82',
    'Квартира Иванова — Профсоюзная, 82 м²',
    'active',
    ${db.json({
      objectAddress:              'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
      objectType:                 'Квартира',
      objectArea:                 '82',
      roomCount:                  '4',
      budget:                     '4 500 000 ₽',
      deadline:                   '01.10.2026',
      style:                      'Современный минимализм',
      client_name:                'Иванов Иван Иванович',
      phone:                      '+7 (916) 305-47-82',
      email:                      'ivanov.ivan@gmail.com',
      passport_series:            '4512',
      passport_number:            '345678',
      passport_issued_by:         'ОВД Черёмушки г. Москвы',
      passport_issue_date:        '20.04.2010',
      passport_registration_address: 'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
      passport_inn:               '771234567890',
    })},
    ARRAY['first-contact','smart-brief','client-tz','moodboard','specifications','space-planning','procurement-list','work-status','site-survey','work-log']
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    profile = EXCLUDED.profile,
    status = EXCLUDED.status
  RETURNING id
`
console.log(`  ✅ Проект ID: ${project.id}, slug: ivanov-profsoiuznaya-82`)

// ─── 4. Связи ────────────────────────────────────────────────────────────────
await db`
  INSERT INTO project_contractors (project_id, contractor_id)
  VALUES (${project.id}, ${contractor.id})
  ON CONFLICT ON CONSTRAINT project_contractor_uniq DO NOTHING
`
console.log('  🔗 Подрядчик привязан к проекту')

// ─── 5. Контент страниц ──────────────────────────────────────────────────────
console.log('📄 Заполняем страницы проекта...')

await upsertPageContent(project.id, 'first-contact', {
  contact_date:        '12.01.2026',
  contact_channel:     'Instagram',
  client_name:         'Иванов Иван Иванович',
  phone:               '+7 (916) 305-47-82',
  email:               'ivanov.ivan@gmail.com',
  object_type:         'Квартира',
  object_address:      'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  object_area:         '82',
  rooms:               '4',
  budget:              '4 500 000 ₽',
  deadline:            '01.10.2026',
  style_preference:    'Современный минимализм, светлые тона',
  notes:               'Клиент увидел наши работы в Instagram. Хочет сделать ремонт под ключ. Главное требование — функциональность и качество. Очень педантичен.',
  source:              'Instagram',
  first_meeting_date:  '18.01.2026',
  meeting_format:      'Очная встреча на объекте',
})

await upsertPageContent(project.id, 'smart-brief', {
  style:               'Современный минимализм',
  color_palette:       'Белый, светло-серый, тёплый бежевый, акценты тёмного дуба',
  avoid:               'Яркие кричащие цвета, хай-тек, барокко',
  inspiration:         'Скандинавский стиль с тёплыми деревянными акцентами',
  comfort_priority:    'Да — тёплый пол во всех санузлах и на кухне',
  lighting:            'Максимум естественного света, скрытая подсветка, диммируемые светильники',
  storage:             'Встроенные шкафы-купе в каждой спальне, гардеробная в мастер-спальне',
  kitchen_style:       'Островная кухня с каменной столешницей, матовые фасады',
  bathroom_count:      '2',
  bathroom_style:      'Белая крупноформатная плитка, встроенные ниши, хромированная фурнитура',
  children_zone:       'Детская комната для мальчика 7 лет — рабочая зона + зона сна',
  home_office:         'Да — отдельный кабинет с хорошей звукоизоляцией',
  smart_home:          'Базовый умный дом — управление освещением и шторами',
  materials_quality:   'Высокий — европейские бренды',
  pets:                'Нет',
  family:              'Двое взрослых, ребёнок 7 лет',
  special_needs:       'Без ступеней в санузлах (пожилые родители в гостях)',
})

await upsertPageContent(project.id, 'client-tz', {
  project_name:        'Дизайн квартиры Иванова. ул. Профсоюзная, д. 45, кв. 17',
  object_address:      'г. Москва, ул. Профсоюзная, д. 45, кв. 17',
  object_area:         '82 м²',
  floor:               '8',
  ceiling_height:      '2,8 м',
  building_type:       'Монолитный жилой дом 2018 г.',
  scope_of_work:       'Дизайн-проект + авторский надзор + комплектация',
  rooms:               'Прихожая, гостиная-столовая, кухня (остров), мастер-спальня с гардеробной, детская, кабинет, санузел 1 (совмещённый, мастер), санузел 2 (гостевой), постирочная',
  walls_material:      'Монолит — без выравнивания не обойтись',
  floor_material:      'Черновая стяжка 60 мм',
  windows:             '6 окон, профиль Rehau. Балкон не остеклён — планируется присоединение к гостиной',
  existing_furniture:  'Нет — квартира под чистовую отделку с нуля',
  design_stages:       'Концепция → Рабочие чертежи → Спецификации → Авторский надзор',
  delivery_format:     'PDF + DWG + 3D-визуализация (каждое помещение)',
  timeline_design:     '45 рабочих дней с момента подписания договора',
  timeline_repair:     'Ремонтные работы: 6 месяцев (апрель–октябрь 2026)',
  budget_design:       '350 000 ₽',
  budget_repair:       '4 150 000 ₽',
  payment_schedule:    '50% аванс, 30% после утверждения рабочих чертежей, 20% по завершении',
  warranty:            'Авторский надзор — 1 раз в неделю в период ремонта',
  special_requirements:'Согласование перепланировки (балкон + гостиная). Шумоизоляция кабинета — Rw ≥ 54 дБ. Тёплый пол — 3 помещения.',
})

await upsertPageContent(project.id, 'moodboard', {
  concept_name:        'Северный свет',
  concept_description: 'Пространство вдохновлено скандинавской архитектурой и японским принципом «ма» — осознанная пустота. Преобладают природные материалы: дуб, лён, металл. Много воздуха, мало декора — каждый предмет функционален.',
  color_main:          'Белый #FAFAFA, светло-серый #E8E4E0',
  color_accent:        'Тёплый дуб #C4956A, тёмная сталь #2C2C2C',
  color_detail:        'Медь #B87333, терракота #C07F5A (текстиль)',
  materials_floor:     'Инженерная доска дуб Harmo "Nordic Oak" 200×1500',
  materials_walls:     'Краска Farrow&Ball "Pointing" 2003, в кабинете — акустическая панель шпон дуб',
  materials_kitchen:   'Столешница Neolith "Calacatta Gold", фасады Blum матовая ламинация белый',
  materials_bath:      'Плитка Fap Ceramiche "Evoque" 60×120 белая, золотая фурнитура Grohe',
  furniture_style:     'Современная европейская. Мягкая мебель — Bolia (Дания). Кухня — Leicht (Германия).',
  lighting_concept:    'Бестеневое освещение через линейные LED-профили по периметру потолка + точечное акцентное. Диммер на все зоны.',
  references:          'IKEA SYMFONISK, Norm Architects Studio, студия SL*Project',
})

await upsertPageContent(project.id, 'specifications', {
  floor_covering:      'Инженерная доска HARMO Nordic Oak 15/4×200×1500 — 82 м²',
  floor_warm:          'Тёплый пол DEVI DEVIheat 10T в санузле 1, санузле 2, постирочной — 18 м²',
  tile_bathroom1:      'FAP Evoque White 60×120 — 42 м², затирка Mapei Ultracolor Plus белая',
  tile_bathroom2:      'FAP Evoque White 30×60 — 24 м², затирка Mapei белая',
  paint_walls:         'Farrow & Ball Pointing 2003 (стойкое), Jotun Lady — детская',
  ceiling_system:      'Натяжной потолок Descor Elite матовый белый — прихожая, гостиная. Гипсокартон Knauf — остальные',
  doors:               'Profil Doors серия X — 8 шт. дуб натуральный, скрытое полотно',
  doors_entrance:      'Торэкс Снегирь с шумоизоляцией, отделка дуб',
  kitchen:             'Leicht Atelier M Magnolia матовый + Frame дуб. Остров 120×240. Встроенная техника Miele.',
  appliances:          'Духовой шкаф Miele H7264B, варочная поверхность Miele KM7697, холодильник Liebherr CNef5735',
  plumbing:            'Смесители Grohe Essence Brushed Cool Sunrise, душевые системы Grohe Rain Shower',
  radiators:           'Kermi Profil-V FTV22, горизонтальная установка, 6 секций',
  insulation_acoustic: 'Кабинет: Rockwool Акустик Баттс 50 мм + Isover 25 мм',
  sockets:             'Legrand Valena Life (белый матовый) — согласно схеме электрики',
  smart_home:          'Система Fibaro Home Center 3 Lite: освещение, шторы, климат',
})

await upsertPageContent(project.id, 'space-planning', {
  layout_concept:      'Перепланировка согласована в Мосжилинспекции (проект ТП-2026-0341). Балкон объединён с гостиной.',
  total_area:          '82 м²',
  living_area:         '41,5 м²',
  kitchen_area:        '18,2 м²',
  master_bedroom:      '16,4 м²',
  childrens_room:      '11,8 м²',
  office:              '10,3 м²',
  bathroom1:           '8,6 м²',
  bathroom2:           '4,4 м²',
  laundry:             '3,2 м²',
  hallway:             '6,1 м²',
  storage_solutions:   'Встроенные шкафы-купе в каждой спальне (глубина 60 см). Гардеробная 3,5 м² в мастер-спальне. Кладовка под кухней.',
  zoning:              'Гостиная зонирована диваном: зона ТВ + зона переговоров. Кабинет — закрытая комната со звукоизоляцией.',
  notes:               'Разводка всех инженерных сетей скрытая. Высота в объединённой гостиной — 3,1 м (убрали перегородку б/у балкона).',
})

await upsertPageContent(project.id, 'procurement-list', {
  item_1:              'Инженерная доска HARMO Nordic Oak — 90 м² — 342 000 ₽ — ОАО «Паркет-холл»',
  item_2:              'Клей Bona R848 + грунт Bona P — 50 000 ₽ — ОАО «Паркет-холл»',
  item_3:              'Тёплый пол DEVI DeviHeat 10T + терморегулятор — 42 500 ₽ — OBI',
  item_4:              'Плитка FAP Evoque White 60×120 × 45 м² — 198 000 ₽ — Kerama Marazzi',
  item_5:              'Краска Farrow & Ball Pointing 5 л × 6 банок — 78 000 ₽ — PaintDeco',
  item_6:              'Кухня Leicht под заказ + встройка Miele × 1 комплект — 1 240 000 ₽ — Leicht Moscow',
  item_7:              'Двери Profil Doors X × 8 шт. — 184 000 ₽ — ПрофильДоорс',
  item_8:              'Дверь входная Торэкс Снегирь — 85 000 ₽ — Торэкс',
  item_9:              'Смесители Grohe Essence × 4 + душ Grohe Rain — 96 000 ₽ — Grohe-shop',
  item_10:             'Натяжные потолки Descor Elite — 52 м² — 78 000 ₽ — Потолок.рф',
  item_11:             'Система Fibaro HС3 Lite + умные розетки × 12 — 68 000 ₽ — Smart House',
  item_12:             'Мебель Bolia: диван, кресла, обеденная группа — 680 000 ₽ — Bolia Moscow',
  total_budget:        '3 089 500 ₽',
  notes:               'Остаток бюджета 1 060 500 ₽ резервирован на непредвиденные расходы и авторский надзор.',
})

await upsertPageContent(project.id, 'site-survey', {
  survey_date:         '25.01.2026',
  surveyor:            'Архитектор Карасёва М.В.',
  building_year:       '2018',
  building_type:       'Монолитный жилой дом, 24 этажа',
  floor:               '8',
  ceiling_height:      '2,82 м (замер в центре комнаты)',
  walls_condition:     'Монолитные перекрытия и несущие стены — удовлетворительно. Ненесущие перегородки кирпич — снос согласован.',
  floor_condition:     'Черновая стяжка 60–65 мм. Дефектов не выявлено.',
  windows_condition:   'Профиль Rehau 2018 — хорошее состояние. Балкон присоединяется — демонтаж рамы.',
  electrics:           '3-фазный ввод 380В. Счётчик Меркурий 230. Замена распредщита — автоматы ABB.',
  plumbing:            'Лежак ХВС/ГВС — PP-R 32 мм. Стояки без замечаний. Новые тройники для тёплого пола.',
  ventilation:         'Принудительная вытяжка в санузлах и кухне — чистка + новые решётки Vents. Приточная установка Turkov Zenit 550 — монтаж в кладовке.',
  measurements:        'Замеры выполнены лазерным дальномером Bosch GLM 50C. Погрешность ±2 мм.',
  defects_found:       '1. Неравномерность стяжки до 18 мм — нивелирующая масса. 2. Промерзание угла в детской — утепление Пеноплекс 50 мм.',
  phono_conditions:    'Лестничная клетка — источник шума. Звукоизоляция межквартирных стен усилена Rockwool.',
  permit_status:       'Разрешение на перепланировку получено 10.02.2026 (ГУП МосгорБТИ)',
})

await upsertPageContent(project.id, 'work-log', {
  entry_1:             '01.03.2026 | Демонтаж: снос ненесущих перегородок, вынос строительного мусора. Подрядчик: Петров С.Н. | Выполнено 100%',
  entry_2:             '05.03.2026 | Проводка: укладка кабелей в штробы, монтаж распредщита ABB. Петров С.Н. | Выполнено 100%',
  entry_3:             '10.03.2026 | Стяжка: нивелирующая масса Knauf 25–43 мм, тёплый пол DEVI под заливку. | В процессе 70%',
  entry_4:             '15.03.2026 | Штукатурка Knauf Rotband: гостиная, коридор, кабинет. | Не начато',
  entry_5:             '20.03.2026 | Плитка санузлы. FAP Evoque + затирка Mapei. | Не начато',
  notes:               'Отставание от графика на 3 дня из-за задержки поставки тёплого пола. Скорректирован календарный план.',
})

console.log('  ✅ Все страницы заполнены')

// ─── 6. Статусы работ ────────────────────────────────────────────────────────
console.log('📋 Создаём статусы работ...')

const workItems = [
  { title: 'Демонтажные работы',          work_type: 'demo',      status: 'done',        date_start: '01.03.2026', date_end: '04.03.2026', budget: '85 000 ₽',   notes: 'Снос перегородок, вынос мусора, отбивка старой плитки в санузлах' },
  { title: 'Электрика (разводка, щит)',   work_type: 'electric',  status: 'done',        date_start: '05.03.2026', date_end: '09.03.2026', budget: '180 000 ₽',  notes: 'Замена распредщита, укладка кабелей NYM в штробы, монтаж 68 точек' },
  { title: 'Стяжка и тёплый пол',         work_type: 'concrete',  status: 'in-progress', date_start: '10.03.2026', date_end: '21.03.2026', budget: '130 000 ₽',  notes: 'Нивелир-масса Knauf 25–43 мм, DEVI под санузлы и кухню. Сохнет 21 день.' },
  { title: 'Сантехника (разводка ХВС/ГВС)', work_type: 'plumbing', status: 'pending',   date_start: '22.03.2026', date_end: '28.03.2026', budget: '95 000 ₽',   notes: 'Новые тройники на стояки PP-R 32, боковые отводы на тёплый пол' },
  { title: 'Штукатурные работы',          work_type: 'plaster',   status: 'pending',     date_start: '22.03.2026', date_end: '05.04.2026', budget: '220 000 ₽',  notes: 'Knauf Rotband 8–12 мм по маякам. Все помещения кроме санузлов.' },
  { title: 'Укладка плитки (санузлы)',    work_type: 'tile',      status: 'pending',     date_start: '06.04.2026', date_end: '25.04.2026', budget: '160 000 ₽',  notes: 'FAP Evoque 60×120, затирка Mapei Ultracolor Plus. Ниши + полочки под заказ.' },
  { title: 'Малярные работы',             work_type: 'paint',     status: 'pending',     date_start: '26.04.2026', date_end: '20.05.2026', budget: '140 000 ₽',  notes: 'Farrow & Ball Pointing 2003. Потолки — водоэмульсия Dulux. 3 слоя.' },
  { title: 'Монтаж инженерной доски',     work_type: 'floor',     status: 'pending',     date_start: '21.05.2026', date_end: '01.06.2026', budget: '95 000 ₽',   notes: 'HARMO Nordic Oak на клей Bona R848. Шлифовка + масло Bona Traffic.' },
  { title: 'Натяжные потолки',            work_type: 'ceiling',   status: 'pending',     date_start: '02.06.2026', date_end: '10.06.2026', budget: '78 000 ₽',   notes: 'Descor Elite матовый в гостиной и прихожей. Остальные — ГКЛ Knauf.' },
  { title: 'Монтаж кухни Leicht',         work_type: 'furniture', status: 'pending',     date_start: '11.06.2026', date_end: '20.06.2026', budget: '120 000 ₽',  notes: 'Сборка и установка кухонного гарнитура. Подключение Miele. Канальный вытяжной вентилятор.' },
  { title: 'Дверные полотна и откосы',    work_type: 'doors',     status: 'pending',     date_start: '21.06.2026', date_end: '30.06.2026', budget: '45 000 ₽',   notes: 'Profil Doors X × 8 шт. Скрытые петли. Откосы из ГКЛ, шпаклёвка, покраска.' },
  { title: 'Система умного дома',         work_type: 'smart',     status: 'pending',     date_start: '01.07.2026', date_end: '10.07.2026', budget: '68 000 ₽',   notes: 'Fibaro Home Center 3 Lite. Программирование сценариев. Обучение клиента.' },
  { title: 'Финишная уборка и сдача',     work_type: 'other',     status: 'pending',     date_start: '01.10.2026', date_end: '01.10.2026', budget: '20 000 ₽',   notes: 'Профессиональная уборка. Составление акта приёма-передачи.' },
]

let sortOrder = 0
for (const item of workItems) {
  await db`
    INSERT INTO work_status_items
      (project_id, contractor_id, title, work_type, status, date_start, date_end, budget, notes, sort_order)
    VALUES (
      ${project.id}, ${contractor.id},
      ${item.title}, ${item.work_type}, ${item.status},
      ${item.date_start}, ${item.date_end}, ${item.budget},
      ${item.notes}, ${sortOrder++}
    )
  `
}
console.log(`  ✅ Создано ${workItems.length} позиций`)

// ─── Итог ─────────────────────────────────────────────────────────────────────
console.log(`
🎉 Демо-данные успешно созданы!

  Клиент:      Иванов Иван Иванович (ID: ${client.id})
  Подрядчик:   Петров Сергей Николаевич / ООО «ПетровСтрой» (ID: ${contractor.id})
  Проект:      ivanov-profsoiuznaya-82 (ID: ${project.id})
  Страниц:     7 (first-contact, smart-brief, client-tz, moodboard, specifications, space-planning, procurement-list, site-survey, work-log)
  Позиций работ: ${workItems.length}

  Открыть: /admin/projects/ivanov-profsoiuznaya-82
`)

await db.end()
