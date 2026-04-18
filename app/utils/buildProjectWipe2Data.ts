import { getBriefSections } from '~~/shared/constants/brief-sections'
import { presetLabel } from '~~/shared/constants/presets'
import type { Wipe2EntityData } from '~~/shared/types/wipe2'

// ── Internal label/color maps ──
const _W2_SP_LABELS: Record<string, string> = {
  '': 'не задан', in_work: 'в работе', sent_to_client: 'отправлен клиенту',
  revision: 'на доработке', approved: 'согласован',
}
const _W2_SP_COLORS: Record<string, string> = {
  '': 'muted', in_work: 'blue', sent_to_client: 'amber', revision: 'red', approved: 'green',
}

function _w2FormatMoney(value: unknown): string {
  const amount = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function _w2StatusTone(status: unknown): 'default' | 'accent' | 'success' | 'muted' {
  const normalized = String(status ?? '').toLowerCase()
  if (!normalized) return 'muted'
  if (['approved', 'done', 'paid', 'received', 'signed', 'issued', 'active'].includes(normalized)) return 'success'
  if (['in_work', 'sent', 'ordered', 'shipped', 'revision', 'paused'].includes(normalized)) return 'accent'
  return 'default'
}

function _w2BoolDescription(value: unknown, positive: string, negative: string): string {
  return value ? positive : negative
}

/**
 * Builds the Wipe2EntityData for the admin project page.
 * Pure data transformation — no reactive state.
 */
export function buildProjectWipe2Data(
  project: any,
  currentPage: string,
  extraServicesData: any[],
  workStatusData: any[],
  globalWipe2State: Wipe2EntityData | null,
  linkedClients: any[],
  linkedContractorsList: any[],
  linkedDesignersList: any[],
): Wipe2EntityData | null {
  const p = project
  if (!p) return null
  const pf: Record<string, any> = p.profile ?? {}

  if (currentPage === 'space_planning') {
    const status = pf.sp_status ?? ''
    const files: any[] = pf.sp_files ?? []
    return {
      entityTitle: 'Планировочные решения',
      entitySubtitle: pf.sp_version ? `версия ${pf.sp_version}` : undefined,
      entityStatus: (_W2_SP_LABELS[status] ?? status) || undefined,
      entityStatusColor: _W2_SP_COLORS[status] ?? 'muted',
      sections: [
        {
          title: 'Общая информация',
          fields: [
            { label: 'Версия комплекта', value: pf.sp_version ?? '', description: 'Текущая версия планировочного пакета.', eyebrow: 'версия', tone: pf.sp_version ? 'accent' as const : 'muted' as const },
            { label: 'Статус', value: status, type: 'status' as const, description: 'Этап согласования планировочных решений.', eyebrow: 'процесс', tone: _w2StatusTone(status) },
            { label: 'Отправлено клиенту', value: pf.sp_sent_date ?? '', type: 'date' as const, description: pf.sp_sent_date ? 'Дата последней отправки комплекта.' : 'Пакет еще не отправлялся.', eyebrow: 'коммуникация', tone: pf.sp_sent_date ? 'success' as const : 'muted' as const },
            { label: 'Согласовано', value: pf.sp_approved_date ?? '', type: 'date' as const, description: pf.sp_approved_date ? 'Клиент подтвердил текущую версию.' : 'Ожидается согласование.', eyebrow: 'решение клиента', tone: pf.sp_approved_date ? 'success' as const : 'muted' as const },
            { label: 'Комментарий архитектора', value: pf.sp_architect_notes ?? '', type: 'multiline' as const, description: 'Внутренние пояснения по логике планировки.', eyebrow: 'архитектор', tone: pf.sp_architect_notes ? 'default' as const : 'muted' as const },
            { label: 'Замечания клиента', value: pf.sp_client_notes ?? '', type: 'multiline' as const, description: 'Фидбек по сценарию жизни и составу помещений.', eyebrow: 'обратная связь', tone: pf.sp_client_notes ? 'accent' as const : 'muted' as const },
          ],
        },
        {
          title: 'Согласование',
          fields: [
            { label: 'Размеры проверены', value: !!pf.sp_dimensions_checked, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_dimensions_checked, 'Ключевые размеры проверены на объекте.', 'Проверка размеров еще не завершена.'), eyebrow: 'контроль', tone: pf.sp_dimensions_checked ? 'success' as const : 'muted' as const },
            { label: 'Зонирование согласовано', value: !!pf.sp_zones_approved, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_zones_approved, 'Клиент утвердил функциональные зоны.', 'Зонирование пока в обсуждении.'), eyebrow: 'сценарий', tone: pf.sp_zones_approved ? 'success' as const : 'accent' as const },
            { label: 'Геометрия заморожена', value: !!pf.sp_geometry_locked, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_geometry_locked, 'Планировку можно брать в дальнейшую разработку.', 'Геометрия еще может меняться.'), eyebrow: 'фиксация', tone: pf.sp_geometry_locked ? 'success' as const : 'muted' as const },
          ],
        },
        ...(files.length ? [{
          title: 'Файлы планировок',
          fields: files.map((f: any) => ({
            label: f.label || f.filename || 'файл',
            value: f.approval ? (_W2_SP_LABELS[f.approval] ?? f.approval) : 'на рассмотрении',
            type: 'status' as const,
            description: f.filename || 'Файл приложен к текущей версии планировки.',
            caption: f.updatedAt || f.createdAt || '',
            eyebrow: 'файл комплекта',
            badge: f.ext || 'plan',
            tone: _w2StatusTone(f.approval),
          })),
        }] : []),
      ],
    }
  }

  // ── Брифинг (self_profile / brief) ──────────────────────────
  if (currentPage === 'self_profile' || currentPage === 'brief') {
    const projectType = p.projectType || 'apartment'
    const sections = getBriefSections(projectType)
    const filled = sections
      .filter(s => s.type === 'fields' && s.fields?.length)
      .map(s => ({
        title: s.title,
        fields: (s.fields ?? []).map(f => ({
          label: f.label,
          value: pf[f.key] ?? '',
          type: (f.type === 'textarea' ? 'multiline' : 'text') as 'multiline' | 'text',
        })),
      }))
    const completedCount = Object.keys(pf).filter(k => k.startsWith('brief_') && pf[k]).length
    return {
      entityTitle: 'Брифинг',
      entitySubtitle: `тип: ${projectType}`,
      entityStatus: pf.brief_completed ? 'заполнен' : completedCount > 0 ? 'в процессе' : 'не заполнен',
      entityStatusColor: pf.brief_completed ? 'green' : completedCount > 0 ? 'amber' : 'muted',
      sections: filled,
    }
  }

  // ── Первичный контакт ────────────────────────────────────────
  if (currentPage === 'first_contact') {
    return {
      entityTitle: 'Первичный контакт',
      entityStatus: pf.lead_status || undefined,
      entityStatusColor: pf.lead_status === 'won' ? 'green' : pf.lead_status === 'lost' ? 'red' : pf.lead_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Контакт',
          fields: [
            { label: 'Имя / ФИО', value: pf.fio ?? '' },
            { label: 'Телефон', value: pf.phone ?? '' },
            { label: 'Email', value: pf.email ?? '' },
            { label: 'Источник', value: pf.lead_source ?? '' },
            { label: 'Дата обращения', value: pf.lead_date ?? '', type: 'date' as const },
          ],
        },
        {
          title: 'Встреча',
          fields: [
            { label: 'Дата встречи', value: pf.lead_meeting_date ?? '', type: 'date' as const },
            { label: 'Время', value: pf.lead_meeting_time ?? '' },
            { label: 'Место', value: pf.lead_meeting_place ?? '' },
            { label: 'Адрес', value: pf.meeting_map_address ?? '' },
            { label: 'Заметки', value: pf.lead_meeting_notes ?? '', type: 'multiline' as const },
            { label: 'Первые пожелания', value: pf.lead_first_wishes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Обмеры / аудит ──────────────────────────────────────────
  if (currentPage === 'site_survey') {
    return {
      entityTitle: 'Обмеры и аудит',
      entityStatus: pf.survey_status || undefined,
      entityStatusColor: pf.survey_status === 'done' ? 'green' : pf.survey_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Общие данные',
          fields: [
            { label: 'Статус', value: pf.survey_status ?? '', type: 'status' as const },
            { label: 'Дата обмеров', value: pf.survey_date ?? '', type: 'date' as const },
            { label: 'Инженер', value: pf.survey_engineer ?? '' },
            { label: 'Адрес объекта', value: pf.survey_address ?? '' },
            { label: 'Площадь, м²', value: pf.survey_area ?? '' },
            { label: 'Высота потолков', value: pf.survey_ceiling ?? '' },
          ],
        },
        {
          title: 'Инженерия',
          fields: [
            { label: 'Заметки инженерии', value: pf.survey_mep_notes ?? '', type: 'multiline' as const },
            { label: 'Электрика', value: pf.mep_electrical ?? '', type: 'multiline' as const },
            { label: 'Сантехника', value: pf.mep_plumbing ?? '', type: 'multiline' as const },
            { label: 'Отопление', value: pf.mep_heating ?? '', type: 'multiline' as const },
            { label: 'Вентиляция', value: pf.mep_ventilation ?? '', type: 'multiline' as const },
          ],
        },
        {
          title: 'Замечания',
          fields: [
            { label: 'Выявленные проблемы', value: pf.survey_issues ?? '', type: 'multiline' as const },
            { label: 'Рекомендации', value: pf.survey_recommendations ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.survey_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── ТЗ и договор ────────────────────────────────────────────
  if (currentPage === 'tor_contract') {
    return {
      entityTitle: 'ТЗ и договор',
      entityStatus: pf.contract_status || undefined,
      entityStatusColor: pf.contract_status === 'signed' ? 'green' : pf.contract_status === 'draft' ? 'muted' : pf.contract_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Договор',
          fields: [
            { label: 'Статус', value: pf.contract_status ?? '', type: 'status' as const },
            { label: 'Номер договора', value: pf.contract_number ?? '' },
            { label: 'Дата договора', value: pf.contract_date ?? '', type: 'date' as const },
            { label: 'Стороны', value: pf.contract_parties ?? '', type: 'multiline' as const },
            { label: 'Тариф', value: pf.service_tariff ?? '' },
            { label: 'Примечания', value: pf.contract_notes ?? '', type: 'multiline' as const },
          ],
        },
        {
          title: 'Счёт и оплата',
          fields: [
            { label: 'Статус оплаты', value: pf.payment_status ?? '', type: 'status' as const },
            { label: 'Сумма', value: pf.invoice_amount ?? '', type: 'currency' as const },
            { label: 'Аванс, %', value: pf.invoice_advance_pct ?? '' },
            { label: 'Дата счёта', value: pf.invoice_date ?? '', type: 'date' as const },
          ],
        },
        {
          title: 'Техническое задание',
          fields: [
            { label: 'Объём работ', value: pf.tor_scope ?? '', type: 'multiline' as const },
            { label: 'Исключения', value: pf.tor_exclusions ?? '', type: 'multiline' as const },
            { label: 'Сроки', value: pf.tor_timeline ?? '', type: 'multiline' as const },
            { label: 'Результаты (deliverables)', value: pf.tor_deliverables ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Мудборд ──────────────────────────────────────────────────
  if (currentPage === 'moodboard') {
    const imgs: any[] = Array.isArray(pf.mb_images) ? pf.mb_images : []
    return {
      entityTitle: 'Мудборд',
      entityStatus: pf.mb_status || undefined,
      entityStatusColor: pf.mb_status === 'approved' ? 'green' : pf.mb_status === 'in_work' ? 'blue' : 'muted',
      sections: [
        {
          title: 'Концепция',
          fields: [
            { label: 'Статус', value: pf.mb_status ?? '', type: 'status' as const },
            { label: 'Стиль', value: Array.isArray(pf.mb_style_tags) ? pf.mb_style_tags.join(', ') : (pf.mb_style_tags ?? '') },
            { label: 'Ключевые слова', value: Array.isArray(pf.mb_keywords) ? pf.mb_keywords.join(', ') : (pf.mb_keywords ?? '') },
            { label: 'Ссылки', value: pf.mb_links ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.mb_notes ?? '', type: 'multiline' as const },
            { label: 'Антипримеры', value: pf.mb_dislikes ?? '', type: 'multiline' as const },
          ],
        },
        ...(imgs.length ? [{
          title: `Изображения (${imgs.length})`,
          fields: [{ label: 'Загружено', value: String(imgs.length) }],
        }] : []),
      ],
    }
  }

  // ── Согласование концепции ───────────────────────────────────
  if (currentPage === 'concept_approval') {
    return {
      entityTitle: 'Согласование концепции',
      entitySubtitle: pf.ca_version ? `версия ${pf.ca_version}` : undefined,
      entityStatus: pf.ca_status || undefined,
      entityStatusColor: pf.ca_status === 'approved' ? 'green' : pf.ca_status === 'revision' ? 'red' : pf.ca_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Статус',
          fields: [
            { label: 'Версия', value: pf.ca_version ?? '' },
            { label: 'Статус', value: pf.ca_status ?? '', type: 'status' as const },
            { label: 'Отправлено', value: pf.ca_sent_date ?? '', type: 'date' as const },
            { label: 'Дата согласования', value: pf.ca_approval_date ?? '', type: 'date' as const },
            { label: 'Геометрия заморожена', value: !!pf.ca_geometry_locked, type: 'boolean' as const },
          ],
        },
        {
          title: 'Замечания',
          fields: [
            { label: 'Заметки', value: pf.ca_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Рабочие чертежи ─────────────────────────────────────────
  if (currentPage === 'working_drawings') {
    return {
      entityTitle: 'Рабочие чертежи',
      entitySubtitle: pf.wd_version ? `версия ${pf.wd_version}` : undefined,
      entityStatus: pf.wd_status || undefined,
      entityStatusColor: pf.wd_status === 'approved' ? 'green' : pf.wd_status === 'revision' ? 'red' : pf.wd_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Версия', value: pf.wd_version ?? '' },
            { label: 'Статус', value: pf.wd_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.wd_issue_date ?? '', type: 'date' as const },
            { label: 'Дата согласования', value: pf.wd_approved_date ?? '', type: 'date' as const },
            { label: 'Масштаб', value: pf.wd_scale ?? '' },
            { label: 'Листов', value: pf.wd_sheets ?? '' },
          ],
        },
        {
          title: 'Контроль',
          fields: [
            { label: 'Размеры проверены', value: !!pf.wd_dimensions_ok, type: 'boolean' as const },
            { label: 'Нормы соблюдены', value: !!pf.wd_regulations_ok, type: 'boolean' as const },
            { label: 'Согласовано с инженерией', value: !!pf.wd_mep_coordinated, type: 'boolean' as const },
            { label: 'Заморожено', value: !!pf.wd_locked, type: 'boolean' as const },
            { label: 'Заметки', value: pf.wd_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Спецификации ─────────────────────────────────────────────
  if (currentPage === 'specifications') {
    const items: any[] = Array.isArray(pf.spec_items) ? pf.spec_items : []
    return {
      entityTitle: 'Спецификации',
      entitySubtitle: pf.spec_version ? `версия ${pf.spec_version}` : undefined,
      entityStatus: pf.spec_status || undefined,
      entityStatusColor: pf.spec_status === 'approved' ? 'green' : pf.spec_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Версия', value: pf.spec_version ?? '' },
            { label: 'Статус', value: pf.spec_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.spec_issue_date ?? '', type: 'date' as const },
            { label: 'Позиций', value: items.length ? String(items.length) : (pf.spec_items_count ?? '') },
            { label: 'Заметки', value: pf.spec_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Инженерия (MEP) ──────────────────────────────────────────
  if (currentPage === 'mep_integration') {
    return {
      entityTitle: 'Инженерные системы',
      entityStatus: pf.mep_status || undefined,
      entityStatusColor: pf.mep_status === 'approved' ? 'green' : pf.mep_status === 'revision' ? 'red' : pf.mep_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Статус',
          fields: [
            { label: 'Общий статус', value: pf.mep_status ?? '', type: 'status' as const },
            { label: 'Статус электрики', value: pf.mep_electrical_status ?? '', type: 'status' as const },
            { label: 'Электроподрядчик', value: pf.mep_electrical_contractor ?? '' },
            { label: 'Нагрузки рассчитаны', value: !!pf.mep_loads_calculated, type: 'boolean' as const },
            { label: 'Согласования получены', value: !!pf.mep_permits_ok, type: 'boolean' as const },
            { label: 'Коллизии проверены', value: !!pf.mep_clash_checked, type: 'boolean' as const },
          ],
        },
        {
          title: 'Заметки',
          fields: [
            { label: 'Электрика', value: pf.mep_electrical_notes ?? '', type: 'multiline' as const },
            { label: 'Общие заметки', value: pf.mep_general_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Финальный альбом ─────────────────────────────────────────
  if (currentPage === 'design_album_final') {
    return {
      entityTitle: 'Финальный альбом',
      entitySubtitle: pf.daf_version ? `версия ${pf.daf_version}` : undefined,
      entityStatus: pf.daf_status || undefined,
      entityStatusColor: pf.daf_status === 'issued' ? 'green' : pf.daf_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Параметры',
          fields: [
            { label: 'Версия', value: pf.daf_version ?? '' },
            { label: 'Статус', value: pf.daf_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.daf_issue_date ?? '', type: 'date' as const },
            { label: 'Страниц', value: pf.daf_page_count ?? '' },
            { label: 'Формат', value: pf.daf_format ?? '' },
          ],
        },
        {
          title: 'Состав альбома',
          fields: [
            { label: 'Чертежи включены', value: !!pf.daf_drawings_included, type: 'boolean' as const },
            { label: 'Спецификации включены', value: !!pf.daf_specs_included, type: 'boolean' as const },
            { label: 'Инженерия включена', value: !!pf.daf_mep_included, type: 'boolean' as const },
            { label: 'Подписан', value: !!pf.daf_signed, type: 'boolean' as const },
            { label: 'Заметки', value: pf.daf_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Поставщики ───────────────────────────────────────────────
  if (currentPage === 'suppliers') {
    const items: any[] = Array.isArray(pf.sup_items) ? pf.sup_items : []
    return {
      entityTitle: 'Поставщики',
      entityStatus: pf.sup_status || undefined,
      entityStatusColor: pf.sup_status === 'done' ? 'green' : pf.sup_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Обзор',
          fields: [
            { label: 'Статус', value: pf.sup_status ?? '', type: 'status' as const },
            { label: 'Поставщиков', value: String(items.length) },
            { label: 'Заметки', value: pf.sup_notes ?? '', type: 'multiline' as const },
          ],
        },
        ...(items.slice(0, 8).map((s: any, i: number) => ({
          title: s.name || `Поставщик ${i + 1}`,
          fields: [
            { label: 'Контакт', value: s.contact ?? '' },
            { label: 'Категория', value: s.category ?? '' },
            { label: 'Статус', value: s.status ?? '', type: 'status' as const },
          ],
        }))),
      ],
    }
  }

  // ── Статус закупок ───────────────────────────────────────────
  if (currentPage === 'procurement_status') {
    const orders: any[] = Array.isArray(pf.ps_orders) ? pf.ps_orders : []
    return {
      entityTitle: 'Статус закупок',
      entityStatus: pf.ps_status || undefined,
      entityStatusColor: pf.ps_status === 'done' ? 'green' : pf.ps_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Обзор',
          fields: [
            { label: 'Статус', value: pf.ps_status ?? '', type: 'status' as const },
            { label: 'Заказов', value: String(orders.length) },
            { label: 'Заметки', value: pf.ps_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── План строительства ───────────────────────────────────────
  if (currentPage === 'construction_plan') {
    return {
      entityTitle: 'План строительства',
      entityStatus: pf.cp_status || undefined,
      entityStatusColor: pf.cp_status === 'done' ? 'green' : pf.cp_status === 'in_work' ? 'blue' : pf.cp_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Статус', value: pf.cp_status ?? '', type: 'status' as const },
            { label: 'Дата начала', value: pf.cp_start_date ?? '', type: 'date' as const },
            { label: 'Дата окончания', value: pf.cp_end_date ?? '', type: 'date' as const },
            { label: 'Подрядчик', value: pf.cp_contractor ?? '' },
            { label: 'Прораб', value: pf.cp_supervisor ?? '' },
          ],
        },
        {
          title: 'Бюджет',
          fields: [
            { label: 'Бюджет', value: pf.cp_budget_total ?? '', type: 'currency' as const },
            { label: 'Израсходовано', value: pf.cp_budget_spent ?? '', type: 'currency' as const },
            { label: 'Заметки', value: pf.cp_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Журнал работ ─────────────────────────────────────────────
  if (currentPage === 'work_log') {
    const entries: any[] = Array.isArray(pf.wl_entries) ? pf.wl_entries : []
    return {
      entityTitle: 'Журнал работ',
      entitySubtitle: entries.length ? `${entries.length} записей` : undefined,
      sections: [
        {
          title: 'Записи',
          fields: entries.slice(0, 16).map((e: any) => ({
            label: e.date ? new Date(e.date).toLocaleDateString('ru') : 'запись',
            value: e.text ?? e.type ?? '',
            type: 'multiline' as const,
          })),
        },
      ],
    }
  }

  // ── Фото объекта ─────────────────────────────────────────────
  if (currentPage === 'site_photos') {
    const photos: any[] = Array.isArray(pf.sp2_photos) ? pf.sp2_photos : []
    const tagCounts: Record<string, number> = {}
    photos.forEach((ph: any) => (ph.tags ?? []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1 }))
    return {
      entityTitle: 'Фото объекта',
      entitySubtitle: photos.length ? `${photos.length} фото` : undefined,
      sections: [
        {
          title: 'Статистика',
          fields: [
            { label: 'Всего фото', value: String(photos.length) },
            ...Object.entries(tagCounts).slice(0, 8).map(([tag, cnt]) => ({
              label: tag, value: String(cnt),
            })),
          ],
        },
      ],
    }
  }

  // ── Дефектная ведомость ──────────────────────────────────────
  if (currentPage === 'punch_list') {
    const items: any[] = Array.isArray(pf.pl_items) ? pf.pl_items : []
    const open = items.filter((i: any) => i.status === 'open' || !i.status).length
    const fixed = items.filter((i: any) => i.status === 'fixed' || i.status === 'verified').length
    return {
      entityTitle: 'Дефектная ведомость',
      entityStatus: open === 0 && items.length > 0 ? 'закрыто' : open > 0 ? 'открытые дефекты' : undefined,
      entityStatusColor: open === 0 && items.length > 0 ? 'green' : open > 0 ? 'red' : 'muted',
      sections: [
        {
          title: 'Статистика',
          fields: [
            { label: 'Всего позиций', value: String(items.length) },
            { label: 'Открытых', value: String(open) },
            { label: 'Исправлено', value: String(fixed) },
          ],
        },
        ...(items.slice(0, 10).map((it: any, i: number) => ({
          title: `${i + 1}. ${it.title || it.description || 'дефект'}`,
          fields: [
            { label: 'Статус', value: it.status ?? '', type: 'status' as const },
            { label: 'Приоритет', value: it.priority ?? '' },
          ],
        }))),
      ],
    }
  }

  // ── Акт приёмки ──────────────────────────────────────────────
  if (currentPage === 'commissioning_act') {
    return {
      entityTitle: 'Акт приёмки',
      entityStatus: pf.cma_status || undefined,
      entityStatusColor: pf.cma_status === 'signed' ? 'green' : pf.cma_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Реквизиты',
          fields: [
            { label: 'Статус', value: pf.cma_status ?? '', type: 'status' as const },
            { label: 'Номер акта', value: pf.cma_act_number ?? '' },
            { label: 'Дата подписания', value: pf.cma_sign_date ?? '', type: 'date' as const },
            { label: 'Объект', value: pf.cma_location ?? '' },
            { label: 'Сумма договора', value: pf.cma_contract_sum ?? '', type: 'currency' as const },
          ],
        },
        {
          title: 'Содержание',
          fields: [
            { label: 'Описание работ', value: pf.cma_works_description ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.cma_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Подпись клиента ──────────────────────────────────────────
  if (currentPage === 'client_sign_off') {
    return {
      entityTitle: 'Подпись клиента',
      entityStatus: pf.cso_status || undefined,
      entityStatusColor: pf.cso_status === 'signed' ? 'green' : pf.cso_status === 'sent' ? 'amber' : pf.cso_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Документ',
          fields: [
            { label: 'Статус', value: pf.cso_status ?? '', type: 'status' as const },
            { label: 'Версия', value: pf.cso_version ?? '' },
            { label: 'Имя клиента', value: pf.cso_client_name ?? '' },
            { label: 'Отправлено', value: pf.cso_sent_date ?? '', type: 'date' as const },
            { label: 'Подписано', value: pf.cso_sign_date ?? '', type: 'date' as const },
            { label: 'Комментарий клиента', value: pf.cso_client_comment ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.cso_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  if (currentPage === 'overview') {
    const statusLabels: Record<string, string> = {
      lead: 'лид', active: 'активен', paused: 'на паузе', done: 'завершён', archived: 'архив',
    }
    const statusColors: Record<string, string> = {
      lead: 'muted', active: 'green', paused: 'amber', done: 'blue', archived: 'muted',
    }
    return {
      entityTitle: p.title,
      entitySubtitle: presetLabel(p.projectType ?? ''),
      entityStatus: statusLabels[p.status] ?? p.status,
      entityStatusColor: statusColors[p.status] ?? 'muted',
      sections: [
        {
          title: 'Проект',
          fields: [
            { label: 'Название', value: p.title, description: 'Рабочее имя проекта в админке и кабинетах.', eyebrow: 'identity', badge: p.slug, tone: 'accent' as const, span: 2 as const },
            { label: 'Тип объекта', value: presetLabel(p.projectType ?? ''), description: 'Определяет шаблоны страниц и brief-секции.', eyebrow: 'preset', tone: 'default' as const },
            { label: 'Статус', value: statusLabels[p.status] ?? p.status, type: 'status' as const, description: 'Текущий жизненный цикл проекта.', eyebrow: 'pipeline', tone: _w2StatusTone(p.status) },
            { label: 'Slug', value: p.slug, description: 'Используется в ссылках и маршрутах кабинета.', eyebrow: 'route', tone: 'muted' as const },
            { label: 'Разделов', value: String((p.pages ?? []).length), type: 'number' as const, description: 'Сколько страниц подключено в проекте.', eyebrow: 'structure', tone: 'success' as const },
          ],
        },
        {
          title: 'Участники',
          fields: [
            {
              label: 'Клиенты',
              value: linkedClients.length
                ? linkedClients.map((c: any) => c.name).join(', ')
                : 'не привязан',
              description: linkedClients.length ? `Привязано клиентов: ${linkedClients.length}.` : 'Для клиентского кабинета нужен хотя бы один клиент.',
              eyebrow: 'client side',
              badge: linkedClients.length ? String(linkedClients.length) : '0',
              tone: linkedClients.length ? 'success' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Подрядчики',
              value: linkedContractorsList.length
                ? linkedContractorsList.map((c: any) => c.name).join(', ')
                : 'не привязаны',
              description: linkedContractorsList.length ? `В работе ${linkedContractorsList.length} подрядчиков.` : 'Подрядчики пока не назначены.',
              eyebrow: 'delivery',
              badge: linkedContractorsList.length ? String(linkedContractorsList.length) : '0',
              tone: linkedContractorsList.length ? 'accent' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Дизайнеры',
              value: linkedDesignersList.length
                ? linkedDesignersList.map((d: any) => d.name).join(', ')
                : 'не привязаны',
              description: linkedDesignersList.length ? `Ответственных дизайнеров: ${linkedDesignersList.length}.` : 'Команда дизайна еще не указана.',
              eyebrow: 'creative team',
              badge: linkedDesignersList.length ? String(linkedDesignersList.length) : '0',
              tone: linkedDesignersList.length ? 'success' as const : 'muted' as const,
              span: 2 as const,
            },
          ],
        },
      ],
    }
  }

  if (currentPage === 'procurement_list') {
    const items: any[] = pf.proc_items ?? []
    const pending = items.filter((i: any) => i.status === 'pending').length
    const ordered = items.filter((i: any) => ['ordered', 'shipped', 'received'].includes(i.status)).length
    const received = items.filter((i: any) => i.status === 'received').length
    const total = items.reduce((s: number, i: any) => {
      const qty = parseFloat(i.quantity) || 1
      const price = parseFloat(i.unitPrice) || 0
      return s + qty * price
    }, 0)
    return {
      entityTitle: 'Список закупок',
      entitySubtitle: `${items.length} позиций`,
      entityStatus: received === items.length && items.length > 0 ? 'получено' : ordered > 0 ? 'в заказе' : 'ожидание',
      entityStatusColor: received === items.length && items.length > 0 ? 'green' : ordered > 0 ? 'amber' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Позиций', value: String(items.length), type: 'number' as const, description: 'Всего строк в закупочном листе.', eyebrow: 'масштаб', tone: items.length ? 'success' as const : 'muted' as const },
            { label: 'Ожидание', value: String(pending), type: 'number' as const, description: 'Позиции без размещенного заказа.', eyebrow: 'backlog', tone: pending ? 'accent' as const : 'muted' as const },
            { label: 'Заказано', value: String(ordered), type: 'number' as const, description: 'Уже отправлено поставщикам.', eyebrow: 'execution', tone: ordered ? 'success' as const : 'muted' as const },
            { label: 'Получено', value: String(received), type: 'number' as const, description: 'Фактически закрытые поставки.', eyebrow: 'receipt', tone: received ? 'success' as const : 'muted' as const },
            { label: 'Сумма', value: _w2FormatMoney(total), description: 'Оценка бюджета по всем позициям списка.', eyebrow: 'budget', tone: total > 0 ? 'accent' as const : 'muted' as const, span: 2 as const },
          ],
        },
        ...(items.slice(0, 12).map((item: any) => ({
          title: item.name || 'позиция',
          fields: [
            { label: 'Статус', value: item.status ?? '', type: 'status' as const, description: item.vendor ? `Поставщик: ${item.vendor}.` : 'Поставщик еще не указан.', eyebrow: 'logistics', badge: item.vendor || 'vendor', tone: _w2StatusTone(item.status) },
            { label: 'Кол-во', value: item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : '—', description: 'Планируемый объем закупки.', eyebrow: 'quantity', tone: item.quantity ? 'default' as const : 'muted' as const },
            { label: 'Цена', value: _w2FormatMoney(item.unitPrice), description: item.quantity && item.unitPrice ? `Сумма строки: ${_w2FormatMoney((parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0))}.` : 'Цена еще не заполнена.', eyebrow: 'unit price', tone: item.unitPrice ? 'accent' as const : 'muted' as const },
            { label: 'Заметки', value: item.notes ?? '', type: 'multiline' as const, description: 'Комментарий по артикулу, замене или срокам.', eyebrow: 'details', tone: item.notes ? 'default' as const : 'muted' as const },
          ],
        }))),
      ],
    }
  }

  if (currentPage === 'extra_services') {
    const svcs = extraServicesData
    const paid = svcs.filter((s: any) => s.status === 'paid').length
    const approved = svcs.filter((s: any) => s.status === 'approved').length
    const totalCost = svcs.reduce((s: number, i: any) => {
      const qty = parseFloat(i.quantity) || 1
      const price = parseFloat(i.unitPrice) || 0
      return s + qty * price
    }, 0)
    return {
      entityTitle: 'Доп. услуги',
      entitySubtitle: `${svcs.length} услуг`,
      entityStatus: paid > 0 ? 'оплачено' : approved > 0 ? 'согласовано' : 'ожидание',
      entityStatusColor: paid > 0 ? 'green' : approved > 0 ? 'amber' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Услуг', value: String(svcs.length), type: 'number' as const, description: 'Всего дополнительных позиций сверх основного договора.', eyebrow: 'объем', tone: svcs.length ? 'success' as const : 'muted' as const },
            { label: 'Оплачено', value: String(paid), type: 'number' as const, description: 'Позиции с подтвержденной оплатой.', eyebrow: 'cashflow', tone: paid ? 'success' as const : 'muted' as const },
            { label: 'Согласовано', value: String(approved), type: 'number' as const, description: 'Услуги, которые клиент уже одобрил.', eyebrow: 'approval', tone: approved ? 'accent' as const : 'muted' as const },
            { label: 'Сумма', value: _w2FormatMoney(totalCost), description: 'Сумма всех дополнительных услуг.', eyebrow: 'budget', tone: totalCost > 0 ? 'accent' as const : 'muted' as const },
          ],
        },
        ...(svcs.slice(0, 10).map((svc: any) => ({
          title: svc.title || svc.serviceKey || 'услуга',
          fields: [
            { label: 'Статус', value: svc.status ?? '', type: 'status' as const, description: svc.serviceKey ? `Ключ услуги: ${svc.serviceKey}.` : 'Дополнительная услуга проекта.', eyebrow: 'workflow', badge: svc.serviceKey || 'extra', tone: _w2StatusTone(svc.status) },
            { label: 'Кол-во', value: svc.quantity ? `${svc.quantity} ${svc.unit ?? ''}`.trim() : '—', description: 'Объем согласованной услуги.', eyebrow: 'scope', tone: svc.quantity ? 'default' as const : 'muted' as const },
            { label: 'Цена', value: _w2FormatMoney(svc.unitPrice), description: svc.quantity && svc.unitPrice ? `Итог по позиции: ${_w2FormatMoney((parseFloat(svc.quantity) || 1) * (parseFloat(svc.unitPrice) || 0))}.` : 'Стоимость еще не зафиксирована.', eyebrow: 'стоимость', tone: svc.unitPrice ? 'accent' as const : 'muted' as const },
            { label: 'Описание', value: svc.description ?? '', type: 'multiline' as const, description: 'Что именно входит в дополнительную услугу.', eyebrow: 'value', tone: svc.description ? 'default' as const : 'muted' as const },
          ],
        }))),
      ],
    }
  }

  if (currentPage === 'work_status') {
    const items = workStatusData
    const inProgress = items.filter((i: any) => i.status === 'in_progress').length
    const done = items.filter((i: any) => i.status === 'done').length
    const planned = items.filter((i: any) => i.status === 'planned').length
    return {
      entityTitle: 'Ход работ',
      entitySubtitle: `${items.length} задач`,
      entityStatus: done === items.length && items.length > 0 ? 'выполнено' : inProgress > 0 ? 'в работе' : 'запланировано',
      entityStatusColor: done === items.length && items.length > 0 ? 'green' : inProgress > 0 ? 'blue' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Задач', value: String(items.length), type: 'number' as const },
            { label: 'В работе', value: String(inProgress), type: 'number' as const },
            { label: 'Выполнено', value: String(done), type: 'number' as const },
            { label: 'Запланировано', value: String(planned), type: 'number' as const },
          ],
        },
        ...(items.slice(0, 10).map((item: any) => ({
          title: item.title || 'задача',
          fields: [
            { label: 'Статус', value: item.status ?? '', type: 'status' as const },
            { label: 'Тип', value: item.workType ?? '' },
            { label: 'Подрядчик', value: item.contractorName ?? '—' },
            { label: 'Дедлайн', value: item.dateEnd ?? '', type: 'date' as const },
            { label: 'Бюджет', value: item.budget ? `${item.budget} ₽` : '—' },
          ],
        }))),
      ],
    }
  }

  // Fallback: компонент мог зарегистрировать данные через registerWipe2Data
  return globalWipe2State
}
