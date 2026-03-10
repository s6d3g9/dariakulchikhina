<template>
  <div class="cab-embed" v-if="managerId">
    <div v-if="pending && !manager" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="manager" class="cab-body" :class="{ 'cab-body--content-only': !showSidebar }">
      <aside v-if="showSidebar" class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav"
            :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.count" class="u-counter">{{ item.count }}</span>
          </button>
        </nav>
      </aside>

      <main class="cab-main" :class="{ 'cab-main--content-only': !showSidebar }">
        <div class="cab-inner">

          <!-- ═══════════════ DASHBOARD ═══════════════ -->
          <template v-if="section === 'dashboard'">
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

            <div class="dash-quick-nav">
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
              <div class="u-section-title">Последние проекты</div>
              <div class="dash-recent-list">
                <div v-for="p in linkedProjects.slice(0, 5)" :key="p.projectId" class="dash-recent-item" @click="goToProject(p.projectSlug)">
                  <span class="dash-recent-name">{{ p.projectName }}</span>
                  <span class="dash-recent-role">{{ p.role }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-else-if="section === 'projects'">
            <div class="u-section-title">Проекты менеджера</div>
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
          </template>

          <!-- ═══════════════ FEED ═══════════════ -->
          <template v-else-if="section === 'feed'">
            <div class="u-section-title">Лента событий</div>
            <div class="cab-empty">
              <span class="ent-empty-icon">📋</span>
              <span>Лента событий будет доступна позже</span>
            </div>
          </template>

          <!-- ═══════════════ APPROVALS ═══════════════ -->
          <template v-else-if="section === 'approvals'">
            <div class="u-section-title">Согласования</div>
            <div class="cab-empty">
              <span class="ent-empty-icon">✅</span>
              <span>Нет активных согласований</span>
            </div>
          </template>

          <!-- ═══════════════ REPORTS ═══════════════ -->
          <template v-else-if="section === 'reports'">
            <div class="u-section-title">Отчёты</div>
            <div class="cab-empty">
              <span class="ent-empty-icon">📊</span>
              <span>Отчёты будут доступны позже</span>
            </div>
          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-else-if="section === 'profile'">
            <div class="u-section-title">Профиль менеджера</div>
            <form class="man-profile-form glass-surface" @submit.prevent="saveProfile">
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Имя *</label>
                  <input v-model="form.name" class="glass-input" required />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Роль</label>
                  <input v-model="form.role" class="glass-input" placeholder="менеджер, ассистент, ревьюер…" />
                </div>
              </div>
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Телефон</label>
                  <input v-model="form.phone" class="glass-input" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Email</label>
                  <input v-model="form.email" class="glass-input" />
                </div>
              </div>
              <div class="u-grid-2">
                <div class="u-field">
                  <label class="u-field__label">Telegram</label>
                  <input v-model="form.telegram" class="glass-input" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Город</label>
                  <input v-model="form.city" class="glass-input" />
                </div>
              </div>
              <div class="u-field">
                <label class="u-field__label">Заметки</label>
                <textarea v-model="form.notes" class="glass-input u-ta" rows="4" placeholder="заметки о менеджере"></textarea>
              </div>
              <div class="man-profile-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

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
const props = defineProps<{ managerId: number; showSidebar?: boolean }>()
const model = defineModel<string>()
const showSidebar = computed(() => props.showSidebar !== false)

const mid = computed(() => props.managerId)
const section = ref(model.value || 'dashboard')

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
    saveMsg.value = 'Сохранено!'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } finally { saving.value = false }
}

const router = useRouter()
function goToProject(slug: string) {
  if (slug) router.push(`/admin/projects/${slug}`)
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
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
