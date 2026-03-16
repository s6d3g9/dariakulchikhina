import type { PayloadItem } from '~~/shared/types/navigation'
import type {
  AppBlueprintDef,
  LayoutBlockPresetDef,
  LayoutBlockTemplateDef,
  MenuBlockDef,
  MenuBlockGroupDef,
} from '~~/shared/types/app-catalog'

function block(
  id: string,
  title: string,
  type: 'node' | 'leaf',
  category: MenuBlockDef['category'],
  family: string,
  description: string,
  appScopes: MenuBlockDef['appScopes'],
  tags: string[] = [],
): MenuBlockDef {
  return {
    id,
    title,
    type,
    category,
    family,
    description,
    configurable: true,
    appScopes,
    tags,
  }
}

export const ADMIN_ROOT_MENU_GROUP: MenuBlockGroupDef = {
  id: 'admin-root',
  title: 'Главное меню',
  category: 'root',
  description: 'Корневые разделы платформы, из которых собираются разные приложения на общей базе.',
  items: [
    block('cat_projects', 'Проекты', 'node', 'root', 'projects', 'Проектный контур и проектные кабинеты.', ['admin', 'project'], ['projects', 'project-root']),
    block('cat_clients', 'Клиенты', 'node', 'root', 'clients', 'Клиентские профили и кабинеты.', ['admin', 'client-cabinet'], ['clients']),
    block('cat_designers', 'Дизайнеры', 'node', 'root', 'designers', 'Кабинеты дизайнеров и связанные реестры.', ['admin', 'designer-cabinet'], ['designers']),
    block('cat_contractors', 'Подрядчики', 'node', 'root', 'contractors', 'Подрядчики, специализации и проектная интеграция.', ['admin', 'contractor-cabinet'], ['contractors']),
    block('cat_sellers', 'Поставщики', 'node', 'root', 'sellers', 'Поставщики, условия и проектные связи.', ['admin', 'seller-cabinet'], ['sellers']),
    block('cat_managers', 'Менеджеры', 'node', 'root', 'managers', 'Менеджерские кабинеты и маршрутизация проекта.', ['admin', 'manager-cabinet'], ['managers']),
    block('cat_docs', 'Документы', 'node', 'root', 'documents', 'Документные библиотеки и шаблоны.', ['admin'], ['documents']),
    block('cat_gallery', 'Галереи', 'node', 'root', 'gallery', 'Каталоги изображений и референсов.', ['admin'], ['gallery']),
    block('cat_moodboards', 'Мудборды', 'node', 'root', 'moodboards', 'Мудборды как отдельный продуктовый контур.', ['admin'], ['moodboards']),
  ],
}

export const DESIGNER_CABINET_BLOCKS: MenuBlockDef[] = [
  block('des_dashboard', 'Обзор', 'leaf', 'cabinet', 'designer-dashboard', 'Сводка кабинета дизайнера.', ['designer-cabinet', 'admin']),
  block('des_services', 'Услуги и цены', 'leaf', 'cabinet', 'designer-commercial', 'Коммерческие условия и услуги.', ['designer-cabinet', 'admin']),
  block('des_packages', 'Пакеты', 'leaf', 'cabinet', 'designer-commercial', 'Продуктовые пакеты.', ['designer-cabinet', 'admin']),
  block('des_subscriptions', 'Подписки', 'leaf', 'cabinet', 'designer-commercial', 'Подписки и recurring-логика.', ['designer-cabinet', 'admin']),
  block('des_projects', 'Проекты', 'leaf', 'cabinet', 'designer-relations', 'Проекты дизайнера.', ['designer-cabinet', 'admin']),
  block('des_clients', 'Клиенты', 'leaf', 'cabinet', 'designer-relations', 'Клиенты дизайнера.', ['designer-cabinet', 'admin']),
  block('des_contractors', 'Подрядчики', 'leaf', 'cabinet', 'designer-relations', 'Подрядчики дизайнера.', ['designer-cabinet', 'admin']),
  block('des_sellers', 'Продавцы', 'leaf', 'cabinet', 'designer-relations', 'Поставщики и продавцы.', ['designer-cabinet', 'admin']),
  block('des_managers', 'Менеджеры', 'leaf', 'cabinet', 'designer-relations', 'Менеджеры внутри контура дизайнера.', ['designer-cabinet', 'admin']),
  block('des_documents', 'Документы', 'leaf', 'cabinet', 'designer-assets', 'Документный контур дизайнера.', ['designer-cabinet', 'admin']),
  block('des_gallery', 'Галерея', 'leaf', 'cabinet', 'designer-assets', 'Галереи дизайнера.', ['designer-cabinet', 'admin']),
  block('des_moodboards', 'Мудборды', 'leaf', 'cabinet', 'designer-assets', 'Мудборд-контур.', ['designer-cabinet', 'admin']),
  block('des_profile', 'Профиль', 'leaf', 'cabinet', 'designer-profile', 'Профиль и персональные настройки.', ['designer-cabinet', 'admin']),
]

export const CLIENT_CABINET_BLOCKS: MenuBlockDef[] = [
  block('cli_dashboard', 'Обзор', 'leaf', 'cabinet', 'client-dashboard', 'Сводка клиента.', ['client-cabinet', 'admin']),
  block('cli_profile', 'Профиль', 'leaf', 'cabinet', 'client-profile', 'Профиль клиента.', ['client-cabinet', 'admin']),
  block('cli_signoff', 'Подписание', 'leaf', 'cabinet', 'client-flow', 'Сценарии подписи и согласования.', ['client-cabinet', 'admin']),
  block('cli_projects', 'Проекты', 'node', 'cabinet', 'client-relations', 'Связанные проекты клиента.', ['client-cabinet', 'admin']),
  block('cli_documents', 'Документы', 'node', 'cabinet', 'client-assets', 'Документы клиента.', ['client-cabinet', 'admin']),
]

export const CONTRACTOR_CABINET_BLOCKS: MenuBlockDef[] = [
  block('con_dashboard', 'Обзор', 'leaf', 'cabinet', 'contractor-dashboard', 'Сводка подрядчика.', ['contractor-cabinet', 'admin']),
  block('con_tasks', 'Задачи', 'leaf', 'cabinet', 'contractor-work', 'Задачи и pipeline работ.', ['contractor-cabinet', 'admin']),
  block('con_contacts', 'Контактные данные', 'leaf', 'cabinet', 'contractor-profile', 'Контактный блок.', ['contractor-cabinet', 'admin']),
  block('con_passport', 'Паспортные данные', 'leaf', 'cabinet', 'contractor-profile', 'Паспортный блок.', ['contractor-cabinet', 'admin']),
  block('con_requisites', 'Реквизиты', 'leaf', 'cabinet', 'contractor-finance', 'Юридические и банковские реквизиты.', ['contractor-cabinet', 'admin']),
  block('con_documents', 'Документы', 'leaf', 'cabinet', 'contractor-assets', 'Документы подрядчика.', ['contractor-cabinet', 'admin']),
  block('con_specialization', 'Специализации', 'leaf', 'cabinet', 'contractor-profile', 'Специализации и компетенции.', ['contractor-cabinet', 'admin']),
  block('con_finances', 'Финансы', 'leaf', 'cabinet', 'contractor-finance', 'Финансовый блок подрядчика.', ['contractor-cabinet', 'admin']),
  block('con_portfolio', 'Портфолио', 'leaf', 'cabinet', 'contractor-assets', 'Портфолио подрядчика.', ['contractor-cabinet', 'admin']),
  block('con_settings', 'Настройки', 'leaf', 'cabinet', 'contractor-settings', 'Настройки кабинета подрядчика.', ['contractor-cabinet', 'admin']),
]

export const SELLER_CABINET_BLOCKS: MenuBlockDef[] = [
  block('sel_dashboard', 'Обзор', 'leaf', 'cabinet', 'seller-dashboard', 'Сводка поставщика.', ['seller-cabinet', 'admin']),
  block('sel_profile', 'Профиль', 'leaf', 'cabinet', 'seller-profile', 'Профиль поставщика.', ['seller-cabinet', 'admin']),
  block('sel_requisites', 'Реквизиты', 'leaf', 'cabinet', 'seller-finance', 'Реквизиты поставщика.', ['seller-cabinet', 'admin']),
  block('sel_terms', 'Условия', 'leaf', 'cabinet', 'seller-commercial', 'Коммерческие условия.', ['seller-cabinet', 'admin']),
  block('sel_projects', 'Проекты', 'leaf', 'cabinet', 'seller-relations', 'Проекты, в которых участвует поставщик.', ['seller-cabinet', 'admin']),
]

export const MANAGER_CABINET_BLOCKS: MenuBlockDef[] = [
  block('man_dashboard', 'Обзор', 'leaf', 'cabinet', 'manager-dashboard', 'Сводка менеджера.', ['manager-cabinet', 'admin']),
  block('man_projects', 'Проекты', 'leaf', 'cabinet', 'manager-operations', 'Проектный блок менеджера.', ['manager-cabinet', 'admin']),
  block('man_feed', 'Лента событий', 'leaf', 'cabinet', 'manager-operations', 'Операционная лента.', ['manager-cabinet', 'admin']),
  block('man_approvals', 'Согласования', 'leaf', 'cabinet', 'manager-operations', 'Узел согласований.', ['manager-cabinet', 'admin']),
  block('man_reports', 'Отчёты', 'leaf', 'cabinet', 'manager-analytics', 'Отчётный контур.', ['manager-cabinet', 'admin']),
  block('man_profile', 'Профиль', 'leaf', 'cabinet', 'manager-profile', 'Профиль менеджера.', ['manager-cabinet', 'admin']),
]

export const PROJECT_CABINET_BLOCKS: MenuBlockDef[] = [
  block('prj_settings', 'Настройки проекта', 'leaf', 'project', 'project-settings', 'Базовые настройки проекта.', ['project', 'admin']),
  block('alpha_phases', 'Фазы (прогресс проекта)', 'node', 'project', 'project-phases', 'Поток фаз проекта.', ['project', 'admin']),
  block('alpha_clients', 'Клиенты', 'node', 'project', 'project-subjects', 'Клиенты, привязанные к проекту.', ['project', 'admin']),
  block('alpha_contractors', 'Подрядчики', 'node', 'project', 'project-subjects', 'Подрядчики проекта.', ['project', 'admin']),
  block('alpha_sellers', 'Поставщики', 'node', 'project', 'project-subjects', 'Поставщики проекта.', ['project', 'admin']),
  block('alpha_designers', 'Дизайнеры', 'node', 'project', 'project-subjects', 'Дизайнеры проекта.', ['project', 'admin']),
  block('alpha_managers', 'Менеджеры', 'node', 'project', 'project-subjects', 'Менеджеры проекта.', ['project', 'admin']),
  block('alpha_docs', 'Документы', 'node', 'project', 'project-assets', 'Документный раздел проекта.', ['project', 'admin']),
  block('alpha_gallery', 'Галереи', 'node', 'project', 'project-assets', 'Галереи проекта.', ['project', 'admin']),
  block('alpha_moodboards', 'Мудборды', 'node', 'project', 'project-assets', 'Мудборды проекта.', ['project', 'admin']),
]

export const PROJECT_PHASE_BLOCKS: MenuBlockDef[] = [
  block('prj_overview', 'Обзор', 'leaf', 'project-phase', 'overview', 'Сводка по проекту.', ['project', 'admin']),
  block('prj_firstcontact', 'Первый контакт', 'leaf', 'project-phase', 'initiation', 'Этап первого контакта.', ['project', 'admin']),
  block('prj_smartbrief', 'Смарт-бриф / ТЗ', 'leaf', 'project-phase', 'initiation', 'Брифинг и ТЗ.', ['project', 'admin']),
  block('prj_sitesurvey', 'Обмеры / аудит', 'leaf', 'project-phase', 'initiation', 'Обмеры и аудит.', ['project', 'admin']),
  block('prj_torcontract', 'ТЗ и договор', 'leaf', 'project-phase', 'initiation', 'Договорный блок.', ['project', 'admin']),
  block('prj_concept', 'Концепция', 'leaf', 'project-phase', 'concept', 'Концептуальный блок.', ['project', 'admin']),
  block('prj_spaceplanning', 'Планировочное решение', 'leaf', 'project-phase', 'concept', 'Планировочная схема.', ['project', 'admin']),
  block('prj_moodboard', 'Мудборд', 'leaf', 'project-phase', 'concept', 'Мудборд этапа.', ['project', 'admin']),
  block('prj_plan', 'Строительный план', 'leaf', 'project-phase', 'working-project', 'План строительных работ.', ['project', 'admin']),
  block('prj_drawings', 'Рабочие чертежи', 'leaf', 'project-phase', 'working-project', 'Рабочая документация.', ['project', 'admin']),
  block('prj_specifications', 'Спецификации', 'leaf', 'project-phase', 'working-project', 'Спецификации проекта.', ['project', 'admin']),
  block('prj_mep', 'MEP-интеграция', 'leaf', 'project-phase', 'working-project', 'Инженерная интеграция.', ['project', 'admin']),
  block('prj_materials', 'Материалы', 'leaf', 'project-phase', 'working-project', 'Материалы и отделка.', ['project', 'admin']),
  block('prj_procurement', 'Закупки', 'leaf', 'project-phase', 'procurement', 'План закупок.', ['project', 'admin']),
  block('prj_suppliers', 'Поставщики', 'leaf', 'project-phase', 'procurement', 'Поставщики в проекте.', ['project', 'admin']),
  block('prj_procurementstatus', 'Статус закупок', 'leaf', 'project-phase', 'procurement', 'Статус закупок.', ['project', 'admin']),
  block('prj_workstatus', 'Строительные работы', 'leaf', 'project-phase', 'construction', 'Прогресс стройки.', ['project', 'admin']),
  block('prj_worklog', 'Журнал работ', 'leaf', 'project-phase', 'construction', 'Журнал работ.', ['project', 'admin']),
  block('prj_sitephotos', 'Фото объекта', 'leaf', 'project-phase', 'construction', 'Фотофиксация объекта.', ['project', 'admin']),
  block('prj_punchlist', 'Замечания (punch-list)', 'leaf', 'project-phase', 'commissioning', 'Дефектная ведомость.', ['project', 'admin']),
  block('prj_commissioning', 'Акт ввода', 'leaf', 'project-phase', 'commissioning', 'Сдача и ввод.', ['project', 'admin']),
  block('prj_clientsignoff', 'Подпись клиента', 'leaf', 'project-phase', 'commissioning', 'Финальное согласование.', ['project', 'admin']),
  block('prj_album', 'Финальный альбом', 'leaf', 'project-phase', 'commissioning', 'Финальный пакет материалов.', ['project', 'admin']),
  block('prj_extraservices', 'Доп. услуги', 'leaf', 'project-phase', 'initiation', 'Расширенные услуги проекта.', ['project', 'admin']),
]

export const DOCUMENT_LIBRARY_BLOCKS: MenuBlockDef[] = [
  block('doc_all', 'Все документы', 'leaf', 'document', 'documents-all', 'Полный документный реестр.', ['admin']),
  block('doc_contract', '01 Договоры дизайн-проект', 'leaf', 'document', 'documents-contracts', 'Договоры дизайн-проекта.', ['admin']),
  block('doc_contract_supply', '02 Договоры поставки', 'leaf', 'document', 'documents-contracts', 'Договоры поставки.', ['admin']),
  block('doc_contract_work', '03 Договоры подряда', 'leaf', 'document', 'documents-contracts', 'Договоры подряда.', ['admin']),
  block('doc_act', '04 Акты выполненных работ', 'leaf', 'document', 'documents-acts', 'Акты выполненных работ.', ['admin']),
  block('doc_act_defect', '05 Акты о дефектах', 'leaf', 'document', 'documents-acts', 'Акты о дефектах.', ['admin']),
  block('doc_invoice', '06 Счета на оплату', 'leaf', 'document', 'documents-finance', 'Счета.', ['admin']),
  block('doc_estimate', '07 Сметы', 'leaf', 'document', 'documents-finance', 'Сметы.', ['admin']),
  block('doc_specification', '08 Спецификации', 'leaf', 'document', 'documents-specs', 'Спецификации.', ['admin']),
  block('doc_tz', '09 Техническое задание', 'leaf', 'document', 'documents-specs', 'Технические задания.', ['admin']),
  block('doc_approval', '10 Согласования', 'leaf', 'document', 'documents-approvals', 'Документы согласований.', ['admin']),
  block('doc_template', '14 Шаблоны', 'leaf', 'document', 'documents-templates', 'Документные шаблоны.', ['admin']),
  block('doc_other', '15 Прочее', 'leaf', 'document', 'documents-other', 'Прочие документы.', ['admin']),
]

export const GALLERY_LIBRARY_BLOCKS: MenuBlockDef[] = [
  block('gal_interiors', 'Интерьеры', 'leaf', 'gallery', 'gallery-main', 'Основная интерьерная галерея.', ['admin']),
  block('gal_furniture', 'Мебель', 'leaf', 'gallery', 'gallery-main', 'Галерея мебели.', ['admin']),
  block('gal_moodboards', 'Мудборды', 'leaf', 'gallery', 'gallery-moodboards', 'Галерея мудбордов.', ['admin']),
  block('gal_materials', 'Материалы', 'leaf', 'gallery', 'gallery-main', 'Галерея материалов.', ['admin']),
  block('gal_art', 'Арт и декор', 'leaf', 'gallery', 'gallery-main', 'Арт и декор.', ['admin']),
]

export const ADMIN_MENU_GROUPS: MenuBlockGroupDef[] = [
  ADMIN_ROOT_MENU_GROUP,
  {
    id: 'designer-cabinet',
    title: 'Кабинет дизайнера',
    category: 'cabinet',
    description: 'Типизированный состав кабинета дизайнера.',
    items: DESIGNER_CABINET_BLOCKS,
  },
  {
    id: 'client-cabinet',
    title: 'Кабинет клиента',
    category: 'cabinet',
    description: 'Типизированный состав кабинета клиента.',
    items: CLIENT_CABINET_BLOCKS,
  },
  {
    id: 'contractor-cabinet',
    title: 'Кабинет подрядчика',
    category: 'cabinet',
    description: 'Типизированный состав кабинета подрядчика.',
    items: CONTRACTOR_CABINET_BLOCKS,
  },
  {
    id: 'seller-cabinet',
    title: 'Кабинет поставщика',
    category: 'cabinet',
    description: 'Типизированный состав кабинета поставщика.',
    items: SELLER_CABINET_BLOCKS,
  },
  {
    id: 'manager-cabinet',
    title: 'Кабинет менеджера',
    category: 'cabinet',
    description: 'Типизированный состав кабинета менеджера.',
    items: MANAGER_CABINET_BLOCKS,
  },
  {
    id: 'project-cabinet',
    title: 'Кабинет проекта',
    category: 'project',
    description: 'Верхнеуровневые проектные блоки.',
    items: PROJECT_CABINET_BLOCKS,
  },
  {
    id: 'project-phases',
    title: 'Фазы проекта',
    category: 'project-phase',
    description: 'Фазовые блоки проекта.',
    items: PROJECT_PHASE_BLOCKS,
  },
  {
    id: 'documents-library',
    title: 'Библиотека документов',
    category: 'document',
    description: 'Категории документов.',
    items: DOCUMENT_LIBRARY_BLOCKS,
  },
  {
    id: 'gallery-library',
    title: 'Библиотека галерей',
    category: 'gallery',
    description: 'Категории галерей.',
    items: GALLERY_LIBRARY_BLOCKS,
  },
]

export const APP_BLUEPRINTS: AppBlueprintDef[] = [
  {
    id: 'design-studio',
    title: 'ОС дизайн-студии',
    description: 'Полный контур администрирования дизайн-студии: проекты, субъекты, документы, галереи.',
    scopes: ['admin', 'project', 'designer-cabinet'],
    menuGroupIds: ['admin-root', 'designer-cabinet', 'project-cabinet', 'project-phases', 'documents-library', 'gallery-library'],
    featuredBlockIds: ['cat_projects', 'cat_designers', 'alpha_phases', 'prj_spaceplanning', 'doc_template', 'gal_moodboards'],
  },
  {
    id: 'contractor-office',
    title: 'Кабинет подрядчика',
    description: 'Облегчённое приложение на той же базе для подрядчиков и менеджеров стройки.',
    scopes: ['admin', 'contractor-cabinet', 'manager-cabinet', 'project'],
    menuGroupIds: ['admin-root', 'contractor-cabinet', 'manager-cabinet', 'project-cabinet', 'project-phases'],
    featuredBlockIds: ['cat_contractors', 'cat_managers', 'con_tasks', 'man_feed', 'prj_workstatus', 'prj_worklog'],
    modules: {
      adminLayout: {
        header: false,
        siteLink: false,
      },
      designPanel: {
        tabs: {
          presets: false,
          concept: false,
          colors: false,
          surface: false,
          radii: false,
          grid: false,
          typeScale: false,
          darkMode: false,
          popups: false,
          tables: false,
          badges: false,
        },
      },
    },
  },
  {
    id: 'client-portal',
    title: 'Портал клиента',
    description: 'Клиентское приложение, собранное из тех же типизированных блоков и реестров.',
    scopes: ['admin', 'client-cabinet', 'project'],
    menuGroupIds: ['admin-root', 'client-cabinet', 'project-cabinet', 'project-phases', 'documents-library'],
    featuredBlockIds: ['cat_clients', 'cli_profile', 'cli_projects', 'prj_clientsignoff', 'doc_contract'],
    modules: {
      adminLayout: {
        notifications: false,
        themeSwitch: false,
        siteLink: false,
      },
      designPanel: {
        tabs: {
          presets: false,
          concept: false,
          colors: false,
          buttons: false,
          type: false,
          surface: false,
          radii: false,
          anim: false,
          grid: false,
          typeScale: false,
          darkMode: false,
          tags: false,
          popups: false,
          tables: false,
          badges: false,
          arch: false,
        },
      },
    },
  },
]

export const LAYOUT_BLOCK_PRESETS: Record<string, LayoutBlockPresetDef> = {
  S: { key: 'S', cellsX: 3, cellsY: 2 },
  M: { key: 'M', cellsX: 6, cellsY: 4 },
  L: { key: 'L', cellsX: 8, cellsY: 5 },
  XL: { key: 'XL', cellsX: 12, cellsY: 8 },
}

export const LAYOUT_BLOCK_TEMPLATES: LayoutBlockTemplateDef[] = [
  { id: 'living-room', title: 'Гостиная', defaultLabel: 'Гостиная', category: 'public', preset: 'L', color: '#4a80f0', description: 'Основная общественная зона.' },
  { id: 'kitchen', title: 'Кухня', defaultLabel: 'Кухня', category: 'service', preset: 'M', color: '#f57c00', description: 'Кухонный блок.' },
  { id: 'master-bedroom', title: 'Спальня', defaultLabel: 'Спальня', category: 'private', preset: 'L', color: '#8e24aa', description: 'Основная приватная зона.' },
  { id: 'kids-room', title: 'Детская', defaultLabel: 'Детская', category: 'private', preset: 'M', color: '#43a047', description: 'Детская комната.' },
  { id: 'bathroom', title: 'Санузел', defaultLabel: 'Санузел', category: 'service', preset: 'S', color: '#0288d1', description: 'Санитарная зона.' },
  { id: 'wardrobe', title: 'Гардероб', defaultLabel: 'Гардероб', category: 'utility', preset: 'S', color: '#00897b', description: 'Хранение и гардероб.' },
  { id: 'hall', title: 'Холл', defaultLabel: 'Холл', category: 'circulation', preset: 'M', color: '#f5a623', description: 'Транзитная зона.' },
  { id: 'cabinet', title: 'Кабинет', defaultLabel: 'Кабинет', category: 'private', preset: 'M', color: '#e53935', description: 'Рабочая комната.' },
  { id: 'terrace', title: 'Терраса', defaultLabel: 'Терраса', category: 'outdoor', preset: 'L', color: '#6d4c41', description: 'Внешняя зона.' },
  { id: 'custom', title: 'Кастомный блок', defaultLabel: 'Новая зона', category: 'custom', preset: 'M', color: '#607d8b', description: 'Пользовательский блок под любое приложение.' },
]

export const LAYOUT_BLOCK_CATEGORY_LABELS: Record<string, string> = {
  public: 'общественные',
  private: 'приватные',
  service: 'сервисные',
  utility: 'технические',
  circulation: 'транзитные',
  outdoor: 'внешние',
  custom: 'кастомные',
}

export function toPayloadItems(blocks: MenuBlockDef[]): PayloadItem[] {
  return blocks.map(blockDef => ({
    id: blockDef.id,
    name: blockDef.title,
    type: blockDef.type,
  }))
}

export function getLayoutTemplateById(templateId: string) {
  return LAYOUT_BLOCK_TEMPLATES.find(template => template.id === templateId) || LAYOUT_BLOCK_TEMPLATES[LAYOUT_BLOCK_TEMPLATES.length - 1]
}