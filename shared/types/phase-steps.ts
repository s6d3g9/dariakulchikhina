export interface PhaseStep {
  num: string          // '0.1', '1.2', etc.
  title: string
  business: string     // what happens in the real world
  it: string           // what the IT system does
  statusChange?: string
  artifacts?: string[]
  critical?: boolean
}

export interface PhaseDefinition {
  key: string
  label: string
  goal: string
  steps: PhaseStep[]
}

export const PHASE_STEPS: PhaseDefinition[] = [
  {
    key: 'lead',
    label: 'Инициация и технический аудит',
    goal: 'Оцифровать пожелания клиента, проверить объект, заключить договор на проектирование.',
    steps: [
      {
        num: '0.1',
        title: 'Первичный контакт',
        business: 'Знакомство, обсуждение базовых параметров: площадь, ЖК, примерный бюджет.',
        it: 'Создание карточки проекта в системе.',
        statusChange: 'Статус проекта → Инициация',
        artifacts: [],
      },
      {
        num: '0.2',
        title: 'Глубинное интервью (Client Briefing)',
        business:
          'Заполнение подробной анкеты о составе семьи, хобби, утренних рутинах, хранении вещей.',
        it: 'Клиент заполняет Smart Brief Form. Система генерирует JSON-объект с тегами (#smart_home, #kids_room, #soundproofing).',
        artifacts: ['Anket_Brief.pdf'],
      },
      {
        num: '0.3',
        title: 'Инженерный аудит и обмеры (Site Survey)',
        business:
          'Выезд инженера. Лазерное 3D-сканирование, проверка вентканалов, стояков, электрощита.',
        it: 'Загрузка облака точек (.e57/.rcp) и фотофиксации As-Is в модуль Digital Twin.',
        statusChange: 'SURVEY_COMPLETED',
        artifacts: ['SurveyReport.pdf', 'Pointcloud.e57', 'Photo_As-Is.zip'],
      },
      {
        num: '0.4',
        title: 'Формирование технического задания (ToR)',
        business: 'Сведение данных из брифа и обмеров в единый документ с графиком работ.',
        it: 'Автогенерация PDF Terms of Reference. Подписание через e-Sign. Выставление инвойса за 1-й этап.',
        statusChange: 'Статус → Эскиз (DESIGN_ACTIVE)',
        artifacts: ['Contract_ToR.pdf', 'Invoice_Advance.pdf'],
        critical: true,
      },
    ],
  },
  {
    key: 'concept',
    label: 'Концепция и пространственный дизайн',
    goal: 'Создать и согласовать объёмно-планировочное решение, стилистику и 3D вайтбокс.',
    steps: [
      {
        num: '1.1',
        title: 'Планировочное решение (Space Planning)',
        business: 'Архитектор предлагает 2–3 варианта расстановки мебели и зонирования.',
        it: 'Загрузка .dwg/.pdf в систему. Клиент получает уведомление. Включается Approval Workflow.',
        statusChange: 'Layout.Status = APPROVED_LOCKED (после подтверждения)',
        artifacts: ['Layout_v1.dwg', 'Layout_v2.pdf'],
      },
      {
        num: '1.2',
        title: 'Мудборд и стилистика (Moodboarding)',
        business: 'Дизайнер собирает референсы, фактуры, цветовые палитры.',
        it: 'Загрузка материалов в интерактивную галерею. Клиент может оставлять комментарии по референсам.',
        artifacts: ['Moodboard_v1.pdf'],
      },
      {
        num: '1.3',
        title: 'Согласование 3D вайтбокс',
        business: 'Дизайнер презентует объёмную 3D-модель без отделки (white-box).',
        it: 'Запрос электронной подписи клиента. Блокировка изменений геометрии после подписания.',
        statusChange: 'Phase1.Status = COMPLETED',
        artifacts: ['3D_Whitebox_Approved.pdf'],
        critical: true,
      },
    ],
  },
  {
    key: 'working_project',
    label: 'Рабочий проект и инженерия',
    goal: 'Разработать полный комплект рабочей документации для строительства.',
    steps: [
      {
        num: '2.1',
        title: 'Фотореалистичные рендеры (3D Visualization)',
        business: 'Дизайнер создаёт финальные 3D-визуализации по каждому помещению.',
        it: 'Версионирование рендеров (v1, v2, …). Постатейная приёмка по комнатам.',
        artifacts: ['Render_LivingRoom_v2.jpg', 'Render_Kitchen_v1.jpg'],
      },
      {
        num: '2.2',
        title: 'Инженерные сети (MEP Integration)',
        business: 'Субподрядчики разрабатывают схемы HVAC, сантехники, слаботочки, smart home.',
        it: 'Загрузка MEP-схем. PM запускает проверку на коллизии. При конфликте создаётся ClashTicket.',
        artifacts: ['HVAC_Scheme.pdf', 'Plumbing_v1.pdf', 'SmartHome_Layout.pdf'],
      },
      {
        num: '2.3',
        title: 'Авторская мебель и столярка (Millwork)',
        business: 'Дизайнер разрабатывает чертежи нестандартной мебели и встроенных элементов.',
        it: 'Парсинг чертежей для формирования спецификации материалов (BoQ).',
        artifacts: ['Millwork_Drawings.pdf', 'BoQ_Draft.xlsx'],
      },
      {
        num: '2.4',
        title: 'Согласование с УК (HOA Approval)',
        business: 'PM подаёт пакет документов в управляющую компанию на согласование перепланировки.',
        it: 'Отслеживание статуса согласования. Этап 4 (Стройка) заблокирован до получения разрешения.',
        statusChange: 'Блокировка до HOA_Approval = APPROVED',
        artifacts: ['HOA_Application.pdf'],
        critical: true,
      },
      {
        num: '2.5',
        title: 'Финальная сборка документации (Blueprint Assembly)',
        business: 'Все чертежи объединяются в единый мастер-комплект.',
        it: 'Генерация Master-PDF с водяным знаком "Согласовано к производству работ".',
        statusChange: 'Phase2.Status = READY_FOR_CONSTRUCTION',
        artifacts: ['Master_Blueprint_ApprovedForConstruction.pdf'],
      },
    ],
  },
  {
    key: 'procurement',
    label: 'Сметы и закупки',
    goal: 'Зафиксировать бюджет, выбрать поставщиков и разместить заказы на длинные позиции.',
    steps: [
      {
        num: '3.1',
        title: 'Генерация BoQ (Bill of Quantities)',
        business: 'Из рабочей документации извлекаются все материалы, изделия и работы.',
        it: 'Автопарсинг чертежей. Формирование Dynamic BoQ с уникальным Item_ID для каждой позиции.',
        artifacts: ['BoQ_Full_v1.xlsx'],
      },
      {
        num: '3.2',
        title: 'Тендер (RFP / Tendering)',
        business: 'PM отправляет запрос коммерческих предложений поставщикам (окна, кухня, сантехника).',
        it: 'Вендоры подают заявки через портал. Система сравнивает предложения side-by-side.',
        artifacts: ['RFP_Windows.pdf', 'RFP_Kitchen.pdf'],
      },
      {
        num: '3.3',
        title: 'Оптимизация бюджета (Value Engineering)',
        business: 'Если итоговая смета превышает целевой бюджет — поиск альтернативных материалов.',
        it: 'Активация VE-модуля. Предложение замен с сохранением эстетики. Трекинг суммы экономии.',
        critical: true,
        artifacts: ['VE_Report.pdf'],
      },
      {
        num: '3.4',
        title: 'Фиксация бюджета (Budget Lock)',
        business: 'Клиент подписывает итоговую смету и график платежей.',
        it: 'BoQ.Status = BASELINE_LOCKED. Генерация заказов (PO) на длинные позиции.',
        statusChange: 'Статус → Стройка',
        artifacts: ['Budget_Approved.pdf', 'PaymentSchedule.pdf', 'PO_LongLead.pdf'],
        critical: true,
      },
    ],
  },
  {
    key: 'construction',
    label: 'Строительство и авторский надзор',
    goal: 'Выполнить ремонтно-отделочные работы в соответствии с проектом.',
    steps: [
      {
        num: '4.1',
        title: 'Мобилизация на объекте (Site Mobilization)',
        business: 'Подрядчики заезжают на объект. Начало черновых работ.',
        it: 'Запуск WBS-трекинга задач (Ганtt). Подрядчики загружают ежедневные фотоотчёты в SiteJournal.',
        artifacts: ['SiteJournal_Day01.jpg'],
      },
      {
        num: '4.2',
        title: 'Авторский надзор (Design Supervision)',
        business: 'Архитектор/дизайнер выезжает на объект, фиксирует отклонения от проекта.',
        it: 'Создание RFI_Ticket или DefectLog с фото и геолокацией. Назначение подрядчику. Запуск SLA-таймера.',
        artifacts: ['Supervision_Report.pdf'],
      },
      {
        num: '4.3',
        title: 'Управление изменениями (Change Orders)',
        business: 'Клиент запрашивает изменение объёма работ (например, добавить тёплый пол).',
        it: 'Создание ChangeOrder. Автоподсчёт стоимости изменений и смещения сроков. e-Sign.',
        statusChange: 'При подписании: мутация BoQ и WBS-таймлайна',
        critical: true,
        artifacts: ['ChangeOrder_001.pdf'],
      },
      {
        num: '4.4',
        title: 'Актирование (Progress Billing)',
        business: 'По достижении контрольной точки (например, "черновые полы закончены") составляется акт.',
        it: 'Генерация Progress_Invoice. Трекинг оплаты клиента.',
        artifacts: ['Progress_Invoice_M1.pdf', 'Act_CompletedWorks.pdf'],
      },
    ],
  },
  {
    key: 'commissioning',
    label: 'Сдача объекта',
    goal: 'Пусконаладка, устранение дефектов и передача объекта клиенту с полным архивом.',
    steps: [
      {
        num: '5.1',
        title: 'Пусконаладочные работы (MEP Commissioning)',
        business: 'Инженер проверяет работу HVAC, сантехники, smart home сценариев.',
        it: 'Загрузка протоколов испытаний в архив As-Built.',
        artifacts: ['Test_Protocol_HVAC.pdf', 'Test_Protocol_SmartHome.pdf'],
      },
      {
        num: '5.2',
        title: 'Дефектовка (Snagging)',
        business: 'PM и клиент совместно обходят объект и фиксируют недоделки.',
        it: 'Создание SnagTicket с фото, координатами и приоритетом. Трекинг OPEN → FIXING → VERIFIED_CLOSED.',
        artifacts: ['Snag_List.pdf'],
      },
      {
        num: '5.3',
        title: 'Возврат удержания (Retention Release)',
        business: 'После закрытия всех дефектов подписывается акт приёмки. Разблокируется 5% удержание.',
        it: 'Разблокировка Retention_Money. Выставление финального инвойса подрядчику.',
        critical: true,
        artifacts: ['Handover_Act_Signed.pdf', 'Final_Invoice_Contractor.pdf'],
      },
      {
        num: '5.4',
        title: 'Цифровая сдача объекта (Digital Handover)',
        business: 'Клиент получает полный архив проекта: чертежи, гарантии, инструкции по эксплуатации.',
        it: 'Компиляция AsBuiltArchive. Проект переводится в статус COMPLETED.',
        statusChange: 'Статус → Завершён',
        artifacts: ['AsBuilt_Archive.zip', 'Warranty_Pack.pdf', 'Care_Manual.pdf'],
        critical: true,
      },
    ],
  },
  {
    key: 'completed',
    label: 'Проект завершён',
    goal: 'Гарантийное сопровождение и поддержка клиента на этапе жизни объекта.',
    steps: [
      {
        num: '6.1',
        title: 'Гарантийный период',
        business: 'Дизайнер и подрядчики несут гарантийные обязательства по выполненным работам.',
        it: 'Возможность создания ServiceTicket. Напоминания о плановых проверках.',
        artifacts: ['Warranty_Certificate.pdf'],
      },
    ],
  },
]
