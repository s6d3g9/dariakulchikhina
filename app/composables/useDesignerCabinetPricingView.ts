import { computed, type Ref } from 'vue'
import {
  BILLING_PERIOD_LABELS,
  BILLING_PERIOD_MONTHS,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SERVICE_CATEGORY_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  PRICE_UNIT_LABELS,
  type BillingPeriod,
  type DesignerPackage,
  type DesignerServiceCategory,
  type DesignerServicePrice,
  type DesignerSubscription,
  type PriceUnit,
} from '~~/shared/types/designer'
import { getDesignerServicePersistedKey } from '~~/shared/utils/designer/designer-catalogs'

type DesignerProjectSummary = {
  id: number
  packageKey?: string | null
  projectTitle?: string | null
  projectSlug?: string | null
}

type ServiceUsageInfo = {
  packageTitles: string[]
  subscriptionTitles: string[]
  total: number
}

type PackageUsageInfo = {
  projectTitles: string[]
  total: number
}

type DraftServiceItem = {
  key: string
  title: string
  price: string
  term: string
  category: string
}

type ServiceOption = {
  key: string
  title: string
  category: string
  price: string
  leadTime: string
}

type UseDesignerCabinetPricingViewOptions = {
  services: Ref<DesignerServicePrice[]>
  packages: Ref<DesignerPackage[]>
  subscriptions: Ref<DesignerSubscription[]>
  designerProjects: Ref<DesignerProjectSummary[]>
}

function formatUsageNames(list: string[]): string {
  if (list.length <= 2) return list.join(', ')
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
}

export function useDesignerCabinetPricingView(options: UseDesignerCabinetPricingViewOptions) {
  function getServicePersistedKey(
    service: DesignerServicePrice,
    index = options.services.value.findIndex((item) => item === service),
  ) {
    return getDesignerServicePersistedKey(service, Math.max(index, 0))
  }

  function getBillingLabel(bp: string): string {
    return BILLING_PERIOD_LABELS[bp as BillingPeriod] || bp
  }

  function getMonthlyPrice(sub: DesignerSubscription): number {
    const months = BILLING_PERIOD_MONTHS[sub.billingPeriod as BillingPeriod] || 1
    const price = Number(sub.price) || 0
    const effectivePrice = sub.discount > 0 ? price * (1 - (sub.discount || 0) / 100) : price
    return Math.round(effectivePrice / months)
  }

  function formatLimitKey(key: string): string {
    const map: Record<string, string> = {
      visits: 'Выездов',
      online_hours: 'Часов онлайн',
      renders: 'Рендеров',
    }
    return map[key] || key
  }

  function getServiceBySelectionKey(key: string): DesignerServicePrice | undefined {
    return options.services.value.find((service, index) => getServicePersistedKey(service, index) === key)
  }

  function getServiceTemplate(key: string) {
    return DESIGNER_SERVICE_TEMPLATES.find((template) => template.key === key)
  }

  function getServiceTitle(key: string): string {
    const service = getServiceBySelectionKey(key)
    if (service) return service.title
    const template = DESIGNER_SERVICE_TEMPLATES.find((item) => item.key === key)
    return template?.title || key
  }

  function getServiceDisplayTitle(service: DesignerServicePrice, index = 0): string {
    const title = String(service.title || '').trim()
    if (title) return title
    const template = getServiceTemplate(service.serviceKey)
    if (template?.title) return template.title
    return `Услуга ${index + 1}`
  }

  function getServiceDisplayDescription(service: DesignerServicePrice): string {
    const description = String(service.description || '').trim()
    if (description) return description
    const template = getServiceTemplate(service.serviceKey)
    return template?.description || ''
  }

  function getServiceTemplateLabel(service: DesignerServicePrice): string {
    const template = getServiceTemplate(service.serviceKey)
    return template?.title || 'Своя услуга'
  }

  function formatRubles(value: number): string {
    return Math.max(0, Number(value) || 0).toLocaleString('ru-RU')
  }

  function formatServicePrice(price: number, unit?: string | null): string {
    const normalizedPrice = Math.max(0, Number(price) || 0)
    if (!unit) return `${formatRubles(normalizedPrice)} ₽`
    if (unit in PRICE_UNIT_LABELS) {
      return `${formatRubles(normalizedPrice)} ${PRICE_UNIT_LABELS[unit as PriceUnit]}`
    }
    return `${formatRubles(normalizedPrice)} ${String(unit).trim()}`
  }

  function getServiceTemplateHint(service: DesignerServicePrice): string {
    const template = getServiceTemplate(service.serviceKey)
    if (!template) {
      return 'Позиция создана вручную. Можно выбрать типовую услугу из каталога и затем скорректировать цену, описание и срок.'
    }
    return `${DESIGNER_SERVICE_CATEGORY_LABELS[template.category]} · ${formatServicePrice(template.defaultPrice, template.defaultUnit)}`
  }

  function getServiceUsageInfo(serviceKey: string | null | undefined): ServiceUsageInfo {
    if (!serviceKey) {
      return {
        packageTitles: [],
        subscriptionTitles: [],
        total: 0,
      }
    }

    const packageTitles = Array.from(new Set(options.packages.value
      .filter((pkg) => (pkg.serviceKeys || []).includes(serviceKey))
      .map((pkg, index) => getPackageDisplayTitle(pkg, index))))

    const subscriptionTitles = Array.from(new Set(options.subscriptions.value
      .filter((subscription) => (subscription.serviceKeys || []).includes(serviceKey))
      .map((subscription, index) => getSubscriptionDisplayTitle(subscription, index))))

    return {
      packageTitles,
      subscriptionTitles,
      total: packageTitles.length + subscriptionTitles.length,
    }
  }

  function formatServiceUsageHint(usage: ServiceUsageInfo): string {
    if (!usage.total) return ''
    const parts = []
    if (usage.packageTitles.length) parts.push(`пакеты: ${formatUsageNames(usage.packageTitles)}`)
    if (usage.subscriptionTitles.length) parts.push(`подписки: ${formatUsageNames(usage.subscriptionTitles)}`)
    return `Связанные позиции обновятся автоматически: ${parts.join(' · ')}.`
  }

  function getPackageUsageInfo(packageKey: string | null | undefined): PackageUsageInfo {
    if (!packageKey) {
      return {
        projectTitles: [],
        total: 0,
      }
    }

    const projectTitles = Array.from(new Set(options.designerProjects.value
      .filter((project) => project.packageKey === packageKey)
      .map((project) => String(project.projectTitle || project.projectSlug || `Проект ${project.id}`).trim())
      .filter(Boolean)))

    return {
      projectTitles,
      total: projectTitles.length,
    }
  }

  function formatPackageUsageHint(usage: PackageUsageInfo) {
    if (!usage.total) return ''
    return `Связанные проекты обновятся автоматически: ${formatUsageNames(usage.projectTitles)}.`
  }

  function formatLeadTimeDays(days?: number | null): string {
    const normalized = Math.max(0, Number(days) || 0)
    if (!normalized) return 'срок не задан'
    if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
    if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
    return `${normalized} дней`
  }

  function getServiceLeadTimeLabel(service: DesignerServicePrice): string {
    return formatLeadTimeDays(service.leadTimeDays)
  }

  function getServiceCategoryValue(service: DesignerServicePrice): DesignerServiceCategory {
    if (service.category) return service.category
    const template = getServiceTemplate(service.serviceKey)
    return (template?.category || 'additional') as DesignerServiceCategory
  }

  function getServiceCategoryLabel(service: DesignerServicePrice): string {
    return DESIGNER_SERVICE_CATEGORY_LABELS[getServiceCategoryValue(service)] || 'услуга'
  }

  function getPackageTitle(key: string): string {
    const pkg = options.packages.value.find((item) => item.key === key)
    if (pkg) return pkg.title
    const template = DESIGNER_PACKAGE_TEMPLATES.find((item) => item.key === key)
    return template?.title || key
  }

  function getPackageDisplayTitle(pkg: DesignerPackage | null | undefined, index = 0): string {
    if (!pkg) return `Пакет ${index + 1}`
    const title = String(pkg.title || '').trim()
    if (title) return title
    const template = DESIGNER_PACKAGE_TEMPLATES.find((item) => item.key === pkg.key)
    if (template?.title) return template.title
    return `Пакет ${index + 1}`
  }

  function getPackageDisplayDescription(pkg: DesignerPackage | null | undefined): string {
    if (!pkg) return 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
    const description = String(pkg.description || '').trim()
    if (description) return description
    const template = DESIGNER_PACKAGE_TEMPLATES.find((item) => item.key === pkg.key)
    return template?.description || 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
  }

  function getSubscriptionDisplayTitle(sub: DesignerSubscription | null | undefined, index = 0): string {
    if (!sub) return `Подписка ${index + 1}`
    const title = String(sub.title || '').trim()
    if (title) return title
    const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find((item) => item.key === sub.key)
    if (template?.title) return template.title
    return `Подписка ${index + 1}`
  }

  function getSubscriptionDisplayDescription(sub: DesignerSubscription | null | undefined): string {
    if (!sub) return 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
    const description = String(sub.description || '').trim()
    if (description) return description
    const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find((item) => item.key === sub.key)
    return template?.description || 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
  }

  function getPriceUnitLabel(unit?: string | null): string {
    if (!unit) return 'без единицы'
    if (unit in PRICE_UNIT_LABELS) return PRICE_UNIT_LABELS[unit as PriceUnit]
    return String(unit).trim()
  }

  function getServiceCountLabel(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} услуга`
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} услуги`
    return `${count} услуг`
  }

  function getCategoryActiveLabel(list: DesignerServicePrice[]): string {
    const activeCount = list.filter((item) => item.enabled).length
    return `${activeCount} активны`
  }

  function getCategoryStartingPrice(list: DesignerServicePrice[]): string {
    const enabledServices = list.filter((item) => item.enabled)
    if (!enabledServices.length) return ''
    const cheapest = enabledServices.reduce((best, current) => current.price < best.price ? current : best)
    return formatServicePrice(cheapest.price, cheapest.unit)
  }

  function getServiceMarketLabel(service: DesignerServicePrice): string {
    const template = getServiceTemplate(service.serviceKey)
    if (!template) return 'Индивидуальная услуга'
    return `Рынок ${formatRubles(template.priceRangeMin)}–${formatRubles(template.priceRangeMax)} ${getPriceUnitLabel(template.defaultUnit)}`
  }

  function getServiceOriginLabel(service: DesignerServicePrice): string {
    return getServiceTemplate(service.serviceKey) ? 'Типовая позиция' : 'Собственная настройка'
  }

  function getPackageExamplePrice(pkg: DesignerPackage, area: number): string {
    return `${formatRubles((pkg.pricePerSqm || 0) * area)} ₽`
  }

  function getPackageVisibleServiceKeys(pkg: DesignerPackage): string[] {
    return (pkg.serviceKeys || []).slice(0, 5)
  }

  function getPackageHiddenServiceCount(pkg: DesignerPackage): number {
    return Math.max(0, (pkg.serviceKeys || []).length - getPackageVisibleServiceKeys(pkg).length)
  }

  function getPackageCoverageLabel(pkg: DesignerPackage): string {
    const count = pkg.serviceKeys?.length || 0
    if (count >= 6) return 'Полный пакет для проекта под ключ'
    if (count >= 4) return 'Сбалансированный пакет для основных этапов'
    if (count >= 2) return 'Компактный пакет для конкретной задачи'
    return 'Точечная услуга для отдельного этапа'
  }

  function getPackageCategoryLabel(pkg: DesignerPackage): string {
    const labels = Array.from(new Set((pkg.serviceKeys || []).map((key) => {
      const service = options.services.value.find((item) => item.serviceKey === key)
      if (service) return DESIGNER_SERVICE_CATEGORY_LABELS[service.category]
      const template = getServiceTemplate(key)
      return template ? DESIGNER_SERVICE_CATEGORY_LABELS[template.category] : ''
    }).filter(Boolean)))

    if (!labels.length) return 'Категории пока не определены'
    if (labels.length <= 2) return labels.join(' + ')
    return `${labels.slice(0, 2).join(' + ')} и ещё ${labels.length - 2}`
  }

  function getPackageBudgetLabel(pkg: DesignerPackage): string {
    const price = Number(pkg.pricePerSqm) || 0
    if (price >= 4000) return 'Премиальный сегмент и плотное сопровождение'
    if (price >= 2500) return 'Средний+ сегмент для подробной проработки'
    if (price >= 1200) return 'Рациональный пакет для жилых интерьеров'
    return 'Лёгкий входной пакет для первых этапов'
  }

  function getLeadTimeStats(keys: string[]) {
    const days = keys
      .map((key) => getServiceBySelectionKey(key)?.leadTimeDays || 0)
      .filter((value) => value > 0)

    if (!days.length) return null

    return {
      min: Math.min(...days),
      max: Math.max(...days),
    }
  }

  function getDraftServiceBundleSummary(keys: string[]) {
    const stats = getLeadTimeStats(keys)
    if (!stats) return 'Выбирайте уже настроенные услуги: пакет и подписка подтянут их текущую цену и срок.'
    if (stats.min === stats.max) return `Срок набора услуг: ${formatLeadTimeDays(stats.max)}.`
    return `Срок набора услуг: от ${formatLeadTimeDays(stats.min)} до ${formatLeadTimeDays(stats.max)}.`
  }

  function getPackageLeadTimeLabel(pkg: DesignerPackage): string {
    const stats = getLeadTimeStats(pkg.serviceKeys || [])
    if (!stats) return 'Срок пакета будет собран из сроков выбранных услуг.'
    if (stats.min === stats.max) return `Срок пакета: ${formatLeadTimeDays(stats.max)}`
    return `Срок пакета: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
  }

  function getSubscriptionLeadTimeLabel(sub: DesignerSubscription): string {
    const stats = getLeadTimeStats(sub.serviceKeys || [])
    if (!stats) return 'Срок закрытия задач зависит от выбранных услуг.'
    if (stats.min === stats.max) return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.max)}`
    return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
  }

  function getPackageGroupLabel(pkg: DesignerPackage): string {
    const count = (pkg.serviceKeys || []).length
    if (pkg.enabled === false) return 'Черновики пакетов'
    if (count >= 6) return 'Полные пакеты'
    if (count >= 4) return 'Сбалансированные пакеты'
    if (count >= 2) return 'Компактные пакеты'
    return 'Точечные пакеты'
  }

  function getPackageListDescription(pkg: DesignerPackage): string {
    const parts = [getPackageCoverageLabel(pkg), getPackageCategoryLabel(pkg)]
    const visibleServices = getPackageVisibleServiceKeys(pkg).map((key) => getServiceTitle(key)).filter(Boolean)
    if (visibleServices.length) parts.push(`Состав: ${visibleServices.join(', ')}`)
    return parts.filter(Boolean).join('. ')
  }

  function getSubscriptionGroupLabel(sub: DesignerSubscription): string {
    if (sub.enabled === false) return 'Черновики подписок'
    return `Подписки ${getBillingLabel(sub.billingPeriod).toLowerCase()}`
  }

  function getSubscriptionListDescription(sub: DesignerSubscription): string {
    const parts: string[] = []
    if (getSubscriptionDisplayDescription(sub)) parts.push(getSubscriptionDisplayDescription(sub))
    if (sub.serviceKeys?.length) {
      parts.push(`Сервисы: ${sub.serviceKeys.slice(0, 4).map((key) => getServiceTitle(key)).join(', ')}`)
    }
    const limitKeys = Object.keys(sub.limits || {})
    if (limitKeys.length) {
      parts.push(limitKeys.slice(0, 3).map((key) => `${formatLimitKey(key)}: ${sub.limits?.[key]}`).join(' · '))
    }
    return parts.join('. ')
  }

  function getDraftServiceItems(keys: string[]): DraftServiceItem[] {
    return keys.map((key) => {
      const service = getServiceBySelectionKey(key)
      return {
        key,
        title: getServiceTitle(key),
        price: service ? formatServicePrice(service.price, service.unit) : 'не задано',
        term: service ? getServiceLeadTimeLabel(service) : 'срок не задан',
        category: service ? (DESIGNER_SERVICE_CATEGORY_LABELS[service.category] || service.category) : 'услуга',
      }
    })
  }

  const allServiceOptions = computed<ServiceOption[]>(() => {
    return options.services.value
      .map((service, index) => ({
        key: getServicePersistedKey(service, index),
        title: getServiceDisplayTitle(service, index),
        category: getServiceCategoryLabel(service),
        price: formatServicePrice(service.price, service.unit),
        leadTime: getServiceLeadTimeLabel(service),
      }))
      .sort((left, right) => {
        const categoryDiff = left.category.localeCompare(right.category, 'ru')
        if (categoryDiff !== 0) return categoryDiff
        return left.title.localeCompare(right.title, 'ru')
      })
  })

  return {
    allServiceOptions,
    getBillingLabel,
    getMonthlyPrice,
    formatLimitKey,
    getServiceTitle,
    getServiceDisplayTitle,
    getServiceDisplayDescription,
    getServiceTemplateLabel,
    getServiceTemplateHint,
    getServiceUsageInfo,
    formatServiceUsageHint,
    getPackageUsageInfo,
    formatPackageUsageHint,
    getServiceLeadTimeLabel,
    getServiceCategoryValue,
    getServiceCategoryLabel,
    getPackageTitle,
    getPackageDisplayTitle,
    getPackageDisplayDescription,
    getSubscriptionDisplayTitle,
    getSubscriptionDisplayDescription,
    formatRubles,
    formatServicePrice,
    getPriceUnitLabel,
    getServiceCountLabel,
    getCategoryActiveLabel,
    getCategoryStartingPrice,
    getServiceMarketLabel,
    getServiceOriginLabel,
    getPackageExamplePrice,
    getPackageVisibleServiceKeys,
    getPackageHiddenServiceCount,
    getPackageCoverageLabel,
    getPackageCategoryLabel,
    getPackageBudgetLabel,
    getDraftServiceBundleSummary,
    getDraftServiceItems,
    getPackageLeadTimeLabel,
    getSubscriptionLeadTimeLabel,
    getPackageGroupLabel,
    getPackageListDescription,
    getSubscriptionGroupLabel,
    getSubscriptionListDescription,
  }
}