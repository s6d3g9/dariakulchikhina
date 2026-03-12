export const MESSENGER_OPTIONS = ['WhatsApp', 'Telegram', 'Viber'] as const

export const PREFERRED_CONTACT_OPTIONS = ['Звонок', 'WhatsApp', 'Telegram', 'Email'] as const

export const OBJECT_TYPE_OPTIONS = ['новостройка', 'вторичное жильё', 'частный дом', 'коммерческое помещение'] as const

export const BALCONY_OPTIONS = ['нет', 'балкон', 'лоджия', 'два балкона'] as const

export const PARKING_OPTIONS = ['нет', 'наземная', 'подземная'] as const

export const BRIEF_REMOTE_WORK_OPTIONS = ['нет', 'частично', 'постоянно', 'оба партнёра'] as const

export const BRIEF_GUESTS_FREQ_OPTIONS = ['редко', 'несколько раз в месяц', 'еженедельно', 'постоянно'] as const

export const BRIEF_STYLE_OPTIONS = ['минимализм', 'скандинавский', 'контемпорари', 'ар-деко', 'неоклассика', 'лофт', 'японский', 'без предпочтений'] as const

export const BRIEF_COLOR_OPTIONS = ['светлая нейтральная', 'тёплая земляная', 'тёмная насыщенная', 'контрастная', 'без предпочтений'] as const

export const CLIENT_PROFILE_BASE_KEYS = [
  'fio', 'phone', 'email', 'messenger', 'messengerNick', 'preferredContact', 'address',
  'objectAddress', 'objectType', 'objectArea', 'roomCount', 'floor', 'ceilingHeight',
  'hasBalcony', 'parking',
] as const

export const CLIENT_PROFILE_PASSPORT_KEYS = [
  'passport_series', 'passport_number', 'passport_issued_by', 'passport_issue_date',
  'passport_department_code', 'passport_birth_place', 'passport_registration_address',
  'passport_inn', 'passport_snils',
] as const

export const CLIENT_PROFILE_BRIEF_KEYS = [
  // ── Жилые: состав семьи ──────────────────────────────────────────
  'brief_adults_count', 'brief_kids_ages', 'brief_ergonomics', 'brief_handed',
  'brief_pets_desc', 'brief_pets_zone_detail', 'brief_remote_work', 'brief_guests_freq', 'brief_hobbies',
  // ── Жилые: концепция ────────────────────────────────────────────
  'brief_home_mood', 'brief_return_emotion', 'brief_space_image',
  // ── Жилые: ритуалы и распорядок ─────────────────────────────────
  'brief_morning_routine', 'brief_evening_routine', 'brief_cooking_role',
  'brief_bedroom_needs', 'brief_acoustic_zones', 'brief_flex_zones', 'brief_future_changes',
  // ── Жилые: кухня ────────────────────────────────────────────────
  'brief_kitchen_intensity', 'brief_kitchen_surfaces', 'brief_kitchen_cabinets',
  'brief_kitchen_hardware', 'brief_kitchen_cooktop', 'brief_kitchen_oven',
  'brief_kitchen_appliances', 'brief_kitchen_sink',
  // ── Жилые: спорт ────────────────────────────────────────────────
  'brief_sport_zone', 'brief_sport_storage', 'brief_sport_tech',
  // ── Жилые: хранение ─────────────────────────────────────────────
  'brief_storage_volume', 'brief_storage_hidden', 'brief_utility_zone',
  // ── Универсальные: свет ──────────────────────────────────────────
  'brief_light_modes', 'brief_light_dimming', 'brief_light_automation',
  // ── Универсальные: технологии ────────────────────────────────────
  'brief_smart_control', 'brief_acoustics_type', 'brief_tech_equipment',
  // ── Универсальные: стиль ────────────────────────────────────────
  'brief_style_prefer', 'brief_color_mood', 'brief_color_palette',
  'brief_like_refs', 'brief_dislike_refs', 'brief_material_prefs',
  'brief_textures', 'brief_prints', 'brief_art',
  // ── Универсальные: ограничения ───────────────────────────────────
  'brief_budget_limits', 'brief_budget_priorities', 'brief_deadlines_hard',
  'brief_special_notes', 'brief_allergies',
  // ── Коммерческие: концепция проекта ─────────────────────────────
  'brief_project_idea', 'brief_target_audience', 'brief_brand_values',
  'brief_competitors_refs', 'brief_unique_selling',
  // ── Коммерческие: рабочее пространство (офис) ───────────────────
  'brief_ws_workstations', 'brief_ws_meeting_rooms', 'brief_ws_focus_zones',
  'brief_ws_lounge', 'brief_ws_reception', 'brief_ws_brand',
  // ── Коммерческие: проф. кухня (ресторан / кафе / отель) ─────────
  'brief_kp_concept', 'brief_kp_capacity', 'brief_kp_equipment',
  'brief_kp_workflow', 'brief_kp_cold_storage', 'brief_kp_delivery',
  // ── Коммерческие: зоны обслуживания (ресторан / кафе / отель) ───
  'brief_sz_guest_capacity', 'brief_sz_service_style', 'brief_sz_bar_zone',
  'brief_sz_outdoor', 'brief_sz_private_rooms', 'brief_sz_staff_areas',
  // ── Коммерческие: номерной фонд (отель / гостевой дом) ──────────
  'brief_rc_room_count', 'brief_rc_room_types', 'brief_rc_amenities',
  'brief_rc_common_areas', 'brief_rc_spa_gym', 'brief_rc_breakfast',
  // ── Коммерческие: торговая концепция ─────────────────────────────
  'brief_rt_product_category', 'brief_rt_display_type', 'brief_rt_customer_flow',
  'brief_rt_storage_back', 'brief_rt_fitting_rooms', 'brief_rt_checkout',
] as const

export const CLIENT_PROFILE_SERVICE_KEYS = [
  'service_tariff_request',
] as const

export const CLIENT_PROFILE_EDITABLE_KEYS = [...CLIENT_PROFILE_BASE_KEYS, ...CLIENT_PROFILE_PASSPORT_KEYS, ...CLIENT_PROFILE_BRIEF_KEYS, ...CLIENT_PROFILE_SERVICE_KEYS] as const

export type ClientProfileEditableKey = (typeof CLIENT_PROFILE_EDITABLE_KEYS)[number]

export const BRIEF_COMPLETION_KEYS = ['fio', 'phone', 'brief_style_prefer', 'brief_home_mood', 'brief_adults_count', 'brief_hobbies'] as const

export function createEmptyClientProfileDraft() {
  return Object.fromEntries(CLIENT_PROFILE_EDITABLE_KEYS.map((key) => [key, ''])) as Record<ClientProfileEditableKey, string>
}
