<template>
  <div class="cab-section" data-section="subscriptions">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }">
      <h2>Подписки и абонементы</h2>
      <div class="cab-section-actions">
        <GlassButton variant="primary" v-if="!subscriptions.length" @click="initSubs">
          Загрузить шаблоны подписок
        </GlassButton>
        <GlassButton variant="secondary" density="compact" :disabled="subscriptionCardSaving" @click="createSubscriptionCard">＋ Подписка</GlassButton>
        <span class="cab-section-note">Изменения сохраняются автоматически</span>
      </div>
    </div>
    <p v-if="subEditError" class="cab-inline-error">{{ subEditError }}</p>
    <p v-if="subEditSuccess" class="cab-inline-success">{{ subEditSuccess }}</p>

    <div v-if="!subscriptions.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>⟳</span>
      <p>Подписки не настроены.<br>Загрузите шаблоны или создайте собственный абонемент.</p>
    </div>

    <template v-if="subscriptions.length">
      <div class="sub-grid" :class="{ 'sub-grid--brutalist': isBrutalist }">
        <div v-for="sub in subscriptions" :key="getSubscriptionActionKey(sub)" class="sub-card-stack">
          <article
            class="sub-card glass-surface"
            :class="{ disabled: !sub.enabled, 'sub-card--brutalist': isBrutalist, 'sub-card--active': subscriptionCardEditorKey === getSubscriptionActionKey(sub) }"
            role="button"
            tabindex="0"
            @click="toggleSubscriptionCardEditor(sub)"
            @keyup.enter.prevent="toggleSubscriptionCardEditor(sub)"
            @keyup.space.prevent="toggleSubscriptionCardEditor(sub)"
          >
            <div class="sub-card-head">
              <h3 class="sub-card-title">{{ getSubscriptionDisplayTitle(sub) }}</h3>
              <span class="sub-period-badge">{{ getBillingLabel(sub.billingPeriod) }}</span>
            </div>
            <div class="sub-card-price-row">
              <span class="sub-card-price">{{ (Number(sub.price) || 0).toLocaleString('ru-RU') }} <small>₽</small></span>
              <span v-if="sub.discount > 0" class="sub-card-discount">−{{ sub.discount }}%</span>
            </div>
            <div v-if="sub.discount > 0" class="sub-card-effective">
              Итого: {{ Math.round((Number(sub.price) || 0) * (1 - (sub.discount || 0) / 100)).toLocaleString('ru-RU') }} ₽
            </div>
            <p class="sub-card-desc">{{ getSubscriptionDisplayDescription(sub) }}</p>
            <div v-if="Object.keys(sub.limits || {}).length" class="sub-card-limits">
              <div v-for="(val, lk) in sub.limits" :key="lk" class="sub-limit-chip">
                <span class="sub-limit-key">{{ formatLimitKey(String(lk)) }}</span>
                <span class="sub-limit-val">{{ val }}</span>
              </div>
            </div>
            <div v-if="sub.serviceKeys?.length" class="pkg-card-services">
              <span v-for="sk in sub.serviceKeys" :key="sk" class="pkg-svc-chip">
                {{ getServiceTitle(sk) }}
              </span>
            </div>
            <div class="sub-card-monthly">
              <span class="sub-m-label">В месяц:</span>
              <span class="sub-m-val">{{ getMonthlyPrice(sub).toLocaleString('ru-RU') }} ₽</span>
            </div>
            <p class="pkg-card-note">{{ getSubscriptionLeadTimeLabel(sub) }}</p>
          </article>
          <div v-if="subscriptionCardEditorKey === getSubscriptionActionKey(sub) && subscriptionCardDraft" class="sub-card-editor glass-surface" :class="{ 'sub-card-editor--brutalist': isBrutalist }">
            <div class="sub-card-editor__head">
              <div>
                <div class="sub-card-editor__eyebrow">редактор подписки</div>
                <strong class="sub-card-editor__title">{{ getSubscriptionDisplayTitle(subscriptionCardDraft) }}</strong>
              </div>
              <div class="sub-card-editor__actions">
                <span class="cab-autosave-status" :class="autosaveStatusClass(subscriptionCardSaveState)">{{ autosaveStatusLabel(subscriptionCardSaveState) }}</span>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="subscriptionCardSaving" @click="duplicateSubscriptionCard(sub)">дублировать</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, -1)">выше</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, 1)">ниже</GlassButton>
                <GlassButton variant="danger" density="compact" type="button" :disabled="subscriptionCardSaving" @click="removeSubscriptionCard(sub)">удалить</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" @click="closeSubscriptionCardEditor">свернуть</GlassButton>
              </div>
            </div>
            <p v-if="subscriptionCardError" class="cab-inline-error">{{ subscriptionCardError }}</p>
            <div class="svc-card-editor__grid">
              <div class="u-field">
                <label class="u-field__label">Название</label>
                <GlassInput v-model="subscriptionCardDraft.title" placeholder="Название подписки" @blur="queueSubscriptionCardSave" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Период</label>
                <select v-model="subscriptionCardDraft.billingPeriod" class="glass-input" @change="queueSubscriptionCardSave">
                  <option v-for="bp in BILLING_PERIODS_LIST" :key="`sub-inline-${bp.value}`" :value="bp.value">{{ bp.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Цена</label>
                <GlassInput v-model.number="subscriptionCardDraft.price" type="number" min="0" @blur="queueSubscriptionCardSave" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Скидка</label>
                <GlassInput v-model.number="subscriptionCardDraft.discount" type="number" min="0" max="100" @blur="queueSubscriptionCardSave" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Описание</label>
                <textarea v-model="subscriptionCardDraft.description" class="glass-input u-ta" rows="3" placeholder="Что входит в подписку" @blur="queueSubscriptionCardSave" />
              </div>
            </div>
            <div class="sub-card-editor__limits">
              <div class="sub-card-editor__limits-head">
                <strong>Лимиты</strong>
                <GlassButton variant="secondary" density="compact" type="button" @click="addSubscriptionCardDraftLimit(); queueSubscriptionCardSave()">＋ лимит</GlassButton>
              </div>
              <div v-if="Object.keys(subscriptionCardDraft.limits || {}).length" class="sub-limits-grid">
                <div v-for="(val, lk) in subscriptionCardDraft.limits" :key="`sub-inline-limit-${lk}`" class="sub-limit-row">
                  <GlassInput :value="lk" class="svc-inp" @change="renameSubscriptionDraftLimit(String(lk), ($event.target as HTMLInputElement).value); queueSubscriptionCardSave()" />
                  <GlassInput :value="val" class="svc-inp svc-inp--num" type="number" min="0" @blur="queueSubscriptionCardSave" @input="updateSubscriptionDraftLimit(String(lk), Number(($event.target as HTMLInputElement).value))" />
                  <button type="button" class="svc-del" @click="removeSubscriptionDraftLimit(String(lk)); queueSubscriptionCardSave()">✕</button>
                </div>
              </div>
            </div>
            <label class="svc-enable svc-enable--editor">
              <input v-model="subscriptionCardDraft.enabled" type="checkbox" @change="queueSubscriptionCardSave" />
              <span>{{ subscriptionCardDraft.enabled ? 'подписка доступна для продажи' : 'подписка скрыта из выдачи' }}</span>
            </label>
            <div class="pkg-card-editor__services">
              <div class="pkg-card-editor__services-head">
                <strong>Услуги в подписке</strong>
                <span>{{ getServiceCountLabel((subscriptionCardDraft.serviceKeys || []).length) }}</span>
              </div>
              <p class="pkg-card-editor__summary">{{ getDraftServiceBundleSummary(subscriptionCardDraft.serviceKeys || []) }}</p>
              <div class="pkg-service-picker-list">
                <button
                  v-for="svcOption in allServiceOptions"
                  :key="`sub-inline-service-${svcOption.key}`"
                  type="button"
                  class="pkg-service-picker"
                  :class="{ 'pkg-service-picker--active': (subscriptionCardDraft.serviceKeys || []).includes(svcOption.key) }"
                  @click="toggleSubscriptionCardDraftService(svcOption.key); queueSubscriptionCardSave()"
                >
                  <div class="pkg-service-picker__main">
                    <strong>{{ svcOption.title }}</strong>
                    <span>{{ svcOption.category }}</span>
                  </div>
                  <div class="pkg-service-picker__meta">
                    <span>{{ svcOption.price }}</span>
                    <span>{{ svcOption.leadTime }}</span>
                  </div>
                </button>
              </div>
              <div v-if="subscriptionCardDraftServices.length" class="pkg-card-editor__service-list">
                <div v-for="svcItem in subscriptionCardDraftServices" :key="`sub-inline-row-${svcItem.key}`" class="pkg-card-editor__service-row">
                  <div>
                    <strong>{{ svcItem.title }}</strong>
                    <span>{{ svcItem.category }} · {{ svcItem.term }}</span>
                  </div>
                  <span>{{ svcItem.price }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  BILLING_PERIOD_LABELS,
  BILLING_PERIOD_MONTHS,
  BILLING_PERIODS,
  type DesignerServicePrice,
  type DesignerSubscription,
  type BillingPeriod,
  type PriceUnit,
} from '~~/shared/types/designer'
import {
  getDesignerServicePersistedKey,
  getDesignerSubscriptionPersistedKey,
  normalizeDesignerSubscriptions,
} from '~~/shared/utils/designer-catalogs'

const props = defineProps<{
  designerId: number
  subscriptions: DesignerSubscription[]
  services: DesignerServicePrice[]
  isBrutalist: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

// ── Local helpers ──

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

function autosaveStatusClass(state: InlineAutosaveState) {
  return state ? `cab-autosave-status--${state}` : 'cab-autosave-status--idle'
}

function autosaveStatusLabel(state: InlineAutosaveState) {
  if (state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (state === 'saved') return '[ СОХРАНЕНО ]'
  if (state === 'error') return '[ ОШИБКА СОХРАНЕНИЯ ]'
  return '[ AUTOSAVE ]'
}

function cloneDraft<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function makeEditorId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function getRequestErrorMessage(error: any, fallback: string) {
  return error?.data?.message || error?.message || fallback
}

function showTransientMessage(target: { value: string }, message: string) {
  target.value = message
  setTimeout(() => {
    if (target.value === message) target.value = ''
  }, 2500)
}

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

// ── Constants ──

const BILLING_PERIODS_LIST = Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => ({ value, label }))

// ── Key helpers ──

function getServicePersistedKey(service: DesignerServicePrice, index = props.services.findIndex(item => item === service)) {
  return getDesignerServicePersistedKey(service, Math.max(index, 0))
}

function getSubscriptionPersistedKey(subscription: DesignerSubscription, index = props.subscriptions.findIndex(item => item === subscription)) {
  return getDesignerSubscriptionPersistedKey(subscription, Math.max(index, 0))
}

function getSubscriptionActionKey(subscription: DesignerSubscription, index = props.subscriptions.findIndex(item => item === subscription)) {
  return getSubscriptionPersistedKey(subscription, index)
}

function findSubscriptionByActionKey(actionKey: string) {
  return props.subscriptions.find((item, index) => getSubscriptionPersistedKey(item, index) === actionKey) || null
}

function getValidServiceSelectionKeys() {
  return new Set(props.services.map((service, index) => getServicePersistedKey(service, index)))
}

// ── Display helpers ──

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

function getServiceCountLabel(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} услуга`
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} услуги`
  return `${count} услуг`
}

function getServiceTemplate(key: string) {
  return DESIGNER_SERVICE_TEMPLATES.find(template => template.key === key)
}

function getServiceDisplayTitle(service: DesignerServicePrice, index = 0): string {
  const title = String(service.title || '').trim()
  if (title) return title
  const template = getServiceTemplate(service.serviceKey)
  if (template?.title) return template.title
  return `Услуга ${index + 1}`
}

function getServiceBySelectionKey(key: string): DesignerServicePrice | undefined {
  return props.services.find((service, index) => getServicePersistedKey(service, index) === key)
}

function getServiceTitle(key: string): string {
  const svc = getServiceBySelectionKey(key)
  if (svc) return svc.title
  const tmpl = DESIGNER_SERVICE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

function getServiceCategoryValue(service: DesignerServicePrice) {
  if (service.category) return service.category
  const template = getServiceTemplate(service.serviceKey)
  return template?.category || 'additional'
}

function getServiceCategoryLabel(service: DesignerServicePrice): string {
  return DESIGNER_SERVICE_CATEGORY_LABELS[getServiceCategoryValue(service) as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS] || 'услуга'
}

function getServiceLeadTimeLabel(service: DesignerServicePrice): string {
  const normalized = Math.max(0, Number(service.leadTimeDays) || 0)
  if (!normalized) return 'срок не задан'
  if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
  if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
  return `${normalized} дней`
}

function getSubscriptionDisplayTitle(sub: DesignerSubscription | null | undefined, index = 0): string {
  if (!sub) return `Подписка ${index + 1}`
  const title = String(sub.title || '').trim()
  if (title) return title
  const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find(item => item.key === sub.key)
  if (template?.title) return template.title
  return `Подписка ${index + 1}`
}

function getSubscriptionDisplayDescription(sub: DesignerSubscription | null | undefined): string {
  if (!sub) return 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
  const description = String(sub.description || '').trim()
  if (description) return description
  const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find(item => item.key === sub.key)
  return template?.description || 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
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

function formatLeadTimeDays(days?: number | null): string {
  const normalized = Math.max(0, Number(days) || 0)
  if (!normalized) return 'срок не задан'
  if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
  if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
  return `${normalized} дней`
}

function getLeadTimeStats(keys: string[]) {
  const days = keys
    .map(key => getServiceBySelectionKey(key)?.leadTimeDays || 0)
    .filter(value => value > 0)
  if (!days.length) return null
  return { min: Math.min(...days), max: Math.max(...days) }
}

function getSubscriptionLeadTimeLabel(sub: DesignerSubscription): string {
  const stats = getLeadTimeStats(sub.serviceKeys || [])
  if (!stats) return 'Срок закрытия задач зависит от выбранных услуг.'
  if (stats.min === stats.max) return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.max)}`
  return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
}

function getDraftServiceBundleSummary(keys: string[]) {
  const stats = getLeadTimeStats(keys)
  if (!stats) return 'Выбирайте уже настроенные услуги: пакет и подписка подтянут их текущую цену и срок.'
  if (stats.min === stats.max) return `Срок набора услуг: ${formatLeadTimeDays(stats.max)}.`
  return `Срок набора услуг: от ${formatLeadTimeDays(stats.min)} до ${formatLeadTimeDays(stats.max)}.`
}

// ── Service options for picker ──

const allServiceOptions = computed(() => {
  return props.services
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

// ── Card editor state ──

const subscriptionCardEditorKey = ref<string | null>(null)
const subscriptionCardDraft = ref<DesignerSubscription | null>(null)
const subscriptionCardSaving = ref(false)
const subscriptionCardError = ref('')
const subscriptionCardSaveState = ref<InlineAutosaveState>('')
const subscriptionCardSnapshot = ref('')
let subscriptionCardTimer: ReturnType<typeof setTimeout> | null = null

const subEditError = ref('')
const subEditSuccess = ref('')

function clearSubscriptionCardTimer() {
  if (!subscriptionCardTimer) return
  clearTimeout(subscriptionCardTimer)
  subscriptionCardTimer = null
}

function closeSubscriptionCardEditor() {
  clearSubscriptionCardTimer()
  subscriptionCardEditorKey.value = null
  subscriptionCardDraft.value = null
  subscriptionCardError.value = ''
  subscriptionCardSaveState.value = ''
  subscriptionCardSnapshot.value = ''
}

function openSubscriptionCardEditor(subscription: DesignerSubscription) {
  closeSubscriptionCardEditor()
  subscriptionCardEditorKey.value = getSubscriptionActionKey(subscription)
  subscriptionCardDraft.value = {
    ...cloneDraft(subscription),
    key: getSubscriptionPersistedKey(subscription),
    serviceKeys: Array.isArray(subscription.serviceKeys) ? [...subscription.serviceKeys] : [],
    limits: { ...(subscription.limits || {}) },
  }
  subscriptionCardError.value = ''
  subscriptionCardSaveState.value = ''
  subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
}

function toggleSubscriptionCardEditor(subscription: DesignerSubscription) {
  if (subscriptionCardEditorKey.value === getSubscriptionActionKey(subscription)) {
    closeSubscriptionCardEditor()
    return
  }
  openSubscriptionCardEditor(subscription)
}

function toggleSubscriptionCardDraftService(key: string) {
  if (!subscriptionCardDraft.value) return
  const idx = subscriptionCardDraft.value.serviceKeys.indexOf(key)
  if (idx >= 0) subscriptionCardDraft.value.serviceKeys.splice(idx, 1)
  else subscriptionCardDraft.value.serviceKeys.push(key)
}

function updateSubscriptionDraftLimit(limitKey: string, value: number) {
  if (!subscriptionCardDraft.value) return
  if (!subscriptionCardDraft.value.limits) subscriptionCardDraft.value.limits = {}
  subscriptionCardDraft.value.limits[limitKey] = Math.max(0, Number(value) || 0)
}

function renameSubscriptionDraftLimit(limitKey: string, nextKeyRaw: string) {
  if (!subscriptionCardDraft.value?.limits) return
  const nextKey = String(nextKeyRaw || '').trim()
  if (!nextKey || nextKey === limitKey) return
  if (limitKey !== nextKey && nextKey in subscriptionCardDraft.value.limits) {
    subscriptionCardError.value = 'Лимит с таким ключом уже существует'
    subscriptionCardSaveState.value = 'error'
    return
  }
  const nextLimits: Record<string, number> = {}
  for (const [key, value] of Object.entries(subscriptionCardDraft.value.limits)) {
    nextLimits[key === limitKey ? nextKey : key] = Number(value) || 0
  }
  subscriptionCardDraft.value.limits = nextLimits
  if (subscriptionCardError.value === 'Лимит с таким ключом уже существует') subscriptionCardError.value = ''
}

function removeSubscriptionDraftLimit(limitKey: string) {
  if (!subscriptionCardDraft.value?.limits) return
  delete subscriptionCardDraft.value.limits[limitKey]
}

function addSubscriptionCardDraftLimit() {
  if (!subscriptionCardDraft.value) return
  if (!subscriptionCardDraft.value.limits) subscriptionCardDraft.value.limits = {}
  let index = 1
  let nextKey = `limit_${index}`
  while (nextKey in subscriptionCardDraft.value.limits) {
    index += 1
    nextKey = `limit_${index}`
  }
  subscriptionCardDraft.value.limits[nextKey] = 0
}

const subscriptionCardDraftServices = computed(() => {
  const keys = subscriptionCardDraft.value?.serviceKeys || []
  return keys.map(key => {
    const service = getServiceBySelectionKey(key)
    return {
      key,
      title: getServiceTitle(key),
      price: service ? formatServicePrice(service.price, service.unit) : 'не задано',
      term: service ? getServiceLeadTimeLabel(service) : 'срок не задан',
      category: service ? (DESIGNER_SERVICE_CATEGORY_LABELS[service.category as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS] || service.category) : 'услуга',
    }
  })
})

// ── Normalization ──

function normalizeSubscriptionsForSave(list: DesignerSubscription[]): { ok: true; list: DesignerSubscription[] } | { ok: false; error: string } {
  const cleaned = normalizeDesignerSubscriptions(list, { validServiceKeys: getValidServiceSelectionKeys() })
    .filter(sub => sub.title || sub.price > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы одну подписку' }
  }

  const seen = new Set<string>()
  for (const sub of cleaned) {
    if (!sub.title) return { ok: false, error: 'У всех подписок должно быть заполнено название' }
    if (seen.has(sub.key)) return { ok: false, error: 'Найдены дубли подписок, удалите повторения' }
    seen.add(sub.key)
  }

  return { ok: true, list: cleaned }
}

// ── API calls ──

async function doSaveSubscriptions(list: DesignerSubscription[]) {
  await $fetch(`/api/designers/${props.designerId}`, {
    method: 'PUT',
    body: { subscriptions: list },
  })
  emit('refresh')
}

// ── Card save ──

async function saveSubscriptionCardEditor() {
  if (!subscriptionCardDraft.value) return
  clearSubscriptionCardTimer()
  subscriptionCardError.value = ''
  const activeKey = subscriptionCardEditorKey.value
  const draft = cloneDraft(subscriptionCardDraft.value)
  const updatedList = props.subscriptions.map(item => (
    getSubscriptionActionKey(item) === activeKey ? draft : cloneDraft(item)
  ))
  const normalized = normalizeSubscriptionsForSave(updatedList)
  if (!normalized.ok) {
    subscriptionCardError.value = normalized.error
    subscriptionCardSaveState.value = 'error'
    return
  }
  subscriptionCardSaving.value = true
  subscriptionCardSaveState.value = 'saving'
  try {
    await doSaveSubscriptions(normalized.list)
    subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
    subscriptionCardSaveState.value = 'saved'
    setAutosaveSettled(subscriptionCardSaveState, 'saved')
  } catch (error: any) {
    subscriptionCardError.value = getRequestErrorMessage(error, 'Не удалось сохранить подписку')
    subscriptionCardSaveState.value = 'error'
  } finally {
    subscriptionCardSaving.value = false
  }
}

function queueSubscriptionCardSave() {
  if (!subscriptionCardDraft.value || !subscriptionCardEditorKey.value) return
  const nextSnapshot = JSON.stringify(subscriptionCardDraft.value)
  if (nextSnapshot === subscriptionCardSnapshot.value) return
  clearSubscriptionCardTimer()
  subscriptionCardTimer = setTimeout(() => { saveSubscriptionCardEditor() }, 120)
}

function buildCustomSubscriptionDraft(): DesignerSubscription {
  const id = makeEditorId()
  return {
    key: `custom_sub_${id}`,
    title: 'Новая подписка',
    description: '',
    billingPeriod: 'monthly',
    price: 0,
    discount: 0,
    serviceKeys: [],
    limits: {},
    enabled: true,
  }
}

async function initSubs() {
  const subs = DESIGNER_SUBSCRIPTION_TEMPLATES.map(t => ({
    key: t.key,
    title: t.title,
    description: t.description,
    billingPeriod: t.billingPeriod,
    price: t.price,
    discount: t.discount,
    serviceKeys: [...t.serviceKeys],
    limits: { ...t.limits },
    enabled: true,
  }))
  await doSaveSubscriptions(subs)
}

async function createSubscriptionCard() {
  subEditError.value = ''
  const draft = buildCustomSubscriptionDraft()
  subscriptionCardSaving.value = true
  try {
    await doSaveSubscriptions([...props.subscriptions.map(item => cloneDraft(item)), draft])
    showTransientMessage(subEditSuccess, 'Подписка добавлена')
    await nextTick()
    const found = findSubscriptionByActionKey(draft.key)
    if (found) openSubscriptionCardEditor(found)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось добавить подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function duplicateSubscriptionCard(subscription: DesignerSubscription) {
  subEditError.value = ''
  const source = subscriptionCardDraft.value && subscriptionCardEditorKey.value === getSubscriptionActionKey(subscription)
    ? cloneDraft(subscriptionCardDraft.value)
    : cloneDraft(subscription)
  const list = props.subscriptions.map(item => cloneDraft(item))
  const index = props.subscriptions.findIndex(item => getSubscriptionActionKey(item) === getSubscriptionActionKey(subscription))
  if (index < 0) return
  source.key = `${subscription.key || 'subscription'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новая подписка'
  subscriptionCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await doSaveSubscriptions(list)
    showTransientMessage(subEditSuccess, 'Подписка продублирована')
    await nextTick()
    const found = findSubscriptionByActionKey(source.key)
    if (found) openSubscriptionCardEditor(found)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function moveSubscriptionCard(subscription: DesignerSubscription, direction: -1 | 1) {
  subEditError.value = ''
  const index = props.subscriptions.findIndex(item => getSubscriptionActionKey(item) === getSubscriptionActionKey(subscription))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= props.subscriptions.length) return
  const list = props.subscriptions.map(item => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  subscriptionCardSaving.value = true
  try {
    await doSaveSubscriptions(list)
    showTransientMessage(subEditSuccess, 'Порядок подписок обновлён')
    await nextTick()
    const found = findSubscriptionByActionKey(getSubscriptionActionKey(subscription))
    if (found) openSubscriptionCardEditor(found)
    else openSubscriptionCardEditor(moved)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось изменить порядок подписок')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function removeSubscriptionCard(subscription: DesignerSubscription) {
  subEditError.value = ''
  subscriptionCardSaving.value = true
  try {
    await doSaveSubscriptions(props.subscriptions.filter(item => getSubscriptionActionKey(item) !== getSubscriptionActionKey(subscription)).map(item => cloneDraft(item)))
    closeSubscriptionCardEditor()
    showTransientMessage(subEditSuccess, 'Подписка удалена')
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось удалить подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}
</script>
