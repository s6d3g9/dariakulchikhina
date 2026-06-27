import { computed, ref, watch, type Ref } from 'vue'

type DocumentTemplateField = {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
}

type DocumentTemplate = {
  key: string
  name: string
  icon: string
  description: string
  category: string
  fields: DocumentTemplateField[]
  template: string
}

type AutoSaveStatus = '' | 'saving' | 'saved' | 'error'

type UseAdminDocumentEditorDataFillOptions = {
  selectedTpl: Ref<DocumentTemplate | null>
  fieldValues: Ref<Record<string, string>>
  fieldAutoFilled: Ref<Record<string, boolean>>
  savedDocId: Ref<number | null>
  autoSaveStatus: Ref<AutoSaveStatus>
  clearAutoSaveTimer: () => void
}

const EXECUTOR_STORAGE_KEY = 'de_executor_defaults'

const EXECUTOR_DEFAULTS: Record<string, string> = {
  executor_name: 'Кульчихина Дария Андреевна',
  executor_inn: '',
  executor_passport: '',
  executor_passport_issued: '',
  executor_passport_date: '',
  executor_registration: '',
  executor_phone: '',
  executor_email: 'daria@kulchikhina.ru',
  executor_bank: '',
  executor_bik: '',
  executor_account: '',
  executor_corr_account: '',
}

const ONES = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
const HUND = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']
const THOU = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']

function thousandsSuffix(value: number) {
  const lastTwoDigits = value % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'тысяч'

  const lastDigit = value % 10
  if (lastDigit === 1) return 'тысяча'
  if (lastDigit >= 2 && lastDigit <= 4) return 'тысячи'
  return 'тысяч'
}

function millionsSuffix(value: number) {
  const lastTwoDigits = value % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'миллионов'

  const lastDigit = value % 10
  if (lastDigit === 1) return 'миллион'
  if (lastDigit >= 2 && lastDigit <= 4) return 'миллиона'
  return 'миллионов'
}

function threeDigitsToWords(value: number, feminine = false): string {
  if (value === 0) return ''

  const parts: string[] = []
  const hundreds = Math.floor(value / 100)
  const tens = Math.floor((value % 100) / 10)
  const ones = value % 10

  if (hundreds) parts.push(HUND[hundreds])
  if (tens === 1) {
    parts.push(feminine ? THOU[tens * 10 + ones] : ONES[tens * 10 + ones])
  } else {
    if (tens) parts.push(TENS[tens])
    if (ones) parts.push(feminine ? THOU[ones] : ONES[ones])
  }

  return parts.join(' ')
}

function numberToWords(value: number): string {
  if (value === 0) return 'ноль'

  const parts: string[] = []
  const millions = Math.floor(value / 1_000_000)
  const thousands = Math.floor((value % 1_000_000) / 1_000)
  const rest = value % 1_000

  if (millions) {
    parts.push(threeDigitsToWords(millions, false))
    parts.push(millionsSuffix(millions))
  }
  if (thousands) {
    parts.push(threeDigitsToWords(thousands, true))
    parts.push(thousandsSuffix(thousands))
  }
  if (rest || (!millions && !thousands)) {
    parts.push(threeDigitsToWords(rest, false))
  }

  return parts.filter(Boolean).join(' ')
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function parseRuAmount(value: string): number {
  const parsed = parseInt(value.replace(/\s/g, '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatIsoDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  return value
}

export function useAdminDocumentEditorDataFill(options: UseAdminDocumentEditorDataFillOptions) {
  const pickedProjectSlug = ref('')
  const pickedClientId = ref(0)
  const pickedContractorId = ref(0)
  const pickedDesignerId = ref(0)
  const designersList = ref<any[]>([])
  const executorSaved = ref(false)
  const ctx = ref<any>(null)
  const loadingCtx = ref(false)

  const pickedClient = computed(() => (
    ctx.value?.clients?.find((client: any) => client.id === pickedClientId.value) || null
  ))
  const pickedContractor = computed(() => (
    ctx.value?.contractors?.find((contractor: any) => contractor.id === pickedContractorId.value) || null
  ))
  const pickedDesigner = computed(() => (
    designersList.value.find((designer: any) => designer.id === pickedDesignerId.value) || null
  ))

  const computedRemaining = computed<string>(() => {
    const priceAmount = parseRuAmount(options.fieldValues.value.price || '')
    const advanceAmount = parseRuAmount(options.fieldValues.value.advance_amount || '')
    if (!priceAmount || !advanceAmount) return ''

    const remaining = priceAmount - advanceAmount
    if (remaining <= 0) return ''
    return `${remaining.toLocaleString('ru-RU')} руб.`
  })

  const allVars = computed(() => {
    const result: Array<{ key: string; label: string; value: string; group: string }> = []
    const values = options.fieldValues.value

    if (options.selectedTpl.value) {
      for (const field of options.selectedTpl.value.fields) {
        result.push({
          key: field.key,
          label: field.label,
          value: values[field.key] || '',
          group: 'Поля шаблона',
        })
      }
    }

    const project = ctx.value?.project
    const projectVars: Array<[string, string, string]> = [
      ['client_name', 'ФИО клиента', project?.client_name || values.client_name || ''],
      ['client_phone', 'Телефон клиента', project?.phone || values.client_phone || ''],
      ['client_email', 'Email клиента', project?.email || values.client_email || ''],
      ['client_passport', 'Паспорт (серия номер)', values.client_passport || ''],
      ['client_passport_issued', 'Паспорт выдан', values.client_passport_issued || ''],
      ['client_passport_date', 'Дата выдачи паспорта', values.client_passport_date || ''],
      ['client_registration', 'Адрес регистрации', values.client_registration || ''],
      ['client_inn', 'ИНН клиента', values.client_inn || ''],
      ['client_address', 'Адрес клиента', values.client_address || ''],
      ['object_address', 'Адрес объекта', project?.objectAddress || values.object_address || ''],
      ['object_type', 'Тип объекта', project?.objectType || values.object_type || ''],
      ['area', 'Площадь (кв.м)', project?.objectArea || values.area || ''],
      ['budget', 'Бюджет', project?.budget || values.budget || ''],
      ['deadline', 'Срок выполнения', project?.deadline || values.deadline || ''],
      ['style', 'Стиль интерьера', project?.style || values.style || ''],
      ['contractor_name', 'Подрядчик', values.contractor_name || ''],
      ['contractor_inn', 'ИНН подрядчика', values.contractor_inn || ''],
      ['contractor_address', 'Адрес подрядчика', values.contractor_address || ''],
      ['contractor_phone', 'Телефон подрядчика', values.contractor_phone || ''],
      ['contractor_account', 'Расчётный счёт', values.contractor_account || ''],
      ['contractor_bik', 'БИК', values.contractor_bik || ''],
      ['contractor_bank', 'Банк', values.contractor_bank || ''],
      ['remaining_amount', 'Остаток суммы', computedRemaining.value || ''],
    ]

    for (const [key, label, value] of projectVars) {
      if (!result.find((item) => item.key === key)) {
        result.push({ key, label, value, group: 'Данные проекта' })
      }
    }

    const executorVars: Array<[string, string]> = [
      ['executor_name', 'ФИО исполнителя'],
      ['executor_inn', 'ИНН исполнителя'],
      ['executor_passport', 'Паспорт исполнителя'],
      ['executor_passport_issued', 'Паспорт выдан'],
      ['executor_passport_date', 'Дата выдачи'],
      ['executor_registration', 'Прописка исполнителя'],
      ['executor_phone', 'Телефон исполнителя'],
      ['executor_email', 'Email исполнителя'],
      ['executor_bank', 'Банк'],
      ['executor_bik', 'БИК'],
      ['executor_account', 'Расчётный счёт'],
      ['executor_corr_account', 'Корреспондентский счёт'],
    ]

    for (const [key, label] of executorVars) {
      if (!result.find((item) => item.key === key)) {
        result.push({
          key,
          label,
          value: values[key] || EXECUTOR_DEFAULTS[key] || '',
          group: 'Исполнитель',
        })
      }
    }

    return result
  })

  function loadExecutorFromStorage(): Record<string, string> {
    if (!import.meta.client) return {}

    try {
      const raw = localStorage.getItem(EXECUTOR_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function applyMap(map: Record<string, string>) {
    if (!options.selectedTpl.value) return

    for (const field of options.selectedTpl.value.fields) {
      if (map[field.key] && (!options.fieldValues.value[field.key] || options.fieldAutoFilled.value[field.key])) {
        options.fieldValues.value[field.key] = map[field.key]
        options.fieldAutoFilled.value[field.key] = true
      }
    }
  }

  function applyProjectData() {
    if (!ctx.value?.project || !options.selectedTpl.value) return

    const project = ctx.value.project
    applyMap({
      object_address: project.objectAddress || '',
      delivery_address: project.objectAddress || '',
      area: project.objectArea || '',
      budget: project.budget || '',
      deadline: project.deadline || '',
      client_name: project.client_name || '',
      client_address: project.objectAddress || '',
      client_phone: project.phone || '',
      client_email: project.email || '',
      object_type: project.objectType || '',
      object: `${project.objectType || ''} ${project.objectArea || ''} кв.м, ${project.objectAddress || ''}`.trim(),
      style: project.style || project._profile?.style || '',
      client_passport: [project.passport_series, project.passport_number].filter(Boolean).join(' '),
      client_passport_issued: project.passport_issued_by || '',
      client_passport_date: project.passport_issue_date || '',
      client_registration: project.passport_registration_address || '',
      client_inn: project.passport_inn || '',
      penalty_pct: '0,1%',
    })
  }

  function applyClientData() {
    const client = pickedClient.value
    if (!client || !options.selectedTpl.value) return

    applyMap({
      client_name: client.name || '',
      client_address: client.address || '',
      client_phone: client.phone || '',
      client_email: client.email || '',
    })
  }

  function applyContractorData() {
    const contractor = pickedContractor.value
    if (!contractor || !options.selectedTpl.value) return

    const companyOrName = contractor.companyName || contractor.name || ''
    applyMap({
      contractor_name: companyOrName,
      contractor: companyOrName,
      supplier_name: companyOrName,
      contractor_inn: contractor.inn || '',
      contractor_address: contractor.legalAddress || contractor.factAddress || '',
      contractor_phone: contractor.phone || '',
      contractor_email: contractor.email || '',
      contractor_bank: contractor.bankName || '',
      contractor_bik: contractor.bik || '',
      contractor_account: contractor.settlementAccount || '',
    })
  }

  function applyDesignerData() {
    if (!options.selectedTpl.value) return

    const designer = pickedDesigner.value
    const stored = loadExecutorFromStorage()
    applyMap({
      ...stored,
      executor_name: designer?.name || stored.executor_name || EXECUTOR_DEFAULTS.executor_name,
      executor_phone: designer?.phone || stored.executor_phone || EXECUTOR_DEFAULTS.executor_phone,
      executor_email: designer?.email || stored.executor_email || EXECUTOR_DEFAULTS.executor_email,
    })
  }

  async function ensureDesignersLoaded() {
    if (designersList.value.length) return

    try {
      const designers = await $fetch<any[]>('/api/designers')
      designersList.value = designers || []
      if (designersList.value.length === 1 && !pickedDesignerId.value) {
        pickedDesignerId.value = designersList.value[0].id
        applyDesignerData()
      }
    } catch {
      // ignore context bootstrap failures here; step 2 can still work manually
    }
  }

  async function loadContext() {
    loadingCtx.value = true
    await ensureDesignersLoaded()

    try {
      ctx.value = await $fetch('/api/documents/context', {
        query: { projectSlug: pickedProjectSlug.value || '' },
      })
      if (ctx.value?.project) {
        applyProjectData()
      }
      if (ctx.value?.clients?.length === 1) {
        pickedClientId.value = ctx.value.clients[0].id
        applyClientData()
      }
    } catch (error) {
      console.error('Failed to load context', error)
    } finally {
      loadingCtx.value = false
    }
  }

  function saveExecutorToStorage() {
    if (!import.meta.client) return

    const values = options.fieldValues.value
    const data: Record<string, string> = {}
    for (const key of Object.keys(EXECUTOR_DEFAULTS)) {
      if (values[key]) data[key] = values[key]
    }

    try {
      localStorage.setItem(EXECUTOR_STORAGE_KEY, JSON.stringify(data))
      executorSaved.value = true
      setTimeout(() => {
        executorSaved.value = false
      }, 2500)
    } catch {
      // ignore storage issues for optional executor defaults persistence
    }
  }

  function selectTemplate(tpl: DocumentTemplate) {
    options.selectedTpl.value = tpl
    options.savedDocId.value = null
    options.autoSaveStatus.value = ''
    options.clearAutoSaveTimer()

    const nextValues: Record<string, string> = {}
    const nextAutoFilled: Record<string, boolean> = {}
    for (const field of tpl.fields) {
      nextValues[field.key] = options.fieldValues.value[field.key] || ''
      nextAutoFilled[field.key] = false
    }

    const today = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    for (const field of tpl.fields) {
      if ((field.key.includes('date') || field.key === 'date') && !nextValues[field.key]) {
        nextValues[field.key] = today
        nextAutoFilled[field.key] = true
      }
    }

    const storedExecutor = loadExecutorFromStorage()
    for (const field of tpl.fields) {
      if (field.key.startsWith('executor_') && !nextValues[field.key]) {
        const value = storedExecutor[field.key] || EXECUTOR_DEFAULTS[field.key] || ''
        if (value) {
          nextValues[field.key] = value
          nextAutoFilled[field.key] = true
        }
      }
    }

    options.fieldValues.value = nextValues
    options.fieldAutoFilled.value = nextAutoFilled
  }

  function generateText(): string {
    if (!options.selectedTpl.value) return ''

    let text = options.selectedTpl.value.template
    for (const [key, value] of Object.entries(options.fieldValues.value)) {
      text = text.split(`{{${key}}}`).join(value || '__________')
    }

    const remaining = computedRemaining.value
    text = text.split('{{remaining_amount}}').join(remaining || '__________')
    return text
  }

  function computeDerivedFields() {
    const values = options.fieldValues.value
    const priceAmount = parseRuAmount(values.price || '')

    if (priceAmount && values.advance && !values.advance_amount) {
      const percent = parseFloat(values.advance.replace('%', '').replace(',', '.'))
      if (!Number.isNaN(percent) && percent > 0 && percent <= 100) {
        const amount = Math.round(priceAmount * percent / 100)
        options.fieldValues.value.advance_amount = `${amount.toLocaleString('ru-RU')} руб.`
        options.fieldAutoFilled.value.advance_amount = true
      }
    }

    if (priceAmount && !values.price_words) {
      const words = capitalize(numberToWords(priceAmount))
      options.fieldValues.value.price_words = `${words} рублей 00 копеек`
      options.fieldAutoFilled.value.price_words = true
    }

    for (const key of ['contract_date', 'client_passport_date', 'act_date', 'date', 'delivery_date']) {
      if (values[key] && /^\d{4}-\d{2}-\d{2}/.test(values[key])) {
        options.fieldValues.value[key] = formatIsoDate(values[key])
        options.fieldAutoFilled.value[key] = true
      }
    }
  }

  watch(
    () => [options.fieldValues.value.price, options.fieldValues.value.advance],
    ([price, advance]) => {
      if (!price) return

      const priceAmount = parseRuAmount(price)
      if (!priceAmount) return

      const percent = parseFloat((advance || '').replace('%', '').replace(',', '.'))
      if (!Number.isNaN(percent) && percent > 0 && percent <= 100) {
        const amount = Math.round(priceAmount * percent / 100)
        options.fieldValues.value.advance_amount = `${amount.toLocaleString('ru-RU')} руб.`
        options.fieldAutoFilled.value.advance_amount = true
      }

      if (!options.fieldValues.value.price_words) {
        options.fieldValues.value.price_words = `${capitalize(numberToWords(priceAmount))} рублей 00 копеек`
        options.fieldAutoFilled.value.price_words = true
      }
    },
  )

  return {
    pickedProjectSlug,
    pickedClientId,
    pickedContractorId,
    pickedDesignerId,
    designersList,
    executorSaved,
    ctx,
    loadingCtx,
    allVars,
    pickedClient,
    pickedContractor,
    pickedDesigner,
    computedRemaining,
    selectTemplate,
    ensureDesignersLoaded,
    loadContext,
    applyClientData,
    applyContractorData,
    applyDesignerData,
    saveExecutorToStorage,
    generateText,
    computeDerivedFields,
  }
}