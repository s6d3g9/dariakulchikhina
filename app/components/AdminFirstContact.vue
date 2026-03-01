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
            <input v-model="form.email" class="afc-inp" type="email" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">мессенджер</label>
            <div style="display:flex;gap:6px">
              <select v-model="form.messenger" class="afc-inp afc-sel" style="flex:0 0 auto;width:130px" @change="save">
                <option value="">—</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="viber">Viber</option>
              </select>
              <input v-model="form.messengerNick" class="afc-inp" placeholder="@ник или номер" @blur="save">
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Initial project parameters -->
      <div class="afc-section">
        <div class="afc-section-title">параметры объекта</div>
        <div class="afc-rows">
          <div class="afc-row">
            <label class="afc-lbl">жилой комплекс / адрес</label>
            <AppAddressInput v-model="form.objectAddress" input-class="afc-inp" placeholder="ЖК «Прима», ул. Садовая 1" @blur="save" />
          </div>
          <div class="afc-row">
            <label class="afc-lbl">тип объекта</label>
            <select v-model="form.objectType" class="afc-inp afc-sel" @change="save">
              <option value="">—</option>
              <option value="apartment">квартира</option>
              <option value="penthouse">пентхаус</option>
              <option value="house">частный дом / коттедж</option>
              <option value="townhouse">таунхаус</option>
              <option value="studio">студия</option>
              <option value="office">офис</option>
              <option value="commercial">коммерческое</option>
            </select>
          </div>
          <div class="afc-row">
            <label class="afc-lbl">площадь (м²)</label>
            <input v-model="form.objectArea" class="afc-inp" placeholder="например: 85" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">кол-во комнат</label>
            <input v-model="form.roomCount" class="afc-inp" placeholder="2" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">примерный бюджет</label>
            <input v-model="form.budget" class="afc-inp" placeholder="₽ 3 500 000" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">желаемые сроки</label>
            <input v-model="form.deadline" class="afc-inp" placeholder="до ноября 2025" @blur="save">
          </div>
          <div class="afc-row">
            <label class="afc-lbl">состояние объекта</label>
            <select v-model="form.lead_object_condition" class="afc-inp afc-sel" @change="save">
              <option value="">—</option>
              <option value="new_rough">новостройка, черновая</option>
              <option value="new_prefinished">новостройка, предчистовая</option>
              <option value="existing_renovation">вторичка, требует ремонта</option>
              <option value="existing_redesign">вторичка, редизайн</option>
            </select>
          </div>
          <div class="afc-row">
            <label class="afc-lbl">этаж</label>
            <input v-model="form.floor" class="afc-inp" placeholder="5 из 12" @blur="save">
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
            <div ref="mapEl" class="afc-map"></div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <input v-model="mapSearch" class="afc-inp" placeholder="поиск адреса..." style="flex:1" @keydown.enter.prevent="searchAddress">
              <button type="button" class="afc-map-btn" @click="searchAddress">найти</button>
              <button v-if="form.meeting_map_lat" type="button" class="afc-map-btn afc-map-btn--clear" @click="clearPin">✕ сбросить</button>
            </div>
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">заметки о встрече / первое впечатление</label>
            <textarea v-model="form.lead_meeting_notes" class="afc-inp afc-ta" rows="3" @blur="save" />
          </div>
          <div class="afc-row afc-row--full">
            <label class="afc-lbl">особые пожелания / первые предпочтения</label>
            <textarea v-model="form.lead_first_wishes" class="afc-inp afc-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Step completion -->
      <div class="afc-section">
        <div class="afc-section-title">завершение шага 0.1</div>
        <div class="afc-complete-card" :class="{ 'afc-complete-card--done': form.lead_step_done }">
          <div class="afc-complete-icon">{{ form.lead_step_done ? '✓' : '○' }}</div>
          <div class="afc-complete-text">
            <strong>{{ form.lead_step_done ? 'Шаг 0.1 выполнен' : 'Шаг 0.1 ещё не завершён' }}</strong>
            <p>{{ form.lead_step_done
              ? 'Первичный контакт установлен. Переходите к шагу 0.2 — Глубинное интервью.'
              : 'Заполните контактные данные и параметры объекта, затем отметьте шаг выполненным.' }}</p>
          </div>
          <button class="afc-complete-btn" @click="toggleStepDone">
            {{ form.lead_step_done ? 'отменить' : 'отметить выполненным' }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const { savedAt, touch: markSaved } = useTimestamp()

const form = reactive<any>({
  lead_status:           '',
  lead_date:             '',
  lead_source:           '',
  lead_meeting_date:     '',
  lead_meeting_place:    '',
  meeting_map_lat:        null as number | null,
  meeting_map_lng:        null as number | null,
  meeting_map_address:    '',
  lead_meeting_notes:    '',
  lead_first_wishes:     '',
  lead_object_condition: '',
  lead_step_done:        false,
  // contact fields (shared with ClientSelfProfile)
  fio:           '',
  phone:         '',
  email:         '',
  messenger:     '',
  messengerNick: '',
  // object fields
  objectAddress: '',
  objectType:    '',
  objectArea:    '',
  roomCount:     '',
  floor:         '',
  budget:        '',
  deadline:      '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

const statusColor = useStatusColor(form, 'lead_status')

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

// ── Yandex Maps ──────────────────────────────────────
const mapEl = ref<HTMLElement | null>(null)
const mapSearch = ref('')
let ymap: any = null
let placemark: any = null

async function initMap() {
  if (!mapEl.value || typeof window === 'undefined') return
  if (!(window as any).ymaps) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script')
      s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
      s.onload = () => (window as any).ymaps.ready(resolve)
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
    const res = await ymaps.geocode(coords, { results: 1 })
    const obj = res.geoObjects.get(0)
    form.meeting_map_address = obj ? obj.getAddressLine() : `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
    save()
  })
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
  ymap.setCenter(coords, 15, { duration: 300 })
}

async function searchAddress() {
  if (!mapSearch.value.trim() || !ymap) return
  const ymaps = (window as any).ymaps
  const res = await ymaps.geocode(mapSearch.value, { results: 1 })
  const obj = res.geoObjects.get(0)
  if (!obj) return
  const coords = obj.geometry.getCoordinates()
  form.meeting_map_address = obj.getAddressLine()
  setPin(coords)
  save()
}

function clearPin() {
  if (placemark) { ymap.geoObjects.remove(placemark); placemark = null }
  form.meeting_map_lat = null
  form.meeting_map_lng = null
  form.meeting_map_address = ''
  save()
}

onMounted(() => { nextTick(initMap) })

function toggleStepDone() {
  form.lead_step_done = !form.lead_step_done
  if (form.lead_step_done && !form.lead_status) {
    form.lead_status = 'qualified'
  }
  save()
}
</script>

<style scoped>
.afc-wrap { padding: 4px 0 40px; }
.afc-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }

.afc-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.afc-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.afc-dot--gray   { background: #ccc; }
.afc-dot--blue   { background: #6b9fd4; }
.afc-dot--yellow { background: #e8b84b; }
.afc-dot--red    { background: #d46b6b; }
.afc-dot--green  { background: #5caa7f; }
.afc-status-sel  { background: none; border: 1px solid var(--border, #e0e0e0); padding: 4px 10px; font-size: .78rem; font-family: inherit; color: inherit; cursor: pointer; }
.afc-saved       { font-size: .72rem; color: #5caa7f; margin-left: auto; }

.afc-section { margin-bottom: 32px; }
.afc-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }

.afc-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.afc-row { display: flex; flex-direction: column; gap: 5px; }
.afc-row--full { grid-column: 1 / -1; }
.afc-lbl { font-size: .72rem; color: #999; }
.afc-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: var(--bg, #fff); color: inherit; font-family: inherit; outline: none; }
.afc-inp:focus { border-color: #aaa; }
.afc-sel { cursor: pointer; }
.afc-ta  { resize: vertical; }

/* Map */
.afc-map { width: 100%; height: 300px; border: 1px solid var(--border, #e0e0e0); border-radius: 2px; }
.afc-map-btn { padding: 7px 14px; border: 1px solid var(--border, #e0e0e0); background: transparent; font-size: .8rem; cursor: pointer; font-family: inherit; color: #555; white-space: nowrap; }
.afc-map-btn:hover { border-color: #aaa; color: #1a1a1a; }
.afc-map-btn--clear { border-color: #f5c0c0; color: #c00; }
.afc-map-btn--clear:hover { border-color: #c00; }

.afc-complete-card {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 16px 18px; border: 1px solid var(--border, #e0e0e0);
}
.afc-complete-card--done { border-color: #a8d8bc; background: #f0faf5; }
.afc-complete-icon { font-size: 1.4rem; flex-shrink: 0; width: 28px; text-align: center; margin-top: 2px; }
.afc-complete-text { flex: 1; }
.afc-complete-text strong { display: block; font-size: .88rem; margin-bottom: 4px; }
.afc-complete-text p { margin: 0; font-size: .78rem; color: #888; }
.afc-complete-card--done .afc-complete-text p { color: #2a7a52; }
.afc-complete-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 7px 16px; font-size: .78rem; cursor: pointer; font-family: inherit; color: #666; align-self: center; white-space: nowrap; }
.afc-complete-card--done .afc-complete-btn { border-color: #a8d8bc; color: #2a7a52; }
.afc-complete-btn:hover { border-color: #aaa; color: inherit; }
</style>
