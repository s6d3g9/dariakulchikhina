import { computed, type Ref } from 'vue'
import {
  DESIGNER_PROJECT_STATUS_LABELS,
  type BillingPeriod,
  type DesignerPackage,
  type DesignerServiceCategory,
  type DesignerServicePrice,
  type DesignerSubscription,
} from '~~/shared/types/designer'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

type DesignerDocument = {
  title?: string | null
  name?: string | null
  category?: string | null
  notes?: string | null
  createdAt?: string | null
  fileName?: string | null
}

type DesignerProjectSummary = {
  projectTitle?: string | null
  status?: string | null
  notes?: string | null
  packageKey?: string | null
  area?: number | null
  totalPrice?: number | null
  address?: string | null
}

type LinkedNamedItem = {
  name?: string | null
  role?: string | null
  phone?: string | null
  email?: string | null
  telegram?: string | null
  projects?: unknown[]
}

type Wipe2SectionFields = Array<{ title: string; subtitle?: string; fields: any[] }>

type UseDesignerCabinetWipe2ViewOptions = {
  designer: Ref<{ name?: string | null; city?: string | null } | null | undefined>
  form: {
    phone: string
    email: string
    city: string
    companyName: string
    telegram: string
    website: string
    experience: string
    specializations: string[]
    about: string
  }
  section: Ref<string>
  services: Ref<DesignerServicePrice[]>
  packages: Ref<DesignerPackage[]>
  subscriptions: Ref<DesignerSubscription[]>
  designerProjects: Ref<DesignerProjectSummary[]>
  designerDocs: Ref<DesignerDocument[]>
  uniqueClients: Ref<Array<{ name?: string | null; phone?: string | null; email?: string | null }>>
  uniqueContractors: Ref<Array<{ name?: string | null; role?: string | null }>>
  linkedData: Ref<{ sellers?: LinkedNamedItem[]; managers?: LinkedNamedItem[] } | null | undefined>
  galleryList: Ref<Array<{ title?: string | null; name?: string | null; description?: string | null }>>
  moodboardList: Ref<Array<{ title?: string | null; name?: string | null; description?: string | null }>>
  dashStats: Ref<{ active?: number; total?: number; totalRevenue?: number }>
  getServiceCategoryValue: (service: DesignerServicePrice) => DesignerServiceCategory
  getServiceDisplayTitle: (service: DesignerServicePrice, index?: number) => string
  formatServicePrice: (price: number, unit?: string | null) => string
  getServiceDisplayDescription: (service: DesignerServicePrice) => string
  getPriceUnitLabel: (unit?: string | null) => string
  getServiceCategoryLabel: (service: DesignerServicePrice) => string
  getServiceActionKey: (service: DesignerServicePrice, index?: number) => string
  getPackageGroupLabel: (pkg: DesignerPackage) => string
  getPackageDisplayTitle: (pkg: DesignerPackage | null | undefined, index?: number) => string
  formatRubles: (value: number) => string
  getPackageListDescription: (pkg: DesignerPackage) => string
  getServiceCountLabel: (count: number) => string
  getPackageExamplePrice: (pkg: DesignerPackage, area: number) => string
  getPackageBudgetLabel: (pkg: DesignerPackage) => string
  getPackageActionKey: (pkg: DesignerPackage, index?: number) => string
  getSubscriptionGroupLabel: (subscription: DesignerSubscription) => string
  getSubscriptionDisplayTitle: (subscription: DesignerSubscription | null | undefined, index?: number) => string
  getSubscriptionListDescription: (subscription: DesignerSubscription) => string
  getBillingLabel: (billingPeriod: string) => string
  getMonthlyPrice: (subscription: DesignerSubscription) => number
  getSubscriptionActionKey: (subscription: DesignerSubscription, index?: number) => string
  getPackageTitle: (key: string) => string
  formatDocDate: (value: string) => string
}

export function useDesignerCabinetWipe2View(options: UseDesignerCabinetWipe2ViewOptions) {
  const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
    const designer = options.designer.value
    if (!designer) return null

    const services = options.services.value || []
    const packages = options.packages.value || []
    const projects = options.designerProjects.value || []
    const subscriptions = options.subscriptions.value || []
    const docs = options.designerDocs.value || []
    const clients = options.uniqueClients.value || []
    const contractors = options.uniqueContractors.value || []
    const sellers = options.linkedData.value?.sellers || []
    const managers = options.linkedData.value?.managers || []

    const serviceCategorySections = SERVICE_CATEGORY_OPTIONS(options)
    const packageSections = PACKAGE_SECTIONS(options, packages)
    const subscriptionSections = SUBSCRIPTION_SECTIONS(options, subscriptions)

    const allSections = [
      {
        title: 'Обзор',
        fields: [
          { label: 'Активных проектов', value: String(options.dashStats.value?.active ?? 0) },
          { label: 'Всего проектов', value: String(options.dashStats.value?.total ?? 0) },
          { label: 'Клиентов', value: String(clients.length) },
          { label: 'Подрядчиков', value: String(contractors.length) },
          { label: 'Общая выручка', value: String(options.dashStats.value?.totalRevenue ?? 0), type: 'currency' as const, span: 2 as const },
          { label: 'Услуг настроено', value: String(options.services.value?.length ?? 0) },
          { label: 'Пакетов', value: String(packages.length) },
        ],
      },
      {
        title: 'Профиль',
        fields: [
          { label: 'Телефон', value: options.form.phone },
          { label: 'Email', value: options.form.email },
          { label: 'Город', value: options.form.city },
          { label: 'Компания', value: options.form.companyName },
          { label: 'Telegram', value: options.form.telegram },
          { label: 'Сайт', value: options.form.website },
          { label: 'Опыт', value: options.form.experience, span: 2 as const },
          { label: 'Специализация', value: options.form.specializations.join(', '), span: 2 as const },
          { label: 'О себе', value: options.form.about, type: 'multiline' as const, span: 2 as const },
        ],
      },
      ...(serviceCategorySections.length
        ? serviceCategorySections
        : [{ title: 'Услуги и прайс', fields: [{ label: 'Услуги', value: 'не настроены', span: 2 as const }] }]),
      ...(packageSections.length
        ? packageSections
        : [{ title: 'Пакеты', fields: [{ label: 'Пакеты', value: 'не настроены', span: 2 as const }] }]),
      {
        title: 'Проекты',
        fields: projects.length
          ? (projects.slice(0, 5).flatMap((project: any) => ([
              {
                label: project.projectTitle ?? 'Проект',
                value: DESIGNER_PROJECT_STATUS_LABELS[project.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || project.status || 'черновик',
                type: 'status' as const,
                span: 2 as const,
                description: project.notes ?? '',
                badge: project.packageKey ? options.getPackageTitle(project.packageKey) : 'без пакета',
                caption: project.area ? `${project.area} м²` : 'площадь не задана',
                eyebrow: 'проект',
                tone: project.totalPrice ? 'accent' as const : 'muted' as const,
              },
              {
                label: 'Стоимость',
                value: project.totalPrice ? String(project.totalPrice) : '',
                type: 'currency' as const,
                description: project.address || '',
                badge: project.area ? `${project.area} м²` : undefined,
                caption: project.packageKey ? options.getPackageTitle(project.packageKey) : 'индивидуально',
                eyebrow: 'бюджет',
                tone: project.totalPrice ? 'success' as const : 'muted' as const,
              },
              {
                label: 'Площадь',
                value: project.area ? `${project.area} м²` : '',
                description: project.address || 'адрес не указан',
                badge: project.status ? 'статус' : undefined,
                caption: project.status || 'черновик',
                eyebrow: 'геометрия',
                tone: 'default' as const,
              },
            ] as any[]))).slice(0, 18)
          : [{ label: '', value: 'нет проектов', span: 2 as const }],
      },
      ...(subscriptionSections.length
        ? subscriptionSections
        : [{ title: 'Подписки', fields: [{ label: 'Подписки', value: 'не настроены', span: 2 as const }] }]),
      {
        title: 'Документы',
        fields: docs.length
          ? docs.slice(0, 8).map((doc: any) => ({
              label: doc.title ?? doc.name ?? 'Документ',
              value: doc.category ?? 'документ',
              description: doc.notes ?? '',
              badge: doc.fileName ? 'файл' : 'запись',
              caption: doc.createdAt ? options.formatDocDate(doc.createdAt) : 'без даты',
              eyebrow: 'документы',
              tone: 'default' as const,
            }))
          : [{ label: 'Документы', value: 'нет загруженных документов', span: 2 as const }],
      },
      {
        title: 'Клиенты',
        fields: clients.length
          ? clients.slice(0, 8).map((client: any) => ({ label: client.name ?? '', value: client.phone ?? client.email ?? '' }))
          : [{ label: 'Клиенты', value: 'нет клиентов', span: 2 as const }],
      },
      {
        title: 'Подрядчики',
        fields: contractors.length
          ? contractors.slice(0, 8).map((contractor: any) => ({ label: contractor.name ?? '', value: contractor.role ?? '' }))
          : [{ label: 'Подрядчики', value: 'нет подрядчиков', span: 2 as const }],
      },
      {
        title: 'Поставщики',
        fields: sellers.length
          ? sellers.slice(0, 8).map((seller: any) => ({ label: seller.name ?? '', value: String(seller.projects?.length ?? 0) + ' проектов' }))
          : [{ label: 'Поставщики', value: 'нет поставщиков', span: 2 as const }],
      },
      {
        title: 'Менеджеры',
        fields: managers.length
          ? managers.slice(0, 8).map((manager: any) => ({ label: manager.name ?? '', value: String(manager.projects?.length ?? 0) + ' проектов' }))
          : [{ label: 'Менеджеры', value: 'нет менеджеров', span: 2 as const }],
      },
      {
        title: 'Галерея',
        fields: [
          { label: 'Объектов в галерее', value: String(options.galleryList.value.length), span: 2 as const },
          { label: 'Мудбордов', value: String(options.moodboardList.value.length), span: 2 as const },
        ],
      },
      {
        title: 'Мудборды',
        fields: options.moodboardList.value.length
          ? options.moodboardList.value.slice(0, 8).map((moodboard: any) => ({ label: moodboard.title ?? moodboard.name ?? '', value: moodboard.description ?? '' }))
          : [{ label: 'Мудборды', value: 'нет мудбордов', span: 2 as const }],
      },
    ]

    const sectionMap: Record<string, string> = {
      services: 'Услуги и прайс',
      packages: 'Пакеты',
      subscriptions: 'Подписки',
      documents: 'Документы',
      projects: 'Проекты',
      clients: 'Клиенты',
      contractors: 'Подрядчики',
      sellers: 'Поставщики',
      managers: 'Менеджеры',
      gallery: 'Галерея',
      moodboards: 'Мудборды',
      profile: 'Профиль',
    }

    const sectionTitle = sectionMap[options.section.value]
    const activeServiceSectionTitles = new Set((serviceCategorySections.length ? serviceCategorySections : [{ title: 'Услуги и прайс' }]).map((item) => item.title))
    const activePackageSectionTitles = new Set((packageSections.length ? packageSections : [{ title: 'Пакеты' }]).map((item) => item.title))
    const activeSubscriptionSectionTitles = new Set((subscriptionSections.length ? subscriptionSections : [{ title: 'Подписки' }]).map((item) => item.title))

    return {
      entityTitle: designer.name,
      entitySubtitle: options.form.city || designer.city || undefined,
      entityStatus: 'дизайнер',
      entityStatusColor: 'blue' as const,
      sections: options.section.value === 'services'
        ? allSections.filter((section) => activeServiceSectionTitles.has(section.title))
        : options.section.value === 'packages'
          ? allSections.filter((section) => activePackageSectionTitles.has(section.title))
          : options.section.value === 'subscriptions'
            ? allSections.filter((section) => activeSubscriptionSectionTitles.has(section.title))
            : sectionTitle
              ? allSections.filter((section) => section.title === sectionTitle)
              : allSections,
    }
  })

  return {
    wipe2CabinetData,
  }
}

function SERVICE_CATEGORY_OPTIONS(options: UseDesignerCabinetWipe2ViewOptions): Wipe2SectionFields {
  const serviceCategoryValues = Array.from(new Set(options.services.value.map((service) => options.getServiceCategoryValue(service))))
  return serviceCategoryValues.map((category) => {
    const items = options.services.value
      .map((service, index) => ({ service, index }))
      .filter(({ service }) => options.getServiceCategoryValue(service) === category)

    if (!items.length) return null

    return {
      title: options.getServiceCategoryLabel(items[0].service),
      subtitle: `${items.length} в категории`,
      fields: items.map(({ service, index }) => ({
        label: options.getServiceDisplayTitle(service, index),
        value: options.formatServicePrice(service.price, service.unit),
        description: options.getServiceDisplayDescription(service),
        badge: service.enabled === false ? 'скрыта' : 'активна',
        caption: options.getPriceUnitLabel(service.unit),
        eyebrow: options.getServiceCategoryLabel(service),
        tone: service.enabled === false ? 'muted' as const : 'accent' as const,
        itemType: 'service' as const,
        itemKey: options.getServiceActionKey(service, index),
      })),
    }
  }).filter(Boolean) as Wipe2SectionFields
}

function PACKAGE_SECTIONS(options: UseDesignerCabinetWipe2ViewOptions, packages: DesignerPackage[]): Wipe2SectionFields {
  return Array.from(new Set(packages.map((pkg) => options.getPackageGroupLabel(pkg))))
    .map((groupTitle) => {
      const items = packages
        .map((pkg, index) => ({ pkg, index }))
        .filter(({ pkg }) => options.getPackageGroupLabel(pkg) === groupTitle)

      if (!items.length) return null

      return {
        title: groupTitle,
        subtitle: `${items.length} в разделе`,
        fields: items.map(({ pkg, index }) => ({
          label: options.getPackageDisplayTitle(pkg, index),
          value: `${options.formatRubles(pkg.pricePerSqm ?? 0)} ₽/м²`,
          description: options.getPackageListDescription(pkg),
          badge: pkg.enabled === false ? 'черновик' : 'готов',
          caption: `${options.getServiceCountLabel((pkg.serviceKeys || []).length)} · 80 м²: ${options.getPackageExamplePrice(pkg, 80)}`,
          eyebrow: options.getPackageBudgetLabel(pkg),
          tone: pkg.enabled === false ? 'muted' as const : 'success' as const,
          itemType: 'package' as const,
          itemKey: options.getPackageActionKey(pkg, index),
          relatedItemKeys: pkg.serviceKeys || [],
        })),
      }
    })
    .filter(Boolean) as Wipe2SectionFields
}

function SUBSCRIPTION_SECTIONS(options: UseDesignerCabinetWipe2ViewOptions, subscriptions: DesignerSubscription[]): Wipe2SectionFields {
  return Array.from(new Set(subscriptions.map((subscription) => options.getSubscriptionGroupLabel(subscription))))
    .map((groupTitle) => {
      const items = subscriptions.filter((subscription) => options.getSubscriptionGroupLabel(subscription) === groupTitle)
      if (!items.length) return null

      return {
        title: groupTitle,
        subtitle: `${items.length} в разделе`,
        fields: items.map((subscription, index) => ({
          label: options.getSubscriptionDisplayTitle(subscription, index),
          value: subscription.price != null ? `${options.formatRubles(subscription.price)} ₽` : '—',
          description: options.getSubscriptionListDescription(subscription),
          badge: subscription.enabled === false ? 'скрыта' : 'активна',
          caption: `${options.getBillingLabel(subscription.billingPeriod as BillingPeriod)} · ${options.getMonthlyPrice(subscription).toLocaleString('ru-RU')} ₽/мес`,
          eyebrow: subscription.discount ? `скидка ${subscription.discount}%` : 'подписка',
          tone: subscription.enabled === false ? 'muted' as const : subscription.discount ? 'success' as const : 'accent' as const,
          itemType: 'subscription' as const,
          itemKey: options.getSubscriptionActionKey(subscription, index),
          relatedItemKeys: subscription.serviceKeys || [],
        })),
      }
    })
    .filter(Boolean) as Wipe2SectionFields
}