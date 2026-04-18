/**
 * useDocumentEditorSources — Step 1 state for AdminDocumentEditor.
 * Manages data sources (project, designer, client, contractor) and maps
 * picked entity data onto field values via `applyMap` helper.
 */

import type { Ref, ComputedRef } from 'vue'

export interface DocumentTemplate {
  key: string
  name: string
  icon: string
  description: string
  category: string
  fields: Array<{ key: string; label: string; placeholder?: string; multiline?: boolean }>
  template: string
}

export interface DocumentContext {
  project?: {
    client_name?: string
    phone?: string
    email?: string
    objectAddress?: string
    objectArea?: string
    objectType?: string
    budget?: string
    deadline?: string
    style?: string
    passport_series?: string
    passport_number?: string
    passport_issued_by?: string
    passport_issue_date?: string
    passport_registration_address?: string
    passport_inn?: string
    _profile?: { style?: string }
    [key: string]: unknown
  }
  clients?: Array<{ id: number; name: string; phone?: string; email?: string; address?: string }>
  contractors?: Array<{
    id: number
    name: string
    companyName?: string
    phone?: string
    email?: string
    inn?: string
    legalAddress?: string
    factAddress?: string
    bankName?: string
    bik?: string
    settlementAccount?: string
  }>
}

export interface DesignerEntry {
  id: number
  name: string
  companyName?: string
  phone?: string
  email?: string
}

export const EXECUTOR_STORAGE_KEY = 'de_executor_defaults'

export const EXECUTOR_DEFAULTS: Record<string, string> = {
  executor_name:            'Кульчихина Дария Андреевна',
  executor_inn:             '',
  executor_passport:        '',
  executor_passport_issued: '',
  executor_passport_date:   '',
  executor_registration:    '',
  executor_phone:           '',
  executor_email:           'daria@kulchikhina.ru',
  executor_bank:            '',
  executor_bik:             '',
  executor_account:         '',
  executor_corr_account:    '',
}

export interface UseDocumentEditorSourcesParams {
  selectedTpl: Ref<DocumentTemplate | null> | ComputedRef<DocumentTemplate | null>
  fieldValues: Ref<Record<string, string>>
  fieldAutoFilled: Ref<Record<string, boolean>>
}

export function useDocumentEditorSources(params: UseDocumentEditorSourcesParams) {
  const { selectedTpl, fieldValues, fieldAutoFilled } = params

  const pickedProjectSlug  = ref('')
  const pickedClientId     = ref(0)
  const pickedContractorId = ref(0)
  const pickedDesignerId   = ref(0)
  const designersList      = ref<DesignerEntry[]>([])
  const executorSaved      = ref(false)
  const ctx                = ref<DocumentContext | null>(null)
  const loadingCtx         = ref(false)

  const pickedClient = computed(() =>
    ctx.value?.clients?.find(c => c.id === pickedClientId.value) || null
  )
  const pickedContractor = computed(() =>
    ctx.value?.contractors?.find(c => c.id === pickedContractorId.value) || null
  )
  const pickedDesigner = computed(() =>
    designersList.value.find(d => d.id === pickedDesignerId.value) || null
  )

  function loadExecutorFromStorage(): Record<string, string> {
    try {
      const raw = localStorage.getItem(EXECUTOR_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  function saveExecutorToStorage() {
    const vals = fieldValues.value
    const data: Record<string, string> = {}
    for (const key of Object.keys(EXECUTOR_DEFAULTS)) {
      if (vals[key]) data[key] = vals[key]
    }
    try {
      localStorage.setItem(EXECUTOR_STORAGE_KEY, JSON.stringify(data))
      executorSaved.value = true
      setTimeout(() => { executorSaved.value = false }, 2500)
    } catch { /* ignore */ }
  }

  function applyMap(map: Record<string, string>) {
    if (!selectedTpl.value) return
    for (const f of selectedTpl.value.fields) {
      if (map[f.key] && (!fieldValues.value[f.key] || fieldAutoFilled.value[f.key])) {
        fieldValues.value[f.key] = map[f.key]
        fieldAutoFilled.value[f.key] = true
      }
    }
  }

  function applyProjectData() {
    if (!ctx.value?.project || !selectedTpl.value) return
    const p = ctx.value.project
    const map: Record<string, string> = {
      object_address: p.objectAddress || '',
      delivery_address: p.objectAddress || '',
      area: p.objectArea || '',
      budget: p.budget || '',
      deadline: p.deadline || '',
      client_name: p.client_name || '',
      client_address: p.objectAddress || '',
      client_phone: p.phone || '',
      client_email: p.email || '',
      object_type: p.objectType || '',
      object: `${p.objectType || ''} ${p.objectArea || ''} кв.м, ${p.objectAddress || ''}`.trim(),
      style: p.style || p._profile?.style || '',
      client_passport: [p.passport_series, p.passport_number].filter(Boolean).join(' '),
      client_passport_issued: p.passport_issued_by || '',
      client_passport_date: p.passport_issue_date || '',
      client_registration: p.passport_registration_address || '',
      client_inn: p.passport_inn || '',
      penalty_pct: '0,1%',
    }
    applyMap(map)
  }

  function applyClientData() {
    const c = pickedClient.value
    if (!c || !selectedTpl.value) return
    applyMap({
      client_name: c.name || '',
      client_address: c.address || '',
      client_phone: c.phone || '',
      client_email: c.email || '',
    })
  }

  function applyContractorData() {
    const c = pickedContractor.value
    if (!c || !selectedTpl.value) return
    const companyOrName = c.companyName || c.name || ''
    applyMap({
      contractor_name: companyOrName,
      contractor: companyOrName,
      supplier_name: companyOrName,
      contractor_inn: c.inn || '',
      contractor_address: c.legalAddress || c.factAddress || '',
      contractor_phone: c.phone || '',
      contractor_email: c.email || '',
      contractor_bank: c.bankName || '',
      contractor_bik: c.bik || '',
      contractor_account: c.settlementAccount || '',
    })
  }

  function applyDesignerData() {
    const d = pickedDesigner.value
    if (!selectedTpl.value) return
    const stored = loadExecutorFromStorage()
    const map: Record<string, string> = {
      ...stored,
      executor_name:  d?.name  || stored.executor_name  || EXECUTOR_DEFAULTS.executor_name,
      executor_phone: d?.phone || stored.executor_phone || EXECUTOR_DEFAULTS.executor_phone,
      executor_email: d?.email || stored.executor_email || EXECUTOR_DEFAULTS.executor_email,
    }
    applyMap(map)
  }

  async function loadContext() {
    loadingCtx.value = true
    if (!designersList.value.length) {
      try {
        const ds = await $fetch<DesignerEntry[]>('/api/designers')
        designersList.value = ds || []
        if (designersList.value.length === 1 && !pickedDesignerId.value) {
          pickedDesignerId.value = designersList.value[0].id
          applyDesignerData()
        }
      } catch { /* ignore */ }
    }
    try {
      ctx.value = await $fetch<DocumentContext>('/api/documents/context', {
        query: { projectSlug: pickedProjectSlug.value || '' },
      })
      if (ctx.value?.project) {
        applyProjectData()
      }
      if (ctx.value?.clients?.length === 1) {
        pickedClientId.value = ctx.value.clients[0].id
        applyClientData()
      }
    } catch (e) {
      console.error('Failed to load context', e)
    } finally {
      loadingCtx.value = false
    }
  }

  async function ensureDesignersLoaded() {
    if (designersList.value.length) return
    try {
      const ds = await $fetch<DesignerEntry[]>('/api/designers')
      designersList.value = ds || []
      if (designersList.value.length === 1 && !pickedDesignerId.value) {
        pickedDesignerId.value = designersList.value[0].id
        applyDesignerData()
      }
    } catch { /* ignore */ }
  }

  return {
    pickedProjectSlug,
    pickedClientId,
    pickedContractorId,
    pickedDesignerId,
    designersList,
    executorSaved,
    ctx,
    loadingCtx,
    pickedClient,
    pickedContractor,
    pickedDesigner,
    loadContext,
    ensureDesignersLoaded,
    applyProjectData,
    applyClientData,
    applyContractorData,
    applyDesignerData,
    applyMap,
    loadExecutorFromStorage,
    saveExecutorToStorage,
  }
}
