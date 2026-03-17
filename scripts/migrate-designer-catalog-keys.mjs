/**
 * Migration: backfill stable keys for designer services/packages/subscriptions.
 *
 * Normalizes existing JSONB arrays in designers.services, designers.packages,
 * and designers.subscriptions so legacy entries without internal keys get
 * deterministic persisted keys.
 *
 * Run: node scripts/migrate-designer-catalog-keys.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)

const DESIGNER_SERVICE_CATEGORIES = new Set([
  'site_visit',
  'concept',
  'design_project',
  'supervision',
  'consultation',
  'additional',
])

const PRICE_UNITS = new Set([
  'sqm',
  'hour',
  'visit',
  'render',
  'fixed',
  'percent',
])

const BILLING_PERIODS = new Set(['monthly', 'quarterly', 'annual'])
const SERVICE_TEMPLATES = new Map([
  ['site_visit', { title: 'Выезд на объект', description: 'Первичный выезд, осмотр, фотофиксация помещений', category: 'measurement', unit: 'per_visit' }],
  ['measurement', { title: 'Обмерный план', description: 'Точные замеры всех помещений, план в масштабе', category: 'measurement', unit: 'per_sqm' }],
  ['photo_fixation', { title: 'Фотофиксация объекта', description: 'Фотосъёмка всех помещений, фасадов, инженерных узлов', category: 'measurement', unit: 'per_visit' }],
  ['moodboard', { title: 'Мудборд / коллаж стиля', description: 'Коллаж с подбором стиля, цветовой палитры, основных материалов', category: 'concept', unit: 'per_sqm' }],
  ['concept_collage', { title: 'Концепт-коллаж по помещениям', description: 'Детальные коллажи по каждому помещению с подбором мебели и отделки', category: 'concept', unit: 'per_sqm' }],
  ['space_planning', { title: 'Планировочное решение', description: '2–3 варианта планировки с расстановкой мебели и зонированием', category: 'concept', unit: 'per_sqm' }],
  ['color_scheme', { title: 'Цветовое решение', description: 'Подбор цветовой палитры, карта колеровки стен и потолков', category: 'concept', unit: 'per_sqm' }],
  ['3d_visualization', { title: '3D-визуализация', description: 'Фотореалистичные рендеры основных помещений (2–3 ракурса/комната)', category: 'design_project', unit: 'per_render' }],
  ['wall_elevations', { title: 'Развёртки стен', description: 'Развёртки всех стен с привязками к плитке, розеткам, декору', category: 'design_project', unit: 'per_sqm' }],
  ['material_selection', { title: 'Подбор материалов', description: 'Ведомость отделочных материалов с артикулами и ссылками', category: 'design_project', unit: 'per_sqm' }],
  ['furniture_selection', { title: 'Подбор мебели', description: 'Спецификация мебели с ценами, артикулами, размерами', category: 'design_project', unit: 'per_sqm' }],
  ['lighting_plan', { title: 'Светодизайн', description: 'План освещения, световые сценарии, подбор светильников', category: 'design_project', unit: 'per_sqm' }],
  ['working_drawings', { title: 'Рабочие чертежи', description: 'Полный комплект рабочей документации: план демонтажа/монтажа, электрика, сантехника, потолки, полы', category: 'full_project', unit: 'per_sqm' }],
  ['electrical_plan', { title: 'План электрики', description: 'Размещение розеток, выключателей, электровыводов, щит', category: 'full_project', unit: 'per_sqm' }],
  ['plumbing_plan', { title: 'План сантехники', description: 'Расположение точек водоснабжения и канализации', category: 'full_project', unit: 'per_sqm' }],
  ['ceiling_plan', { title: 'План потолков', description: 'Конструкция, уровни, встроенный свет, профили', category: 'full_project', unit: 'per_sqm' }],
  ['floor_plan', { title: 'План полов', description: 'Раскладка покрытий, тёплый пол, уровни стяжки', category: 'full_project', unit: 'per_sqm' }],
  ['specification', { title: 'Сводная спецификация', description: 'Полная ведомость всех материалов, мебели и оборудования с ценами', category: 'full_project', unit: 'per_sqm' }],
  ['author_supervision', { title: 'Авторский надзор', description: 'Регулярные выезды на объект, контроль подрядчиков, согласование замен', category: 'supervision', unit: 'per_visit' }],
  ['supervision_monthly', { title: 'Авторский надзор (абонемент)', description: 'Ежемесячный абонемент: 4–8 выездов, удалённые консультации', category: 'supervision', unit: 'fixed' }],
  ['commissioning', { title: 'Приёмка и дефектовка', description: 'Контроль качества выполненых работ, составление дефектной ведомости', category: 'supervision', unit: 'per_visit' }],
  ['online_consultation', { title: 'Онлайн-консультация', description: 'Видеозвонок: разбор планировки, стиль, бюджет, рекомендации', category: 'consultation', unit: 'per_hour' }],
  ['onsite_consultation', { title: 'Выездная консультация', description: 'Приезд на объект с рекомендациями по планировке и стилю', category: 'consultation', unit: 'per_visit' }],
  ['procurement_service', { title: 'Комплектация (закупки)', description: 'Полное сопровождение закупок: заказ, логистика, приёмка на объекте', category: 'additional', unit: 'percent' }],
  ['custom_furniture', { title: 'Проектирование встроенной мебели', description: 'Чертежи и 3D-модели нестандартной мебели на заказ', category: 'additional', unit: 'fixed' }],
  ['styling', { title: 'Декорирование / стайлинг', description: 'Финальная расстановка декора, текстиля, аксессуаров', category: 'additional', unit: 'per_sqm' }],
  ['photo_shoot', { title: 'Фотосессия интерьера', description: 'Профессиональная фотосъёмка готового интерьера для портфолио', category: 'additional', unit: 'fixed' }],
])
const PACKAGE_TEMPLATES = new Map([
  ['layout_only', { title: 'Планировочное решение', description: 'Обмер + 2–3 варианта планировки. Минимальный пакет для тех, кто делает ремонт самостоятельно.', serviceKeys: ['measurement', 'space_planning'], pricePerSqm: 550 }],
  ['concept', { title: 'Эскизный проект (коллажи)', description: 'Обмер + планировка + мудборд + коллажи по помещениям + цветовые решения.', serviceKeys: ['site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme'], pricePerSqm: 1800 }],
  ['design_project', { title: 'Дизайн-проект с 3D', description: 'Эскизный проект + 3D-визуализация + развёртки стен + подбор материалов и мебели.', serviceKeys: ['site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme', '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan'], pricePerSqm: 3500 }],
  ['full_project', { title: 'Полный дизайн-проект', description: 'Всё из «Дизайн-проект» + рабочие чертежи + полная спецификация.', serviceKeys: ['site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme', '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan', 'working_drawings', 'electrical_plan', 'plumbing_plan', 'ceiling_plan', 'floor_plan', 'specification'], pricePerSqm: 5500 }],
  ['premium', { title: 'Премиум (под ключ)', description: 'Полный проект + авторский надзор + комплектация + декорирование.', serviceKeys: ['site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme', '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan', 'working_drawings', 'electrical_plan', 'plumbing_plan', 'ceiling_plan', 'floor_plan', 'specification', 'author_supervision', 'procurement_service', 'styling', 'commissioning'], pricePerSqm: 8000 }],
])
const SUBSCRIPTION_TEMPLATES = new Map([
  ['support_monthly', { title: 'Сопровождение (месяц)', description: 'Ежемесячное сопровождение проекта: 2 выезда + удалённые консультации без лимита', billingPeriod: 'monthly', price: 40000, discount: 0, serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision'], limits: { visits: 2, online_hours: 8 } }],
  ['support_quarterly', { title: 'Сопровождение (квартал)', description: 'Квартальный абонемент: 6 выездов + удалённые консультации + приёмка этапов', billingPeriod: 'quarterly', price: 105000, discount: 12, serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision', 'commissioning'], limits: { visits: 6, online_hours: 24 } }],
  ['full_annual', { title: 'Полное сопровождение (год)', description: 'Годовой контракт: неограниченные выезды + полный надзор + комплектация + стайлинг', billingPeriod: 'annual', price: 360000, discount: 25, serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision', 'commissioning', 'procurement_service', 'styling'], limits: { visits: 48 } }],
])

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNonNegativeNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
}

function asBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback
}

function coerceArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toKeySlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function buildFallbackKey(prefix, index, seed) {
  const safeIndex = Math.max(index, 0) + 1
  const slug = toKeySlug(seed)
  return `${prefix}_${slug || 'item'}_${safeIndex}`
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(asTrimmedString).filter(Boolean)))
}

function normalizeLimits(value) {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, raw]) => [asTrimmedString(key), asNonNegativeNumber(raw)])
      .filter(([key]) => Boolean(key)),
  )
}

function normalizeDesignerServices(value) {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.serviceKey)
    const template = SERVICE_TEMPLATES.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Услуга ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const category = asTrimmedString(source.category)
    const unit = asTrimmedString(source.unit)
    return {
      serviceKey: rawKey || buildFallbackKey('service', index, title || description),
      title,
      description,
      category: DESIGNER_SERVICE_CATEGORIES.has(category) ? category : (template?.category || 'additional'),
      unit: PRICE_UNITS.has(unit) ? unit : (template?.unit || 'fixed'),
      price: asNonNegativeNumber(source.price),
      enabled: asBoolean(source.enabled, true),
    }
  })
}

function normalizeDesignerPackages(value) {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.key)
    const template = PACKAGE_TEMPLATES.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Пакет ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const serviceKeys = normalizeStringList(source.serviceKeys)
    return {
      key: rawKey || buildFallbackKey('package', index, title || description),
      title,
      description,
      serviceKeys: serviceKeys.length ? serviceKeys : (template?.serviceKeys || []),
      pricePerSqm: asNonNegativeNumber(source.pricePerSqm) || template?.pricePerSqm || 0,
      enabled: asBoolean(source.enabled, true),
    }
  })
}

function normalizeDesignerSubscriptions(value) {
  return coerceArray(value).map((item, index) => {
    const source = isRecord(item) ? item : {}
    const rawKey = asTrimmedString(source.key)
    const template = SUBSCRIPTION_TEMPLATES.get(rawKey)
    const title = asTrimmedString(source.title) || template?.title || `Подписка ${index + 1}`
    const description = asTrimmedString(source.description) || template?.description || ''
    const billingPeriod = asTrimmedString(source.billingPeriod)
    const serviceKeys = normalizeStringList(source.serviceKeys)
    const limits = normalizeLimits(source.limits)
    return {
      key: rawKey || buildFallbackKey('subscription', index, title || description),
      title,
      description,
      billingPeriod: BILLING_PERIODS.has(billingPeriod) ? billingPeriod : (template?.billingPeriod || 'monthly'),
      price: asNonNegativeNumber(source.price) || template?.price || 0,
      discount: Math.min(100, asNonNegativeNumber(source.discount) || template?.discount || 0),
      serviceKeys: serviceKeys.length ? serviceKeys : (template?.serviceKeys || []),
      limits: Object.keys(limits).length ? limits : (template?.limits || {}),
      enabled: asBoolean(source.enabled, true),
    }
  })
}

async function run() {
  console.log('▶ Backfilling designer catalog keys...')

  const rows = await sql`
    SELECT id, services, packages, subscriptions
    FROM designers
    ORDER BY id ASC
  `

  let updatedCount = 0

  for (const row of rows) {
    const nextServices = normalizeDesignerServices(row.services)
    const nextPackages = normalizeDesignerPackages(row.packages)
    const nextSubscriptions = normalizeDesignerSubscriptions(row.subscriptions)

    const servicesChanged = JSON.stringify(nextServices) !== JSON.stringify(row.services || [])
    const packagesChanged = JSON.stringify(nextPackages) !== JSON.stringify(row.packages || [])
    const subscriptionsChanged = JSON.stringify(nextSubscriptions) !== JSON.stringify(row.subscriptions || [])

    if (!servicesChanged && !packagesChanged && !subscriptionsChanged) continue

    await sql`
      UPDATE designers
      SET
        services = ${JSON.stringify(nextServices)}::jsonb,
        packages = ${JSON.stringify(nextPackages)}::jsonb,
        subscriptions = ${JSON.stringify(nextSubscriptions)}::jsonb,
        updated_at = now()
      WHERE id = ${row.id}
    `

    updatedCount += 1
    console.log(`  ✓ designer #${row.id} normalized`)
  }

  console.log(`✅ Migration complete. Updated designers: ${updatedCount}/${rows.length}`)
  await sql.end()
}

run().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})