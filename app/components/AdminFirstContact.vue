<template>
  <div class="afc-wrap">
    <div v-if="pending" class="afc-loading">Загрузка...</div>
    <template v-else>
      <!-- Step status header -->
      <div class="afc-status-row">
        <span class="afc-dot" :class="`afc-dot--${statusColor}`"></span>
        <select v-model="form.lead_status" class="afc-status-sel" @change="save">
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
            <AppDatePicker v-model="form.lead_date" model-type="iso" input-class="afc-inp" @update:model-value="save" />
          </div>
          <div class="afc-row">
            <label class="afc-lbl">источник лида</label>
            <select v-model="form.lead_source" class="afc-inp afc-sel" @change="save">
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
            <input v-model="form.fio" class="afc-inp" placeholder="Как к вам обращаться?" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">телефон</label>
            <input v-model="form.phone" class="afc-inp" placeholder="+7 (___) ___-__-__" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">email</label>
            <input v-model="form.email" class="afc-inp" type="email" placeholder="name@example.com" @blur="save">
          </div>
        </div>
      </div>

      <!-- Section: Meeting -->
      <div class="afc-section">
        <div class="afc-section-title">встреча</div>
        <div class="afc-rows">
          <div class="afc-row">
            <label class="afc-lbl">дата встречи</label>
            <AppDatePicker v-model="form.lead_meeting_date" model-type="iso" input-class="afc-inp" @update:model-value="save" />
          </div>
          <div class="afc-row">
            <label class="afc-lbl">время встречи</label>
            <input v-model="form.lead_meeting_time" class="afc-inp" type="time" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">место встречи</label>
            <select v-model="form.lead_meeting_place" class="afc-inp afc-sel" @change="save">
              <option value="">—</option>
              <option value="office">офис студии</option>
              <option value="object">на объекте</option>
              <option value="zoom">онлайн (Zoom/Google Meet)</option>
              <option value="cafe">кафе</option>
            </select>
          </div>

          <!-- Yandex Map -->
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">
              карта
              <span v-if="form.meeting_map_address" style="font-weight:400;color:#444;font-size:.8rem;margin-left:6px">{{ form.meeting_map_address }}</span>
            </label>
            <div v-if="hasYandexApiKey" ref="mapEl" class="afc-map"></div>
            <iframe
              v-else
              class="afc-map"
              style="border:0"
              :src="fallbackMapSrc"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Карта (упрощённый режим)"
            />
            <div v-if="mapError" class="afc-map-error">{{ mapError }}</div>
            <div v-if="hasYandexApiKey" style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <input v-model="mapSearch" class="afc-inp" placeholder="поиск адреса..." style="flex:1" @keydown.enter.prevent="searchAddress">
              <button type="button" class="afc-map-btn" @click="searchAddress">найти</button>
              <button v-if="form.meeting_map_lat" type="button" class="afc-map-btn afc-map-btn--clear" @click="clearPin">✕ сбросить</button>
            </div>
            <div v-else class="afc-map-error" style="margin-top:6px">
              Упрощённый режим карты (без пина). Для интерактивной карты добавьте `YANDEX_MAPS_API_KEY`.
            </div>
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">заметки о встрече / первое впечатление</label>
            <textarea v-model="form.lead_meeting_notes" class="afc-inp afc-ta" rows="3" @blur="save"></textarea>
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">особые пожелания / первые предпочтения</label>
            <textarea v-model="form.lead_first_wishes" class="afc-inp afc-ta" rows="2" @blur="save"></textarea>
          </div>
        </div>
      </div>

      <!-- Section: Step completion -->
      <div class="afc-section">
        <div class="afc-complete-card" :class="{ 'afc-complete-card--done': project?.isStepDone?.first_contact }">
          <div class="afc-complete-icon">
            {{ project?.isStepDone?.first_contact ? '✓' : '○' }}
          </div>
          <div class="afc-complete-text">
            <strong>первичный контакт</strong>
            <p v-if="project?.isStepDone?.first_contact">этап завершен</p>
            <p v-else>заполните основную информацию и отметьте как завершенный</p>
          </div>
          <button
            type="button"
            class="afc-complete-btn"
            @click="toggleStepCompletion('first_contact')"
          >
            {{ project?.isStepDone?.first_contact ? 'пометить незавершенным' : 'завершить этап' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { slug } = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch(() => `/api/projects/${slug}`, {
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

// ── Yandex Maps ──────────────────────────────────────
const mapEl = ref<HTMLElement | null>(null)
const mapSearch = ref('')
const mapError = ref('')
const runtimeConfig = useRuntimeConfig()
const hasYandexApiKey = computed(() => String(runtimeConfig.public?.yandexMapsApiKey || '').trim().length > 0)
let ymap: any = null
let placemark: any = null

const fallbackMapSrc = computed(() => {
  const lat = typeof form.meeting_map_lat === 'number' ? form.meeting_map_lat : 55.751574
  const lng = typeof form.meeting_map_lng === 'number' ? form.meeting_map_lng : 37.573856
  return `https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=${form.meeting_map_lat ? 15 : 10}`
})

function getYandexScriptSrc() {
  const key = String(runtimeConfig.public?.yandexMapsApiKey || '').trim()
  const base = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
  return key ? `${base}&apikey=${encodeURIComponent(key)}` : base
}

async function initMap() {
  if (!mapEl.value) return
  mapError.value = ''
  try {
    const key = String(runtimeConfig.public?.yandexMapsApiKey || '').trim()
    if (!key) {
      mapError.value = 'Не задан YANDEX_MAPS_API_KEY (Nuxt runtimeConfig.public).'
      return
    }

    if (!(window as any).ymaps) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps="1"]')
        if (existing) {
          existing.addEventListener('load', () => {
            if ((window as any).ymaps) (window as any).ymaps.ready(resolve)
            else reject(new Error('ymaps not available'))
          }, { once: true })
          existing.addEventListener('error', () => reject(new Error('Script failed to load')), { once: true })
          return
        }

        const s = document.createElement('script')
        s.src = getYandexScriptSrc()
        s.setAttribute('data-ymaps', '1')
        s.onload = () => {
          if ((window as any).ymaps) {
            (window as any).ymaps.ready(resolve)
          } else {
            reject(new Error('ymaps not available'))
          }
        }
        s.onerror = () => reject(new Error('Script failed to load'))
        document.head.appendChild(s)
      })
    } else {
      await new Promise<void>(r => (window as any).ymaps.ready(r))
    }
    const ymaps = (window as any).ymaps
    const center = form.meeting_map_lat
      ? [form.meeting_map_lat, form.meeting_map_lng]
      : [55.751574, 37.573856]
    ymap = new ymaps.Map(mapEl.value, {
      center,
      zoom: form.meeting_map_lat ? 15 : 10,
      controls: ['zoomControl', 'geolocationControl'],
    })
    if (form.meeting_map_lat) {
      placemark = new ymaps.Placemark([form.meeting_map_lat, form.meeting_map_lng], {}, { preset: 'islands#violetDotIcon' })
      ymap.geoObjects.add(placemark)
    }
    ymap.events.add('click', async (e: any) => {
      const coords = e.get('coords')
      setPin(coords)
      try {
        const res = await ymaps.geocode(coords, { results: 1 })
        const obj = res.geoObjects.get(0)
        form.meeting_map_address = obj ? obj.getAddressLine() : `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
      } catch {
        form.meeting_map_address = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
      }
      save()
    })
  } catch (err: any) {
    mapError.value = `Не удалось загрузить карту: ${err?.message || 'unknown error'}`
  }
}

function setPin(coords: [number, number]) {
  const ymaps = (window as any).ymaps
  if (placemark) ymap.geoObjects.remove(placemark)
  placemark = new ymaps.Placemark(coords, {}, { preset: 'islands#violetDotIcon', draggable: true })
  placemark.events.add('dragend', async () => {
    const c = placemark.geometry.getCoordinates()
    form.meeting_map_lat = c[0]
    form.meeting_map_lng = c[1]
    const res = await ymaps.geocode(c, { results: 1 })
    const obj = res.geoObjects.get(0)
    form.meeting_map_address = obj ? obj.getAddressLine() : `${c[0].toFixed(5)}, ${c[1].toFixed(5)}`
    save()
  })
  ymap.geoObjects.add(placemark)
  form.meeting_map_lat = coords[0]
  form.meeting_map_lng = coords[1]
}

async function searchAddress() {
  if (!mapSearch.value.trim()) return
  const ymaps = (window as any).ymaps
  try {
    const res = await ymaps.geocode(mapSearch.value, { results: 1 })
    const obj = res.geoObjects.get(0)
    if (!obj) { mapError.value = 'Адрес не найден'; return }
    mapError.value = ''
    const coords = obj.geometry.getCoordinates()
    form.meeting_map_address = obj.getAddressLine()
    setPin(coords)
    save()
  } catch (err: any) {
    mapError.value = 'Ошибка поиска адреса'
  }
}

function clearPin() {
  if (placemark) { ymap.geoObjects.remove(placemark); placemark = null }
  form.meeting_map_lat = null
  form.meeting_map_lng = null
  form.meeting_map_address = ''
  save()
}

onMounted(() => {
  nextTick(() => {
    if (hasYandexApiKey.value && mapEl.value) {
      initMap()
    }
  })
})

// ── Step completion ──────────────────────────────────────
async function toggleStepCompletion(stepKey: string) {
  await $fetch(`/api/projects/${slug}/step-completion`, {
    method: 'POST',
    body: { stepKey, completed: !project.value?.isStepDone?.[stepKey] },
  })
  await refreshCookie('project')
}
</script>

<style scoped>
.afc-wrap { max-width: 900px; }
.afc-loading { text-align: center; padding: 40px; color: #999; }

.afc-status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.afc-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.afc-dot--new { background: #ddd; }
.afc-dot--contacted { background: #ffb74d; }
.afc-dot--meeting { background: #81c784; }
.afc-dot--qualified { background: #4caf50; }
.afc-dot--declined { background: #f44336; }
.afc-status-sel { flex: 1; padding: 6px 10px; border: 1px solid var(--border, #e0e0e0); border-radius: 2px; font-size: .85rem; font-family: inherit; color: inherit; background: transparent; }
.afc-saved { font-size: .75rem; color: #666; white-space: nowrap; }

.afc-section { margin-bottom: 32px; }
.afc-section-title { font-size: .9rem; font-weight: 600; margin-bottom: 16px; color: #333; text-transform: uppercase; letter-spacing: .5px; }
.afc-rows { display: flex; flex-direction: column; gap: 12px; }
.afc-row { display: flex; align-items: center; gap: 12px; }
.afc-row--full { flex-direction: column; align-items: stretch; gap: 6px; }
.afc-lbl { min-width: 140px; font-size: .8rem; color: #666; flex-shrink: 0; }
.afc-inp { flex: 1; padding: 8px 12px; border: 1px solid var(--border, #e0e0e0); border-radius: 2px; font-size: .8rem; font-family: inherit; color: inherit; background: transparent; }
.afc-inp:focus { outline: none; border-color: #888; }
.afc-sel { cursor: pointer; }
.afc-ta { resize: vertical; min-height: 60px; font-family: inherit; }

.afc-map { width: 100%; height: 300px; border: 1px solid var(--border, #e0e0e0); border-radius: 2px; }
.afc-map-error { margin-top: 6px; padding: 6px 10px; font-size: .78rem; color: var(--ds-error, #c00); background: color-mix(in srgb, var(--ds-error, #c00) 6%, transparent); border: 1px solid color-mix(in srgb, var(--ds-error, #c00) 15%, transparent); border-radius: 3px; }
.afc-map-btn { padding: 7px 14px; border: 1px solid var(--border, #e0e0e0); background: transparent; font-size: .8rem; cursor: pointer; font-family: inherit; color: #555; white-space: nowrap; }
.afc-map-btn:hover { border-color: #aaa; color: #1a1a1a; }
.afc-map-btn--clear { border-color: color-mix(in srgb, var(--ds-error, #c00) 30%, transparent); color: var(--ds-error, #c00); }
.afc-map-btn--clear:hover { border-color: var(--ds-error, #c00); }

.afc-complete-card {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 16px 18px; border: 1px solid var(--border, #e0e0e0);
}
.afc-complete-card--done { border-color: color-mix(in srgb, var(--ds-success, #5caa7f) 50%, transparent); background: #f0faf5; }
.afc-complete-icon { font-size: 1.4rem; flex-shrink: 0; width: 28px; text-align: center; margin-top: 2px; }
.afc-complete-text { flex: 1; }
.afc-complete-text strong { display: block; font-size: .88rem; margin-bottom: 4px; }
.afc-complete-text p { margin: 0; font-size: .78rem; color: #888; }
.afc-complete-card--done .afc-complete-text p { color: var(--ds-success, #2a7a52); }
.afc-complete-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 7px 16px; font-size: .78rem; cursor: pointer; font-family: inherit; color: #666; align-self: center; white-space: nowrap; }
.afc-complete-card--done .afc-complete-btn { border-color: color-mix(in srgb, var(--ds-success, #5caa7f) 50%, transparent); color: var(--ds-success, #2a7a52); }
.afc-complete-btn:hover { border-color: #aaa; color: inherit; }
</style>