import { computed, type Ref } from 'vue'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

type SellerSummary = {
  name?: string | null
}

type LinkedProject = {
  title?: string | null
  name?: string | null
  status?: string | null
  address?: string | null
  slug?: string | null
  area?: number | null
}

type UseSellerCabinetWipe2ViewOptions = {
  seller: Ref<SellerSummary | null | undefined>
  linkedProjects: Ref<LinkedProject[] | null | undefined>
  section: Ref<string>
  form: {
    phone: string
    email: string
    city: string
    rating: number | null
    categories: string[]
    contactPerson: string
    telegram: string
    website: string
    notes: string
    deliveryTerms: string
    paymentTerms: string
    minOrder: string
    discount: string
    inn: string
    kpp: string
    ogrn: string
    bankName: string
    bik: string
    settlementAccount: string
    legalAddress: string
  }
}

export function useSellerCabinetWipe2View(options: UseSellerCabinetWipe2ViewOptions) {
  const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
    const seller = options.seller.value
    if (!seller) return null

    const projects = options.linkedProjects.value || []

    const allSections = [
      {
        title: 'Обзор',
        fields: [
          { label: 'Телефон', value: options.form.phone },
          { label: 'Email', value: options.form.email },
          { label: 'Город', value: options.form.city },
          { label: 'Рейтинг', value: options.form.rating != null ? String(options.form.rating) : '—' },
          { label: 'Проектов', value: String(projects.length), span: 2 as const },
          { label: 'Категории', value: options.form.categories.join(', '), span: 2 as const },
        ],
      },
      {
        title: 'Профиль',
        fields: [
          { label: 'Телефон', value: options.form.phone, description: 'основной контакт поставщика', badge: 'контакт', caption: 'связь', eyebrow: 'профиль', tone: 'default' as const },
          { label: 'Email', value: options.form.email, description: 'почта для коммерческих запросов', badge: 'mail', caption: 'канал', eyebrow: 'профиль', tone: 'default' as const },
          { label: 'Город', value: options.form.city, description: 'основная география работы', badge: 'geo', caption: 'регион', eyebrow: 'профиль', tone: 'default' as const },
          { label: 'Контактное лицо', value: options.form.contactPerson, description: 'человек, который ведёт клиента', badge: 'owner', caption: 'менеджер', eyebrow: 'профиль', tone: 'accent' as const },
          { label: 'Telegram', value: options.form.telegram, description: 'оперативная связь', badge: 'tg', caption: 'чат', eyebrow: 'профиль', tone: 'default' as const },
          { label: 'Сайт', value: options.form.website, description: 'витрина поставщика', badge: 'web', caption: 'url', eyebrow: 'профиль', tone: 'default' as const },
          { label: 'Категории', value: options.form.categories.join(', '), span: 2 as const },
          { label: 'Заметки', value: options.form.notes, type: 'multiline' as const, span: 2 as const },
        ],
      },
      {
        title: 'Условия работы',
        fields: [
          { label: 'Условия доставки', value: options.form.deliveryTerms, span: 2 as const, description: 'логистика и сроки поставки', badge: 'delivery', caption: 'исполнение', eyebrow: 'условия', tone: 'accent' as const },
          { label: 'Условия оплаты', value: options.form.paymentTerms, span: 2 as const, description: 'аванс, постоплата и график', badge: 'finance', caption: 'расчёты', eyebrow: 'условия', tone: 'success' as const },
          { label: 'Мин. заказ', value: options.form.minOrder, description: 'минимальный порог по заявке', badge: 'min', caption: 'порог', eyebrow: 'условия', tone: 'default' as const },
          { label: 'Скидка', value: options.form.discount, description: 'базовая коммерческая уступка', badge: 'discount', caption: 'коммерция', eyebrow: 'условия', tone: 'success' as const },
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
        title: 'Проекты',
        fields: projects.length
          ? projects.slice(0, 8).map((project) => ({
              label: project.title ?? project.name ?? 'Проект',
              value: project.status ?? '',
              type: 'status' as const,
              span: 2 as const,
              description: project.address ?? '',
              badge: project.slug ? 'live' : 'draft',
              caption: project.area ? `${project.area} м²` : 'без площади',
              eyebrow: 'проект',
              tone: 'accent' as const,
            }))
          : [{ label: '', value: 'нет связанных проектов', span: 2 as const }],
      },
    ]

    const sectionMap: Record<string, string> = {
      profile: 'Профиль',
      terms: 'Условия работы',
      requisites: 'Реквизиты',
      projects: 'Проекты',
    }

    const sectionTitle = sectionMap[options.section.value]

    return {
      entityTitle: seller.name,
      entitySubtitle: options.form.city || undefined,
      entityStatus: 'поставщик',
      entityStatusColor: 'amber' as const,
      sections: sectionTitle ? allSections.filter((section) => section.title === sectionTitle) : allSections,
    }
  })

  return {
    wipe2CabinetData,
  }
}