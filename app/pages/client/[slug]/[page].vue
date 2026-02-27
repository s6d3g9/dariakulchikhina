<template>
  <div class="client-page">
    <div class="menu-ribbon" v-if="availablePages.length">
      <NuxtLink
        v-for="item in availablePages"
        :key="item.slug"
        :to="`/client/${route.params.slug}/${item.slug}`"
        class="menu-item"
        :class="{ 'menu-item--active': item.slug === page }"
      >
        {{ item.title }}
      </NuxtLink>
    </div>

    <div class="client-page-body">
      <!-- Роадмап -->
      <ClientRoadmap v-if="page === 'project_roadmap'" :slug="route.params.slug as string" />
      <!-- Статусы работ -->
      <ClientWorkStatus v-else-if="page === 'work_status'" :slug="route.params.slug as string" />
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
  { slug: 'materials', title: 'материалы' },
  { slug: 'tz', title: 'техническое задание' },
  { slug: 'profile_customer', title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'профиль подрядчиков' },
  { slug: 'work_status', title: 'статусы работ' },
  { slug: 'project_roadmap', title: 'дорожная карта' },
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
  gap: 10px 18px;
  padding: 14px 0 10px;
  border-bottom: 1px solid var(--border, #ececec);
}

.menu-item {
  text-decoration: none;
  color: var(--secondary, #8f8f8f);
  font-size: .8rem;
  letter-spacing: .7px;
  text-transform: uppercase;
  padding: 4px 0;
  cursor: pointer;
  user-select: none;
  flex: 0 0 auto;
  white-space: nowrap;
}

.menu-item:hover {
  color: var(--text, #1a1a1a);
  padding-left: 5px;
}

.menu-item--active {
  color: var(--text, #1a1a1a);
  padding-left: 5px;
}

.client-page-body {
  padding: 18px 0 24px;
}

@media (max-width: 768px) {
  .menu-ribbon {
    flex-wrap: nowrap;
    gap: 22px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 10px 0 8px;
  }

  .menu-ribbon::-webkit-scrollbar {
    display: none;
  }

  .menu-item {
    font-size: .78rem;
    padding: 2px 0;
  }

  .menu-item:hover,
  .menu-item--active {
    padding-left: 0;
    color: var(--text, #1a1a1a);
  }

  .client-page-body {
    padding: 14px 0 20px;
  }
}
</style>
