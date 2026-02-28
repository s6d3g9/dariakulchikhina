<template>
  <div class="bcab-root glass-page">
    <header class="bcab-header glass-surface">
      <div class="bcab-logo">DK <span>| Кабинет клиента</span></div>
      <div class="bcab-hright">
        <span v-if="client" class="bcab-hname">{{ client.name }}</span>
        <button class="glass-chip bcab-logout" @click="logout">Выйти</button>
      </div>
    </header>

    <div v-if="pending" class="bcab-loading">Загружаем…</div>

    <div v-else-if="client" class="bcab-body">
      <!-- Sidebar -->
      <aside class="bcab-sidebar glass-surface">
        <nav class="bcab-nav">
          <button
            v-for="item in topNav"
            :key="item.key"
            class="bcab-nav-item"
            :class="{ active: section === item.key }"
            @click="section = item.key"
          >
            <span class="bcab-nav-icon">{{ item.icon }}</span>{{ item.label }}
          </button>

          <!-- Gallery group toggle -->
          <button
            class="bcab-nav-item bcab-nav-group"
            :class="{ 'group-active': section.startsWith('gallery') }"
            @click="galleryOpen = !galleryOpen"
          >
            <span class="bcab-nav-icon">▣</span>Галереи
            <span class="bcab-nav-arrow" :class="{ open: galleryOpen }">›</span>
          </button>
          <div class="bcab-nav-sub" :class="{ open: galleryOpen }">
            <button
              v-for="g in galleries"
              :key="g.key"
              class="bcab-nav-sub-item"
              :class="{ active: section === g.key }"
              @click="section = g.key"
            >{{ g.label }}</button>
          </div>
        </nav>
      </aside>

      <!-- Main -->
      <main class="bcab-main">
        <div class="bcab-inner">

          <!-- Brief -->
          <template v-if="section === 'brief'">
            <div class="bcab-section-head">
              <div v-if="client.linkedProject" class="bcab-sync-row">
                <button type="button" class="bcab-sync-btn" @click="pullFromProject" title="Загрузить все данные из проекта">← из проекта</button>
                <button type="button" class="bcab-sync-btn" @click="pushToProject" title="Сохранить бриф и передать все данные в проект">→ в проект</button>
              </div>
            </div>
            <form @submit.prevent="saveBrief" class="bcab-form">
              <div class="bcab-form-section">
                <h3>О вас</h3>
                <div class="bcab-grid-2">
                  <div class="bcab-field">
                    <label>О себе</label>
                    <textarea v-model="brief.about_me" class="glass-input" rows="3" placeholder="Расскажите немного о себе…" />
                  </div>
                  <div class="bcab-field">
                    <label>Состав семьи</label>
                    <div class="bcab-tags">
                      <button
                        v-for="t in FAMILY_TAGS" :key="t.val" type="button"
                        class="bcab-tag" :class="{ active: brief.family.includes(t.val) }"
                        @click="toggleTag(brief.family, t.val)"
                      >{{ t.icon }} {{ t.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bcab-form-section">
                <h3>О проекте</h3>
                <div class="bcab-field bcab-field-full">
                  <label>Комнаты / помещения</label>
                  <div class="bcab-tags">
                    <button
                      v-for="t in ROOM_TAGS" :key="t" type="button"
                      class="bcab-tag" :class="{ active: brief.rooms.includes(t) }"
                      @click="toggleTag(brief.rooms, t)"
                    >{{ t }}</button>
                  </div>
                </div>
                <div class="bcab-field bcab-field-full" style="margin-top:14px">
                  <label>Предпочтения по стилю</label>
                  <div class="bcab-tags">
                    <button
                      v-for="t in STYLE_TAGS" :key="t" type="button"
                      class="bcab-tag" :class="{ active: brief.style_preference.includes(t) }"
                      @click="toggleTag(brief.style_preference, t)"
                    >{{ t }}</button>
                  </div>
                </div>
                <div class="bcab-grid-2" style="margin-top:14px">
                  <div class="bcab-field">
                    <label>Бюджет</label>
                    <input v-model="brief.budget" class="glass-input" placeholder="Ориентировочный бюджет" />
                  </div>
                  <div class="bcab-field">
                    <label>Желаемые сроки</label>
                    <input v-model="brief.deadline_wish" class="glass-input" placeholder="Когда хотите закончить?" />
                  </div>
                </div>
              </div>

              <div class="bcab-form-section">
                <h3>Пожелания и боли</h3>
                <div class="bcab-grid-2">
                  <div class="bcab-field">
                    <label>Что сейчас не устраивает</label>
                    <textarea v-model="brief.current_pain" class="glass-input" rows="3" />
                  </div>
                  <div class="bcab-field">
                    <label>Пожелания</label>
                    <textarea v-model="brief.wishes" class="glass-input" rows="3" />
                  </div>
                  <div class="bcab-field">
                    <label>Чего хотите избежать</label>
                    <textarea v-model="brief.avoid" class="glass-input" rows="2" />
                  </div>
                </div>
              </div>

              <div class="bcab-form-section">
                <h3>Референсы</h3>
                <div class="bcab-field">
                  <label>Ссылки / описание</label>
                  <textarea v-model="brief.references" class="glass-input" rows="3" placeholder="Pinterest, Houzz, ссылки на картинки…" />
                </div>
              </div>

              <div class="bcab-foot">
                <button type="submit" class="bcab-save">Сохранить</button>
                <span v-if="saveMsg" class="bcab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- Object params -->
          <template v-else-if="section === 'object'">
            <div class="bcab-section-head">
              <div v-if="client.linkedProject" class="bcab-sync-row">
                <button type="button" class="bcab-sync-btn" @click="pullFromBrief" title="Перенести бюджет / срок / стиль из брифа">← из брифа</button>
              </div>
            </div>
            <div>
              <form @submit.prevent="saveObject" class="bcab-form">
                <div class="bcab-form-section">
                  <h3>Адрес и тип</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field bcab-field-suggest">
                      <label>Адрес объекта</label>
                      <div class="bcab-suggest-wrap">
                        <input
                          v-model="objectForm.objectAddress"
                          class="glass-input"
                          autocomplete="off"
                          @input="onAddressInput"
                          @focus="onAddressInput"
                          @blur="hideSuggest"
                          @keydown.down.prevent="suggestDown"
                          @keydown.up.prevent="suggestUp"
                          @keydown.enter.prevent="suggestSelect"
                        />
                        <ul v-if="suggestions.length" class="bcab-suggest-list">
                          <li
                            v-for="(s, i) in suggestions"
                            :key="i"
                            class="bcab-suggest-item"
                            :class="{ active: suggestIndex === i }"
                            @mousedown.prevent="pickSuggest(s)"
                          >
                            <span class="bcab-suggest-title">{{ s.title }}</span>
                            <span v-if="s.subtitle" class="bcab-suggest-sub">{{ s.subtitle }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="bcab-field">
                      <label>Тип объекта</label>
                      <input v-model="objectForm.objectType" class="glass-input" /></div>
                  </div>
                </div>
                <div class="bcab-form-section">
                  <h3>Характеристики</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field">
                      <label>Площадь, м²</label>
                      <input v-model="objectForm.objectArea" class="glass-input" />
                    </div>
                    <div class="bcab-field">
                      <label>Количество комнат</label>
                      <input v-model="objectForm.roomCount" class="glass-input" />
                    </div>
                    <div class="bcab-field">
                      <label>Этаж</label>
                      <input v-model="objectForm.floor" class="glass-input" />
                    </div>
                    <div class="bcab-field">
                      <label>Высота потолков</label>
                      <input v-model="objectForm.ceilingHeight" class="glass-input" />
                    </div>
                  </div>
                </div>
                <div class="bcab-form-section">
                  <h3>Стиль и бюджет</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field">
                      <label>Стиль</label>
                      <input v-model="objectForm.stylePreferences" class="glass-input" />
                    </div>
                    <div class="bcab-field">
                      <label>Бюджет</label>
                      <input v-model="objectForm.budget" class="glass-input" />
                    </div>
                    <div class="bcab-field">
                      <label>Срок</label>
                      <input v-model="objectForm.deadline" class="glass-input" />
                    </div>
                  </div>
                </div>
                <div class="bcab-foot">
                  <button type="submit" class="bcab-save">Сохранить</button>
                  <button type="button" class="bcab-sync-btn" @click="pushToBrief">→ в бриф</button>
                  <span v-if="objectSaveMsg" class="bcab-save-msg">{{ objectSaveMsg }}</span>
                </div>
              </form>
            </div>
          </template>

          <!-- Roadmap -->
          <template v-else-if="section === 'roadmap'">
            <div v-if="client.linkedProject?.slug">
              <ClientRoadmap :slug="client.linkedProject.slug" />
            </div>
            <div v-else class="bcab-placeholder">
              <div class="bcab-placeholder-icon">◈</div>
              <p>Проект пока не привязан.<br>Обратитесь к вашему дизайнеру.</p>
            </div>
          </template>

          <!-- Contractors -->
          <template v-else-if="section === 'contractors'">
            <div v-if="client.linkedProject?.slug">
              <ClientContractorsProfile :slug="client.linkedProject.slug" />
            </div>
            <div v-else class="bcab-placeholder">
              <div class="bcab-placeholder-icon">◑</div>
              <p>Проект пока не привязан.<br>Обратитесь к вашему дизайнеру.</p>
            </div>
          </template>

          <!-- Documents -->
          <template v-else-if="section === 'documents'">
            <div class="bcab-placeholder">
              <div class="bcab-placeholder-icon">◻</div>
              <p>Раздел в разработке.<br>Здесь будут ваши договоры и документы.</p>
            </div>
          </template>

          <!-- Galleries -->
          <template v-else-if="section.startsWith('gallery')">
            <div class="bcab-placeholder">
              <div class="bcab-placeholder-icon">▣</div>
              <p>Галерея в разработке.<br>Скоро здесь появятся материалы.</p>
            </div>
          </template>

        </div>
      </main>
    </div>

    <footer class="bcab-footer">
      <span>© Дарья Кульчихина</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['client-brief'] })

const router = useRouter()
const rRoute = useRoute()
const clientId = Number(rRoute.params.clientId)

const { data: client, pending, refresh } = await useFetch<any>(`/api/clients/${clientId}/brief`)

const brief = reactive({
  about_me: '',
  family: [] as string[],
  rooms: [] as string[],
  style_preference: [] as string[],
  budget: '',
  deadline_wish: '',
  current_pain: '',
  wishes: '',
  avoid: '',
  references: '',
})

const objectForm = reactive({
  objectAddress: '',
  objectType: '',
  objectArea: '',
  roomCount: '',
  floor: '',
  ceilingHeight: '',
  stylePreferences: '',
  budget: '',
  deadline: '',
})

watch(client, (val) => {
  const sp = (val?.selfProfile as any) || {}
  const op = ((val?.brief as any)?.object_params as any) || {}
  const toArr = (v: any) => Array.isArray(v) ? v : (v ? String(v).split(',').map((s: string) => s.trim()).filter(Boolean) : [])

  if (val?.brief) {
    const { object_params: _op, ...bf } = (val.brief as any)
    // clients.brief has priority; fall back to selfProfile fields
    brief.about_me          = bf.about_me       || sp.lifestyle      || ''
    brief.family            = toArr(bf.family?.length   ? bf.family   : sp.family_tags)
    brief.rooms             = toArr(bf.rooms?.length    ? bf.rooms    : sp.rooms_tags)
    brief.style_preference  = toArr(bf.style_preference?.length ? bf.style_preference : (sp.style_tags || sp.stylePreferences))
    brief.budget            = bf.budget         || sp.budget         || ''
    brief.deadline_wish     = bf.deadline_wish   || sp.deadline       || ''
    brief.current_pain      = bf.current_pain    || sp.current_pain   || ''
    brief.wishes            = bf.wishes          || sp.wishes         || ''
    brief.avoid             = bf.avoid           || sp.dislikes       || ''
    brief.references        = bf.references      || sp.brief_like_refs || ''
  } else {
    // No local brief yet — load entirely from selfProfile
    brief.about_me         = sp.lifestyle       || ''
    brief.family           = toArr(sp.family_tags)
    brief.rooms            = toArr(sp.rooms_tags)
    brief.style_preference = toArr(sp.style_tags || sp.stylePreferences)
    brief.budget           = sp.budget          || ''
    brief.deadline_wish    = sp.deadline         || ''
    brief.current_pain     = sp.current_pain     || ''
    brief.wishes           = sp.wishes           || ''
    brief.avoid            = sp.dislikes         || ''
    brief.references       = sp.brief_like_refs  || ''
  }

  // objectForm: selfProfile takes priority over brief.object_params
  const source: Record<string, unknown> = { ...op, ...sp }
  Object.keys(objectForm).forEach(k => {
    ;(objectForm as any)[k] = (source[k] as string) ?? ''
  })
}, { immediate: true })

const section = ref('brief')
const galleryOpen = ref(false)
const saveMsg = ref('')

// Tag options
const FAMILY_TAGS = [
  { val: 'муж', icon: '👨', label: 'Муж' },
  { val: 'жена', icon: '👩', label: 'Жена' },
  { val: 'мальчик', icon: '👦', label: 'Мальчик' },
  { val: 'девочка', icon: '👧', label: 'Девочка' },
  { val: 'младенец', icon: '👶', label: 'Младенец' },
  { val: 'кошка', icon: '🐱', label: 'Кошка' },
  { val: 'собака', icon: '🐶', label: 'Собака' },
  { val: 'попугай', icon: '🦜', label: 'Попугай' },
  { val: 'рыбки', icon: '🐠', label: 'Рыбки' },
  { val: 'другие питомцы', icon: '🐾', label: 'Другие питомцы' },
]

const ROOM_TAGS = [
  'Прихожая', 'Гостиная', 'Кухня', 'Столовая', 'Спальня',
  'Детская', 'Кабинет', 'Гардероб', 'Ванная', 'Санузел',
  'Кладовка', 'Балкон', 'Терраса', 'Гараж',
]

const STYLE_TAGS = [
  'Модерн', 'Скандинавский', 'Минимализм', 'Лофт', 'Классика',
  'Неоклассика', 'Ар-деко', 'Бохо', 'Эклектика', 'Contemporary',
  'Японский', 'Средиземноморский', 'Прованс', 'Хай-тек', 'Шебби-шик',
]

function toggleTag(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}
const objectSaveMsg = ref('')

// Address suggest
const suggestions = ref<{ title: string; subtitle: string; full: string }[]>([])
const suggestIndex = ref(-1)
let suggestTimer: ReturnType<typeof setTimeout> | null = null

async function onAddressInput() {
  const q = objectForm.objectAddress.trim()
  if (suggestTimer) clearTimeout(suggestTimer)
  if (q.length < 2) { suggestions.value = []; return }
  suggestTimer = setTimeout(async () => {
    try {
      const data = await $fetch<any>('/api/suggest/address', { query: { q } })
      suggestions.value = data.results || []
      suggestIndex.value = -1
    } catch { suggestions.value = [] }
  }, 250)
}

function hideSuggest() {
  setTimeout(() => { suggestions.value = [] }, 150)
}

function suggestDown() {
  if (suggestIndex.value < suggestions.value.length - 1) suggestIndex.value++
}
function suggestUp() {
  if (suggestIndex.value > 0) suggestIndex.value--
}
function suggestSelect() {
  if (suggestIndex.value >= 0) pickSuggest(suggestions.value[suggestIndex.value])
}
function pickSuggest(s: { title: string; subtitle: string; full: string }) {
  objectForm.objectAddress = s.full
  suggestions.value = []
  suggestIndex.value = -1
}

const topNav = [
  { key: 'brief', icon: '◎', label: 'Бриф' },
  { key: 'object', icon: '⬜', label: 'Параметры объекта' },
  { key: 'roadmap', icon: '◈', label: 'Дорожная карта' },
  { key: 'contractors', icon: '◑', label: 'Исполнители' },
  { key: 'documents', icon: '📄', label: 'Документы' },
]

const galleries = [
  { key: 'gallery-interior', label: 'Интерьер' },
  { key: 'gallery-furniture', label: 'Мебель' },
  { key: 'gallery-materials', label: 'Материалы' },
  { key: 'gallery-art', label: 'Арт-объекты' },
  { key: 'gallery-moodboards', label: 'Мудборды' },
]

// Build self_profile payload from current brief
function briefToSelfProfile() {
  return {
    lifestyle:      brief.about_me,
    family_tags:    brief.family,
    rooms_tags:     brief.rooms,
    style_tags:     brief.style_preference,
    stylePreferences: Array.isArray(brief.style_preference) ? brief.style_preference.join(', ') : brief.style_preference,
    budget:         brief.budget,
    deadline:       brief.deadline_wish,
    current_pain:   brief.current_pain,
    wishes:         brief.wishes,
    dislikes:       brief.avoid,
    brief_like_refs: brief.references,
  }
}

async function saveBrief() {
  saveMsg.value = ''
  const existingObjectParams = (client.value?.brief as any)?.object_params || {}
  await $fetch(`/api/clients/${clientId}/brief`, {
    method: 'PUT',
    body: { ...brief, object_params: existingObjectParams },
  })
  // Auto-sync to project selfProfile if linked
  if (client.value?.linkedProject) {
    await $fetch(`/api/clients/${clientId}/self-profile`, {
      method: 'PUT',
      body: { content: briefToSelfProfile() },
    })
  }
  await refresh()
  saveMsg.value = 'Сохранено!'
  setTimeout(() => (saveMsg.value = ''), 3000)
}

async function saveObject() {
  objectSaveMsg.value = ''
  // Always save to clients.brief.object_params (works without a project)
  const currentBrief = (client.value?.brief as any) || {}
  await $fetch(`/api/clients/${clientId}/brief`, {
    method: 'PUT',
    body: { ...currentBrief, object_params: { ...objectForm } },
  })
  // If linked to a project, also sync to self_profile
  if (client.value?.linkedProject) {
    await $fetch(`/api/clients/${clientId}/self-profile`, {
      method: 'PUT',
      body: { content: { ...objectForm } },
    })
  }
  await refresh()
  objectSaveMsg.value = 'Сохранено!'
  setTimeout(() => (objectSaveMsg.value = ''), 3000)
}

// Бриф ← проект: полная загрузка всех полей из selfProfile
function pullFromProject() {
  const p = (client.value?.selfProfile as any) || {}
  const toArr = (v: any) => Array.isArray(v) ? v : (v ? String(v).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
  brief.about_me         = p.lifestyle       || brief.about_me
  brief.family           = p.family_tags?.length ? toArr(p.family_tags) : brief.family
  brief.rooms            = p.rooms_tags?.length  ? toArr(p.rooms_tags)  : brief.rooms
  brief.style_preference = p.style_tags?.length  ? toArr(p.style_tags)  : (p.stylePreferences ? toArr(p.stylePreferences) : brief.style_preference)
  brief.budget           = p.budget          || brief.budget
  brief.deadline_wish    = p.deadline         || brief.deadline_wish
  brief.current_pain     = p.current_pain     || brief.current_pain
  brief.wishes           = p.wishes           || brief.wishes
  brief.avoid            = p.dislikes         || brief.avoid
  brief.references       = p.brief_like_refs  || brief.references
}

// Бриф → проект: сохранить все поля брифа + шаредные поля в objectForm
async function pushToProject() {
  if (brief.budget) objectForm.budget = brief.budget
  if (brief.deadline_wish) objectForm.deadline = brief.deadline_wish
  if (brief.style_preference.length) objectForm.stylePreferences = Array.isArray(brief.style_preference) ? brief.style_preference.join(', ') : brief.style_preference
  await saveObject()
  await $fetch(`/api/clients/${clientId}/self-profile`, {
    method: 'PUT',
    body: { content: briefToSelfProfile() },
  })
  await refresh()
}

// Параметры ← бриф: перенести из брифа в форму объекта
function pullFromBrief() {
  if (brief.budget) objectForm.budget = brief.budget
  if (brief.deadline_wish) objectForm.deadline = brief.deadline_wish
  if (brief.style_preference.length) objectForm.stylePreferences = Array.isArray(brief.style_preference) ? brief.style_preference.join(', ') : brief.style_preference
}

// Параметры → бриф: перенести из объекта в бриф
function pushToBrief() {
  if (objectForm.budget) brief.budget = objectForm.budget
  if (objectForm.deadline) brief.deadline_wish = objectForm.deadline
  if (objectForm.stylePreferences) {
    const toArr = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean)
    brief.style_preference = toArr(objectForm.stylePreferences)
  }
}

async function logout() {
  await $fetch('/api/auth/client-id-logout', { method: 'POST' })
  router.push('/client/brief-login')
}
</script>

<style scoped>
.bcab-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--glass-page-bg, #f0f4ff);
}

.bcab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.25));
}

.bcab-logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--glass-text, #1a1a2e);
}
.bcab-logo span {
  font-weight: 400;
  font-size: 0.95rem;
  opacity: 0.65;
  margin-left: 6px;
}

.bcab-hright {
  display: flex;
  align-items: center;
  gap: 14px;
}
.bcab-hname {
  font-size: 0.9rem;
  opacity: 0.75;
}
.bcab-logout {
  cursor: pointer;
  background: none;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  font-size: 0.85rem;
}

.bcab-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 60px;
  opacity: 0.5;
  font-size: 1.1rem;
}

.bcab-body {
  flex: 1;
  display: flex;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 20px;
  gap: 24px;
  align-items: flex-start;
}

/* Sidebar */
.bcab-sidebar {
  width: 210px;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 16px 0;
  position: sticky;
  top: 84px;
}

.bcab-nav {
  display: flex;
  flex-direction: column;
}

.bcab-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.72;
  transition: background 0.15s, opacity 0.15s;
  border-radius: 0;
}
.bcab-nav-item:hover {
  background: rgba(255,255,255,0.18);
  opacity: 1;
}
.bcab-nav-item.active {
  background: rgba(255,255,255,0.28);
  opacity: 1;
  font-weight: 600;
}
.bcab-nav-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.bcab-nav-group {
  justify-content: space-between;
}
.bcab-nav-group.group-active {
  opacity: 1;
  font-weight: 600;
}
.bcab-nav-arrow {
  font-size: 1rem;
  transform: rotate(0deg);
  transition: transform 0.2s;
  display: inline-block;
}
.bcab-nav-arrow.open {
  transform: rotate(90deg);
}
.bcab-nav-sub {
  display: none;
  flex-direction: column;
  background: rgba(0,0,0,0.04);
}
.bcab-nav-sub.open {
  display: flex;
}
.bcab-nav-sub-item {
  padding: 8px 18px 8px 38px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--glass-text, #1a1a2e);
  opacity: 0.65;
  transition: background 0.15s, opacity 0.15s;
}
.bcab-nav-sub-item:hover {
  background: rgba(255,255,255,0.18);
  opacity: 0.9;
}
.bcab-nav-sub-item.active {
  background: rgba(255,255,255,0.25);
  opacity: 1;
  font-weight: 600;
}

/* Main */
.bcab-main {
  flex: 1;
  min-width: 0;
}
.bcab-inner {
  max-width: 900px;
}

.bcab-section-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.bcab-sync-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.bcab-sync-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.22);
  border: 1px solid rgba(180,180,220,0.35);
  backdrop-filter: blur(8px);
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.bcab-sync-btn:hover {
  background: rgba(255,255,255,0.34);
  border-color: rgba(120,130,200,0.5);
}

/* Brief form */
.bcab-form-section {
  background: var(--glass-bg, rgba(255,255,255,0.35));
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 18px;
}
.bcab-form-section h3 {
  margin: 0 0 14px;
  font-size: 0.95rem;
  font-weight: 700;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.bcab-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.bcab-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bcab-field label {
  font-size: 0.8rem;
  opacity: 0.65;
}
.bcab-field .glass-input {
  width: 100%;
  resize: vertical;
}
.bcab-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
}
.bcab-save {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 8px 26px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(180,180,220,0.45);
  backdrop-filter: blur(10px);
  transition: background 0.15s, border-color 0.15s;
}
.bcab-save:hover {
  background: rgba(255,255,255,0.5);
  border-color: rgba(120,130,200,0.55);
}
.bcab-save-msg {
  font-size: 0.88rem;
  color: #4a7c59;
  font-weight: 600;
}

.bcab-field-suggest {
  position: relative;
}
.bcab-suggest-wrap {
  position: relative;
}
.bcab-suggest-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border, rgba(200,200,220,0.4));
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  list-style: none;
  margin: 0;
  padding: 4px 0;
  z-index: 500;
  max-height: 240px;
  overflow-y: auto;
}
.bcab-suggest-item {
  display: flex;
  flex-direction: column;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.12s;
  gap: 2px;
}
.bcab-suggest-item:hover,
.bcab-suggest-item.active {
  background: rgba(100,120,200,0.08);
}
.bcab-suggest-title {
  font-size: 0.88rem;
  color: #1a1a2e;
  font-weight: 500;
}
.bcab-suggest-sub {
  font-size: 0.76rem;
  color: #888;
}

/* Tag selectors */
.bcab-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 2px 0;
}
.bcab-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(180,180,220,0.35);
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(6px);
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--glass-text, #1a1a2e);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  user-select: none;
  white-space: nowrap;
}
.bcab-tag:hover {
  background: rgba(255,255,255,0.32);
  border-color: rgba(120,130,200,0.45);
}
.bcab-tag.active {
  background: rgba(100,110,200,0.22);
  border-color: rgba(100,110,200,0.55);
  font-weight: 600;
  transform: scale(1.03);
}
.bcab-field-full {
  grid-column: 1 / -1;
}
.bcab-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  opacity: 0.55;
  background: var(--glass-bg, rgba(255,255,255,0.2));
  border: 1px dashed var(--glass-border, rgba(255,255,255,0.3));
  border-radius: 16px;
}
.bcab-placeholder-icon {
  font-size: 2.5rem;
  margin-bottom: 14px;
}
.bcab-placeholder p {
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
}

.bcab-footer {
  text-align: center;
  padding: 18px;
  font-size: 0.8rem;
  opacity: 0.4;
}

/* Mobile */
@media (max-width: 768px) {
  .bcab-header {
    padding: 12px 16px;
  }
  .bcab-body {
    flex-direction: column;
    padding: 16px 12px;
    gap: 16px;
  }
  .bcab-sidebar {
    width: 100%;
    position: static;
    padding: 8px 0;
    overflow-x: auto;
  }
  .bcab-nav {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .bcab-nav-item {
    flex-shrink: 0;
    padding: 7px 14px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .bcab-nav-sub {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  .bcab-nav-sub-item {
    flex-shrink: 0;
    padding: 7px 12px 7px 12px;
  }
  .bcab-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
