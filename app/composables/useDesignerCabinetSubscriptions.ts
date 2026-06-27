import { onBeforeUnmount, ref, type Ref } from 'vue'
import {
  type DesignerSubscription,
} from '~~/shared/types/designer'
import {
  normalizeDesignerSubscriptions,
} from '~~/shared/utils/designer/designer-catalogs'

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

type SubscriptionEditorUtilities = {
  cloneDraft: <T>(value: T) => T
  makeEditorId: () => string
  getRequestErrorMessage: (error: any, fallback: string) => string
  showTransientMessage: (target: Ref<string>, message: string) => void
  setAutosaveSettled: (state: Ref<InlineAutosaveState>, expected: InlineAutosaveState) => void
}

type UseDesignerCabinetSubscriptionsOptions = {
  subscriptions: Ref<DesignerSubscription[]>
  saveSubscriptions: (subscriptions: DesignerSubscription[]) => Promise<unknown>
  initSubscriptionsFromTemplates: () => DesignerSubscription[]
  getValidServiceSelectionKeys: () => Set<string>
  getSubscriptionActionKey: (subscription: DesignerSubscription, index?: number) => string
  findSubscriptionByActionKey: (actionKey: string) => DesignerSubscription | null
  closePeerEditors: () => void
  utils: SubscriptionEditorUtilities
}

export function useDesignerCabinetSubscriptions(options: UseDesignerCabinetSubscriptionsOptions) {
  const subEditError = ref('')
  const subEditSuccess = ref('')

  const subscriptionCardEditorKey = ref<string | null>(null)
  const subscriptionCardDraft = ref<DesignerSubscription | null>(null)
  const subscriptionCardSaving = ref(false)
  const subscriptionCardError = ref('')
  const subscriptionCardSaveState = ref<InlineAutosaveState>('')
  const subscriptionCardSnapshot = ref('')
  let subscriptionCardTimer: ReturnType<typeof setTimeout> | null = null

  function clearSubscriptionCardTimer() {
    if (!subscriptionCardTimer) return
    clearTimeout(subscriptionCardTimer)
    subscriptionCardTimer = null
  }

  function normalizeSubscriptionsForSave(
    list: DesignerSubscription[],
  ): { ok: true; list: DesignerSubscription[] } | { ok: false; error: string } {
    const cleaned = normalizeDesignerSubscriptions(list, { validServiceKeys: options.getValidServiceSelectionKeys() })
      .filter((sub) => sub.title || sub.price > 0)

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

  function buildCustomSubscriptionDraft(): DesignerSubscription {
    const id = options.utils.makeEditorId()
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
    const subscriptions = options.initSubscriptionsFromTemplates()
    await options.saveSubscriptions(subscriptions)
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
    clearSubscriptionCardTimer()
    options.closePeerEditors()
    subscriptionCardEditorKey.value = options.getSubscriptionActionKey(subscription)
    subscriptionCardDraft.value = {
      ...options.utils.cloneDraft(subscription),
      key: options.getSubscriptionActionKey(subscription),
      serviceKeys: Array.isArray(subscription.serviceKeys) ? [...subscription.serviceKeys] : [],
      limits: { ...(subscription.limits || {}) },
    }
    subscriptionCardError.value = ''
    subscriptionCardSaveState.value = ''
    subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
  }

  function toggleSubscriptionCardEditor(subscription: DesignerSubscription) {
    if (subscriptionCardEditorKey.value === options.getSubscriptionActionKey(subscription)) {
      closeSubscriptionCardEditor()
      return
    }
    openSubscriptionCardEditor(subscription)
  }

  function toggleSubscriptionCardDraftService(key: string) {
    if (!subscriptionCardDraft.value) return
    const index = subscriptionCardDraft.value.serviceKeys.indexOf(key)
    if (index >= 0) subscriptionCardDraft.value.serviceKeys.splice(index, 1)
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
    for (const [key, currentValue] of Object.entries(subscriptionCardDraft.value.limits)) {
      nextLimits[key === limitKey ? nextKey : key] = Number(currentValue) || 0
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

  async function saveSubscriptionCardEditor() {
    if (!subscriptionCardDraft.value) return
    clearSubscriptionCardTimer()
    subscriptionCardError.value = ''
    const activeKey = subscriptionCardEditorKey.value
    const draft = options.utils.cloneDraft(subscriptionCardDraft.value)
    const updatedList = options.subscriptions.value.map((item) => (
      options.getSubscriptionActionKey(item) === activeKey
        ? draft
        : options.utils.cloneDraft(item)
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
      await options.saveSubscriptions(normalized.list)
      subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
      subscriptionCardSaveState.value = 'saved'
      options.utils.setAutosaveSettled(subscriptionCardSaveState, 'saved')
    } catch (error: any) {
      subscriptionCardError.value = options.utils.getRequestErrorMessage(error, 'Не удалось сохранить подписку')
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
    subscriptionCardTimer = setTimeout(() => {
      saveSubscriptionCardEditor()
    }, 120)
  }

  async function createSubscriptionCard() {
    subEditError.value = ''
    const draft = buildCustomSubscriptionDraft()
    subscriptionCardSaving.value = true
    try {
      await options.saveSubscriptions([...options.subscriptions.value.map((item) => options.utils.cloneDraft(item)), draft])
      options.utils.showTransientMessage(subEditSuccess, 'Подписка добавлена')
      openSubscriptionCardEditor(options.findSubscriptionByActionKey(draft.key) || draft)
    } catch (error: any) {
      subEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось добавить подписку')
    } finally {
      subscriptionCardSaving.value = false
    }
  }

  async function duplicateSubscriptionCard(subscription: DesignerSubscription) {
    subEditError.value = ''
    const source = subscriptionCardDraft.value && subscriptionCardEditorKey.value === options.getSubscriptionActionKey(subscription)
      ? options.utils.cloneDraft(subscriptionCardDraft.value)
      : options.utils.cloneDraft(subscription)
    const list = options.subscriptions.value.map((item) => options.utils.cloneDraft(item))
    const index = options.subscriptions.value.findIndex((item) => options.getSubscriptionActionKey(item) === options.getSubscriptionActionKey(subscription))
    if (index < 0) return
    source.key = `${subscription.key || 'subscription'}_copy_${options.utils.makeEditorId()}`
    source.title = source.title ? `${source.title} (копия)` : 'Новая подписка'
    subscriptionCardSaving.value = true
    try {
      list.splice(index + 1, 0, source)
      await options.saveSubscriptions(list)
      options.utils.showTransientMessage(subEditSuccess, 'Подписка продублирована')
      openSubscriptionCardEditor(options.findSubscriptionByActionKey(source.key) || source)
    } catch (error: any) {
      subEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось продублировать подписку')
    } finally {
      subscriptionCardSaving.value = false
    }
  }

  async function moveSubscriptionCard(subscription: DesignerSubscription, direction: -1 | 1) {
    subEditError.value = ''
    const index = options.subscriptions.value.findIndex((item) => options.getSubscriptionActionKey(item) === options.getSubscriptionActionKey(subscription))
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= options.subscriptions.value.length) return
    const list = options.subscriptions.value.map((item) => options.utils.cloneDraft(item))
    const [moved] = list.splice(index, 1)
    list.splice(targetIndex, 0, moved)
    subscriptionCardSaving.value = true
    try {
      await options.saveSubscriptions(list)
      options.utils.showTransientMessage(subEditSuccess, 'Порядок подписок обновлён')
      openSubscriptionCardEditor(options.findSubscriptionByActionKey(options.getSubscriptionActionKey(subscription)) || moved)
    } catch (error: any) {
      subEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось изменить порядок подписок')
    } finally {
      subscriptionCardSaving.value = false
    }
  }

  async function removeSubscriptionCard(subscription: DesignerSubscription) {
    subEditError.value = ''
    subscriptionCardSaving.value = true
    try {
      await options.saveSubscriptions(
        options.subscriptions.value
          .filter((item) => options.getSubscriptionActionKey(item) !== options.getSubscriptionActionKey(subscription))
          .map((item) => options.utils.cloneDraft(item)),
      )
      closeSubscriptionCardEditor()
      options.utils.showTransientMessage(subEditSuccess, 'Подписка удалена')
    } catch (error: any) {
      subEditError.value = options.utils.getRequestErrorMessage(error, 'Не удалось удалить подписку')
    } finally {
      subscriptionCardSaving.value = false
    }
  }

  onBeforeUnmount(() => {
    clearSubscriptionCardTimer()
  })

  return {
    subEditError,
    subEditSuccess,
    subscriptionCardEditorKey,
    subscriptionCardDraft,
    subscriptionCardSaving,
    subscriptionCardError,
    subscriptionCardSaveState,
    initSubs,
    closeSubscriptionCardEditor,
    openSubscriptionCardEditor,
    toggleSubscriptionCardEditor,
    toggleSubscriptionCardDraftService,
    updateSubscriptionDraftLimit,
    renameSubscriptionDraftLimit,
    removeSubscriptionDraftLimit,
    addSubscriptionCardDraftLimit,
    queueSubscriptionCardSave,
    createSubscriptionCard,
    duplicateSubscriptionCard,
    moveSubscriptionCard,
    removeSubscriptionCard,
  }
}