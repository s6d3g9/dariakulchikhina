import {
  BILLING_PERIODS,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SERVICE_CATEGORIES,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  PRICE_UNITS,
  type DesignerPackage,
  type DesignerServicePrice,
  type DesignerSubscription,
} from '../types/designer'

const serviceCategorySet = new Set<string>(DESIGNER_SERVICE_CATEGORIES)
const priceUnitSet = new Set<string>(PRICE_UNITS)
const billingPeriodSet = new Set<string>(BILLING_PERIODS)
const serviceTemplateMap = new Map(DESIGNER_SERVICE_TEMPLATES.map((item) => [item.key, item]))
const packageTemplateMap = new Map(DESIGNER_PACKAGE_TEMPLATES.map((item) => [item.key, item]))
const subscriptionTemplateMap = new Map(DESIGNER_SUBSCRIPTION_TEMPLATES.map((item) => [item.key, item]))

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNonNegativeNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

function asBoolean(value: unknown, fallback = true) {
  return typeof value === 'boolean' ? value : fallback
}

function coerceArray(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toKeySlug(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function buildFallbackKey(prefix: string, index: number, seed?: unknown) {
  const safeIndex = Math.max(index, 0) + 1
  const slug = toKeySlug(seed)
  return `${prefix}_${slug || 'item'}_${safeIndex}`
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(asTrimmedString).filter(Boolean)))
}

function normalizeLimits(value: unknown) {
  if (!isRecord(value)) return {}
  const entries = Object.entries(value)
    .map(([key, raw]) => [asTrimmedString(key), asNonNegativeNumber(raw)] as const)
    .filter(([key]) => Boolean(key))
  return Object.fromEntries(entries)
}

export function getDesignerServicePersistedKey(service: Pick<DesignerServicePrice, 'serviceKey' | 'title' | 'description'>, index: number) {
  return asTrimmedString(service.serviceKey) || buildFallbackKey('service', index, service.title || service.description)
}

export function getDesignerPackagePersistedKey(pkg: Pick<DesignerPackage, 'key' | 'title' | 'description'>, index: number) {
  return asTrimmedString(pkg.key) || buildFallbackKey('package', index, pkg.title || pkg.description)
}

export function getDesignerSubscriptionPersistedKey(subscription: Pick<DesignerSubscription, 'key' | 'title' | 'description'>, index: number) {
  return asTrimmedString(subscription.key) || buildFallbackKey('subscription', index, subscription.title || subscription.description)
}

export function normalizeDesignerServices(value: unknown): DesignerServicePrice[] {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.serviceKey)
    const template = serviceTemplateMap.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Услуга ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const category = asTrimmedString(source.category)
    const unit = asTrimmedString(source.unit)
    return {
      serviceKey: getDesignerServicePersistedKey({
        serviceKey: rawKey,
        title,
        description,
      }, index),
      title,
      description,
      category: serviceCategorySet.has(category) ? category as DesignerServicePrice['category'] : (template?.category || 'additional'),
      unit: priceUnitSet.has(unit) ? unit as DesignerServicePrice['unit'] : (template?.defaultUnit || 'fixed'),
      price: asNonNegativeNumber(source.price),
      enabled: asBoolean(source.enabled, true),
    }
  })
}

export function normalizeDesignerPackages(value: unknown): DesignerPackage[] {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.key)
    const template = packageTemplateMap.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Пакет ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const serviceKeys = normalizeStringList(source.serviceKeys)
    return {
      key: getDesignerPackagePersistedKey({
        key: rawKey,
        title,
        description,
      }, index),
      title,
      description,
      serviceKeys: serviceKeys.length ? serviceKeys : normalizeStringList(template?.serviceKeys),
      pricePerSqm: asNonNegativeNumber(source.pricePerSqm) || template?.suggestedPricePerSqm || 0,
      enabled: asBoolean(source.enabled, true),
    }
  })
}

export function normalizeDesignerSubscriptions(value: unknown): DesignerSubscription[] {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.key)
    const template = subscriptionTemplateMap.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Подписка ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const billingPeriod = asTrimmedString(source.billingPeriod)
    const serviceKeys = normalizeStringList(source.serviceKeys)
    return {
      key: getDesignerSubscriptionPersistedKey({
        key: rawKey,
        title,
        description,
      }, index),
      title,
      description,
      billingPeriod: billingPeriodSet.has(billingPeriod) ? billingPeriod as DesignerSubscription['billingPeriod'] : (template?.billingPeriod || 'monthly'),
      price: asNonNegativeNumber(source.price) || template?.price || 0,
      discount: Math.min(100, asNonNegativeNumber(source.discount) || template?.discount || 0),
      serviceKeys: serviceKeys.length ? serviceKeys : normalizeStringList(template?.serviceKeys),
      limits: Object.keys(normalizeLimits(source.limits)).length ? normalizeLimits(source.limits) : (template?.limits || {}),
      enabled: asBoolean(source.enabled, true),
    }
  })
}