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

export const CLIENT_PROFILE_BRIEF_KEYS = [
  'brief_adults_count', 'brief_kids_ages', 'brief_ergonomics', 'brief_handed',
  'brief_pets_desc', 'brief_pets_zone_detail', 'brief_remote_work', 'brief_guests_freq', 'brief_hobbies',
  'brief_style_prefer', 'brief_color_mood', 'brief_color_palette',
  'brief_like_refs', 'brief_dislike_refs', 'brief_material_prefs', 'brief_textures', 'brief_prints', 'brief_art',
  'brief_home_mood', 'brief_return_emotion', 'brief_space_image',
  'brief_morning_routine', 'brief_evening_routine', 'brief_cooking_role',
  'brief_bedroom_needs', 'brief_acoustic_zones', 'brief_flex_zones', 'brief_future_changes',
  'brief_budget_limits', 'brief_deadlines_hard', 'brief_special_notes', 'brief_allergies',
] as const

export const CLIENT_PROFILE_EDITABLE_KEYS = [...CLIENT_PROFILE_BASE_KEYS, ...CLIENT_PROFILE_BRIEF_KEYS] as const

export type ClientProfileEditableKey = (typeof CLIENT_PROFILE_EDITABLE_KEYS)[number]

export const BRIEF_COMPLETION_KEYS = ['fio', 'phone', 'brief_style_prefer', 'brief_home_mood', 'brief_adults_count', 'brief_hobbies'] as const

export function createEmptyClientProfileDraft() {
  return Object.fromEntries(CLIENT_PROFILE_EDITABLE_KEYS.map((key) => [key, ''])) as Record<ClientProfileEditableKey, string>
}
