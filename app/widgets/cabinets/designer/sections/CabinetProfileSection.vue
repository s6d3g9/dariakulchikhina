<template>
  <div class="cab-section" data-section="profile">
    <form @submit.prevent class="cab-form" :class="{ 'cab-form--brutalist': isBrutalist }">
      <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalist }">
        <h3>Основные данные</h3>
        <div class="u-modal__row2">
          <div class="u-field">
            <label class="u-field__label">Имя / Студия *</label>
            <GlassInput v-model="form.name" required @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Компания</label>
            <GlassInput v-model="form.companyName" placeholder="ООО / ИП…" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Телефон</label>
            <GlassInput v-model="form.phone" type="tel" placeholder="+7 (___) ___-__-__" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Email</label>
            <GlassInput v-model="form.email" type="email" placeholder="mail@example.com" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Telegram</label>
            <GlassInput v-model="form.telegram" placeholder="@username" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Сайт / портфолио</label>
            <GlassInput v-model="form.website" placeholder="https://…" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Город</label>
            <GlassInput v-model="form.city" placeholder="Москва" @blur="queueProfileAutosave" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Опыт работы</label>
            <GlassInput v-model="form.experience" placeholder="10 лет" @blur="queueProfileAutosave" />
          </div>
        </div>
      </div>

      <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalist }">
        <h3>О себе</h3>
        <div class="u-field u-field--full">
          <textarea v-model="form.about" class="glass-input u-ta" rows="4" placeholder="Расскажите о своём подходе к дизайну, стилях, специализации…" @blur="queueProfileAutosave" />
        </div>
      </div>

      <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalist }">
        <h3>Специализации</h3>
        <div class="u-tags">
          <button
            v-for="sp in SPECIALIZATION_OPTIONS"
            :key="`spec-${sp}`"
            type="button"
            class="pkg-tag-picker"
            :class="{ 'pkg-tag-picker--active': renderedProfileSpecializations.includes(sp) }"
            @click="toggleSpec(sp)"
          >{{ sp }}</button>
        </div>
      </div>

      <div class="u-form-foot">
        <span class="cab-autosave-status" :class="autosaveStatusClass(profileSaveState)">{{ autosaveStatusLabel(profileSaveState) }}</span>
        <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

const props = defineProps<{
  designerId: number
  designer: any
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

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

// ── Constants ──

const SPECIALIZATION_OPTIONS = [
  'Квартиры', 'Дома и коттеджи', 'Апартаменты', 'Офисы',
  'Рестораны и кафе', 'Магазины', 'Общественные пространства',
  'Минимализм', 'Современный', 'Классика', 'Лофт', 'Скандинавский',
  'Ар-деко', 'Эко', 'Hi-Tech', 'Японский', 'Прованс',
]

// ── Local form (owns its own copy) ──

const form = reactive({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  telegram: '',
  website: '',
  city: '',
  experience: '',
  about: '',
  specializations: [] as string[],
})

const saveMsg = ref('')

// Sync from designer prop
watch(() => props.designer, (d) => {
  if (!d) return
  form.name = d.name || ''
  form.companyName = d.companyName || ''
  form.phone = d.phone || ''
  form.email = d.email || ''
  form.telegram = d.telegram || ''
  form.website = d.website || ''
  form.city = d.city || ''
  form.experience = d.experience || ''
  form.about = d.about || ''
  form.specializations = Array.isArray(d.specializations) ? [...d.specializations] : []
}, { immediate: true, deep: false })

// ── Specializations ──

const profileSpecDirty = ref(false)

const renderedProfileSpecializations = computed(() => (
  profileSpecDirty.value
    ? form.specializations
    : (Array.isArray(props.designer?.specializations) ? props.designer.specializations : form.specializations)
))

watch(() => props.designer?.specializations, () => {
  profileSpecDirty.value = false
}, { immediate: true, deep: true })

function toggleSpec(sp: string) {
  profileSpecDirty.value = true
  const idx = form.specializations.indexOf(sp)
  if (idx >= 0) form.specializations.splice(idx, 1)
  else form.specializations.push(sp)
  queueProfileAutosave()
}

// ── Autosave ──

const profileSaveState = ref<InlineAutosaveState>('')
const profileSnapshot = ref('')
let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

function clearProfileSaveTimer() {
  if (!profileSaveTimer) return
  clearTimeout(profileSaveTimer)
  profileSaveTimer = null
}

function serializeProfileForm() {
  return JSON.stringify({
    name: form.name,
    companyName: form.companyName,
    phone: form.phone,
    email: form.email,
    telegram: form.telegram,
    website: form.website,
    city: form.city,
    experience: form.experience,
    about: form.about,
    specializations: [...form.specializations],
  })
}

async function autoSaveProfile() {
  clearProfileSaveTimer()
  profileSaveState.value = 'saving'
  try {
    const nextSnapshot = serializeProfileForm()
    await $fetch(`/api/designers/${props.designerId}`, {
      method: 'PUT',
      body: { ...form },
    })
    profileSnapshot.value = nextSnapshot
    profileSaveState.value = 'saved'
    setAutosaveSettled(profileSaveState, 'saved')
    emit('refresh')
    saveMsg.value = 'Сохранено!'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } catch (_error) {
    profileSaveState.value = 'error'
  }
}

function queueProfileAutosave() {
  if (!props.designer) return
  const nextSnapshot = serializeProfileForm()
  if (nextSnapshot === profileSnapshot.value) return
  clearProfileSaveTimer()
  profileSaveTimer = setTimeout(() => { autoSaveProfile() }, 120)
}

// Reset snapshot when designer id changes
watch(() => props.designerId, async () => {
  clearProfileSaveTimer()
  await nextTick()
  profileSnapshot.value = serializeProfileForm()
  profileSaveState.value = ''
}, { immediate: true })
</script>
