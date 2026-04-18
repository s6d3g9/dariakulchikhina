/**
 * useDocumentEditorFields — Step 2 field + derivation state for AdminDocumentEditor.
 * Owns fieldValues/fieldAutoFilled, computes remaining amount / price words / date formatting,
 * manages template `{{vars}}` insertion and watchers for auto-derived values.
 */

import type { Ref, ComputedRef } from 'vue'
import { EXECUTOR_DEFAULTS } from '~/composables/useDocumentEditorSources'
import type { DocumentContext, DocumentTemplate } from '~/composables/useDocumentEditorSources'

export interface TemplateVar {
  key: string
  label: string
  value: string
  group: string
}

export interface UseDocumentEditorFieldsParams {
  selectedTpl: Ref<DocumentTemplate | null>
  fieldValues: Ref<Record<string, string>>
  fieldAutoFilled: Ref<Record<string, boolean>>
  ctx: Ref<DocumentContext | null> | ComputedRef<DocumentContext | null>
  editorEl: Ref<HTMLDivElement | null>
  editorContent: Ref<string>
  step: Ref<number>
  copyMsg: Ref<string>
}

// ── Number → Russian words ─────────────────────────────────────────────────
const ONES  = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']
const TENS  = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто']
const HUND  = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот']
const THOU  = ['','одна','две','три','четыре','пять','шесть','семь','восемь','девять',
                'десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать',
                'шестнадцать','семнадцать','восемнадцать','девятнадцать']

const THOUS_SFX = (n: number) => {
  const r100 = n % 100
  if (r100 >= 11 && r100 <= 14) return 'тысяч'
  const r = n % 10
  if (r === 1) return 'тысяча'
  if (r >= 2 && r <= 4) return 'тысячи'
  return 'тысяч'
}

const MILL_SFX = (n: number) => {
  const r100 = n % 100
  if (r100 >= 11 && r100 <= 14) return 'миллионов'
  const r = n % 10
  if (r === 1) return 'миллион'
  if (r >= 2 && r <= 4) return 'миллиона'
  return 'миллионов'
}

function threeDigitsToWords(n: number, fem = false): string {
  if (n === 0) return ''
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10
  if (h) parts.push(HUND[h])
  if (t === 1) {
    parts.push(fem ? THOU[t * 10 + o] : ONES[t * 10 + o])
  } else {
    if (t) parts.push(TENS[t])
    if (o) parts.push(fem ? THOU[o] : ONES[o])
  }
  return parts.join(' ')
}

export function numberToWords(n: number): string {
  if (n === 0) return 'ноль'
  const parts: string[] = []
  const mill = Math.floor(n / 1_000_000)
  const thou = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  if (mill) {
    parts.push(threeDigitsToWords(mill, false))
    parts.push(MILL_SFX(mill))
  }
  if (thou) {
    parts.push(threeDigitsToWords(thou, true))
    parts.push(THOUS_SFX(thou))
  }
  if (rest || (!mill && !thou)) {
    parts.push(threeDigitsToWords(rest, false))
  }
  return parts.filter(Boolean).join(' ')
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function parseRuAmount(s: string): number {
  const n = parseInt(s.replace(/\s/g, '').replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

export function formatIsoDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}.${m[2]}.${m[1]}`
  return s
}

export function useDocumentEditorFields(params: UseDocumentEditorFieldsParams) {
  const { selectedTpl, fieldValues, fieldAutoFilled, ctx, editorEl, editorContent, step, copyMsg } = params

  const varsOpen = ref(false)

  const computedRemaining = computed<string>(() => {
    const priceNum = parseRuAmount(fieldValues.value['price'] || '')
    const advAmt   = parseRuAmount(fieldValues.value['advance_amount'] || '')
    if (!priceNum || !advAmt) return ''
    const rem = priceNum - advAmt
    if (rem <= 0) return ''
    return `${rem.toLocaleString('ru-RU')} руб.`
  })

  const allVars = computed<TemplateVar[]>(() => {
    const result: TemplateVar[] = []
    const vals = fieldValues.value

    if (selectedTpl.value) {
      for (const f of selectedTpl.value.fields) {
        result.push({ key: f.key, label: f.label, value: vals[f.key] || '', group: 'Поля шаблона' })
      }
    }

    const p = ctx.value?.project
    const projectVars: Array<[string, string, string]> = [
      ['client_name',          'ФИО клиента',              p?.client_name || vals.client_name || ''],
      ['client_phone',         'Телефон клиента',           p?.phone || vals.client_phone || ''],
      ['client_email',         'Email клиента',             p?.email || vals.client_email || ''],
      ['client_passport',      'Паспорт (серия номер)',     vals.client_passport || ''],
      ['client_passport_issued','Паспорт выдан',            vals.client_passport_issued || ''],
      ['client_passport_date', 'Дата выдачи паспорта',      vals.client_passport_date || ''],
      ['client_registration',  'Адрес регистрации',         vals.client_registration || ''],
      ['client_inn',           'ИНН клиента',               vals.client_inn || ''],
      ['client_address',       'Адрес клиента',             vals.client_address || ''],
      ['object_address',       'Адрес объекта',             p?.objectAddress || vals.object_address || ''],
      ['object_type',          'Тип объекта',               p?.objectType || vals.object_type || ''],
      ['area',                 'Площадь (кв.м)',            p?.objectArea || vals.area || ''],
      ['budget',               'Бюджет',                    p?.budget || vals.budget || ''],
      ['deadline',             'Срок выполнения',           p?.deadline || vals.deadline || ''],
      ['style',                'Стиль интерьера',           p?.style || vals.style || ''],
      ['contractor_name',      'Подрядчик',                 vals.contractor_name || ''],
      ['contractor_inn',       'ИНН подрядчика',            vals.contractor_inn || ''],
      ['contractor_address',   'Адрес подрядчика',          vals.contractor_address || ''],
      ['contractor_phone',     'Телефон подрядчика',        vals.contractor_phone || ''],
      ['contractor_account',   'Расчётный счёт',            vals.contractor_account || ''],
      ['contractor_bik',       'БИК',                       vals.contractor_bik || ''],
      ['contractor_bank',      'Банк',                      vals.contractor_bank || ''],
      ['remaining_amount',     'Остаток суммы',             computedRemaining.value || ''],
    ]
    for (const [key, label, value] of projectVars) {
      if (!result.find(r => r.key === key)) {
        result.push({ key, label, value, group: 'Данные проекта' })
      }
    }

    const executorVars: Array<[string, string]> = [
      ['executor_name',            'ФИО исполнителя'],
      ['executor_inn',             'ИНН исполнителя'],
      ['executor_passport',        'Паспорт исполнителя'],
      ['executor_passport_issued', 'Паспорт выдан'],
      ['executor_passport_date',   'Дата выдачи'],
      ['executor_registration',    'Прописка исполнителя'],
      ['executor_phone',           'Телефон исполнителя'],
      ['executor_email',           'Email исполнителя'],
      ['executor_bank',            'Банк'],
      ['executor_bik',             'БИК'],
      ['executor_account',         'Расчётный счёт'],
      ['executor_corr_account',    'Корреспондентский счёт'],
    ]
    for (const [key, label] of executorVars) {
      if (!result.find(r => r.key === key)) {
        result.push({ key, label, value: vals[key] || EXECUTOR_DEFAULTS[key] || '', group: 'Исполнитель' })
      }
    }

    return result
  })

  function insertVar(key: string) {
    const token = `{{${key}}}`
    if (step.value === 2 && editorEl.value) {
      editorEl.value.focus()
      const sel = window.getSelection()
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(token))
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
        editorContent.value = editorEl.value.innerText
      } else {
        editorContent.value += token
        editorEl.value.innerText = editorContent.value
      }
    } else {
      navigator.clipboard.writeText(token).catch(() => {})
      copyMsg.value = `✓ скопировано: ${token}`
      setTimeout(() => { copyMsg.value = '' }, 2000)
    }
  }

  function generateText(): string {
    if (!selectedTpl.value) return ''
    let text = selectedTpl.value.template
    for (const [k, v] of Object.entries(fieldValues.value)) {
      text = text.split(`{{${k}}}`).join(v || '__________')
    }
    const rem = computedRemaining.value
    text = text.split('{{remaining_amount}}').join(rem || '__________')
    return text
  }

  function computeDerivedFields() {
    const vals = fieldValues.value
    const priceNum = parseRuAmount(vals['price'] || '')

    if (priceNum && vals['advance'] && !vals['advance_amount']) {
      const pct = parseFloat(vals['advance'].replace('%', '').replace(',', '.'))
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        const amt = Math.round(priceNum * pct / 100)
        fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
        fieldAutoFilled.value['advance_amount'] = true
      }
    }

    if (priceNum && !vals['price_words']) {
      const words = capitalize(numberToWords(priceNum))
      const kopecks = `00 копеек`
      fieldValues.value['price_words'] = `${words} рублей ${kopecks}`
      fieldAutoFilled.value['price_words'] = true
    }

    for (const key of ['contract_date', 'client_passport_date', 'act_date', 'date', 'delivery_date']) {
      if (vals[key] && /^\d{4}-\d{2}-\d{2}/.test(vals[key])) {
        fieldValues.value[key] = formatIsoDate(vals[key])
        fieldAutoFilled.value[key] = true
      }
    }
  }

  watch(
    () => [fieldValues.value['price'], fieldValues.value['advance']],
    ([price, advance]) => {
      if (!price) return
      const priceNum = parseRuAmount(price)
      if (!priceNum) return

      const pct = parseFloat((advance || '').replace('%', '').replace(',', '.'))
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        const amt = Math.round(priceNum * pct / 100)
        fieldValues.value['advance_amount'] = `${amt.toLocaleString('ru-RU')} руб.`
        fieldAutoFilled.value['advance_amount'] = true
      }
      if (!fieldValues.value['price_words']) {
        fieldValues.value['price_words'] = `${capitalize(numberToWords(priceNum))} рублей 00 копеек`
        fieldAutoFilled.value['price_words'] = true
      }
    }
  )

  return {
    varsOpen,
    computedRemaining,
    allVars,
    insertVar,
    generateText,
    computeDerivedFields,
  }
}
