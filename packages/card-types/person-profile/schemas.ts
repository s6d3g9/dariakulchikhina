/**
 * packages/card-types/person-profile/schemas.ts
 *
 * Declarative data-shape contract consumed by shell views, panels, and the
 * fractal harness. Keep this in sync with schema.data.json.
 */

export type ViewMode = 'instance' | 'type'
export type PanelSlot = 'top' | 'left' | 'right' | 'bottom'
export type SectionRole =
  | 'identity'
  | 'status'
  | 'timeline'
  | 'stream'
  | 'actions'
  | 'evidence'
  | 'inversion'

export interface FieldDef {
  key: string
  label_ru: string
  type: string
}

export interface SectionDef {
  key: string
  title_ru: string
  role: SectionRole
  fields: readonly FieldDef[]
}

export interface PanelDef {
  title_ru: string
  content_kind: string
}

export interface FixtureDef {
  id: string
  view: ViewMode
  values: Record<string, unknown>
}

export interface CardTypeSchema {
  sectionsSchema: Record<ViewMode, readonly SectionDef[]>
  panels: Record<PanelSlot, Record<ViewMode, PanelDef>>
  modes: Record<ViewMode, readonly string[]>
  fixtures: readonly FixtureDef[]
}

export const personProfileSchema: CardTypeSchema = {
  sectionsSchema: {
    instance: [
      {
        key: 'header',
        title_ru: 'Профиль агента',
        role: 'identity',
        fields: [
          {
            key: 'name',
            label_ru: 'Имя',
            type: 'string',
          },
          {
            key: 'avatar',
            label_ru: 'Аватар',
            type: 'url',
          },
          {
            key: 'status',
            label_ru: 'Статус',
            type: 'string',
          },
          {
            key: 'rating',
            label_ru: 'Рейтинг',
            type: 'number',
          },
        ],
      },
      {
        key: 'timeline',
        title_ru: 'Хронология',
        role: 'timeline',
        fields: [
          {
            key: 'created',
            label_ru: 'Создан',
            type: 'date',
          },
          {
            key: 'last_active',
            label_ru: 'Последняя активность',
            type: 'date',
          },
          {
            key: 'updated',
            label_ru: 'Обновлен',
            type: 'date',
          },
        ],
      },
      {
        key: 'summary',
        title_ru: 'Статистика',
        role: 'status',
        fields: [
          {
            key: 'tasks_done',
            label_ru: 'Задач выполнено',
            type: 'number',
          },
          {
            key: 'conversations',
            label_ru: 'Диалогов проведено',
            type: 'number',
          },
          {
            key: 'tokens_used',
            label_ru: 'Использовано токенов',
            type: 'string',
          },
        ],
      },
      {
        key: 'actions',
        title_ru: 'Действия',
        role: 'actions',
        fields: [
          {
            key: 'start_chat',
            label_ru: 'Начать диалог',
            type: 'action',
          },
          {
            key: 'assign_task',
            label_ru: 'Поручить задачу',
            type: 'action',
          },
          {
            key: 'view_history',
            label_ru: 'Открыть историю',
            type: 'action',
          },
        ],
      },
      {
        key: 'sections',
        title_ru: 'Детали',
        role: 'stream',
        fields: [
          {
            key: 'skills',
            label_ru: 'Навыки',
            type: 'list',
          },
          {
            key: 'pricing',
            label_ru: 'Стоимость',
            type: 'object',
          },
          {
            key: 'portfolio',
            label_ru: 'Портфолио',
            type: 'list',
          },
        ],
      },
      {
        key: 'footer',
        title_ru: 'Дополнительно',
        role: 'evidence',
        fields: [
          {
            key: 'privacy_policy',
            label_ru: 'Конфиденциальность',
            type: 'link',
          },
          {
            key: 'support',
            label_ru: 'Поддержка',
            type: 'link',
          },
        ],
      },
    ],
    type: [
      {
        key: 'header',
        title_ru: 'Роль',
        role: 'identity',
        fields: [
          {
            key: 'title',
            label_ru: 'Название роли',
            type: 'string',
          },
          {
            key: 'logo',
            label_ru: 'Логотип',
            type: 'url',
          },
          {
            key: 'category',
            label_ru: 'Категория',
            type: 'string',
          },
        ],
      },
      {
        key: 'timeline',
        title_ru: 'Жизненный цикл',
        role: 'timeline',
        fields: [
          {
            key: 'established',
            label_ru: 'Основан',
            type: 'date',
          },
          {
            key: 'last_updated',
            label_ru: 'Обновлен',
            type: 'date',
          },
        ],
      },
      {
        key: 'summary',
        title_ru: 'Общая статистика',
        role: 'status',
        fields: [
          {
            key: 'active_instances',
            label_ru: 'Активных агентов',
            type: 'number',
          },
          {
            key: 'total_tasks',
            label_ru: 'Всего задач',
            type: 'number',
          },
        ],
      },
      {
        key: 'actions',
        title_ru: 'Взаимодействие',
        role: 'actions',
        fields: [
          {
            key: 'join_ecosystem',
            label_ru: 'Создать агента',
            type: 'action',
          },
          {
            key: 'view_docs',
            label_ru: 'Документация',
            type: 'action',
          },
          {
            key: 'contact_sales',
            label_ru: 'Связаться с продажами',
            type: 'action',
          },
        ],
      },
      {
        key: 'sections',
        title_ru: 'Информация',
        role: 'stream',
        fields: [
          {
            key: 'catalog',
            label_ru: 'Каталог агентов',
            type: 'list',
          },
          {
            key: 'capabilities',
            label_ru: 'Возможности',
            type: 'list',
          },
          {
            key: 'case_studies',
            label_ru: 'Кейсы',
            type: 'list',
          },
        ],
      },
      {
        key: 'footer',
        title_ru: 'Реквизиты',
        role: 'evidence',
        fields: [
          {
            key: 'terms',
            label_ru: 'Условия использования',
            type: 'link',
          },
          {
            key: 'certifications',
            label_ru: 'Сертификаты',
            type: 'link',
          },
        ],
      },
    ],
  },
  panels: {
    top: {
      instance: {
        title_ru: 'Медиа и Аватары',
        content_kind: 'media',
      },
      type: {
        title_ru: 'Маркетинговые материалы',
        content_kind: 'media',
      },
    },
    left: {
      instance: {
        title_ru: 'Магазин навыков',
        content_kind: 'shop',
      },
      type: {
        title_ru: 'Корпоративные лицензии',
        content_kind: 'shop',
      },
    },
    right: {
      instance: {
        title_ru: 'Активные чаты',
        content_kind: 'chats',
      },
      type: {
        title_ru: 'Сообщество разработчиков',
        content_kind: 'communities',
      },
    },
    bottom: {
      instance: {
        title_ru: 'Лента событий',
        content_kind: 'feed',
      },
      type: {
        title_ru: 'Новости платформы',
        content_kind: 'feed',
      },
    },
  },
  modes: {
    instance: ['consumer', 'provider'],
    type: ['explore', 'connect'],
  },
  fixtures: [
    {
      id: 'fx-agent-1',
      view: 'instance',
      values: {
        name: 'Композитор AI',
        avatar: 'https://example.com/avatars/composer.png',
        status: 'Активен',
        rating: 4.9,
        created: '2023-01-15T10:00:00Z',
        last_active: '2023-10-24T12:30:00Z',
        updated: '2023-10-20T08:00:00Z',
        tasks_done: 1520,
        conversations: 340,
        tokens_used: '2.5M',
        skills: ['Сбор требований', 'Архитектура', 'TypeScript'],
        pricing: {
          currency: 'USD',
          amount: 50,
        },
        portfolio: ['CRM система', 'Платформа курсов'],
        privacy_policy: 'https://example.com/privacy',
        support: 'support@example.com',
      },
    },
    {
      id: 'fx-agent-1-type',
      view: 'type',
      values: {
        title: 'AI Архитектор',
        logo: 'https://example.com/logos/ai-arch.png',
        category: 'IT, Разработка',
        established: '2022-05-10T00:00:00Z',
        last_updated: '2023-09-01T00:00:00Z',
        active_instances: 150,
        total_tasks: 50000,
        join_ecosystem: 'Создать своего агента',
        view_docs: 'Как настроить агента',
        contact_sales: 'Связаться с нами',
        catalog: ['Junior Dev', 'Senior Dev', 'QA Engineer'],
        capabilities: ['Code Review', 'Auto-coding', 'Bug fixing'],
        case_studies: ['Ускорение релизов x2'],
        terms: 'https://example.com/terms',
        certifications: 'ISO 27001',
      },
    },
  ],
}
