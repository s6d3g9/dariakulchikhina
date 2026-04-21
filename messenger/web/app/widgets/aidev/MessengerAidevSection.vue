<script setup lang="ts">
// AIDev — project-centric dev flow, styled identically to the other
// messenger sections (Чаты / Контакты / Агенты): section-block root,
// scrollable VList of items with chat-row rows, bottom search-dock with
// suggestions popping UP above the field. See docs/architecture-v5/24-aidev-module.md.

const projects = useMessengerProjects()
const createDialog = useProjectCreate()
const activeProject = useState<string | null>('aidev-active-project', () => null)

const searchDraft = ref('')
const searchOpen = ref(false)
const loadError = ref('')

onMounted(async () => {
  await useMessengerAuth().hydrate()
  try { await projects.refresh() }
  catch (e) { loadError.value = (e as Error).message || 'Не удалось загрузить проекты' }
})

const normalizedQuery = computed(() => searchDraft.value.trim().toLowerCase())
const filteredProjects = computed(() => {
  const q = normalizedQuery.value
  const list = projects.projects.value
  if (!q) return list
  return list.filter((p) => {
    return p.name.toLowerCase().includes(q)
      || p.slug.toLowerCase().includes(q)
      || (p.description || '').toLowerCase().includes(q)
  })
})

const searchSuggestions = computed(() => {
  if (!searchOpen.value || !normalizedQuery.value) return []
  return filteredProjects.value.slice(0, 6)
})

function openSearch() { searchOpen.value = true }
function closeSearch() { setTimeout(() => { searchOpen.value = false }, 150) }

function openProject(slug: string) {
  activeProject.value = slug
  searchDraft.value = ''
  searchOpen.value = false
}
function backToList() { activeProject.value = null }

function startCreate() { createDialog.show() }
function onProjectCreated(slug: string) { activeProject.value = slug }

function projectInitials(name: string) {
  const norm = (name || '').trim()
  if (!norm) return '??'
  const parts = norm.split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}
</script>

<template>
  <section class="section-block section-block--aidev" aria-label="AIDev section">
    <!-- PROJECT MODE: full-height workspace with its own header (back + tabs) -->
    <div v-if="activeProject" class="aidev-section__workspace">
      <MessengerProjectWorkspace
        :project-slug="activeProject"
        @back="backToList"
      />
    </div>

    <!-- LIST MODE: list of projects + bottom search dock (same shape as Agents/Contacts) -->
    <template v-else>
      <VAlert v-if="loadError" type="error" density="compact" class="ma-2">{{ loadError }}</VAlert>
      <div v-if="projects.pending.value" class="section-progress section-progress--floating">
        <MessengerProgressLinear aria-label="Загрузка проектов" indeterminate four-color />
      </div>

      <VList class="section-list" bg-color="transparent" lines="three">
        <VListItem
          v-for="project in filteredProjects"
          :key="project.id"
          class="chat-row"
          lines="three"
          @click="openProject(project.slug)"
        >
          <template #prepend>
            <VAvatar
              :color="project.color || 'primary'"
              variant="tonal"
              size="48"
            >
              {{ projectInitials(project.name) }}
            </VAvatar>
          </template>
          <template #title>
            <div class="chat-row__titlebar">
              <div class="chat-row__titlemain">
                <span class="title-small">{{ project.name }}</span>
              </div>
              <span class="chat-row__time">{{ new Date(project.updatedAt).toLocaleDateString('ru-RU') }}</span>
            </div>
          </template>
          <template #subtitle>
            <span class="on-surface-variant">
              @{{ project.slug }}
              <template v-if="project.description"> · {{ project.description }}</template>
            </span>
          </template>
          <template #append>
            <VBtn
              size="small"
              color="primary"
              variant="tonal"
              @click.stop="openProject(project.slug)"
            >
              Открыть
            </VBtn>
          </template>
        </VListItem>

        <div
          v-if="!filteredProjects.length && !projects.pending.value"
          class="empty-state"
        >
          <VIcon size="48" color="on-surface-variant">mdi-rocket-launch-outline</VIcon>
          <p class="empty-state__title">
            {{ normalizedQuery ? 'Ничего не найдено' : 'Проектов пока нет' }}
          </p>
          <p class="empty-state__text">
            {{ normalizedQuery
              ? 'Сбросьте поиск или измените запрос.'
              : 'Создайте первый проект — composer, агенты и ресурсы подтянутся.' }}
          </p>
          <VBtn
            v-if="!normalizedQuery"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            class="mt-3"
            @click="startCreate"
          >
            Новый проект
          </VBtn>
        </div>
      </VList>

      <!-- Action row (icon-only, right-aligned) — above the search dock,
           same slot as section-tabs-row in other sections -->
      <div class="section-tabs-row aidev-section__actions">
        <span class="aidev-section__actions-spacer" />
        <VBtn
          v-if="projects.hasMore.value"
          icon
          variant="text"
          size="small"
          :loading="projects.pending.value"
          aria-label="Загрузить ещё проекты"
          title="Загрузить ещё проекты"
          @click="projects.loadMore()"
        >
          <VIcon>mdi-chevron-down</VIcon>
        </VBtn>
        <VBtn
          icon
          variant="text"
          size="small"
          aria-label="Новый проект"
          title="Новый проект"
          @click="startCreate"
        >
          <VIcon>mdi-plus</VIcon>
        </VBtn>
      </div>

      <!-- Bottom search dock with suggestions opening UPWARD (same as Agents/Contacts) -->
      <div class="search-dock search-dock--bottom-dock aidev-section__search-dock">
        <div class="search-dock__field">
          <MessengerDockField>
            <input
              v-model="searchDraft"
              type="text"
              class="composer-input composer-input--dock"
              placeholder="Найти проект"
              autocomplete="off"
              @focus="openSearch"
              @blur="closeSearch"
            />
          </MessengerDockField>
          <Transition name="chrome-reveal">
            <div
              v-if="searchOpen && searchSuggestions.length"
              class="search-dropdown"
              @mousedown.prevent
            >
              <VList bg-color="transparent" density="comfortable">
                <VListItem
                  v-for="project in searchSuggestions"
                  :key="project.id"
                  @click="openProject(project.slug)"
                >
                  <template #title>{{ project.name }}</template>
                  <template #subtitle>
                    @{{ project.slug }}
                    <template v-if="project.description"> · {{ project.description }}</template>
                  </template>
                </VListItem>
              </VList>
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <!-- Shared create dialog (opens over everything, reads shared useProjectCreate state) -->
    <ProjectCreateDialog @created="onProjectCreated" />
  </section>
</template>

<style scoped>
.section-block--aidev {
  position: relative;
}

.aidev-section__workspace {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.aidev-section__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 0;
}

.aidev-section__actions-spacer {
  flex: 1;
}

.aidev-section__search-dock {
  /* Match agents section: above the bottom-nav, below the action row. */
  order: 2;
}
</style>
