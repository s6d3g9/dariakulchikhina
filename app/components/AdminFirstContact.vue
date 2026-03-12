<template>
  <div class="afc-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>
      <!-- Step status header -->
      <div class="afc-status-row">
        <span class="afc-dot" :class="`afc-dot--${statusColor}`"></span>
        <select v-model="form.lead_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="new">новый лид</option>
          <option value="contacted">контакт установлен</option>
          <option value="meeting">назначена встреча</option>
          <option value="qualified">квалифицирован ✓</option>
          <option value="declined">отказ</option>
        </select>
        <span v-if="savedAt" class="afc-saved">✓ {{ savedAt }}</span>
      </div>

      <!-- Section: Contact Info -->
      <div class="afc-section">
        <div class="afc-section-title">контакт</div>
        <div class="afc-rows">
          <div class="afc-row">
            <label class="afc-lbl">дата первого контакта</label>
            <AppDatePicker v-model="form.lead_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="afc-row">
            <label class="afc-lbl">источник лида</label>
            <select v-model="form.lead_source" class="glass-input" @change="save">
              <option value="">—</option>
              <option value="call">входящий звонок</option>
              <option value="site">сайт / заявка</option>
              <option value="instagram">Instagram</option>
              <option value="telegram">Telegram</option>
              <option value="referral">рекомендация</option>
              <option value="repeat">повторный клиент</option>
              <option value="other">другое</option>
            </select>
          </div>
          <div class="afc-row">
            <label class="afc-lbl">ФИО клиента</label>
            <input v-model="form.fio" class="glass-input" placeholder="Как к вам обращаться?" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">телефон</label>
            <input v-model="form.phone" class="glass-input" placeholder="+7 (___) ___-__-__" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">email</label>
            <input v-model="form.email" class="glass-input" type="email" placeholder="name@example.com" @blur="save">
          </div>
        </div>
      </div>

      <!-- Section: Meeting -->
      <div class="afc-section">
        <div class="afc-section-title">встреча</div>
        <div class="afc-rows">
          <div class="afc-row">
            <label class="afc-lbl">дата встречи</label>
            <AppDatePicker v-model="form.lead_meeting_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="afc-row">
            <label class="afc-lbl">время встречи</label>
            <input v-model="form.lead_meeting_time" class="glass-input" type="time" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">место встречи</label>
            <select v-model="form.lead_meeting_place" class="glass-input" @change="save">
              <option value="">—</option>
              <option value="office">офис студии</option>
              <option value="object">на объекте</option>
              <option value="zoom">онлайн (Zoom/Google Meet)</option>
              <option value="cafe">кафе</option>
            </select>
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">адрес встречи</label>
            <AppAddressInput
              v-model="form.meeting_map_address"
              input-class="glass-input"
              placeholder="Начните вводить адрес…"
              @update:model-value="onAddressChange"
              @blur="save"
            />
          </div>

          <!-- Yandex Map -->
          <div v-if="hasMapCoords" class="afc-row afc-row--full">
            <label class="afc-lbl">
              карта
              <span v-if="form.meeting_map_address" class="afc-map-addr">{{ form.meeting_map_address }}</span>
            </label>
            <iframe
              :key="mapKey"
              class="afc-map"
              style="border:0"
              :src="fallbackMapSrc"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Карта"
            />
            <div class="afc-map-fields">
              <div class="afc-map-coords">
                <input
                  v-model.number="form.meeting_map_lat"
                  class="glass-input"
                  type="number"
                  step="0.000001"
                  placeholder="Широта (lat)"
                  @blur="save"
                >
                <input
                  v-model.number="form.meeting_map_lng"
                  class="glass-input"
                  type="number"
                  step="0.000001"
                  placeholder="Долгота (lng)"
                  @blur="save"
                >
              </div>
            </div>
          </div>
          <div v-else-if="geocoding" class="afc-row afc-row--full afc-geocoding">определяю координаты…</div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">заметки о встрече / первое впечатление</label>
            <textarea v-model="form.lead_meeting_notes" class="glass-input u-ta" rows="3" @blur="save"></textarea>
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">особые пожелания / первые предпочтения</label>
            <textarea v-model="form.lead_first_wishes" class="glass-input u-ta" rows="2" @blur="save"></textarea>
          </div>
        </div>
      </div>

      <!-- Section: Step completion -->
      <div class="afc-section">
        <div class="afc-complete-card" :class="{ 'afc-complete-card--done': isStepDone.first_contact }">
          <div class="afc-complete-icon">
            {{ isStepDone.first_contact ? '✓' : '○' }}
          </div>
          <div class="afc-complete-text">
            <strong>первичный контакт</strong>
            <p v-if="isStepDone.first_contact">этап завершен</p>
            <p v-else>заполните основную информацию и отметьте как завершенный</p>
          </div>
          <button
            type="button"
            class="afc-complete-btn"
            @click="toggleStepCompletion('first_contact')"
          >
            {{ isStepDone.first_contact ? 'пометить незавершенным' : 'завершить этап' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { slug } = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${slug}`, {
  server: false
})

// Form data
const form = reactive({
  lead_status:         '',
  lead_date:           '',
  lead_source:         '',
  fio:                 '',
  phone:               '',
  email:               '',
  lead_meeting_date:   '',
  lead_meeting_time:   '',
  lead_meeting_place:  '',
  meeting_map_lat:      null as null | number,
  meeting_map_lng:      null as null | number,
  meeting_map_address: '',
  lead_meeting_notes:  '',
  lead_first_wishes:   '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

const statusColor = useStatusColor(form, 'lead_status')

// Saving system
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  if (!project.value) return
  await $fetch(`/api/projects/${slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value.profile || {}), ...form } },
  })
  markSaved()
}

// ── Map (with geocoding + marker) ─────────────────────────

const geocoding = ref(false)
const mapKey = ref(0)

const hasMapCoords = computed(() =>
  typeof form.meeting_map_lat === 'number' && typeof form.meeting_map_lng === 'number',
)

const fallbackMapSrc = computed(() => {
  const lat = typeof form.meeting_map_lat === 'number' ? form.meeting_map_lat : 55.751574
  const lng = typeof form.meeting_map_lng === 'number' ? form.meeting_map_lng : 37.573856
  const z = form.meeting_map_lat ? 16 : 10
  const pt = form.meeting_map_lat ? `&pt=${lng}%2C${lat}%2Cpm2rdm` : ''
  return `https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=${z}${pt}`
})

let geocodeTimer: ReturnType<typeof setTimeout> | null = null

function onAddressChange(val: string) {
  if (geocodeTimer) clearTimeout(geocodeTimer)
  if (!val || val.trim().length < 5) return
  geocodeTimer = setTimeout(() => geocodeAddress(val), 600)
}

async function geocodeAddress(address: string) {
  geocoding.value = true
  try {
    const { lat, lng } = await $fetch<{ lat: number | null; lng: number | null }>(
      '/api/geocode/address',
      { query: { address } },
    )
    if (lat != null && lng != null) {
      form.meeting_map_lat = lat
      form.meeting_map_lng = lng
      mapKey.value++
      await save()
    }
  } catch { /* ignore */ }
  geocoding.value = false
}

// ── Step completion (stored in profile._stepsDone) ──────────────
const isStepDone = computed(() => project.value?.profile?._stepsDone ?? {})

async function toggleStepCompletion(stepKey: string) {
  if (!project.value) return
  const done = { ...(project.value.profile?._stepsDone || {}) }
  done[stepKey] = !done[stepKey]
  await $fetch(`/api/projects/${slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value.profile || {}), _stepsDone: done } },
  })
  project.value = { ...project.value, profile: { ...(project.value.profile || {}), _stepsDone: done } }
  markSaved()
}
</script>

<style scoped>
.afc-wrap { max-width: 900px; }
.afc-loading { text-align: center; padding: 40px; color: var(--ds-muted, #999); }

.afc-status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.afc-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.afc-dot--new { background: var(--ds-muted, #ddd); }
.afc-dot--contacted { background: var(--ds-warning, #ffb74d); }
.afc-dot--meeting { background: color-mix(in srgb, var(--ds-success, #81c784) 70%, transparent); }
.afc-dot--qualified { background: var(--ds-success, #4caf50); }
.afc-dot--declined { background: var(--ds-error, #f44336); }
.afc-complete-card--done { border-color: color-mix(in srgb, var(--ds-success, #5caa7f) 50%, transparent); background: color-mix(in srgb, var(--ds-success, #5caa7f) 8%, transparent); }
.afc-complete-icon { font-size: 1.4rem; flex-shrink: 0; width: 28px; text-align: center; margin-top: 2px; }
.afc-complete-text { flex: 1; }
.afc-complete-text strong { display: block; font-size: .88rem; margin-bottom: 4px; }
.afc-complete-text p { margin: 0; font-size: .78rem; color: var(--ds-muted, #888); }
.afc-complete-card--done .afc-complete-text p { color: var(--ds-success, #2a7a52); }
.afc-complete-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 7px 16px; font-size: .78rem; cursor: pointer; font-family: inherit; color: var(--ds-muted, #666); align-self: center; white-space: nowrap; }
.afc-complete-card--done .afc-complete-btn { border-color: color-mix(in srgb, var(--ds-success, #5caa7f) 50%, transparent); color: var(--ds-success, #2a7a52); }
.afc-complete-btn:hover { border-color: color-mix(in srgb, var(--glass-text) 40%, transparent); color: inherit; }
.afc-map-addr { font-weight: 400; color: var(--ds-muted, #444); font-size: .8rem; margin-left: 6px; }
.afc-geocoding { text-align: center; padding: 12px; color: var(--ds-muted, #888); font-size: .82rem; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .afc-wrap { max-width: 100%; }
  .afc-row { flex-direction: column; align-items: stretch; gap: 4px; }
  .afc-lbl { min-width: auto; font-size: .74rem; }
  .afc-map-coords { grid-template-columns: 1fr; }
  .afc-map { height: 220px; }
  .afc-complete-card { flex-direction: column; gap: 10px; padding: 14px; }
  .afc-complete-btn { align-self: flex-start; }
  .afc-status-row { flex-wrap: wrap; }
  .afc-section-title { font-size: .82rem; }
}
</style>