<template>
  <div>
    <div v-if="projectPending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else-if="!project" style="font-size:.88rem;color:#999">Проект не найден</div>
    <template v-else>
      <div style="font-size:.78rem;color:#aaa;margin-bottom:12px">
        <NuxtLink to="/admin" style="color:#888;text-decoration:none">проекты</NuxtLink>
        <span style="margin:0 6px">/</span>
        <span>{{ project.title }}</span>
      </div>

      <!-- Horizontal phase tracker -->
      <AdminProjectPhase
        :slug="route.params.slug as string"
        :status="projectStatus"
        @update:status="projectStatus = $event"
      />

      <!-- Two-column: left nav + right content -->
      <div class="proj-layout">

        <!-- Left sidebar: vertical nav -->
        <nav class="proj-sidenav">
          <template v-for="group in navGroups" :key="group.label">
            <div class="proj-sidenav-group" v-if="group.pages.length">
              <div class="proj-sidenav-group-label">{{ group.label }}</div>
              <button
                v-for="pg in group.pages"
                :key="pg.slug"
                class="proj-sidenav-item"
                :class="{ 'proj-sidenav-item--active': activePage === pg.slug }"
                @click="activePage = pg.slug"
              >{{ pg.title }}</button>
            </div>
          </template>
        </nav>

        <!-- Right content -->
        <div class="proj-main">
          <div class="proj-topbar">
            <a :href="`https://dariakulchikhina.com/api/auth/client-open?projectSlug=${encodeURIComponent(project.slug)}`" class="proj-ready-link">готовые страницы ↗</a>
            <button class="proj-settings-btn" @click="showEdit = true">⚙ проект</button>
          </div>

          <div v-if="activePage === 'project_roadmap'"><AdminRoadmap :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'work_status'"><AdminWorkStatus :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'profile_customer'"><AdminClientProfile :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'profile_contractors'"><AdminContractorsProfile :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'first_contact'"><AdminFirstContact :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'brief'"><AdminSmartBrief :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'site_survey'"><AdminSiteSurvey :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'tor_contract'"><AdminToRContract :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'space_planning'"><AdminSpacePlanning :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'moodboard'"><AdminMoodboard :slug="route.params.slug as string" /></div>
          <div v-else-if="activePage === 'concept_approval'"><AdminConceptApproval :slug="route.params.slug as string" /></div>
          <div v-else><AdminPageContent :slug="route.params.slug as string" :page="activePage" /></div>
        </div>
      </div>
    </template>

    <div v-if="showEdit" class="a-modal-backdrop" @click.self="showEdit = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">редактировать проект</h3>
        <form @submit.prevent="saveProject">
          <div class="a-field">
            <label>Название</label>
            <input v-model="editForm.title" class="a-input" required>
          </div>
          <div class="a-field">
            <label>PIN клиента</label>
            <input v-model="editForm.clientPin" class="a-input" placeholder="оставьте пустым для автогенерации">
          </div>
          <div class="a-field">
            <label style="margin-bottom:10px;display:block">Видимые страницы</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
              <label
                v-for="pg in allPageSlugs"
                :key="pg.slug"
                style="display:flex;align-items:center;gap:8px;font-size:.82rem;color:inherit;cursor:pointer"
              >
                <input
                  type="checkbox"
                  :checked="editForm.pages.includes(pg.slug)"
                  @change="togglePage(pg.slug)"
                  style="cursor:pointer"
                >
                {{ pg.title }}
              </label>
            </div>
          </div>
          <p v-if="editError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ editError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="showEdit = false">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: project, pending: projectPending, refresh } = await useFetch<any>(`/api/projects/${slug.value}`)
const activePage = ref('materials')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')

const editForm = reactive({
  title: project.value?.title || '',
  clientPin: project.value?.clientPin || '',
  pages: [...(project.value?.pages || [])],
})

function togglePage(pageSlug: string) {
  const idx = editForm.pages.indexOf(pageSlug)
  if (idx === -1) editForm.pages.push(pageSlug)
  else editForm.pages.splice(idx, 1)
}

watch(project, (p) => {
  if (p) {
    editForm.title = p.title
    editForm.clientPin = p.clientPin || ''
    editForm.pages = [...(p.pages || [])]
    projectStatus.value = p.status || 'lead'
  }
})

const allPageSlugs = [
  // ── Phase 0: Инициация ──────────────────────────────
  { slug: 'first_contact',     title: '0.1 первичный контакт' },
  { slug: 'brief',             title: '0.2 брифинг' },
  { slug: 'site_survey',       title: '0.3 обмеры / аудит' },
  { slug: 'tor_contract',      title: '0.4 ТЗ и договор' },
  // ── Phase 1: Эскиз ──────────────────────────────────
  { slug: 'space_planning',    title: 'планировки' },
  { slug: 'moodboard',         title: 'мудборд' },
  { slug: 'concept_approval',  title: 'согласование эскиза' },
  // ── Кабинет клиента ─────────────────────────────────
  { slug: 'phase_init',        title: 'инициация (трекер фазы 0)' },
  { slug: 'self_profile',      title: 'анкета клиента' },
  { slug: 'design_timeline',   title: 'ход проекта' },
  { slug: 'design_album',      title: 'альбом проекта' },
  { slug: 'contracts',         title: 'документы / договоры' },
  // ── Общие разделы ───────────────────────────────────
  { slug: 'profile_customer',  title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'подрядчики' },
  { slug: 'materials',         title: 'материалы' },
  { slug: 'tz',                title: 'тех. задание' },
  { slug: 'work_status',       title: 'статусы работ' },
  { slug: 'project_roadmap',   title: 'дорожная карта' },
]

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter(p => pages.includes(p.slug))
})

async function saveProject() {
  saving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}`, {
      method: 'PUT',
      body: {
        title: editForm.title,
        clientPin: editForm.clientPin || undefined,
        pages: editForm.pages,
      }
    })
    showEdit.value = false
    refresh()
  } catch (e: any) {
    editError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Layout ── */
.proj-layout { display: flex; align-items: flex-start; gap: 0; }

/* ── Left sidebar nav ── */
.proj-sidenav {
  width: 160px; flex-shrink: 0;
  position: sticky; top: 80px;
  padding-right: 12px;
  border-right: 1px solid #e5e7eb;
  margin-right: 20px;
}
.dark .proj-sidenav { border-color: #2a2a2e; }

.proj-sidenav-group { margin-bottom: 18px; }
.proj-sidenav-group-label {
  font-size: .62rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em;
  color: #bbb; margin-bottom: 6px; padding-left: 8px;
}
.dark .proj-sidenav-group-label { color: #555; }

.proj-sidenav-item {
  display: block; width: 100%; text-align: left;
  padding: 6px 8px; border: none; background: transparent;
  font-size: .8rem; color: #666; cursor: pointer;
  border-radius: 5px; font-family: inherit; line-height: 1.3;
  transition: background .12s, color .12s;
}
.proj-sidenav-item:hover { background: #f3f4f6; color: #1a1a1a; }
.dark .proj-sidenav-item:hover { background: #1e1e20; color: #e5e7eb; }
.proj-sidenav-item--active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.dark .proj-sidenav-item--active { background: #1e1b4b; color: #a5b4fc; }

/* ── Right content ── */
.proj-main { flex: 1; min-width: 0; }

.proj-topbar {
  display: flex; justify-content: flex-end;
  gap: 8px; margin-bottom: 16px; align-items: center;
}
.proj-ready-link {
  font-size: .78rem; color: #666; text-decoration: none;
  border: 1px solid #ddd; padding: 5px 10px; border-radius: 2px;
}
.proj-ready-link:hover { border-color: #1a1a1a; color: #1a1a1a; }
.proj-settings-btn {
  border: 1px dashed #ddd; background: transparent; padding: 5px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px; color: #666;
}
.proj-settings-btn:hover { border-color: #1a1a1a; color: #1a1a1a; }

/* ── Modal ── */
.a-btn-sm {
  border: 1px solid #ddd; background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px; color: #666;
}
.a-btn-sm:hover { border-color: #1a1a1a; color: #1a1a1a; }
.a-btn-save {
  border: 1px solid #1a1a1a; background: #1a1a1a; color: #fff;
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: #333; }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: #888; margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid #ddd;
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
  color: inherit; background: transparent;
}
.a-input:focus { border-bottom-color: #1a1a1a; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: #fff; border: 1px solid #e0e0e0;
  padding: 32px; width: 480px; max-width: 90vw; max-height: 90vh; overflow-y: auto;
}
.dark .a-modal { background: #1a1a1c; border-color: #2a2a2e; }
</style>
