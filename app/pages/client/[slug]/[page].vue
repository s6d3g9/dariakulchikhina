<template>
  <div class="client-page">
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
    <!-- Роадмап -->
    <ClientRoadmap v-else-if="page === 'project_roadmap'" :slug="route.params.slug as string" />
    <!-- Статусы работ -->
    <ClientWorkStatus v-else-if="page === 'work_status'" :slug="route.params.slug as string" />
    <!-- Подрядчики проекта -->
    <ClientContractorsProfile v-else-if="page === 'profile_contractors'" :slug="route.params.slug as string" />
    <!-- Обычный JSON-контент -->
    <ClientPageContent v-else :slug="route.params.slug as string" :page="page" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const page  = computed(() => route.params.page as string)
</script>

<style scoped>
.client-page { padding: 4px 0 24px; }
</style>
