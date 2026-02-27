<template>
  <div class="bcab-root glass-page">

    <!-- Header -->
    <header class="bcab-header glass-surface">
      <div class="bcab-header-inner">
        <div class="bcab-logo">
          <span class="bcab-logo-mark">DK</span>
          <span class="bcab-logo-sep"></span>
          <span class="bcab-logo-name">Кабинет клиента</span>
        </div>
        <div class="bcab-header-right">
          <span v-if="client" class="bcab-client-name">{{ client.name }}</span>
          <button class="bcab-logout" @click="logout">выйти</button>
        </div>
      </div>
    </header>

    <div v-if="pending" class="bcab-loading">Загрузка…</div>

    <main v-else-if="client" class="bcab-main">
      <div class="bcab-inner">

        <!-- Welcome -->
        <div class="bcab-hero">
          <h1 class="bcab-hero-title">Привет, {{ firstName }}!</h1>
          <p class="bcab-hero-sub">Заполните бриф — мы сможем лучше понять ваш проект</p>
        </div>

        <!-- Brief form -->
        <form class="bcab-form" @submit.prevent="saveBrief">

          <section class="bcab-section glass-surface">
            <h2 class="bcab-section-title">О вас</h2>
            <div class="bcab-grid">
              <div class="bcab-field">
                <label>Расскажите о себе</label>
                <textarea v-model="brief.about_me" class="bcab-input glass-input" rows="3" placeholder="Семья, образ жизни, чем занимаетесь…"></textarea>
              </div>
              <div class="bcab-field">
                <label>Состав семьи</label>
                <input v-model="brief.family" class="bcab-input glass-input" placeholder="Например: пара + 1 ребёнок">
              </div>
            </div>
          </section>

          <section class="bcab-section glass-surface">
            <h2 class="bcab-section-title">О проекте</h2>
            <div class="bcab-grid">
              <div class="bcab-field">
                <label>Помещения</label>
                <input v-model="brief.rooms" class="bcab-input glass-input" placeholder="Гостиная, спальня, кухня…">
              </div>
              <div class="bcab-field">
                <label>Желаемый стиль</label>
                <input v-model="brief.style_preference" class="bcab-input glass-input" placeholder="Минимализм, скандинавский, модерн…">
              </div>
              <div class="bcab-field">
                <label>Бюджет</label>
                <input v-model="brief.budget" class="bcab-input glass-input" placeholder="Примерная сумма">
              </div>
              <div class="bcab-field">
                <label>Желаемый срок завершения</label>
                <input v-model="brief.deadline_wish" class="bcab-input glass-input" placeholder="Например: до нового года">
              </div>
            </div>
          </section>

          <section class="bcab-section glass-surface">
            <h2 class="bcab-section-title">Пожелания и боли</h2>
            <div class="bcab-grid">
              <div class="bcab-field bcab-field--full">
                <label>Что сейчас не устраивает</label>
                <textarea v-model="brief.current_pain" class="bcab-input glass-input" rows="3" placeholder="Тёмно, мало хранений, неудобная планировка…"></textarea>
              </div>
              <div class="bcab-field bcab-field--full">
                <label>Ваши пожелания и мечты</label>
                <textarea v-model="brief.wishes" class="bcab-input glass-input" rows="3" placeholder="Хочу уютный уголок для чтения, большую ванну…"></textarea>
              </div>
              <div class="bcab-field bcab-field--full">
                <label>Что нельзя делать / чего избегать</label>
                <textarea v-model="brief.avoid" class="bcab-input glass-input" rows="2" placeholder="Не люблю тёмные цвета,避免много декора…"></textarea>
              </div>
            </div>
          </section>

          <section class="bcab-section glass-surface">
            <h2 class="bcab-section-title">Референсы и вдохновение</h2>
            <div class="bcab-field">
              <label>Ссылки на Pinterest, Instagram, Houzz и т.д.</label>
              <textarea v-model="brief.references" class="bcab-input glass-input" rows="3" placeholder="https://pinterest.com/..."></textarea>
            </div>
          </section>

          <div class="bcab-foot">
            <span v-if="saveMsg" class="bcab-save-msg" :class="saveError && 'bcab-save-msg--err'">{{ saveMsg }}</span>
            <button type="submit" class="bcab-save-btn" :disabled="saving">
              {{ saving ? 'Сохранение…' : 'Сохранить бриф' }}
            </button>
          </div>
        </form>

      </div>
    </main>

    <footer class="bcab-footer">
      <span class="bcab-footer-copy">© Daria Kulchikhina Design Studio</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['client-brief'] })

const route  = useRouter()
const rRoute = useRoute()
const clientId = Number(rRoute.params.clientId)

const { data: client, pending } = await useFetch<any>(`/api/clients/${clientId}/brief`)

const brief = reactive({
  about_me:      '',
  family:        '',
  rooms:         '',
  style_preference: '',
  budget:        '',
  deadline_wish: '',
  current_pain:  '',
  wishes:        '',
  avoid:         '',
  references:    '',
})

watch(client, (c) => {
  if (c?.brief) Object.assign(brief, c.brief)
}, { immediate: true })

const firstName = computed(() => {
  if (!client.value?.name) return ''
  return client.value.name.split(' ')[0]
})

const saving  = ref(false)
const saveMsg = ref('')
const saveError = ref(false)

async function saveBrief() {
  saving.value = true; saveMsg.value = ''; saveError.value = false
  try {
    await $fetch(`/api/clients/${clientId}/brief`, { method: 'PUT', body: { ...brief } })
    saveMsg.value = 'Сохранено!'
  } catch {
    saveMsg.value = 'Ошибка сохранения'; saveError.value = true
  } finally {
    saving.value = false
    setTimeout(() => { saveMsg.value = '' }, 3000)
  }
}

async function logout() {
  await $fetch('/api/auth/client-id-logout', { method: 'POST' })
  route.push('/client/brief-login')
}
</script>

<style scoped>
.bcab-root { min-height: 100vh; display: flex; flex-direction: column; }

/* Header */
.bcab-header {
  position: sticky; top: 0; z-index: 50;
  border-radius: 0 0 16px 16px;
  border-top: none !important; border-left: none !important; border-right: none !important;
}
.bcab-header-inner {
  max-width: 860px; margin: 0 auto; padding: 0 24px;
  height: 52px; display: flex; align-items: center; justify-content: space-between;
}
.bcab-logo { display: flex; align-items: center; gap: 10px; }
.bcab-logo-mark { font-size: .72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--glass-text); }
.bcab-logo-sep  { width: 1px; height: 14px; background: var(--glass-border); }
.bcab-logo-name { font-size: .74rem; letter-spacing: .8px; color: var(--glass-text); opacity: .45; }
.bcab-header-right { display: flex; align-items: center; gap: 12px; }
.bcab-client-name { font-size: .74rem; color: var(--glass-text); opacity: .45; }
.bcab-logout {
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  cursor: pointer; padding: 5px 12px; font-size: .72rem;
  letter-spacing: .6px; text-transform: uppercase;
  color: var(--glass-text); opacity: .65; font-family: inherit;
  border-radius: 7px; transition: opacity .15s;
}
.bcab-logout:hover { opacity: 1; }

.bcab-loading { padding: 80px 24px; text-align: center; opacity: .35; font-size: .82rem; }

/* Main */
.bcab-main { flex: 1; }
.bcab-inner { max-width: 860px; margin: 0 auto; padding: 32px 24px 64px; }

.bcab-hero { margin-bottom: 28px; }
.bcab-hero-title { font-size: 1.6rem; font-weight: 300; letter-spacing: -.4px; color: var(--glass-text); margin: 0 0 6px; }
.bcab-hero-sub   { font-size: .77rem; color: var(--glass-text); opacity: .45; letter-spacing: .4px; margin: 0; }

/* Form */
.bcab-form { display: flex; flex-direction: column; gap: 16px; }
.bcab-section { padding: 20px 22px; border-radius: 16px; }
.bcab-section-title {
  font-size: .66rem; text-transform: uppercase; letter-spacing: 1.2px;
  color: var(--glass-text); opacity: .4; margin: 0 0 16px;
}
.bcab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.bcab-field { display: flex; flex-direction: column; gap: 5px; }
.bcab-field--full { grid-column: 1 / -1; }
.bcab-field label { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .4; }
.bcab-input { padding: 9px 13px; border-radius: 9px; font-family: inherit; font-size: .88rem; width: 100%; box-sizing: border-box; resize: vertical; }

.bcab-foot {
  display: flex; align-items: center; justify-content: flex-end; gap: 12px;
  padding-top: 4px;
}
.bcab-save-msg { font-size: .78rem; color: var(--glass-text); opacity: .55; }
.bcab-save-msg--err { color: #dc2626; opacity: 1; }
.bcab-save-btn {
  padding: 10px 28px; border-radius: 9px; cursor: pointer;
  border: none; background: var(--glass-text); color: var(--glass-page-bg);
  font-family: inherit; font-size: .85rem; font-weight: 500;
  transition: opacity .15s;
}
.bcab-save-btn:hover:not(:disabled) { opacity: .82; }
.bcab-save-btn:disabled { opacity: .4; cursor: default; }

.bcab-footer {
  border-top: 1px solid var(--glass-border);
  padding: 14px 24px; text-align: center;
}
.bcab-footer-copy { font-size: .68rem; letter-spacing: .5px; color: var(--glass-text); opacity: .35; text-transform: uppercase; }

@media (max-width: 640px) {
  .bcab-grid { grid-template-columns: 1fr; }
  .bcab-inner { padding: 20px 16px 48px; }
  .bcab-header-inner { padding: 0 16px; }
  .bcab-client-name { display: none; }
}
</style>
