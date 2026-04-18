import type { Wipe2EntityData } from '~~/shared/types/wipe2'

// ── Private helpers ──────────────────────────────────────────────────────────

const _CLIENT_DOC_CATEGORIES = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'contract', label: 'Договор' },
  { value: 'invoice',  label: 'Счёт' },
  { value: 'act',      label: 'Акт' },
  { value: 'other',    label: 'Другое' },
]

function _getClientDocCategoryLabel(category?: string | null): string {
  return _CLIENT_DOC_CATEGORIES.find(item => item.value === category)?.label || category || 'Документ'
}

function _getClientProjectStatus(project: any): string {
  if (!project) return 'не привязан'
  const statusMap: Record<string, string> = {
    lead:     'лид',
    active:   'активен',
    paused:   'на паузе',
    done:     'завершен',
    archived: 'архив',
  }
  return statusMap[project.status] || project.status || 'в работе'
}

function _getClientProjectTone(project: any): 'default' | 'accent' | 'success' | 'muted' {
  if (!project) return 'muted'
  if (project.status === 'active' || project.status === 'done') return 'success'
  if (project.status === 'paused') return 'accent'
  return 'default'
}

function _formatDocDate(v: string): string {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU')
}

// ── Public builder ───────────────────────────────────────────────────────────

/**
 * Builds Wipe2EntityData for the admin clients page.
 * Pure function — no reactive deps, safe to call inside a computed.
 *
 * @param client         - selectedClient.value
 * @param currentPage    - currentClientPage.value
 * @param filteredDocs   - filteredClientDocs.value
 * @param profileStats   - clientProfileStats.value
 */
export function buildClientWipe2Data(
  client: any,
  currentPage: string,
  filteredDocs: any[],
  profileStats: { filled: number; total: number },
): Wipe2EntityData | null {
  const c = client
  if (!c) return null
  const projects = c.linkedProjects || []
  const primaryProject = projects[0] || null
  const docs = filteredDocs || []

  if (currentPage === 'documents') {
    return {
      entityTitle: 'Документы клиента',
      entitySubtitle: docs.length ? `${docs.length} файлов` : 'архив пока пуст',
      entityStatus: docs.length ? 'загружены' : 'пусто',
      entityStatusColor: docs.length ? 'green' : 'muted',
      sections: [
        {
          title: 'Документы',
          fields: docs.length
            ? docs.slice(0, 18).map((doc: any) => ({
                label: doc.title || 'Документ',
                value: _getClientDocCategoryLabel(doc.category),
                type: 'badge' as const,
                description: doc.notes || 'Без заметок',
                caption: doc.createdAt ? _formatDocDate(doc.createdAt) : 'без даты',
                eyebrow: 'документ клиента',
                badge: doc.url ? 'файл' : 'черновик',
                tone: doc.url ? 'success' as const : 'muted' as const,
                span: 2 as const,
              }))
            : [{
                label: 'Архив',
                value: 'Документов пока нет',
                description: 'Загрузите паспорт, договор, счета или акты для клиента.',
                eyebrow: 'пустое состояние',
                tone: 'muted' as const,
                span: 2 as const,
              }],
        },
      ],
    }
  }

  if (currentPage === 'projects') {
    return {
      entityTitle: 'Проекты клиента',
      entitySubtitle: projects.length ? `${projects.length} связанных проектов` : 'без привязки',
      entityStatus: projects.length ? 'привязан' : 'без проекта',
      entityStatusColor: projects.length ? 'green' : 'muted',
      sections: [
        {
          title: 'Проекты',
          fields: projects.length
            ? projects.map((project: any) => ({
                label: project.title || project.slug,
                value: _getClientProjectStatus(project),
                type: 'status' as const,
                description: project.slug || 'slug не задан',
                caption: project.projectType || 'тип не указан',
                eyebrow: 'карточка проекта',
                badge: project.slug || 'project',
                tone: _getClientProjectTone(project),
                span: 2 as const,
              }))
            : [{
                label: 'Привязка проекта',
                value: 'Клиент пока не связан с проектом',
                description: 'Через действие «привязать» можно сразу открыть кабинет проекта и документы.',
                eyebrow: 'следующий шаг',
                tone: 'muted' as const,
                span: 2 as const,
              }],
        },
      ],
    }
  }

  if (currentPage === 'signoff') {
    return {
      entityTitle: 'Подписание и согласование',
      entitySubtitle: primaryProject?.title || 'проект не выбран',
      entityStatus: primaryProject ? 'готово к согласованию' : 'нужен проект',
      entityStatusColor: primaryProject ? 'blue' : 'muted',
      sections: [
        {
          title: 'Сценарий работы',
          fields: [
            {
              label: 'Проект',
              value: primaryProject?.title || 'не привязан',
              description: primaryProject?.slug || 'сначала привяжите клиента к проекту',
              eyebrow: 'контекст',
              tone: primaryProject ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Кабинет клиента',
              value: primaryProject ? 'можно открыть' : 'недоступен',
              description: primaryProject
                ? 'Клиент сможет согласовывать документы через кабинет проекта.'
                : 'Пока нет связанного проекта.',
              eyebrow: 'доступ',
              badge: primaryProject ? 'online' : 'offline',
              tone: primaryProject ? 'accent' as const : 'muted' as const,
            },
          ],
        },
      ],
    }
  }

  if (currentPage === 'profile') {
    return {
      entityTitle: c.name,
      entitySubtitle: c.phone || c.email || undefined,
      entityStatus: `${profileStats.filled}/${profileStats.total} полей`,
      entityStatusColor: profileStats.filled >= 3 ? 'green' : 'amber',
      sections: [
        {
          title: 'Профиль',
          fields: [
            {
              label: 'Телефон',
              value: c.phone ?? 'не указан',
              description: c.phone ? 'Основной быстрый контакт.' : 'Добавьте телефон для быстрой связи.',
              eyebrow: 'контакт',
              tone: c.phone ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Email',
              value: c.email ?? 'не указан',
              description: c.email ? 'Используется для документов и уведомлений.' : 'Email пока не заполнен.',
              eyebrow: 'контакт',
              tone: c.email ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Мессенджер',
              value: c.messengerNick ? `${c.messenger ?? ''} ${c.messengerNick}`.trim() : 'не указан',
              description: c.messengerNick ? 'Канал для быстрых согласований.' : 'Можно добавить Telegram или WhatsApp.',
              eyebrow: 'оперативная связь',
              tone: c.messengerNick ? 'accent' as const : 'muted' as const,
            },
            {
              label: 'Адрес',
              value: c.address ?? 'не указан',
              description: c.address ? 'Основной адрес клиента или объекта.' : 'Адрес еще не сохранен.',
              eyebrow: 'локация',
              tone: c.address ? 'default' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Заметки',
              value: c.notes ?? 'без заметок',
              type: 'multiline' as const,
              description: c.notes ? 'Контекст по коммуникации и особенностям клиента.' : 'Внутренних заметок пока нет.',
              eyebrow: 'комментарий команды',
              tone: c.notes ? 'accent' as const : 'muted' as const,
              span: 2 as const,
            },
          ],
        },
      ],
    }
  }

  // Default: dashboard / overview
  return {
    entityTitle: c.name,
    entitySubtitle: c.phone || c.email || undefined,
    entityStatus: c.linkedProjects?.length ? 'привязан' : 'без проекта',
    entityStatusColor: c.linkedProjects?.length ? 'green' : 'muted',
    sections: [
      {
        title: 'Обзор',
        fields: [
          {
            label: 'Контакт',
            value: c.phone || c.email || 'не указан',
            description: c.phone && c.email ? 'Телефон и email заполнены.' : 'Есть только один канал связи.',
            eyebrow: 'коммуникация',
            badge: c.messengerNick ? 'messenger' : 'direct',
            tone: c.phone || c.email ? 'success' as const : 'muted' as const,
          },
          {
            label: 'Профиль',
            value: `${profileStats.filled}/${profileStats.total}`,
            description: 'Заполненность базовой карточки клиента.',
            caption: 'контактные поля',
            eyebrow: 'готовность данных',
            tone: profileStats.filled >= 3 ? 'accent' as const : 'muted' as const,
          },
          {
            label: 'Основной проект',
            value: primaryProject?.title || 'не привязан',
            description: primaryProject
              ? _getClientProjectStatus(primaryProject)
              : 'Нужна привязка к проекту для кабинета и согласований.',
            caption: primaryProject?.slug || 'project required',
            eyebrow: 'статус проекта',
            badge: primaryProject ? 'linked' : 'pending',
            tone: _getClientProjectTone(primaryProject),
            span: 2 as const,
          },
          {
            label: 'Заметки',
            value: c.notes ?? 'без заметок',
            type: 'multiline' as const,
            description: c.address ? `Адрес: ${c.address}` : 'Адрес не указан.',
            eyebrow: 'контекст',
            tone: c.notes ? 'default' as const : 'muted' as const,
            span: 2 as const,
          },
        ],
      },
      {
        title: 'Проекты',
        fields: projects.length
          ? projects.slice(0, 8).map((project: any) => ({
              label: project.title || project.slug,
              value: _getClientProjectStatus(project),
              type: 'status' as const,
              description: project.slug || 'slug не задан',
              caption: project.projectType || 'тип не указан',
              badge: project.slug || 'project',
              eyebrow: 'связанный проект',
              tone: _getClientProjectTone(project),
              span: 2 as const,
            }))
          : [{
              label: 'Проекты',
              value: 'Связей пока нет',
              description: 'Привяжите клиента к проекту, чтобы открыть кабинет и документы.',
              eyebrow: 'пустое состояние',
              tone: 'muted' as const,
              span: 2 as const,
            }],
      },
    ],
  }
}
