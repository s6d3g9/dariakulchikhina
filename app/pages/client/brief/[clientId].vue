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
              <h2 class="bcab-section-title">Бриф</h2>
              <div v-if="client.linkedProject" class="bcab-sync-row">
                <button type="button" class="glass-chip bcab-sync-btn" @click="pullFromProject" title="Перенести бюджет / срок / стиль из проекта">← из проекта</button>
                <button type="button" class="glass-chip bcab-sync-btn" @click="pushToProject" title="Перенести бюджет / срок / стиль в проект">→ в проект</button>
              </div>
            </div>
            <form @submit.prevent="saveBrief" class="bcab-form">
              <div class="bcab-form-section">
                <h3>О вас</h3>
                <div class="bcab-grid-2">
                  <div class="bcab-field">
                    <label>О себе</label>
                    <textarea v-model="brief.about_me" class="glass-input" rows="3" placeholder="Расскажите немного о себе и своей семье…" />
                  </div>
                  <div class="bcab-field">
                    <label>Состав семьи</label>
                    <textarea v-model="brief.family" class="glass-input" rows="3" placeholder="Сколько человек, дети, питомцы…" />
                  </div>
                </div>
              </div>

              <div class="bcab-form-section">
                <h3>О проекте</h3>
                <div class="bcab-grid-2">
                  <div class="bcab-field">
                    <label>Комнаты / помещения</label>
                    <textarea v-model="brief.rooms" class="glass-input" rows="2" placeholder="Гостиная, спальня, кухня…" />
                  </div>
                  <div class="bcab-field">
                    <label>Предпочтения по стилю</label>
                    <textarea v-model="brief.style_preference" class="glass-input" rows="2" placeholder="Скандинавский, лофт, минимализм…" />
                  </div>
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
                <button type="submit" class="glass-chip bcab-save">Сохранить</button>
                <span v-if="saveMsg" class="bcab-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

          <!-- Object params -->
          <template v-else-if="section === 'object'">
            <div class="bcab-section-head">
              <h2 class="bcab-section-title">Параметры объекта</h2>
              <div v-if="client.linkedProject" class="bcab-sync-row">
                <button type="button" class="glass-chip bcab-sync-btn" @click="pullFromBrief" title="Перенести бюджет / срок / стиль из брифа">← из брифа</button>
              </div>
            </div>
            <div>
              <form @submit.prevent="saveObject" class="bcab-form">
                <div class="bcab-form-section">
                  <h3>Адрес и тип</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field">
                      <label>Адрес объекта</label>
                      <input v-model="objectForm.objectAddress" class="glass-input" placeholder="ЖК Crystal, корп 2, кв 45" />
                    </div>
                    <div class="bcab-field">
                      <label>Тип объекта</label>
                      <input v-model="objectForm.objectType" class="glass-input" placeholder="Квартира / дом / офис…" />
                    </div>
                  </div>
                </div>
                <div class="bcab-form-section">
                  <h3>Характеристики</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field">
                      <label>Площадь, м²</label>
                      <input v-model="objectForm.objectArea" class="glass-input" placeholder="87" />
                    </div>
                    <div class="bcab-field">
                      <label>Количество комнат</label>
                      <input v-model="objectForm.roomCount" class="glass-input" placeholder="3" />
                    </div>
                    <div class="bcab-field">
                      <label>Этаж</label>
                      <input v-model="objectForm.floor" class="glass-input" placeholder="12 из 25" />
                    </div>
                    <div class="bcab-field">
                      <label>Высота потолков</label>
                      <input v-model="objectForm.ceilingHeight" class="glass-input" placeholder="2.8 м" />
                    </div>
                  </div>
                </div>
                <div class="bcab-form-section">
                  <h3>Стиль и бюджет</h3>
                  <div class="bcab-grid-2">
                    <div class="bcab-field">
                      <label>Стиль</label>
                      <input v-model="objectForm.stylePreferences" class="glass-input" placeholder="Скандинавский, лофт…" />
                    </div>
                    <div class="bcab-field">
                      <label>Бюджет</label>
                      <input v-model="objectForm.budget" class="glass-input" placeholder="₽ 3 000 000" />
                    </div>
                    <div class="bcab-field">
                      <label>Срок</label>
                      <input v-model="objectForm.deadline" class="glass-input" placeholder="до декабря 2026" />
                    </div>
                  </div>
                </div>
                <div class="bcab-foot">
                  <button type="submit" class="glass-chip bcab-save">Сохранить</button>
                  <button type="button" class="glass-chip bcab-sync-btn" @click="pushToBrief">→ в бриф</button>
                  <span v-if="objectSaveMsg" class="bcab-save-msg">{{ objectSaveMsg }}</span>
                </div>
              </form>
            </div>
          </template>

          <!-- Roadmap -->
          <template v-else-if="section === 'roadmap'">
            <h2 class="bcab-section-title">Дорожная карта</h2>
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
            <h2 class="bcab-section-title">Контакты исполнителей</h2>
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
            <h2 class="bcab-section-title">Договоры и документы</h2>
            <div class="bcab-placeholder">
              <div class="bcab-placeholder-icon">◻</div>
              <p>Раздел в разработке.<br>Здесь будут ваши договоры и документы.</p>
            </div>
          </template>

          <!-- Galleries -->
          <template v-else-if="section.startsWith('gallery')">
            <h2 class="bcab-section-title">{{ currentGalleryLabel }}</h2>
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
  family: '',
  rooms: '',
  style_preference: '',
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
  if (val?.brief) {
    const { object_params: _op, ...briefFields } = (val.brief as any)
    Object.assign(brief, briefFields)
  }
  // Populate objectForm: project selfProfile takes priority, fallback to brief.object_params
  const sp = (val?.selfProfile as Record<string, unknown>) || {}
  const op = ((val?.brief as any)?.object_params as Record<string, unknown>) || {}
  const source: Record<string, unknown> = { ...op, ...sp }
  Object.keys(objectForm).forEach(k => {
    ;(objectForm as any)[k] = (source[k] as string) ?? ''
  })
}, { immediate: true })

const section = ref('brief')
const galleryOpen = ref(false)
const saveMsg = ref('')
const objectSaveMsg = ref('')

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

const currentGalleryLabel = computed(() => {
  const g = galleries.find(g => g.key === section.value)
  return g ? `Галерея: ${g.label}` : 'Галерея'
})

async function saveBrief() {
  saveMsg.value = ''
  // Preserve object_params when saving brief fields
  const existingObjectParams = (client.value?.brief as any)?.object_params || {}
  await $fetch(`/api/clients/${clientId}/brief`, {
    method: 'PUT',
    body: { ...brief, object_params: existingObjectParams },
  })
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

// Бриф ← проект: перенести бюджет/срок/стиль из self_profile в бриф
function pullFromProject() {
  const p = (client.value?.selfProfile as any) || {}
  if (p.budget) brief.budget = p.budget
  if (p.deadline) brief.deadline_wish = p.deadline
  if (p.stylePreferences) brief.style_preference = p.stylePreferences
  if (p.brief_like_refs) brief.references = p.brief_like_refs
  if (p.dislikes) brief.avoid = p.dislikes
}

// Бриф → проект: перенести поля брифа в objectForm и сохранить
async function pushToProject() {
  if (brief.budget) objectForm.budget = brief.budget
  if (brief.deadline_wish) objectForm.deadline = brief.deadline_wish
  if (brief.style_preference) objectForm.stylePreferences = brief.style_preference
  await saveObject()
}

// Параметры ← бриф: перенести из брифа в форму объекта
function pullFromBrief() {
  if (brief.budget) objectForm.budget = brief.budget
  if (brief.deadline_wish) objectForm.deadline = brief.deadline_wish
  if (brief.style_preference) objectForm.stylePreferences = brief.style_preference
}

// Параметры → бриф: перенести из объекта в бриф
function pushToBrief() {
  if (objectForm.budget) brief.budget = objectForm.budget
  if (objectForm.deadline) brief.deadline_wish = objectForm.deadline
  if (objectForm.stylePreferences) brief.style_preference = objectForm.stylePreferences
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
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}
.bcab-section-head .bcab-section-title {
  margin-bottom: 0;
}
.bcab-section-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 22px;
  color: var(--glass-text, #1a1a2e);
}
.bcab-sync-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.bcab-sync-btn {
  cursor: pointer;
  background: rgba(100,120,200,0.12);
  border: 1px solid rgba(100,120,200,0.28);
  font-size: 0.8rem;
  padding: 5px 14px;
  opacity: 0.85;
}
.bcab-sync-btn:hover {
  background: rgba(100,120,200,0.22);
  opacity: 1;
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
  background: rgba(80,100,200,0.18);
  border: 1px solid rgba(80,100,200,0.35);
  font-size: 0.9rem;
  padding: 8px 24px;
}
.bcab-save:hover {
  background: rgba(80,100,200,0.28);
}
.bcab-save-msg {
  font-size: 0.88rem;
  color: #4a7c59;
  font-weight: 600;
}

/* Placeholder */
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
