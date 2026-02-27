<template>
  <div class="client-home">
    <div v-if="pending" class="client-empty">Загрузка...</div>

    <template v-else-if="project">
      <div class="client-home-head">
        <h1 class="client-home-title">{{ project.title }}</h1>
      </div>

      <div class="menu-ribbon">
        <NuxtLink
          v-for="pg in availablePages"
          :key="pg.slug"
          :to="`/client/${project.slug}/${pg.slug}`"
          class="menu-item"
        >
          {{ pg.title }}
        </NuxtLink>
      </div>
    </template>

    <div v-else class="client-empty">Проект не найден</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const { data: project, pending } = await useFetch<any>(`/api/projects/${route.params.slug}`)

const allPageSlugs = [
  { slug: 'materials', title: 'материалы' },
  { slug: 'tz', title: 'техническое задание' },
  { slug: 'profile_customer', title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'профиль подрядчиков' },
  { slug: 'work_status', title: 'статусы работ' },
  { slug: 'project_roadmap', title: 'дорожная карта' },
]

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter(p => pages.includes(p.slug))
})
</script>

<style scoped>
.client-home-head {
  border-bottom: 1px solid var(--border, #ececec);
  padding: 28px 0 22px;
}

.client-home-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 400;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--text, #1f1f1f);
}

.menu-ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding-top: 18px;
}

.menu-item {
  display: block;
  text-decoration: none;
  color: var(--secondary, #8f8f8f);
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .7px;
  padding: 6px 0;
  user-select: none;
  flex: 0 0 auto;
  white-space: nowrap;
}

.menu-item:hover,
.menu-item:focus-visible,
.menu-item:active {
  color: var(--text, #1a1a1a);
  padding-left: 5px;
}

.client-empty {
  padding: 28px 0;
  color: var(--secondary, #999);
  font-size: .86rem;
}

@media (max-width: 768px) {
  .client-home-head {
    padding: 18px 0 14px;
  }

  .client-home-title {
    font-size: .86rem;
    letter-spacing: 1px;
  }

  .menu-ribbon {
    flex-wrap: nowrap;
    gap: 22px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-top: 12px;
  }

  .menu-ribbon::-webkit-scrollbar {
    display: none;
  }

  .menu-item {
    font-size: .78rem;
    padding: 2px 0;
  }

  .menu-item:hover,
  .menu-item:focus-visible,
  .menu-item:active {
    padding-left: 0;
  }
}
</style>