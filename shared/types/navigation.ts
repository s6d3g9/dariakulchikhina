/**
 * RECURSIVE NAVIGATION SCHEMA (FRACTAL UI)
 * Эта схема описывает самоподобный алгоритм интерфейса.
 * Любой экран в системе описывается интерфейсом `NavigationNode`.
 *
 * !!! СТРОГИЕ ГЛОБАЛЬНЫЕ ПРАВИЛА UI (ОГРАНИЧЕНИЯ) !!!
 *
 * 1. СТРОГОЕ РАЗДЕЛЕНИЕ ЭКРАНА: Навигация находится ТОЛЬКО СЛЕВА (в сайдбаре).
 *    Информация и контент — ТОЛЬКО СПРАВА (в основной области).
 * 2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО располагать элементы навигации где-либо, кроме
 *    левого вертикального меню сайдбара.
 * 3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО создавать любые горизонтальные меню
 *    (header nav, top bar links, горизонтальные табы для навигации).
 * 4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выносить ветки или элементы навигации за пределы
 *    левого сайдбара.
 * 5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО создавать разную структуру для субъектов
 *    (клиенты, дизайнеры, подрядчики) и объектов (документы, галереи).
 *    Структура меню ВСЕГДА 100% идентична и подчиняется единому интерфейсу NavigationNode.
 * 6. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО открывать меню, страницы или документы в другом
 *    окне или новой вкладке браузера.
 * 7. ВСЕ взаимодействие должно происходить строго внутри ОДНОГО окна и
 *    динамически рендериться ТОЛЬКО на ОДНОЙ странице (чистая SPA-архитектура).
 * 8. Центральная/правая часть экрана (Main Content) используется ТОЛЬКО для:
 *    - отображения конечного контента (leaf/документов),
 *    - дашбордов и форм редактирования,
 *    - предпросмотра файлов.
 *    В центральной/правой части экрана НЕ должно быть переходов на другие узлы
 *    (за исключением компонента "хлебных крошек" для возврата назад).
 * 9. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать всплывающие окна (модалки, попапы,
 *    dropdowns, оверлеи) для меню навигации.
 * 10. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать иконки, эмодзи, аватарки и
 *    дополнительные текстовые пояснения (описания/субтитры) в пунктах меню.
 *    Только строгий, минималистичный, текстовый стиль. Ничего лишнего.
 *
 * =========================================================================
 * *** SENIOR UI/UX NEGATIVE PROMPT (CRITICAL AI DIRECTIVES) ***
 * =========================================================================
 * - DO NOT render ANY horizontal navigation (no top-bars, no horizontal tabs).
 * - DO NOT place navigation elements outside the left vertical sidebar.
 * - DO NOT use modals, popups, dropdowns, or overlays for routing/navigation.
 * - DO NOT create different layout structures for different entities.
 *   100% structural uniformity is mandatory.
 * - DO NOT open links in new windows/tabs (target="_blank" is FORBIDDEN).
 * - DO NOT use icons, emojis, avatars, or helper text in the nav menu.
 *   Strictly minimalist, text-only brutalism.
 * - DO NOT render navigation nodes in the main content area.
 *   Main view is strictly for leaf payloads, data, and forms.
 */

// ─── 1. Типизация ────────────────────────────────────────────────────────────

export type NodeType = 'system_root' | 'registry' | 'cabinet' | 'project_root'
export type PayloadItemType = 'node' | 'leaf'

export interface FilterParams {
  placeholder: string
  value: string // Текущий запрос пользователя
}

export interface PayloadItem {
  id: string
  name: string
  type: PayloadItemType // 'node' — можно провалиться глубже, 'leaf' — конечный документ/форма
  action?: string       // Подсказка для ИИ о следующем действии
}

export interface NavigationNode {
  step: string           // Буквенный идентификатор шага (A, B, C...)
  nodeId: string         // Уникальный ID текущего узла
  nodeType: NodeType     // Тип узла для системной логики (без визуальных иконок)
  context: {
    title: string        // Заголовок текущего экрана
    breadcrumbs: string[] // Путь к текущему экрану
  }
  filter: FilterParams   // Параметры локального поиска
  payload: PayloadItem[] // Содержимое узла (дочерние узлы или листы)
}

// ─── 2. State Flow: A → B → C → D → E → F ───────────────────────────────────
//
//   A  system_root  — Главное меню (корень)
//   B  registry     — Реестр дизайнеров (список сущностей)
//   C  cabinet      — Кабинет дизайнера (смешанные узлы: листья-секции + узлы-реестры)
//   D  registry     — Реестр проектов дизайнера
//   E  project_root — Кабинет проекта (ТОЛЬКО фазы/секции проекта — НЕ субъекты)
//                     leaf = секция открывается справа
//                     node = drill в под-реестр (документы / галерея)
//   F  registry     — Реестр документов проекта (листья-категории)
//
// ВАЖНО: В project_root ЗАПРЕЩЕНО показывать субъекты (клиентов, дизайнеров,
// подрядчиков). Это снова создаёт меню выбора субъектов — нарушает правило 5.
// Связанные субъекты выводятся ТОЛЬКО в секции «Обзор» справа как inline-блоки.
//
// Тот же путь применяется к ЛЮБОЙ сущности:
//   Клиенты, Подрядчики, Поставщики, Документы, Галереи — ИДЕНТИЧНАЯ структура.

export const UserJourneyFlow: NavigationNode[] = [
  {
    step: 'A',
    nodeId: 'root',
    nodeType: 'system_root',
    context: {
      title: 'Главное меню',
      breadcrumbs: ['Главное меню'],
    },
    filter: {
      placeholder: 'Глобальный поиск по системе...',
      value: '',
    },
    payload: [
      { id: 'cat_projects',    name: 'Проекты',     type: 'node' },
      { id: 'cat_clients',     name: 'Клиенты',     type: 'node' },
      { id: 'cat_designers',   name: 'Дизайнеры',   type: 'node', action: 'CLICK' },
      { id: 'cat_contractors', name: 'Подрядчики',  type: 'node' },
      { id: 'cat_docs',        name: 'Документы',   type: 'node' },
      { id: 'cat_gallery',     name: 'Галереи',     type: 'node' },
      { id: 'cat_sellers',     name: 'Селлеры',     type: 'node' },
    ],
  },

  {
    step: 'B',
    nodeId: 'cat_designers',
    nodeType: 'registry',
    context: {
      title: 'Дизайнеры',
      breadcrumbs: ['Главное меню', 'Дизайнеры'],
    },
    filter: {
      placeholder: 'Поиск по именам дизайнеров...',
      value: '',
    },
    payload: [
      { id: 'usr_dariak', name: 'dariak', type: 'node', action: 'CLICK' },
      { id: 'usr_ivanov', name: 'ivanov', type: 'node' },
      { id: 'usr_petrov', name: 'petrov', type: 'node' },
    ],
  },

  {
    step: 'C',
    nodeId: 'usr_dariak',
    nodeType: 'cabinet',
    context: {
      title: 'Кабинет дизайнера (dariak)',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak'],
    },
    filter: {
      placeholder: 'Поиск по связанным категориям кабинета...',
      value: '',
    },
    payload: [
      // leaf-секции профиля (открываются справа, не drill)
      { id: 'dar_services',    name: 'Услуги и цены', type: 'node' },
      { id: 'dar_packages',    name: 'Пакеты',        type: 'node' },
      { id: 'dar_subs',        name: 'Подписки',      type: 'node' },
      { id: 'dar_profile',     name: 'Профиль',       type: 'node' },
      // node-реестры связанных сущностей (drill deeper)
      { id: 'dar_projects',    name: 'Проекты',       type: 'node', action: 'CLICK' },
      { id: 'dar_clients',     name: 'Клиенты',       type: 'node' },
      { id: 'dar_contractors', name: 'Подрядчики',    type: 'node' },
      { id: 'dar_docs',        name: 'Документы',     type: 'node' },
      { id: 'dar_gallery',     name: 'Галереи',       type: 'node' },
      { id: 'dar_sellers',     name: 'Селлеры',       type: 'node' },
    ],
  },

  {
    step: 'D',
    nodeId: 'dar_projects',
    nodeType: 'registry',
    context: {
      title: 'Проекты (dariak)',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak', 'Проекты'],
    },
    filter: {
      placeholder: 'Поиск по названию проекта...',
      value: '',
    },
    payload: [
      { id: 'proj_alpha',  name: 'ЖК Альфа',    type: 'node', action: 'CLICK' },
      { id: 'proj_forest', name: 'Дом в лесу',  type: 'node' },
    ],
  },

  {
    step: 'E',
    nodeId: 'proj_alpha',
    nodeType: 'project_root',
    context: {
      title: 'ЖК Альфа',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak', 'Проекты', 'ЖК Альфа'],
    },
    filter: {
      placeholder: 'Поиск по фазам проекта...',
      value: '',
    },
    // !! ТОЛЬКО фазы/секции проекта. Субъекты (клиенты, дизайнеры, подрядчики)
    // НЕ являются пунктами навигации проекта — они отображаются в секции «Обзор»
    payload: [
      { id: 'prj_overview',      name: 'Обзор',                  type: 'leaf' },
      { id: 'prj_firstcontact',  name: 'Первый контакт',         type: 'leaf' },
      { id: 'prj_smartbrief',    name: 'Смарт-бриф / ТЗ',        type: 'leaf' },
      { id: 'prj_concept',       name: 'Концепция',               type: 'leaf' },
      { id: 'prj_spaceplanning', name: 'Планировочное решение',   type: 'leaf' },
      { id: 'prj_moodboard',     name: 'Мудборд',                 type: 'leaf' },
      { id: 'prj_plan',          name: 'Строительный план',       type: 'leaf' },
      { id: 'prj_drawings',      name: 'Рабочие чертежи',         type: 'leaf' },
      { id: 'prj_mep',           name: 'MEP-интеграция',          type: 'leaf' },
      { id: 'prj_materials',     name: 'Материалы',               type: 'leaf' },
      { id: 'prj_procurement',   name: 'Закупки',                 type: 'leaf' },
      { id: 'prj_workstatus',    name: 'Строительные работы',     type: 'leaf' },
      { id: 'prj_sitephotos',    name: 'Фото объекта',            type: 'leaf' },
      { id: 'prj_punchlist',     name: 'Замечания (punch-list)',  type: 'leaf' },
      { id: 'prj_commissioning', name: 'Акт ввода',               type: 'leaf' },
      { id: 'prj_album',         name: 'Финальный альбом',        type: 'leaf' },
      { id: 'prj_extraservices', name: 'Доп. услуги',             type: 'leaf' },
      { id: 'prj_documents',     name: 'Документы',               type: 'node', action: 'CLICK' },
      { id: 'prj_gallery',       name: 'Галерея',                 type: 'node' },
    ],
  },

  {
    step: 'F',
    nodeId: 'alpha_docs',
    nodeType: 'registry',
    context: {
      title: 'Документы (ЖК Альфа)',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak', 'Проекты', 'ЖК Альфа', 'Документы'],
    },
    filter: {
      placeholder: 'Поиск по номеру или типу документа...',
      value: '',
    },
    payload: [
      { id: 'doc_12', name: 'Договор №12', type: 'leaf', action: 'OPEN_DOCUMENT' },
      { id: 'doc_13', name: 'Смета №3',    type: 'leaf' },
      { id: 'doc_14', name: 'Акт приемки', type: 'leaf' },
    ],
  },
]
