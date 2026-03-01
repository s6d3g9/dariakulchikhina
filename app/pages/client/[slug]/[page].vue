<template>
  <div class="client-page">
    <component :is="activeComponent" v-bind="activeProps" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const page = computed(() => route.params.page as string)

const normalizedPage = computed(() =>
  page.value === 'brief' ? 'self_profile' : page.value,
)

const pageComponentMap: Record<string, any> = {
  phase_init: ClientInitiation,
  self_profile: AdminSmartBrief,
  client_contacts: ClientContactDetails,
  design_timeline: ClientTimeline,
  design_album: ClientDesignAlbum,
  contracts: ClientContracts,
  project_roadmap: ClientRoadmap,
  work_status: ClientWorkStatus,
  profile_contractors: ClientContractorsProfile,
}

const activeComponent = computed(() => pageComponentMap[normalizedPage.value] || ClientPageContent)

const activeProps = computed(() => {
  const base = { slug: slug.value }
  if (activeComponent.value === AdminSmartBrief) {
    return { ...base, clientMode: true }
  }
  if (activeComponent.value === ClientPageContent) {
    return { ...base, page: normalizedPage.value }
  }
  return base
})
</script>

<style scoped>
.client-page { padding: 4px 0 24px; }
</style>
