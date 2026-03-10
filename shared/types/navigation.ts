/**
 * RECURSIVE NAVIGATION SCHEMA (FRACTAL UI)
 * Эта схема описывает самоподобный алгоритм интерфейса.
 * Любой экран в системе описывается интерфейсом `NavigationNode`.
 *
 * =========================================================================
 * [ АРХИТЕКТУРНЫЕ ПРАВИЛА И ОГРАНИЧЕНИЯ (RU) ]
 * =========================================================================
 * 1. РАЗДЕЛЕНИЕ ЭКРАНА: Навигация ТОЛЬКО слева (сайдбар). Контент ТОЛЬКО справа.
 * 2. ЕДИНОЕ ОКНО (SPA): Никаких новых вкладок (target="_blank" запрещен). Всё рендерится на одной странице.
 * 3. ЕДИНАЯ СТРУКТУРА: Структура меню 100% идентична для любых сущностей (клиенты, проекты, документы).
 * 4. ЛЕВЫЙ САЙДБАР (НАВИГАЦИЯ):
 *    - Никаких горизонтальных меню или табов.
 *    - Никаких всплывающих окон (модалок, дропдаунов) для навигации.
 *    - Никаких иконок, эмодзи или аватарок. Только строгий текстовый минимализм (брутализм).
 * 5. ПРАВАЯ ОБЛАСТЬ (КОНТЕНТ):
 *    - Жесткая привязка к выбранному пункту слева.
 *    - Внутри правой области навигация ЗАПРЕЩЕНА (разрешены только "хлебные крошки" для возврата).
 *    - Если слева выбран Узел (node) -> справа показываем дашборд/сводную статистику.
 *    - Если слева выбран Лист (leaf) -> справа показываем сам документ, файл или форму редактирования.
 * 6. СЕТКА И ДИЗАЙН (ПРАВАЯ ОБЛАСТЬ):
 *    - Строгий лимит сетки: максимум 2 элемента по горизонтали (колонки) и 8 по вертикали (строки) на видимом экране (2x8).
 *    - Всё, что не влезает — рендерится ниже по той же строгой сетке и доступно только по скроллу/свайпу.
 *    - Строгое визуальное разделение "Название пункта (Label)" и "Поле ввода (Control)". Смешивание недопустимо.
 *    - Абсолютный минимализм: без теней, градиентов и визуального мусора.
 *
 * =========================================================================
 * *** SENIOR UI/UX SYSTEM DIRECTIVES & NEGATIVE PROMPTS FOR AI (EN) ***
 * =========================================================================
 *
 * [ 1. GLOBAL LAYOUT & ARCHITECTURE ]
 * - STRICT SCREEN SPLIT: Navigation MUST be exclusively on the LEFT (Sidebar). Content/Data MUST be exclusively on the RIGHT (Main Area).
 * - PURE SPA: ALL interactions must happen within a SINGLE window and render dynamically on a SINGLE page.
 * - DO NOT open menus, pages, or documents in another window or new browser tab (target="_blank" is FORBIDDEN).
 * - DO NOT create different layout structures for different entities. 100% structural uniformity is MANDATORY for all nodes (clients, designers, documents, etc.).
 *
 * [ 2. NAVIGATION RULES (LEFT SIDEBAR) ]
 * - DO NOT render ANY horizontal navigation (no header nav, no top-bar links, no horizontal tabs).
 * - DO NOT place navigation elements outside the left vertical sidebar.
 * - DO NOT use modals, popups, dropdowns, or overlays for routing/navigation.
 * - DO NOT use icons, emojis, avatars, or helper text in the nav menu. Use strictly minimalist, text-only brutalism.
 *
 * [ 3. MAIN CONTENT RULES (RIGHT AREA) ]
 * - STRICT CONTENT BINDING: The right area's content is ALWAYS strictly bound to the active state of the left menu.
 * - NO NAVIGATION ON THE RIGHT: The right area is ONLY for reading data (view) and filling forms (edit). Navigation inside the right area is FORBIDDEN. Changing entity context MUST only happen via the left sidebar.
 * - NODE BEHAVIOR: Selecting a "node" (type: "node") in the sidebar renders only summary info/dashboards in the right area.
 * - LEAF BEHAVIOR: Selecting a "leaf" (type: "leaf") in the sidebar renders the actual document, file, or editing form.
 * - BREADCRUMBS: The ONLY acceptable navigation element in the right area is a breadcrumb trail for returning.
 *
 * [ 4. UI/UX DESIGN & GRID LIMITS (MAIN AREA) ]
 * - STRICT GRID LIMITS: The main content area MUST use a strict 2-column grid. The visible viewport MUST fit a MAXIMUM of 2x8 elements (2 columns, 8 rows). Additional items MUST continue on this exact same grid and be accessible ONLY via vertical scrolling or swiping.
 * - ABSOLUTE MINIMALISM: All UI elements MUST be strictly minimalist. DO NOT use decorative UI elements (no complex shadows, no gradients, no visual noise).
 * - LABEL/CONTROL SEPARATION: Any forms, lists, and settings MUST have strict visual separation between the "Label" (item name) and "Control" (input, checkbox, select). DO NOT mix them chaotically. Enforce clear visual grid alignments.
 * - INHERITANCE: ALL navigation restrictions (no popups, no icons, text-only minimal brutalism) apply 100% to the right content area as well.
 */

// 1. Описание типов (Типизация для ИИ)
export type NodeType = 'system_root' | 'registry' | 'cabinet' | 'project_root';
export type PayloadItemType = 'node' | 'leaf';

export interface FilterParams {
  placeholder: string;
  value: string; // Текущий запрос пользователя для поиска
}

export interface PayloadItem {
  id: string;
  name: string;
  type: PayloadItemType; // 'node' - можно провалиться глубже, 'leaf' - конечный документ/форма
  action?: string; // Подсказка для ИИ о следующем действии (нажатие, открытие)
}

export interface NavigationNode {
  step: string;          // Буквенный идентификатор шага (A, B, C...)
  nodeId: string;        // Уникальный ID текущего узла
  nodeType: NodeType;    // Тип узла для системной логики
  context: {
    title: string;       // Заголовок текущего экрана
    breadcrumbs: string[]; // Путь к текущему экрану (хлебные крошки)
  };
  filter: FilterParams;  // Параметры локального поиска
  payload: PayloadItem[]; // Содержимое узла (дочерние узлы или листы)
}

// 2. Снимок состояний (State Flow) от Главного меню до конкретного документа
//
//   A  system_root  — Главное меню (корень)
//   B  registry     — Реестр дизайнеров (список сущностей)
//   C  cabinet      — Кабинет дизайнера (смешанные узлы: листья-секции + узлы-реестры)
//   D  registry     — Реестр проектов дизайнера
//   E  project_root — Кабинет проекта
//                     node: alpha_phases → список фаз (F)
//                     node: alpha_docs / alpha_gallery → реестры контента
//                     node: alpha_clients / alpha_contractors / ... → реестры субъектов
//   F  registry     — Фазы проекта (листья) ИЛИ реестр документов/галерей
//
// ВАЖНО: В project_root субъекты (клиенты, дизайнеры, подрядчики) РАЗРЕШЕНЫ как
// пункты навигации — они ведут в под-реестры, откуда можно открыть кабинет субъекта.
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
      { id: 'cat_sellers',     name: 'Поставщики',  type: 'node' },
      { id: 'cat_managers',    name: 'Менеджеры',   type: 'node' },
      { id: 'cat_docs',        name: 'Документы',   type: 'node' },
      { id: 'cat_gallery',     name: 'Галереи',     type: 'node' },
      { id: 'cat_moodboards',  name: 'Мудборды',    type: 'node' },
      { id: 'cat_tariffs',     name: 'Тарифы',      type: 'node' },
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
      { id: 'dar_services',    name: 'Услуги и цены', type: 'leaf' },
      { id: 'dar_packages',    name: 'Пакеты',        type: 'leaf' },
      { id: 'dar_subs',        name: 'Подписки',      type: 'leaf' },
      { id: 'dar_profile',     name: 'Профиль',       type: 'leaf' },
      { id: 'dar_projects',    name: 'Проекты',       type: 'node', action: 'CLICK' },
      { id: 'dar_clients',     name: 'Клиенты',       type: 'node' },
      { id: 'dar_contractors', name: 'Подрядчики',    type: 'node' },
      { id: 'dar_sellers',     name: 'Поставщики',    type: 'node' },
      { id: 'dar_managers',    name: 'Менеджеры',     type: 'node' },
      { id: 'dar_docs',        name: 'Документы',     type: 'node' },
      { id: 'dar_gallery',     name: 'Галереи',       type: 'node' },
      { id: 'dar_moodboards',  name: 'Мудборды',      type: 'node' },
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
      { id: 'proj_alpha',  name: 'ЖК Альфа',   type: 'node', action: 'CLICK' },
      { id: 'proj_forest', name: 'Дом в лесу', type: 'node' },
    ],
  },

  {
    step: 'E',
    nodeId: 'proj_alpha',
    nodeType: 'project_root',
    context: {
      title: 'Кабинет проекта (ЖК Альфа)',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak', 'Проекты', 'ЖК Альфа'],
    },
    filter: {
      placeholder: 'Поиск по кабинету проекта...',
      value: '',
    },
    payload: [
      { id: 'alpha_phases',      name: 'Фазы (прогресс проекта)', type: 'node' },
      { id: 'alpha_clients',     name: 'Клиенты',                  type: 'node' },
      { id: 'alpha_contractors', name: 'Подрядчики',                type: 'node' },
      { id: 'alpha_sellers',     name: 'Поставщики',                type: 'node' },
      { id: 'alpha_designers',   name: 'Дизайнеры',                 type: 'node' },
      { id: 'alpha_managers',    name: 'Менеджеры',                 type: 'node' },
      { id: 'alpha_docs',        name: 'Документы',                 type: 'node', action: 'CLICK' },
      { id: 'alpha_gallery',     name: 'Галереи',                   type: 'node' },
      { id: 'alpha_moodboards',  name: 'Мудборды',                  type: 'node' },
      { id: 'alpha_tariff',      name: 'Тариф',                     type: 'node' },
    ],
  },

  {
    step: 'F',
    nodeId: 'alpha_phases',
    nodeType: 'registry',
    context: {
      title: 'Фазы проекта (ЖК Альфа)',
      breadcrumbs: ['Главное меню', 'Дизайнеры', 'dariak', 'Проекты', 'ЖК Альфа', 'Фазы'],
    },
    filter: {
      placeholder: 'Поиск по фазам...',
      value: '',
    },
    payload: [
      { id: 'prj_overview',      name: 'Обзор',                  type: 'leaf' },
      { id: 'prj_firstcontact',  name: 'Первый контакт',         type: 'leaf' },
      { id: 'prj_smartbrief',    name: 'Смарт-бриф / ТЗ',        type: 'leaf' },
      { id: 'prj_sitesurvey',    name: 'Обмеры / аудит',         type: 'leaf' },
      { id: 'prj_torcontract',   name: 'ТЗ и договор',           type: 'leaf' },
      { id: 'prj_concept',       name: 'Концепция',               type: 'leaf' },
      { id: 'prj_spaceplanning', name: 'Планировочное решение',   type: 'leaf' },
      { id: 'prj_moodboard',     name: 'Мудборд',                 type: 'leaf' },
      { id: 'prj_plan',          name: 'Строительный план',       type: 'leaf' },
      { id: 'prj_drawings',      name: 'Рабочие чертежи',         type: 'leaf' },
      { id: 'prj_specifications',name: 'Спецификации',            type: 'leaf' },
      { id: 'prj_mep',           name: 'MEP-интеграция',          type: 'leaf' },
      { id: 'prj_materials',     name: 'Материалы',               type: 'leaf' },
      { id: 'prj_procurement',   name: 'Закупки',                 type: 'leaf' },
      { id: 'prj_suppliers',     name: 'Поставщики',              type: 'leaf' },
      { id: 'prj_procurementstatus', name: 'Статус закупок',      type: 'leaf' },
      { id: 'prj_workstatus',    name: 'Строительные работы',     type: 'leaf' },
      { id: 'prj_worklog',       name: 'Журнал работ',            type: 'leaf' },
      { id: 'prj_sitephotos',    name: 'Фото объекта',            type: 'leaf' },
      { id: 'prj_punchlist',     name: 'Замечания (punch-list)',  type: 'leaf' },
      { id: 'prj_commissioning', name: 'Акт ввода',               type: 'leaf' },
      { id: 'prj_clientsignoff', name: 'Подпись клиента',         type: 'leaf' },
      { id: 'prj_album',         name: 'Финальный альбом',        type: 'leaf' },
      { id: 'prj_extraservices', name: 'Доп. услуги',             type: 'leaf' },
    ],
  },
];
