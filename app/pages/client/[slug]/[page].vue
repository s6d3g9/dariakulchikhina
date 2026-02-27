<template>
  <div class="client-page">
    <div class="menu-ribbon" v-if="availablePages.length">
      <NuxtLink
        v-for="item in availablePages"
        :key="item.slug"
        :to="`/client/${route.params.slug}/${item.slug}`"
        class="menu-item glass-chip"
        :class="{ 'menu-item--active': item.slug === page }"
      >
        {{ item.title }}
      </NuxtLink>
    </div>

    <div class="client-page-body">
      <!-- Фаза 0: Инициация -->
      <ClientInitiation v-if="page === 'phase_init'" :slug="route.params.slug as string" />
      <!-- Анкета клиента -->
      <ClientSelfProfile v-else-if="page === 'self_profile'" :slug="route.params.slug as string" />
      <!-- Ход проекта (таймлайн + команда) -->
      <ClientTimeline v-else-if="page === 'design_timeline'" :slug="route.params.slug as string" />
      <!-- Альбом проекта -->
      <ClientDesignAlbum v-else-if="page === 'design_album'" :slug="route.params.slug as string" />
      <!-- Документы / договоры -->
      <ClientContracts v-else-if="page === 'contracts'" :slug="route.params.slug as string" />
      <!-- Роадмап (legacy) -->
      <ClientRoadmap v-else-if="page === 'project_roadmap'" :slug="route.params.slug as string" />
      <!-- Статусы работ -->
      <ClientWorkStatus v-else-if="page === 'work_status'" :slug="route.params.slug as string" />
      <!-- Подрядчики проекта -->
      <ClientContractorsProfile v-else-if="page === 'profile_contractors'" :slug="route.params.slug as string" />
      <!-- Обычный JSON-контент -->
      <ClientPageContent v-else :slug="route.params.slug as string" :page="page" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const page = computed(() => route.params.page as string)
const { data: project } = await useFetch<any>(`/api/projects/${route.params.slug}`)

const allPages = [
  { slug: 'phase_init',          title: 'инициация' },
  { slug: 'self_profile',        title: 'мои данные' },
  { slug: 'design_timeline',     title: 'ход проекта' },
  { slug: 'design_album',        title: 'альбом проекта' },
  { slug: 'contracts',           title: 'документы' },
  { slug: 'materials',           title: 'материалы' },
  { slug: 'tz',                  title: 'техническое задание' },
  { slug: 'profile_customer',    title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'профиль подрядчиков' },
  { slug: 'work_status',         title: 'статусы работ' },
  { slug: 'project_roadmap',     title: 'дорожная карта' },
]
const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPages.filter(p => pages.includes(p.slug))
})
</script>

<style scoped>
.menu-ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 16px 0 14px;
  margin-bottom: 8px;
}

.menu-item {
  text-decoration: none;
  font-size: .75rem;
  letter-spacing: .6px;
  text-transform: lowercase;
  padding: 5px 14px;
  border-radius: 999px;
  white-space: nowrap;
  flex: 0 0 auto;
  color: var(--glass-text);
  opacity: .55;
  border: 1px solid transparent;
  transition: opacity .15s, border-color .15s, background .15s;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.menu-item:hover {
  opacity: .85;
  background: var(--glass-bg);
  border-color: var(--glass-border);
}
.menu-item--active {
  opacity: 1;
  background: var(--glass-bg);
  border-color: var(--glass-border);
  box-shadow: var(--glass-shadow);
  font-weight: 500;
}

.client-page-body {
  padding: 18px 0 24px;
}

@media (max-width: 768px) {
  .menu-ribbon {
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 12px 0 10px;
  }
  .menu-ribbon::-webkit-scrollbar { display: none; }
  .client-page-body { padding: 14px 0 20px; }
}
</style>
