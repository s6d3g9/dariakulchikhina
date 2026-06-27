import { computed, nextTick, onBeforeUnmount, ref, type Ref } from 'vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  type DesignerServiceCategory,
  type DesignerPackage,
  type DesignerServicePrice,
  type DesignerSubscription,
  type PriceUnit,
} from '~~/shared/types/designer'
import {
  getDesignerServicePersistedKey,
  normalizeDesignerServices,
} from '~~/shared/utils/designer/designer-catalogs'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type ServiceUsageInfo = {
  packageTitles: string[]
  subscriptionTitles: string[]
  total: number
}

type SavePricingCatalogPayload = {
  services: DesignerServicePrice[]
  packages: DesignerPackage[]
  subscriptions: DesignerSubscription[]
}

type ServiceEditorUtilities = {
  cloneDraft: <T>(value: T) => T
  makeEditorId: () => string
  getRequestErrorMessage: (error: any, fallback: string) => string
  showTransientMessage: (target: Ref<string>, message: string) => void
  setAutosaveSettled: (state: Ref<InlineAutosaveState>, expected: InlineAutosaveState) => void
}

type UseDesignerCabinetServicesOptions = {
  services: Ref<DesignerServicePrice[]>
  packages: Ref<DesignerPackage[]>
  subscriptions: Ref<DesignerSubscription[]>
  saveServices: (services: DesignerServicePrice[]) => Promise<unknown>
  savePricingCatalog: (payload: SavePricingCatalogPayload) => Promise<unknown>
  getServiceUsageInfo: (serviceKey: string | null | undefined) => ServiceUsageInfo
  formatServicePrice: (price: number, unit: PriceUnit) => string
  closePeerEditors: () => void
  utils: ServiceEditorUtilities
}

function formatUsageNames(list: string[]): string {
  if (list.length <= 2) return list.join(', ')
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
}

function formatServiceTemplateRange(
  template: { priceRangeMin?: number | null; priceRangeMax?: number | null; defaultUnit: PriceUnit },
  formatServicePrice: UseDesignerCabinetServicesOptions['formatServicePrice'],
): string {
  const min = Math.max(0, Number(template.priceRangeMin) || 0)
  const max = Math.max(0, Number(template.priceRangeMax) || 0)
  if (!min && !max) return 'диапазон не задан'
  if (!min || min === max) return formatServicePrice(max || min, template.defaultUnit)
  return `${formatServicePrice(min, template.defaultUnit)} - ${formatServicePrice(max, template.defaultUnit)}`
}

export function useDesignerCabinetServices(options: UseDesignerCabinetServicesOptions) {
  const svcEditError = ref('')
  const svcEditSuccess = ref('')

  const inlinePriceKey = ref<string | null>(null)
  const inlinePriceVal = ref(0)

  const serviceCatalogOpen = ref(false)
  const serviceCatalogSearch = ref('')
  const serviceCatalogCategory = ref<'all' | DesignerServiceCategory>('all')
  const serviceCatalogMode = ref<'create' | 'replace'>('create')
  const serviceCatalogTargetKey = ref<string | null>(null)

  const serviceCardEditorKey = ref<string | null>(null)
  const serviceCardDraft = ref<DesignerServicePrice | null>(null)
  const serviceCardSaving = ref(false)
  const serviceCardError = ref('')
  const serviceCardSaveState = ref<InlineAutosaveState>('')
  const serviceCardSnapshot = ref('')
  let serviceCardTimer: ReturnType<typeof setTimeout> | null = null

  const EMPTY_SERVICE_USAGE: ServiceUsageInfo = {
    packageTitles: [],
    subscriptionTitles: [],
    total: 0,
  }

  function getServicePersistedKey(
    service: DesignerServicePrice,
    index = options.services.value.findIndex((item) => item === service),
  ) {
    return getDesignerServicePersistedKey(service, Math.max(index, 0))
  }

  function getServiceActionKey(
    service: DesignerServicePrice,
    index = options.services.value.findIndex((item) => item === service),
  ) {
    return getServicePersistedKey(service, index)
  }

  function findServiceByActionKey(actionKey: string) {
    return options.services.value.find((item, index) => getServicePersistedKey(item, index) === actionKey) || null
  }

  function getValidServiceSelectionKeys() {
    return new Set(options.services.value.map((service, index) => getServicePersistedKey(service, index)))
  }

  function clearServiceCardTimer() {
    if (!serviceCardTimer) return
    clearTimeout(serviceCardTimer)
    serviceCardTimer = null
  }

  function normalizeServicesForSave(
    list: DesignerServicePrice[],
  ): { ok: true; list: DesignerServicePrice[] } | { ok: false; error: string } {
    const cleaned = normalizeDesignerServices(list)
      .filter((item) => item.title || item.description || item.price > 0)

    if (!cleaned.length) {
      return { ok: false, error: 'Добавьте хотя бы одну услугу с названием' }
    }

    const seen = new Set<string>()
    for (const item of cleaned) {
      if (!item.title) return { ok: false, error: 'У всех услуг должно быть заполнено название' }
      if (seen.has(item.serviceKey)) return { ok: false, error: 'Найдены дубли услуг, удалите повторения' }
      seen.add(item.serviceKey)
    }

    return { ok: true, list: cleaned }
  }

  function buildCustomServiceDraft(): DesignerServicePrice {
    const id = options.utils.makeEditorId()
    return {
      serviceKey: `custom_${id}`,
      title: 'Новая услуга',
      description: '',
      category: 'additional',
      unit: 'fixed',
      price: 0,
      leadTimeDays: 0,
      enabled: true,
    }
  }

  function buildCatalogServiceDraft(templateKey: string): DesignerServicePrice | null {
    const template = DESIGNER_SERVICE_TEMPLATES.find((item) => item.key === templateKey)
    if (!template) return null
    return {
      serviceKey: template.key,
      title: template.title,
      description: template.description,
      category: template.category,
      unit: template.defaultUnit,
      price: template.defaultPrice,
      leadTimeDays: 0,
      enabled: true,
    }
  }

  const filteredServiceCatalogEntries = computed(() => {
    const usedKeys = new Set(options.services.value.map((service, index) => getServicePersistedKey(service, index)))
    if (serviceCatalogMode.value === 'replace' && serviceCatalogTargetKey.value) {
      usedKeys.delete(serviceCatalogTargetKey.value)
    }

    const search = serviceCatalogSearch.value.trim().toLowerCase()

    return DESIGNER_SERVICE_TEMPLATES
      .filter((template) => !usedKeys.has(template.key))
      .map((template) => ({
        key: template.key,
        categoryKey: template.category,
        title: template.title,
        description: template.description,
        category: DESIGNER_SERVICE_CATEGORY_LABELS[template.category],
        price: options.formatServicePrice(template.defaultPrice, template.defaultUnit),
        priceRange: formatServiceTemplateRange(template, options.formatServicePrice),
      }))
      .filter((entry) => {
        if (serviceCatalogCategory.value !== 'all' && entry.categoryKey !== serviceCatalogCategory.value) return false
        if (!search) return true
        const haystack = `${entry.title} ${entry.description} ${entry.category}`.toLowerCase()
        return haystack.includes(search)
      })
      .sort((left, right) => {
        const categoryDiff = left.category.localeCompare(right.category, 'ru')
        if (categoryDiff !== 0) return categoryDiff
        return left.title.localeCompare(right.title, 'ru')
      })
  })

  const serviceCatalogTargetUsage = computed(() => {
    if (serviceCatalogMode.value !== 'replace' || !serviceCatalogTargetKey.value) return EMPTY_SERVICE_USAGE
    return options.getServiceUsageInfo(serviceCatalogTargetKey.value)
  })

  const serviceEditorUsage = computed(() => {
    if (!serviceCardEditorKey.value) return EMPTY_SERVICE_USAGE
    return options.getServiceUsageInfo(serviceCardEditorKey.value)
  })

  function startInlinePrice(service: DesignerServicePrice) {
    const actionKey = getServiceActionKey(service)
    if (inlinePriceKey.value === actionKey) return
    inlinePriceKey.value = actionKey
    inlinePriceVal.value = service.price
    nextTick(() => {
      const input = document.querySelector('.svc-price-inline-input') as HTMLInputElement | null
      input?.focus()
      input?.select()
    })
  }

  function cancelInlinePrice() {
    inlinePriceKey.value = null
  }

  async function commitInlinePrice(service: DesignerServicePrice) {
    if (inlinePriceKey.value !== getServiceActionKey(service)) return
    const newPrice = Math.max(0, Number(inlinePriceVal.value) || 0)
    inlinePriceKey.value = null
    if (newPrice === service.price) return
    const updated = options.services.value.map((item) => (
      item.serviceKey === service.serviceKey ? { ...item, price: newPrice } : { ...item }
    ))
    await options.saveServices(updated)
  }

  function closeServiceCatalog() {
    serviceCatalogOpen.value = false
    serviceCatalogSearch.value = ''
    serviceCatalogCategory.value = 'all'
    serviceCatalogTargetKey.value = null
    if (serviceCardError.value === 'Выберите другую услугу: этот шаблон уже занят в прайсе') {
      serviceCardError.value = ''
    }
    serviceCatalogMode.value = 'create'
  }

  function closeServiceCardEditor() {
    clearServiceCardTimer()
    serviceCardEditorKey.value = null
    serviceCardDraft.value = null
    serviceCardError.value = ''
    serviceCardSaveState.value = ''
    serviceCardSnapshot.value = ''
    if (serviceCatalogMode.value === 'replace') closeServiceCatalog()
  }

  function openServiceCardEditor(service: DesignerServicePrice) {
    clearServiceCardTimer()
    options.closePeerEditors()
    serviceCardEditorKey.value = getServiceActionKey(service)
    serviceCardDraft.value = {
      ...options.utils.cloneDraft(service),
      serviceKey: getServicePersistedKey(service),
    }
    serviceCardError.value = ''
    serviceCardSaveState.value = ''
    serviceCardSnapshot.value = JSON.stringify(serviceCardDraft.value)
  }

  function toggleServiceCardEditor(service: DesignerServicePrice) {
    if (serviceCardEditorKey.value === getServiceActionKey(service)) {
      closeServiceCardEditor()
      return
    }
    openServiceCardEditor(service)
  }

  function openServiceCatalog(mode: 'create' | 'replace', service?: DesignerServicePrice) {
    if (mode === 'replace' && !service && !serviceCardDraft.value) return
    serviceCatalogMode.value = mode
    serviceCatalogSearch.value = ''
    serviceCatalogCategory.value = 'all'
    serviceCatalogTargetKey.value = mode === 'replace'
      ? (service ? getServiceActionKey(service) : serviceCardEditorKey.value)
      : null
    serviceCatalogOpen.value = true
  }

  function applyCatalogTemplateToDraft(templateKey: string) {
    if (!serviceCardDraft.value) return
    const template = DESIGNER_SERVICE_TEMPLATES.find((item) => item.key === templateKey)
    if (!template) return

    const occupied = options.services.value.find((item, index) => {
      const persistedKey = getServicePersistedKey(item, index)
      return persistedKey === templateKey && persistedKey !== serviceCatalogTargetKey.value
    })
    if (occupied) {
      serviceCardError.value = 'Выберите другую услугу: этот шаблон уже занят в прайсе'
      serviceCardSaveState.value = 'error'
      return
    }

    serviceCardDraft.value = {
      ...serviceCardDraft.value,
      serviceKey: template.key,
      title: template.title,
      description: template.description,
      category: template.category,
      unit: template.defaultUnit,
      price: template.defaultPrice,
    }
    serviceCardError.value = ''
    queueServiceCardSave()
    closeServiceCatalog()
  }

  function confirmServiceTemplateReplacement() {
    const usage = serviceCatalogTargetUsage.value
    if (!usage.total) return true

    const scopes = []
    if (usage.packageTitles.length) scopes.push(`Пакеты: ${formatUsageNames(usage.packageTitles)}`)
    if (usage.subscriptionTitles.length) scopes.push(`Подписки: ${formatUsageNames(usage.subscriptionTitles)}`)

    return confirm([
      'Эта услуга уже используется в пакетах или подписках.',
      ...scopes,
      '',
      'Заменить типовую услугу и автоматически обновить все связанные ссылки?',
    ].join('\n'))
  }

  function selectServiceCatalogEntry(templateKey: string) {
    if (serviceCatalogMode.value === 'replace') {
      if (!confirmServiceTemplateReplacement()) return
      applyCatalogTemplateToDraft(templateKey)
      return
    }
    void addServiceFromCatalog(templateKey)
    closeServiceCatalog()
  }

  async function saveServiceCardEditor() {
    if (!serviceCardDraft.value) return
    clearServiceCardTimer()
    serviceCardError.value = ''
    const activeKey = serviceCardEditorKey.value
    const activeIndex = options.services.value.findIndex((item) => getServiceActionKey(item) === activeKey)
    const draft = options.utils.cloneDraft(serviceCardDraft.value)
    const updatedList = options.services.value.map((item) => (
      getServiceActionKey(item) === activeKey
        ? draft
        : options.utils.cloneDraft(item)
    ))
    const normalized = normalizeServicesForSave(updatedList)
    if (!normalized.ok) {
      serviceCardError.value = normalized.error
      serviceCardSaveState.value = 'error'
      return
    }
    serviceCardSaving.value = true
    serviceCardSaveState.value = 'saving'
    try {
      const nextEditorItem = activeIndex >= 0 ? normalized.list[activeIndex] : draft
      const nextSelectionKey = activeIndex >= 0
        ? getServicePersistedKey(nextEditorItem, activeIndex)
        : draft.serviceKey

      if (activeKey && nextSelectionKey && activeKey !== nextSelectionKey) {
        const nextPackages = options.packages.value.map((pkg) => ({
          ...options.utils.cloneDraft(pkg),
          serviceKeys: (pkg.serviceKeys || []).map((key) => key === activeKey ? nextSelectionKey : key),
        }))
        const nextSubscriptions = options.subscriptions.value.map((subscription) => ({
          ...options.utils.cloneDraft(subscription),
          serviceKeys: (subscription.serviceKeys || []).map((key) => key === activeKey ? nextSelectionKey : key),
        }))
        await options.savePricingCatalog({
          services: normalized.list,
          packages: nextPackages,
          subscriptions: nextSubscriptions,
        })
      } else {
        await options.saveServices(normalized.list)
      }

      serviceCardEditorKey.value = nextSelectionKey
      serviceCatalogTargetKey.value = nextSelectionKey
      serviceCardSnapshot.value = JSON.stringify(nextEditorItem)
      serviceCardSaveState.value = 'saved'
      options.utils.setAutosaveSettled(serviceCardSaveState, 'saved')
    } catch (error: any) {
      serviceCardError.value = options.utils.getRequestErrorMessage(error, 'Не удалось сохранить услугу')
      serviceCardSaveState.value = 'error'
    } finally {
      serviceCardSaving.value = false
    }
  }

  function queueServiceCardSave() {
    if (!serviceCardDraft.value || !serviceCardEditorKey.value) return
    const nextSnapshot = JSON.stringify(serviceCardDraft.value)
    if (nextSnapshot === serviceCardSnapshot.value) return
    clearServiceCardTimer()
    serviceCardTimer = setTimeout(() => {
      saveServiceCardEditor()
    }, 120)
  }

  async function createServiceCard() {
    svcEditError.value = ''
    const draft = buildCustomServiceDraft()
    serviceCardSaving.value = true
    try {
      await options.saveServices([...options.services.value.map((item) => options.utils.cloneDraft(item)), draft])
      options.utils.showTransientMessage(svcEditSuccess, 'Услуга добавлена')
      await nextTick()
      openServiceCardEditor(findServiceByActionKey(draft.serviceKey) || draft)
    } catch (error: any) {
      svcEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось добавить услугу')
    } finally {
      serviceCardSaving.value = false
    }
  }

  async function addServiceFromCatalog(templateKey: string) {
    svcEditError.value = ''
    const existing = findServiceByActionKey(templateKey)
    if (existing) {
      openServiceCardEditor(existing)
      return
    }

    const draft = buildCatalogServiceDraft(templateKey)
    if (!draft) return

    serviceCardSaving.value = true
    try {
      await options.saveServices([...options.services.value.map((item) => options.utils.cloneDraft(item)), draft])
      options.utils.showTransientMessage(svcEditSuccess, 'Услуга добавлена из каталога')
      await nextTick()
      openServiceCardEditor(findServiceByActionKey(templateKey) || draft)
    } catch (error: any) {
      svcEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось добавить услугу из каталога')
    } finally {
      serviceCardSaving.value = false
    }
  }

  async function duplicateServiceCard(service: DesignerServicePrice) {
    svcEditError.value = ''
    const source = serviceCardDraft.value && serviceCardEditorKey.value === getServiceActionKey(service)
      ? options.utils.cloneDraft(serviceCardDraft.value)
      : options.utils.cloneDraft(service)
    const list = options.services.value.map((item) => options.utils.cloneDraft(item))
    const index = options.services.value.findIndex((item) => getServiceActionKey(item) === getServiceActionKey(service))
    if (index < 0) return
    source.serviceKey = `${service.serviceKey || 'service'}_copy_${options.utils.makeEditorId()}`
    source.title = source.title ? `${source.title} (копия)` : 'Новая услуга'
    serviceCardSaving.value = true
    try {
      list.splice(index + 1, 0, source)
      await options.saveServices(list)
      options.utils.showTransientMessage(svcEditSuccess, 'Услуга продублирована')
      await nextTick()
      openServiceCardEditor(findServiceByActionKey(source.serviceKey) || source)
    } catch (error: any) {
      svcEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось продублировать услугу')
    } finally {
      serviceCardSaving.value = false
    }
  }

  async function moveServiceCard(service: DesignerServicePrice, direction: -1 | 1) {
    svcEditError.value = ''
    const index = options.services.value.findIndex((item) => getServiceActionKey(item) === getServiceActionKey(service))
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= options.services.value.length) return
    const list = options.services.value.map((item) => options.utils.cloneDraft(item))
    const [moved] = list.splice(index, 1)
    list.splice(targetIndex, 0, moved)
    serviceCardSaving.value = true
    try {
      await options.saveServices(list)
      options.utils.showTransientMessage(svcEditSuccess, 'Порядок услуг обновлён')
      await nextTick()
      openServiceCardEditor(findServiceByActionKey(getServiceActionKey(service)) || moved)
    } catch (error: any) {
      svcEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось изменить порядок услуг')
    } finally {
      serviceCardSaving.value = false
    }
  }

  async function removeServiceCard(service: DesignerServicePrice) {
    svcEditError.value = ''
    serviceCardSaving.value = true
    try {
      const removedKey = getServiceActionKey(service)
      const nextServices = options.services.value
        .filter((item) => getServiceActionKey(item) !== removedKey)
        .map((item) => options.utils.cloneDraft(item))
      const nextPackages = options.packages.value.map((pkg) => ({
        ...options.utils.cloneDraft(pkg),
        serviceKeys: (pkg.serviceKeys || []).filter((key) => key !== removedKey),
      }))
      const nextSubscriptions = options.subscriptions.value.map((subscription) => ({
        ...options.utils.cloneDraft(subscription),
        serviceKeys: (subscription.serviceKeys || []).filter((key) => key !== removedKey),
      }))
      const cleanedReferences =
        nextPackages.some((pkg, index) => (pkg.serviceKeys || []).length !== (options.packages.value[index]?.serviceKeys || []).length)
        || nextSubscriptions.some((subscription, index) => (subscription.serviceKeys || []).length !== (options.subscriptions.value[index]?.serviceKeys || []).length)

      await options.savePricingCatalog({
        services: nextServices,
        packages: nextPackages,
        subscriptions: nextSubscriptions,
      })
      closeServiceCardEditor()
      options.utils.showTransientMessage(
        svcEditSuccess,
        cleanedReferences ? 'Услуга удалена и убрана из пакетов и подписок' : 'Услуга удалена',
      )
    } catch (error: any) {
      svcEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось удалить услугу')
    } finally {
      serviceCardSaving.value = false
    }
  }

  onBeforeUnmount(() => {
    clearServiceCardTimer()
  })

  return {
    svcEditError,
    svcEditSuccess,
    inlinePriceKey,
    inlinePriceVal,
    serviceCatalogOpen,
    serviceCatalogSearch,
    serviceCatalogCategory,
    serviceCatalogMode,
    serviceCatalogTargetKey,
    filteredServiceCatalogEntries,
    serviceCatalogTargetUsage,
    serviceEditorUsage,
    serviceCardEditorKey,
    serviceCardDraft,
    serviceCardSaving,
    serviceCardError,
    serviceCardSaveState,
    getServicePersistedKey,
    getServiceActionKey,
    findServiceByActionKey,
    getValidServiceSelectionKeys,
    startInlinePrice,
    cancelInlinePrice,
    commitInlinePrice,
    closeServiceCardEditor,
    openServiceCardEditor,
    toggleServiceCardEditor,
    openServiceCatalog,
    closeServiceCatalog,
    selectServiceCatalogEntry,
    saveServiceCardEditor,
    queueServiceCardSave,
    createServiceCard,
    duplicateServiceCard,
    moveServiceCard,
    removeServiceCard,
  }
}