<template>
  <div class="cab-embed" v-if="managerId">
    <div v-if="pending && !manager" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="manager" class="cab-body" :class="{ 'cab-body--content-only': !showSidebar }">
      <aside v-if="showSidebar" v-show="!isWipe2Mode" class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav"
            :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="onNavClick(item.key)"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.count" class="u-counter">{{ item.count }}</span>
          </button>
        </nav>
      </aside>

      <main
        ref="viewportRef"
        class="cab-main"
        :class="{ 'cab-main--content-only': !showSidebar, 'cv-viewport--paged': isPaged }"
        :tabindex="isPaged ? 0 : undefined"
        @wheel="handleWheel"
        @keydown="handleKeydown"
        @scroll="syncPager"
      >
        <div v-show="!isWipe2Mode" class="cab-inner cv-wipe-inner" :class="{ 'cab-inner--ribbon': showAll }">

          <!-- ═══════════════ DASHBOARD ═══════════════ -->
          <template v-if="(section === 'dashboard') || showAll">
            <div class="cab-section" data-section="dashboard">
            <div class="dash-welcome glass-surface">
              <div class="dash-welcome-left">
                <div class="dash-avatar">{{ manager?.name?.charAt(0)?.toUpperCase() || '◎' }}</div>
                <div>
                  <div class="dash-welcome-name">{{ manager?.name }}</div>
                  <div class="dash-welcome-role">
                    {{ manager?.role || 'Менеджер' }}
                    <span v-if="manager?.city"> · {{ manager.city }}</span>
                  </div>
                </div>
              </div>
              <div class="dash-profile-progress">
                <div class="dash-profile-pct-ring" :style="{ '--pct': profilePct }">
                  <span class="dash-profile-pct-val">{{ profilePct }}%</span>
                </div>
                <div class="dash-profile-progress-info">
                  <span class="dash-profile-progress-label">Профиль заполнен</span>
                  <button v-if="profilePct < 100" class="dash-profile-fill-btn" @click="section = 'profile'">Заполнить →</button>
                </div>
              </div>
            </div>

            <div class="dash-quick-nav" v-show="!showAll">
              <button class="dash-quick-btn glass-surface" @click="section = 'projects'">
                <span class="dash-quick-icon">◒</span>
                <span class="dash-quick-label">Проекты</span>
                <span v-if="linkedProjects.length" class="dash-quick-badge">{{ linkedProjects.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'feed'">
                <span class="dash-quick-icon">◈</span>
                <span class="dash-quick-label">Лента</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'approvals'">
                <span class="dash-quick-icon">◎</span>
                <span class="dash-quick-label">Согласования</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'profile'">
                <span class="dash-quick-icon">◓</span>
                <span class="dash-quick-label">Профиль</span>
              </button>
            </div>

            <div class="dash-stats">
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ linkedProjects.length }}</div>
                <div class="dash-stat-label">Проектов</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--blue">
                <div class="dash-stat-val">{{ activeProjectsCount }}</div>
                <div class="dash-stat-label">Активных</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--green">
                <div class="dash-stat-val">{{ manager?.role || '—' }}</div>
                <div class="dash-stat-label">Роль</div>
              </div>
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ manager?.city || '—' }}</div>
                <div class="dash-stat-label">Город</div>
              </div>
            </div>

            <div v-if="linkedProjects.length" class="dash-recent glass-surface">
              <CabSectionHeader title="Последние проекты" eyebrow="manager" />
              <div class="dash-recent-list">
                <div v-for="p in linkedProjects.slice(0, 5)" :key="p.projectId" class="dash-recent-item" @click="goToProject(p.projectSlug)">
                  <span class="dash-recent-name">{{ p.projectName }}</span>
                  <span class="dash-recent-role">{{ p.role }}</span>
                </div>
              </div>
            </div>
            </div>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-if="(section === 'projects') || showAll">
            <div class="cab-section" data-section="projects">
            <CabSectionHeader
              title="Проекты менеджера"
              eyebrow="manager"
              note="Лента проектов и статус назначения собраны в том же shell, что и остальные кабинеты."
            />
            <div v-if="!linkedProjects.length" class="cab-empty">
              <span class="ent-empty-icon">📂</span>
              <span>Нет привязанных проектов</span>
            </div>
            <div v-else class="man-project-list">
              <div
                v-for="p in linkedProjects"
                :key="p.id"
                class="man-project-card glass-surface"
              >
                <div class="man-project-card__head">
                  <span class="man-project-card__name" @click="goToProject(p.projectSlug)">{{ p.projectName }}</span>
                  <span class="man-project-card__role ws-status--active">{{ p.role }}</span>
                </div>
                <div class="man-project-card__meta">
                  Назначен: {{ fmtDate(p.assignedAt) }}
                </div>
              </div>
            </div>
            </div>
          </template>

          <!-- ═══════════════ FEED ═══════════════ -->
          <template v-if="(section === 'feed') || showAll">
            <div class="cab-section" data-section="feed">
            <CabSectionHeader title="Лента событий" eyebrow="manager" note="Операционная лента будет добавлена в этот же стандартный shell." />
            <div class="cab-empty">
              <span class="ent-empty-icon">📋</span>
              <span>Лента событий будет доступна позже</span>
            </div>
            </div>
          </template>

          <!-- ═══════════════ APPROVALS ═══════════════ -->
          <template v-if="(section === 'approvals') || showAll">
            <div class="cab-section" data-section="approvals">
            <CabSectionHeader title="Согласования" eyebrow="manager" note="Блок оставлен в общей архитектуре правой зоны без отдельного layout-ответвления." />
            <div class="cab-empty">
              <span class="ent-empty-icon">✅</span>
              <span>Нет активных согласований</span>
            </div>
            </div>
          </template>

          <!-- ═══════════════ REPORTS ═══════════════ -->
          <template v-if="(section === 'reports') || showAll">
            <div class="cab-section" data-section="reports">
            <CabSectionHeader title="Отчёты" eyebrow="manager" note="Раздел уже оформлен тем же section-shell и готов к дальнейшему наполнению." />
            <div class="cab-empty">
              <span class="ent-empty-icon">📊</span>
              <span>Отчёты будут доступны позже</span>
            </div>
            </div>
          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-if="(section === 'profile') || showAll">
            <div class="cab-section" data-section="profile">
            <CabSectionHeader
              title="Профиль менеджера"
              eyebrow="manager"
              note="Контакты и заметки сохраняются автоматически, без отдельного подтверждения."
            />
            <form class="man-profile-form glass-surface" @submit.prevent="saveProfile" @focusout="queueProfileAutosave" @change="queueProfileAutosave">
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Имя *</label>
                  <GlassInput v-model="form.name"  required />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Роль</label>
                  <GlassInput v-model="form.role"  placeholder="менеджер, ассистент, ревьюер…" />
                </div>
              </div>
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Телефон</label>
                  <GlassInput v-model="form.phone"  />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Email</label>
                  <GlassInput v-model="form.email"  />
                </div>
              </div>
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Telegram</label>
                  <GlassInput v-model="form.telegram"  />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Город</label>
                  <GlassInput v-model="form.city"  />
                </div>
              </div>
              <div class="u-field">
                <label class="u-field__label">Заметки</label>
                <textarea v-model="form.notes" class="glass-input u-ta" rows="4" placeholder="заметки о менеджере"></textarea>
              </div>
              <div class="man-profile-foot">
                <CabAutosaveStatus :state="profileSaveState" />
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
            </div>
          </template>

        </div>
        <div v-if="isPaged" class="cv-pager-rail">
          <div class="cv-pager-rail__meta">
            <span class="cv-pager-rail__mode">{{ pagerModeLabel }}</span>
            <span>экран {{ pageIndex }} / {{ pageCount }}</span>
          </div>
          <div class="cv-pager-rail__actions">
            <GlassButton variant="secondary" density="compact" type="button"  @click="move('prev')">← экран</GlassButton>
            <GlassButton variant="secondary" density="compact" type="button"  @click="move('next')">{{ pagerNextLabel }}</GlassButton>
          </div>
        </div>
      </main>
    </div>

    <div v-else class="cab-empty">
      <span class="ent-empty-icon">⚠️</span>
      <span>Менеджер не найден</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import { registerWipe2Data } from '~/composables/useWipe2'

const props = defineProps<{ managerId: number; showSidebar?: boolean }>()
const model = defineModel<string>()
const showSidebar = computed(() => props.showSidebar !== false)
const designSystem = useDesignSystem()

const mid = computed(() => props.managerId)
const section = ref(model.value || 'dashboard')
const sectionOrder = computed(() => nav.value.map((item) => item.key))
const {
  viewportRef,
  contentViewMode,
  isPaged,
  pagerModeLabel,
  pagerNextLabel,
  pageIndex,
  pageCount,
  syncPager,
  move,
  handleWheel,
  handleKeydown,
} = useContentViewport({
  mode: computed(() => designSystem.tokens.value.contentViewMode),
  currentSection: section,
  sectionOrder,
  onNavigate: async (nextSection) => {
    section.value = nextSection
  },
  transitionMs: computed(() => designSystem.tokens.value.pageTransitDuration ?? 280),
})

watch(model, (v) => { if (v) section.value = v })
watch(section, (v) => { model.value = v })

const { data: manager, pending, refresh } = useFetch<any>(
  () => `/api/managers/${mid.value}`,
  { watch: [mid] },
)

const { data: linkedProjects, refresh: refreshProjects } = useFetch<any[]>(
  () => `/api/managers/${mid.value}/projects`,
  { watch: [mid], default: () => [] },
)

const nav = computed(() => [
  { key: 'dashboard',  icon: '◈', label: 'Обзор' },
  { key: 'projects',   icon: '◒', label: 'Проекты', count: linkedProjects.value?.length || 0 },
  { key: 'feed',       icon: '◎', label: 'Лента событий' },
  { key: 'approvals',  icon: '✓', label: 'Согласования' },
  { key: 'reports',    icon: '◑', label: 'Отчёты' },
  { key: 'profile',    icon: '◓', label: 'Профиль' },
])

const activeProjectsCount = computed(() =>
  linkedProjects.value?.filter((p: any) => p.role === 'lead').length ?? 0
)

const profilePct = computed(() => {
  if (!manager.value) return 0
  const m = manager.value
  const fields = [m.name, m.role, m.phone, m.email, m.telegram, m.city]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
})

// Profile form
const form = reactive({ name: '', role: '', phone: '', email: '', telegram: '', city: '', notes: '' })
const saving = ref(false)
const saveMsg = ref('')
type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'
const profileSaveState = ref<InlineAutosaveState>('')
let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

watch(manager, (m) => {
  if (!m) return
  form.name = m.name || ''
  form.role = m.role || ''
  form.phone = m.phone || ''
  form.email = m.email || ''
  form.telegram = m.telegram || ''
  form.city = m.city || ''
  form.notes = m.notes || ''
}, { immediate: true })

async function saveProfile() {
  if (!mid.value) return
  saving.value = true; saveMsg.value = ''
  try {
    await $fetch(`/api/managers/${mid.value}`, { method: 'PUT', body: { ...form } })
    await refresh()
  } catch (error: any) {
    saveMsg.value = 'Ошибка: ' + (error?.data?.message || error.message || 'неизвестная')
    throw error
  } finally { saving.value = false }
}

function clearProfileSaveTimer() {
  if (!profileSaveTimer) return
  clearTimeout(profileSaveTimer)
  profileSaveTimer = null
}

function setAutosaveSettled(expected: InlineAutosaveState) {
  setTimeout(() => {
    if (profileSaveState.value === expected) profileSaveState.value = ''
  }, 1400)
}

async function autoSaveProfile() {
  clearProfileSaveTimer()
  profileSaveState.value = 'saving'
  try {
    await saveProfile()
    profileSaveState.value = 'saved'
    setAutosaveSettled('saved')
  } catch {
    profileSaveState.value = 'error'
  }
}

function queueProfileAutosave() {
  clearProfileSaveTimer()
  saveMsg.value = ''
  profileSaveTimer = setTimeout(() => {
    autoSaveProfile()
  }, 420)
}

onBeforeUnmount(() => {
  clearProfileSaveTimer()
})

const router = useRouter()
function goToProject(slug: string) {
  if (slug) router.push(`/admin/projects/${slug}`)
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Wipe2 card view ──
const isWipe2Mode = computed(() => designSystem.tokens.value.contentViewMode === 'wipe2')
const showAll = computed(() => !isWipe2Mode.value)

// ── Ribbon nav: scroll to section on click ──
function scrollToSection(key: string) {
  const vp = viewportRef.value
  const root = vp ?? document.body
  const el = root.querySelector<HTMLElement>(`.cab-section[data-section="${key}"]`)
  if (!el) return
  // scroll-margin-top handles sticky header offset (set in CSS)
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onNavClick(key: string) {
  section.value = key
  if (showAll.value) requestAnimationFrame(() => scrollToSection(key))
}
watch(section, (key) => {
  if (!showAll.value) return
  requestAnimationFrame(() => scrollToSection(key))
}, { flush: 'post' })

const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
  const m = manager.value
  if (!m) return null
  const projs = linkedProjects.value || []
  const pending = projs.filter((p: any) => p.status === 'pending' || p.status === 'revision')
  const done = projs.filter((p: any) => p.status === 'done' || p.status === 'completed').length
    const allSections = [
      { title: 'Обзор', fields: [
        { label: 'Всего проектов', value: String(projs.length) },
        { label: 'Как лид', value: String(activeProjectsCount.value) },
        { label: 'Профиль заполнен', value: `${profilePct.value}%` },
        { label: 'Заметки', value: form.notes ? 'есть' : '—' },
      ]},
      { title: 'Проекты', fields: projs.length
        ? projs.slice(0, 6).map((p: any) => ({
            label: p.projectName ?? p.title ?? 'Проект',
            value: p.status ?? '',
            type: 'status' as const,
            span: 2 as const,
            description: p.address ?? '',
            badge: p.role || 'manager',
            caption: p.projectSlug || 'без slug',
            eyebrow: 'проект',
            tone: p.role === 'lead' ? 'accent' as const : 'default' as const,
          }))
        : [{ label: '', value: 'нет проектов', span: 2 as const }],
      },
      { title: 'Лента событий', fields: projs.slice(0, 5).length
        ? projs.slice(0, 5).map((p: any) => ({
            label: p.projectName ?? p.title ?? 'Событие',
            value: p.status ?? '',
            type: 'status' as const,
            span: 2 as const,
            description: p.address ?? 'операционный апдейт проекта',
            badge: p.role || 'update',
            caption: p.projectSlug || 'карточка проекта',
            eyebrow: 'лента',
            tone: 'default' as const,
          }))
        : [{ label: '', value: 'нет событий', span: 2 as const }],
      },
      { title: 'Согласования', fields: pending.length
        ? pending.slice(0, 6).map((p: any) => ({
            label: p.projectName ?? p.title ?? 'Согласование',
            value: p.status ?? '',
            type: 'status' as const,
            span: 2 as const,
            description: p.address ?? 'требует решения менеджера',
            badge: 'pending',
            caption: p.role || 'координация',
            eyebrow: 'approval',
            tone: 'accent' as const,
          }))
        : [{ label: '', value: 'нет ожидающих согласований', span: 2 as const }],
      },
      { title: 'Отчёты', fields: [
        { label: 'Всего проектов', value: String(projs.length) },
        { label: 'Завершено', value: String(done) },
        { label: 'В работе', value: String(projs.length - done) },
      ]},
      { title: 'Профиль', fields: [
        { label: 'Роль', value: form.role },
        { label: 'Телефон', value: form.phone },
        { label: 'Email', value: form.email },
        { label: 'Telegram', value: form.telegram },
        { label: 'Город', value: form.city },
        { label: 'Проектов', value: String(projs.length) },
        { label: 'Заметки', value: form.notes, type: 'multiline' as const, span: 2 as const },
      ]},
    ]
    const W2_SECTION: Record<string, string> = {
      projects: 'Проекты', feed: 'Лента событий', approvals: 'Согласования',
      reports: 'Отчёты', profile: 'Профиль',
    }
    const sectionTitle = W2_SECTION[section.value]
    return {
      entityTitle: m.name,
      entitySubtitle: form.role || undefined,
      entityStatus: form.role ?? 'менеджер',
      entityStatusColor: 'blue' as const,
      sections: sectionTitle ? allSections.filter(s => s.title === sectionTitle) : allSections,
    }
})
registerWipe2Data(wipe2CabinetData)
</script>

<style scoped>
.cab-body--content-only { display: block; }
.cab-main--content-only { padding-left: 0; }
.man-project-list {
  display: flex; flex-direction: column; gap: 10px;
}
.man-project-card {
  padding: 14px 18px; border-radius: 10px;
}
.man-project-card__head {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
}
.man-project-card__name {
  font-weight: 600; cursor: pointer;
}
.man-project-card__name:hover { text-decoration: underline; }
.man-project-card__role {
  font-size: .82rem; padding: 2px 10px; border-radius: 8px;
}
.man-project-card__meta {
  font-size: .82rem; opacity: .65; margin-top: 4px;
}
.man-profile-form {
  padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 14px;
}
.man-profile-foot {
  display: flex; align-items: center; gap: 12px; margin-top: 6px;
}
.dash-recent { padding: 16px 18px; border-radius: 12px; }
.dash-recent-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.dash-recent-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  background: var(--glass-bg, rgba(255,255,255,.04));
}
.dash-recent-item:hover { background: var(--glass-bg-hover, rgba(255,255,255,.08)); }
.dash-recent-name { font-weight: 500; }
.dash-recent-role { font-size: .8rem; opacity: .6; }
</style>