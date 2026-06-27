import { computed, type Ref } from 'vue'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

type ContractorSummary = {
  name?: string | null
  contractorType?: 'company' | 'master' | string | null
}

type ContractorDoc = {
  title?: string | null
  name?: string | null
  category?: string | null
  notes?: string | null
  fileName?: string | null
  createdAt?: string | null
}

type ContractorTask = {
  title?: string | null
  status?: string | null
  description?: string | null
  notes?: string | null
  priority?: string | null
  deadline?: string | null
}

type ContractorStaffMember = {
  name?: string | null
  role?: string | null
  specialization?: string | null
  phone?: string | null
  email?: string | null
}

type ContractorProjectLink = {
  title?: string | null
  slug?: string | null
}

type ContractorPortfolioStats = {
  doneCount?: number
  projectCount?: number
  photoCount?: number
}

type ContractorDashStats = {
  total?: number
  inProgress?: number
  done?: number
  overdue?: number
}

type UseContractorCabinetWipe2ViewOptions = {
  contractor: Ref<ContractorSummary | null | undefined>
  workItems: Ref<ContractorTask[] | null | undefined>
  contractorDocs: Ref<ContractorDoc[] | null | undefined>
  staff: Ref<ContractorStaffMember[] | null | undefined>
  linkedProjects: Ref<ContractorProjectLink[] | null | undefined>
  profilePct: Ref<number>
  portfolioStats: Ref<ContractorPortfolioStats | null | undefined>
  dashStats: Ref<ContractorDashStats | null | undefined>
  notifSettings: {
    newTasks: boolean
    deadlines: boolean
  }
  section: Ref<string>
  form: {
    phone: string
    email: string
    companyName: string
    website: string
    workTypes: string[]
    roleTypes: string[]
    notes: string
    passportSeries: string
    passportNumber: string
    passportIssuedBy: string
    passportIssueDate: string
    passportDepartmentCode: string
    birthDate: string
    birthPlace: string
    snils: string
    inn: string
    kpp: string
    ogrn: string
    bankName: string
    bik: string
    settlementAccount: string
    legalAddress: string
    taxSystem: string
    hourlyRate: string
    paymentMethods: string[]
  }
  formatDocDate: (value: string) => string
  getDocCategoryLabel: (category: string) => string
}

export function useContractorCabinetWipe2View(options: UseContractorCabinetWipe2ViewOptions) {
  const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
    const contractor = options.contractor.value
    if (!contractor) return null

    const items = options.workItems.value || []
    const active = items.filter((item) => ['planned', 'in_progress'].includes(item.status ?? ''))
    const docs = options.contractorDocs.value || []
    const members = options.staff.value || []

    const allSections = [
      {
        title: 'Обзор',
        fields: [
          { label: 'Задач всего', value: String(options.dashStats.value?.total ?? 0) },
          { label: 'В работе', value: String(options.dashStats.value?.inProgress ?? 0) },
          { label: 'Выполнено', value: String(options.dashStats.value?.done ?? 0) },
          { label: 'Просрочено', value: String(options.dashStats.value?.overdue ?? 0) },
          { label: 'Проектов', value: String(options.linkedProjects.value?.length ?? 0), span: 2 as const },
          { label: 'Профиль заполнен', value: `${options.profilePct.value}%`, span: 2 as const },
        ],
      },
      {
        title: 'Активные задачи',
        fields: active.length
          ? active.slice(0, 8).map((item) => ({
              label: item.title ?? 'Задача',
              value: item.status ?? '',
              type: 'status' as const,
              span: 2 as const,
              description: item.description ?? item.notes ?? '',
              badge: item.priority ? `приоритет ${item.priority}` : 'в работе',
              caption: item.deadline ? options.formatDocDate(item.deadline) : 'без дедлайна',
              eyebrow: 'задача',
              tone: item.status === 'done' ? 'success' as const : 'accent' as const,
            }))
          : [{ label: 'Всего задач', value: String(items.length) }, { label: 'Нет активных', value: '', span: 2 as const }],
      },
      {
        title: 'Контакты',
        fields: [
          { label: 'Телефон', value: options.form.phone },
          { label: 'Email', value: options.form.email },
          { label: 'Компания', value: options.form.companyName },
          { label: 'Telegram', value: (options.form as any).telegram ?? '' },
          { label: 'Сайт', value: options.form.website },
          { label: 'Виды работ', value: Array.isArray(options.form.workTypes) ? options.form.workTypes.join(', ') : '', span: 2 as const },
          { label: 'Роли', value: Array.isArray(options.form.roleTypes) ? options.form.roleTypes.join(', ') : '', span: 2 as const },
          { label: 'Заметки', value: options.form.notes, type: 'multiline' as const, span: 2 as const },
        ],
      },
      {
        title: 'Паспортные данные',
        fields: [
          { label: 'Серия', value: options.form.passportSeries },
          { label: 'Номер', value: options.form.passportNumber },
          { label: 'Выдан', value: options.form.passportIssuedBy, span: 2 as const },
          { label: 'Дата выдачи', value: options.form.passportIssueDate },
          { label: 'Код подразделения', value: options.form.passportDepartmentCode },
          { label: 'Дата рождения', value: options.form.birthDate },
          { label: 'Место рождения', value: options.form.birthPlace, span: 2 as const },
          { label: 'СНИЛС', value: options.form.snils },
          { label: 'ИНН', value: options.form.inn },
        ],
      },
      {
        title: 'Реквизиты',
        fields: [
          { label: 'ИНН', value: options.form.inn },
          { label: 'КПП', value: options.form.kpp },
          { label: 'ОГРН', value: options.form.ogrn },
          { label: 'Банк', value: options.form.bankName, span: 2 as const },
          { label: 'БИК', value: options.form.bik },
          { label: 'Р/с', value: options.form.settlementAccount, span: 2 as const },
          { label: 'Юр. адрес', value: options.form.legalAddress, span: 2 as const },
        ],
      },
      {
        title: 'Документы',
        fields: docs.length
          ? docs.slice(0, 8).map((doc) => ({
              label: doc.title ?? doc.name ?? 'Документ',
              value: options.getDocCategoryLabel(doc.category ?? ''),
              description: doc.notes ?? '',
              badge: doc.fileName ? 'файл' : 'запись',
              caption: doc.createdAt ? options.formatDocDate(doc.createdAt) : 'без даты',
              eyebrow: 'документы',
              tone: 'default' as const,
            }))
          : [{ label: 'Документы', value: 'нет загруженных документов', span: 2 as const }],
      },
      {
        title: 'Специализация',
        fields: [
          { label: 'Виды работ', value: Array.isArray(options.form.workTypes) ? options.form.workTypes.join(', ') : '', span: 2 as const },
          { label: 'Роли', value: Array.isArray(options.form.roleTypes) ? options.form.roleTypes.join(', ') : '', span: 2 as const },
          { label: 'Сертификаты', value: (options.form as any).certifications?.length ? String((options.form as any).certifications.length) : '—' },
        ],
      },
      {
        title: 'Финансы',
        fields: [
          { label: 'Система налогообложения', value: options.form.taxSystem ?? '', span: 2 as const },
          { label: 'Ставка в час', value: options.form.hourlyRate ?? '' },
          { label: 'Способы оплаты', value: Array.isArray(options.form.paymentMethods) ? options.form.paymentMethods.join(', ') : '', span: 2 as const },
        ],
      },
      {
        title: 'Портфолио',
        fields: [
          { label: 'Выполненных задач', value: String(options.portfolioStats.value?.doneCount ?? 0), description: 'закрытые позиции в work log', badge: 'портфолио', caption: 'за всё время', eyebrow: 'результат', tone: 'success' as const },
          { label: 'Проектов', value: String(options.portfolioStats.value?.projectCount ?? 0), description: 'объекты, где подрядчик участвовал', badge: 'кейсы', caption: 'в базе', eyebrow: 'проектный след', tone: 'accent' as const },
          { label: 'Фотографий', value: String(options.portfolioStats.value?.photoCount ?? 0), description: 'визуальные подтверждения работ', badge: 'медиа', caption: 'загружено', eyebrow: 'архив', tone: 'default' as const },
        ],
      },
      {
        title: 'Настройки',
        fields: [
          { label: 'Уведомления: новые задачи', value: options.notifSettings.newTasks ? 'включено' : 'выключено' },
          { label: 'Уведомления: дедлайны', value: options.notifSettings.deadlines ? 'включено' : 'выключено' },
        ],
      },
      {
        title: 'Бригада',
        fields: members.length
          ? members.slice(0, 8).map((member) => ({
              label: member.name ?? 'Сотрудник',
              value: member.role ?? member.specialization ?? '',
              description: member.phone ?? member.email ?? '',
              badge: member.specialization ? 'спец' : 'команда',
              caption: member.specialization ?? 'роль не указана',
              eyebrow: 'бригада',
              tone: 'default' as const,
            }))
          : [{ label: 'Сотрудники', value: 'нет сотрудников', span: 2 as const }],
      },
    ]

    const sectionMap: Record<string, string> = {
      tasks: 'Активные задачи',
      contacts: 'Контакты',
      passport: 'Паспортные данные',
      requisites: 'Реквизиты',
      documents: 'Документы',
      specialization: 'Специализация',
      finances: 'Финансы',
      portfolio: 'Портфолио',
      settings: 'Настройки',
      staff: 'Бригада',
    }

    const sectionTitle = sectionMap[options.section.value]

    return {
      entityTitle: contractor.name,
      entitySubtitle: options.form.companyName || (contractor.contractorType === 'company' ? 'организация' : 'мастер'),
      entityStatus: contractor.contractorType === 'company' ? 'организация' : 'мастер',
      entityStatusColor: contractor.contractorType === 'company' ? 'blue' as const : 'amber' as const,
      sections: sectionTitle ? allSections.filter((section) => section.title === sectionTitle) : allSections,
    }
  })

  return {
    wipe2CabinetData,
  }
}