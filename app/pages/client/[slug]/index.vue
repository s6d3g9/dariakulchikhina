<template>
  <div class="cc-root glass-page">

    <div v-if="pending" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 5" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="error || !project" class="cc-error glass-surface">
      <template v-if="(error as any)?.statusCode === 401 || (error as any)?.status === 401">
        <p>Сессия истекла. Войдите снова.</p>
        <NuxtLink to="/client/login" class="a-btn-save">Войти</NuxtLink>
      </template>
      <template v-else>
        <p>Не удалось загрузить данные проекта.</p>
        <button @click="refresh" class="a-btn-sm">Повторить</button>
        <NuxtLink to="/client/login" class="a-btn-sm">Выйти</NuxtLink>
      </template>
    </div>

    <div v-else class="cc-body">

      <!-- Mobile top bar -->
      <div class="cc-mobile-bar glass-surface">
        <div class="cc-mobile-title">{{ project.title }}</div>
        <div class="cc-mobile-nav">
          <button
            class="cc-mobile-btn"
            :class="{ 'cc-mobile-btn--active': activePage === 'overview' }"
            @click="setPage('overview')"
          >
            <span>◈</span>
          </button>
          <button
            v-for="pg in navPages"
            :key="pg.slug"
            class="cc-mobile-btn"
            :class="{ 'cc-mobile-btn--active': activePage === pg.slug }"
            @click="setPage(pg.slug)"
          >
            <span>{{ pg.icon }}</span>
          </button>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="cc-sidebar glass-surface std-sidenav">
        <div class="cc-sidebar-header">
          <div class="cc-project-title">{{ project.title }}</div>
          <div class="cc-project-status">
            <span class="cc-status-dot" :class="`cc-status--${project.status}`"></span>
            {{ statusLabel(project.status) }}
          </div>
        </div>

        <nav class="cc-nav std-nav">
          <button
            class="cc-nav-item std-nav-item"
            :class="{ active: activePage === 'overview', 'std-nav-item--active': activePage === 'overview' }"
            @click="setPage('overview')"
          >
            <span class="cc-nav-icon">◈</span>
            <span class="cc-nav-label">обзор</span>
          </button>
          <button
            v-for="pg in navPages"
            :key="pg.slug"
            class="cc-nav-item std-nav-item"
            :class="{ active: activePage === pg.slug, 'std-nav-item--active': activePage === pg.slug }"
            @click="setPage(pg.slug)"
          >
            <span class="cc-nav-icon">{{ pg.icon }}</span>
            <span class="cc-nav-label">{{ pg.title }}</span>
          </button>
        </nav>

        <div class="cc-sidebar-footer">
          <!-- Visit info + status change -->
          <div v-if="project?.profile?.visit_date" class="cc-visit-widget">
            <div class="cc-visit-heading">Выезд</div>
            <div v-if="project.profile.visit_contractor_name" class="cc-visit-who">{{ project.profile.visit_contractor_name }}</div>
            <div class="cc-visit-when">
              {{ project.profile.visit_date }}<template v-if="project.profile.visit_time"> · {{ project.profile.visit_time }}</template>
            </div>
            <div v-if="project.profile.visit_services" class="cc-visit-services">{{ project.profile.visit_services }}</div>
            <div v-if="project.profile.visit_status" :class="`cc-visit-badge cc-visit-badge--${project.profile.visit_status}`">
              {{ visitStatusLabel(project.profile.visit_status) }}
            </div>
            <div v-if="project.profile.visit_status === 'scheduled'" class="cc-visit-actions">
              <button :disabled="changingVisitStatus" class="cc-va-btn cc-va-btn--done" @click="updateVisitStatus('done')">✓ проведён</button>
              <button :disabled="changingVisitStatus" class="cc-va-btn cc-va-btn--noshow" @click="updateVisitStatus('noshow')">✗ не явился</button>
              <button :disabled="changingVisitStatus" class="cc-va-btn cc-va-btn--postponed" @click="updateVisitStatus('postponed')">↷ перенесён</button>
              <button :disabled="changingVisitStatus" class="cc-va-btn cc-va-btn--cancel" @click="updateVisitStatus('cancelled')">— отменён</button>
            </div>
            <!-- Rating widget after visit done -->
            <div v-if="project.profile.visit_status === 'done' && !project.profile.visit_rating && !ratingDone" class="cc-rating-widget">
              <div class="cc-rating-heading">Оцените выезд</div>
              <div class="cc-stars">
                <button v-for="s in 5" :key="s" type="button"
                  class="cc-star"
                  :class="{ 'cc-star--active': s <= ratingHover || s <= ratingValue }"
                  @mouseenter="ratingHover = s"
                  @mouseleave="ratingHover = 0"
                  @click="ratingValue = s"
                >★</button>
              </div>
              <textarea v-model="ratingComment" class="cc-rating-textarea" placeholder="Комментарий (необязательно)" rows="2" />
              <button :disabled="!ratingValue || sendingRating" class="cc-rating-submit" @click="submitRating">
                {{ sendingRating ? '...' : 'Отправить оценку' }}
              </button>
            </div>
            <div v-else-if="project.profile.visit_status === 'done' && (project.profile.visit_rating || ratingDone)" class="cc-rating-done">
              <span>Ваша оценка: </span>
              <span class="cc-stars-given">{{ '★'.repeat(project.profile.visit_rating || ratingValue) }}{{ '☆'.repeat(5 - (project.profile.visit_rating || ratingValue)) }}</span>
            </div>
          </div>
          <!-- "Связаться со мной" -->
          <div v-if="project?.profile?.contact_request_status === 'pending'" class="cc-contact-sent">
            ✔ Запрос отправлен — свяжемся с вами
          </div>
          <button v-else class="cc-contact-btn" @click="showContactModal = true">
            📞 Связаться со мной
          </button>

          <button @click="logout" class="cc-logout">выйти</button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="cc-main">
        <div class="cc-content">
          <ClientOverview
            v-if="activePage === 'overview'"
            :slug="slug"
            :project="project"
            :contractors="linkedContractors || []"
            :rm-map="rmMap"
            @navigate="setPage"
          />
          <component
            v-else
            :is="activeComponent"
            v-bind="activeProps"
            :key="activePage"
          />
        </div>
      </main>

    </div>

    <!-- ── Contact request modal ── -->
    <Teleport to="body">
      <div v-if="showContactModal" class="cc-modal-bg" @click.self="showContactModal = false">
        <div class="cc-modal glass-surface">
          <div class="cc-modal-head">
            <span>Выберите удобное время</span>
            <button class="cc-modal-close" @click="showContactModal = false">✕</button>
          </div>
          <div class="cc-modal-body">
            <div class="cc-slot-grid">
              <button
                class="cc-slot"
                :class="{ 'cc-slot--active': selectedSlot === 'asap' }"
                @click="selectedSlot = 'asap'"
              >🚀 Как можно раньше</button>
              <button
                v-for="slot in contactSlots" :key="slot.value"
                class="cc-slot"
                :class="{ 'cc-slot--active': selectedSlot === slot.value }"
                @click="selectedSlot = slot.value"
              >{{ slot.label }}</button>
            </div>
            <textarea v-model="contactMessage" class="cc-modal-text" rows="2" placeholder="Вопрос или уточнение (необязательно)" />
            <p v-if="contactError" class="cc-modal-err">{{ contactError }}</p>
            <div class="cc-modal-foot">
              <button class="cc-modal-cancel" @click="showContactModal = false">Отмена</button>
              <button class="cc-modal-submit" :disabled="!selectedSlot || sendingContact" @click="submitContactRequest">
                {{ sendingContact ? '...' : 'Отправить' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { getClientPages } from '~~/shared/constants/pages'

// Client-facing components
import ClientInitiation    from '~/components/ClientInitiation.vue'
import ClientSelfProfile   from '~/components/ClientSelfProfile.vue'
import ClientContactDetails from '~/components/ClientContactDetails.vue'
import ClientPassport      from '~/components/ClientPassport.vue'
import ClientBrief         from '~/components/ClientBrief.vue'
import ClientTZ            from '~/components/ClientTZ.vue'
import ClientContracts     from '~/components/ClientContracts.vue'
import ClientWorkProgress  from '~/components/ClientWorkProgress.vue'
import ClientTimeline      from '~/components/ClientTimeline.vue'
import ClientDesignAlbum   from '~/components/ClientDesignAlbum.vue'
import ClientPageContent   from '~/components/ClientPageContent.vue'
import ClientOverview      from '~/components/ClientOverview.vue'

definePageMeta({ middleware: 'client', layout: 'default' })

const route   = useRoute()
const router  = useRouter()
const slug    = computed(() => route.params.slug as string)

// Forward cookies to SSR fetch so requireAdminOrClient can read the session
const reqHeaders = useRequestHeaders(['cookie'])

// ── Fetch project ────────────────────────────────────────────────────────
const { data: project, pending, error, refresh } = await useFetch(
  () => `/api/projects/${slug.value}`,
  {
    watch: [slug],
    headers: reqHeaders,
  }
)

// ── Fetch linked contractors ─────────────────────────────────────────────
const { data: linkedContractors } = await useFetch<any[]>(
  () => `/api/projects/${slug.value}/contractors`,
  { default: () => [], headers: reqHeaders }
)

// ── Page component map ───────────────────────────────────────────────────
const PAGE_COMPONENT_MAP: Record<string, Component> = {
  phase_init:      ClientInitiation,
  self_profile:    ClientSelfProfile,
  brief:           ClientSelfProfile,
  client_contacts: ClientContactDetails,
  client_passport: ClientPassport,
  client_brief:    ClientBrief,
  client_tz:       ClientTZ,
  contracts:       ClientContracts,
  work_progress:   ClientWorkProgress,
  design_timeline: ClientTimeline,
  design_album:    ClientDesignAlbum,
}

// ── Navigation ───────────────────────────────────────────────────────────
const allClientPages = getClientPages()

const navPages = computed(() => {
  const pages = project.value?.pages || []
  return allClientPages.filter(p => {
    if (!p.phase) return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})

// ── Active page state ────────────────────────────────────────────────────
const activePage = ref('overview')

watch(navPages, (pages) => {
  if (!activePage.value || activePage.value === 'overview') return
  if (!pages.some(p => p.slug === activePage.value) && pages.length) {
    activePage.value = pages[0].slug
  }
}, { immediate: true })

function setPage(slug: string) {
  activePage.value = slug
  // Scroll to top on mobile
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const normalizedPage = computed(() =>
  activePage.value === 'brief' ? 'self_profile' : activePage.value
)

const activeComponent = computed<Component>(() =>
  PAGE_COMPONENT_MAP[normalizedPage.value] || ClientPageContent
)

const activeProps = computed(() => {
  const base = { slug: slug.value }
  if (activeComponent.value === ClientPageContent) {
    return { ...base, page: normalizedPage.value }
  }
  return base
})

// ── Utils ────────────────────────────────────────────────────────────────
function statusLabel(s: string) {
  const map: Record<string, string> = {
    lead: 'Инициация',
    concept: 'Концепция',
    working_project: 'Рабочий проект',
    procurement: 'Комплектация',
    construction: 'Строительство',
    commissioning: 'Сдача',
  }
  return map[s] || s
}

async function logout() {
  await $fetch('/api/auth/client-id-logout', { method: 'POST' }).catch(() => {})
  router.push('/client/login')
}

// ── Visit status ──────────────────────────────────────────────────
const changingVisitStatus = ref(false)

const VISIT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'запланирован',
  done:      'проведён',
  noshow:    'не явился',
  postponed: 'перенесён',
  cancelled: 'отменён',
}
function visitStatusLabel(status: string): string {
  return VISIT_STATUS_LABELS[status] || status
}

async function updateVisitStatus(status: string) {
  changingVisitStatus.value = true
  try {
    await $fetch(`/api/projects/${slug.value}/visit-status`, {
      method: 'PUT',
      body: { visit_status: status },
      headers: reqHeaders,
    })
    await refresh()
  } catch (e: any) {
    console.error('Не удалось обновить статус выезда', e)
  } finally {
    changingVisitStatus.value = false
  }
}

// ── Visit rating ─────────────────────────────────────────────────
const ratingValue   = ref(0)
const ratingHover   = ref(0)
const ratingComment = ref('')
const sendingRating = ref(false)
const ratingDone    = ref(false)

async function submitRating() {
  if (!ratingValue.value) return
  sendingRating.value = true
  try {
    await $fetch(`/api/projects/${slug.value}/visit-rating`, {
      method: 'PUT',
      body: { visit_rating: ratingValue.value, visit_comment: ratingComment.value },
      headers: reqHeaders,
    })
    ratingDone.value = true
    await refresh()
  } catch (e: any) { console.error(e) }
  finally { sendingRating.value = false }
}

// ── Contact request ───────────────────────────────────────────────
const showContactModal = ref(false)
const selectedSlot     = ref('')
const contactMessage   = ref('')
const sendingContact   = ref(false)
const contactError     = ref('')

// 3 days × 3 slots
const contactSlots = computed(() => {
  const slots: Array<{ value: string; label: string }> = []
  for (let d = 1; d <= 3; d++) {
    const date = new Date()
    date.setDate(date.getDate() + d)
    const label = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
    const iso   = date.toISOString().slice(0, 10)
    slots.push(
      { value: `${iso}T09:00`, label: `${label}, 9:00 – 11:00` },
      { value: `${iso}T13:00`, label: `${label}, 13:00 – 15:00` },
      { value: `${iso}T18:00`, label: `${label}, 18:00 – 20:00` },
    )
  }
  return slots
})

async function submitContactRequest() {
  if (!selectedSlot.value) return
  sendingContact.value = true; contactError.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/contact-request`, {
      method: 'PUT',
      body: { slot: selectedSlot.value, message: contactMessage.value },
      headers: reqHeaders,
    })
    await refresh()
    showContactModal.value = false
    selectedSlot.value = ''
    contactMessage.value = ''
  } catch (e: any) {
    contactError.value = e.data?.message || 'Ошибка отправки'
  } finally {
    sendingContact.value = false
  }
}
</script>

<style scoped>
/* ── Root layout ─────────────────────────────────────────────── */
.cc-root {
  min-height: 100vh;
}

.cc-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0.5;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
}

.cc-loading-dot {
  animation: cc-spin 2s linear infinite;
  display: inline-block;
}

@keyframes cc-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.cc-error {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 40px;
}

/* ── Body grid ───────────────────────────────────────────────── */
.cc-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
}

/* ── Mobile top bar ──────────────────────────────────────────── */
.cc-mobile-bar {
  grid-column: 1 / -1;
  display: none;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.2));
  position: sticky;
  top: 0;
  z-index: 10;
}

.cc-mobile-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 0 auto;
  max-width: 120px;
}

.cc-mobile-nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}
.cc-mobile-nav::-webkit-scrollbar { display: none; }

.cc-mobile-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.cc-mobile-btn:hover {
  background: rgba(255,255,255,0.25);
}
.cc-mobile-btn--active {
  background: rgba(255,255,255,0.35);
  border-color: var(--glass-border, rgba(180,180,220,0.3));
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.cc-sidebar {
  grid-column: 1;
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px 0;
  border-right: 1px solid var(--glass-border, rgba(180,180,220,0.15));
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.cc-sidebar-header {
  padding: 0 18px 16px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.12));
  margin-bottom: 12px;
}

.cc-project-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 4px;
  line-height: 1.3;
}

.cc-project-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  opacity: 0.45;
}

.cc-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.cc-status--lead         { color: #9e9e9e; }
.cc-status--concept      { color: #7c3aed; }
.cc-status--working_project { color: #2563eb; }
.cc-status--procurement  { color: #d97706; }
.cc-status--construction { color: #ea580c; }
.cc-status--commissioning { color: #16a34a; }

.cc-nav {
  flex: 1;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cc-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 0.82rem;
  text-align: left;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: background 0.15s, opacity 0.15s;
}
.cc-nav-item:hover { background: rgba(255,255,255,0.18); opacity: 0.9; }
.cc-nav-item.active { background: rgba(255,255,255,0.28); opacity: 1; font-weight: 600; }

.cc-nav-icon { font-size: 0.95rem; width: 18px; flex-shrink: 0; text-align: center; }
.cc-nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cc-sidebar-footer {
  padding: 12px 18px 0;
  border-top: 1px solid var(--glass-border, rgba(180,180,220,0.12));
  margin-top: auto;
}

/* ── Visit widget in sidebar ── */
.cc-visit-widget {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.12));
}
.cc-visit-heading {
  font-size: .6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .09em;
  opacity: .35;
  margin-bottom: 5px;
}
.cc-visit-who {
  font-size: .73rem;
  font-weight: 500;
  opacity: .75;
  margin-bottom: 2px;
}
.cc-visit-when {
  font-size: .72rem;
  opacity: .6;
  font-variant-numeric: tabular-nums;
  margin-bottom: 3px;
}
.cc-visit-services {
  font-size: .68rem;
  opacity: .45;
  margin-bottom: 5px;
  line-height: 1.3;
}
.cc-visit-badge {
  display: inline-block;
  font-size: .62rem;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 600;
  margin-bottom: 8px;
}
.cc-visit-badge--scheduled { background: #dbeafe; color: #1d4ed8; }
.cc-visit-badge--done      { background: #dcfce7; color: #15803d; }
.cc-visit-badge--noshow    { background: #fee2e2; color: #b91c1c; }
.cc-visit-badge--postponed { background: #fef9c3; color: #854d0e; }
.cc-visit-badge--cancelled { background: #f4f4f5; color: #71717a; }
.cc-visit-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cc-va-btn {
  padding: 5px 8px;
  font-size: .68rem;
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  transition: background .12s, opacity .12s;
}
.cc-va-btn:disabled { opacity: .35; cursor: default; }
.cc-va-btn--done      { background: #f0fdf4; color: #15803d; border-color: #86efac; }
.cc-va-btn--noshow    { background: #fef2f2; color: #b91c1c; border-color: #fca5a5; }
.cc-va-btn--postponed { background: #fefce8; color: #854d0e; border-color: #fde047; }
.cc-va-btn--cancel    { background: #f9fafb; color: #6b7280; border-color: #d1d5db; }

.cc-logout {
  font-size: 0.72rem;
  opacity: 0.3;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0;
  transition: opacity 0.15s;
}
.cc-logout:hover { opacity: 0.6; }

/* ── Rating widget ──────────────────────────────────────────── */
.cc-rating-widget {
  margin-bottom: 10px;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--glass-border, rgba(180,180,220,0.12));
}
.cc-rating-heading {
  font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .09em;
  opacity: .35; margin-bottom: 6px;
}
.cc-stars {
  display: flex; gap: 3px; margin-bottom: 7px;
}
.cc-star {
  font-size: 1.4rem; background: none; border: none; cursor: pointer;
  padding: 0; color: var(--glass-text); opacity: .2; transition: opacity .1s, color .1s;
  line-height: 1;
}
.cc-star--active { opacity: 1; color: #f59e0b; }
.cc-rating-textarea {
  width: 100%; box-sizing: border-box;
  font-size: .76rem; font-family: inherit;
  padding: 6px 8px; border-radius: 7px; resize: none;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  color: var(--glass-text); outline: none; margin-bottom: 7px;
}
.cc-rating-submit {
  width: 100%; padding: 7px; font-size: .74rem; font-family: inherit;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px; cursor: pointer; color: var(--glass-text);
  transition: background .15s;
}
.cc-rating-submit:hover:not(:disabled) { background: color-mix(in srgb, var(--glass-text) 18%, transparent); }
.cc-rating-submit:disabled { opacity: .35; cursor: default; }
.cc-rating-done {
  font-size: .72rem; opacity: .6; margin-bottom: 10px;
  display: flex; align-items: center; gap: 5px;
}
.cc-stars-given { color: #f59e0b; letter-spacing: 1px; }

/* ── Contact-me button ──────────────────────────────────────── */
.cc-contact-btn {
  width: 100%; padding: 8px 10px; margin-bottom: 10px;
  font-size: .76rem; font-family: inherit; text-align: left;
  background: color-mix(in srgb, #3b82f6 12%, transparent);
  border: 1px solid color-mix(in srgb, #3b82f6 25%, transparent);
  border-radius: 8px; cursor: pointer; color: var(--glass-text);
  transition: background .15s;
}
.cc-contact-btn:hover { background: color-mix(in srgb, #3b82f6 20%, transparent); }
.cc-contact-sent {
  font-size: .72rem; color: #16a34a; margin-bottom: 10px;
  padding: 6px 8px; border-radius: 7px;
  background: color-mix(in srgb, #16a34a 10%, transparent);
  border: 1px solid color-mix(in srgb, #16a34a 20%, transparent);
}

/* ── Contact modal ──────────────────────────────────────────── */
.cc-modal-bg {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.4); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.cc-modal {
  width: 100%; max-width: 420px; border-radius: 14px;
  padding: 0; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
.cc-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; font-size: .84rem; font-weight: 500;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.cc-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: .85rem; opacity: .5; color: var(--glass-text);
}
.cc-modal-body { padding: 16px 18px; }
.cc-slot-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 14px;
}
.cc-slot {
  padding: 9px 6px; font-size: .74rem; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 9px; cursor: pointer; text-align: center;
  background: color-mix(in srgb, var(--glass-bg) 40%, transparent);
  color: var(--glass-text); transition: background .12s, border-color .12s;
}
.cc-slot--active {
  background: color-mix(in srgb, #3b82f6 15%, transparent);
  border-color: #3b82f6; font-weight: 600;
}
/* "Как можно раньше" span full width */
.cc-slot-grid .cc-slot:first-child { grid-column: 1 / -1; }
.cc-modal-text {
  width: 100%; box-sizing: border-box; resize: none;
  padding: 8px 10px; font-size: .8rem; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px; background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  color: var(--glass-text); outline: none; margin-bottom: 12px;
}
.cc-modal-err { font-size: .76rem; color: #dc2626; margin-bottom: 8px; }
.cc-modal-foot { display: flex; gap: 8px; justify-content: flex-end; }
.cc-modal-cancel {
  padding: 8px 18px; font-size: .8rem; font-family: inherit;
  background: none; border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px; cursor: pointer; color: var(--glass-text); opacity: .6;
}
.cc-modal-cancel:hover { opacity: 1; }
.cc-modal-submit {
  padding: 8px 18px; font-size: .8rem; font-family: inherit;
  background: #3b82f6; border: none; border-radius: 8px;
  cursor: pointer; color: #fff; font-weight: 500;
  transition: opacity .15s;
}
.cc-modal-submit:hover:not(:disabled) { opacity: .88; }
.cc-modal-submit:disabled { opacity: .35; cursor: default; }

/* ── Main content ────────────────────────────────────────────── */
.cc-main {
  grid-column: 2;
  grid-row: 1 / -1;
  min-width: 0;
  overflow: hidden;
}

.cc-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 700px) {
  .cc-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }

  .cc-mobile-bar {
    display: flex;
  }

  .cc-sidebar {
    display: none;
  }

  .cc-main {
    grid-column: 1;
    grid-row: 2;
  }

  .cc-content {
    padding: 16px 14px;
  }
}
</style>
