<template>
  <component :is="resolvedComponent" v-bind="resolvedProps" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import ClientPageContent from '~/features/page-content/ui/ClientPageContent.vue'
import ClientInitiation from '~/widgets/phases/initiation/ClientInitiation.vue'
import ClientContactDetails from '~/widgets/cabinets/client/ClientContactDetails.vue'
import ClientTimeline from '~/widgets/projects/ClientTimeline.vue'
import ClientDesignAlbum from '~/widgets/phases/working-project/ClientDesignAlbum.vue'
import ClientContracts from '~/widgets/projects/ClientContracts.vue'
import ClientExtraServices from '~/widgets/projects/ClientExtraServices.vue'
import ClientSelfProfile from '~/widgets/cabinets/client/ClientSelfProfile.vue'
import ClientBrief from '~/widgets/projects/ClientBrief.vue'
import ClientTZ from '~/widgets/phases/concept/ClientTZ.vue'
import ClientWorkProgress from '~/widgets/phases/construction/ClientWorkProgress.vue'
import ClientPassport from '~/widgets/projects/ClientPassport.vue'

const props = defineProps<{
  slug: string
  page: string
}>()

const clientComponentMap: Record<string, Component> = {
  phase_init: ClientInitiation,
  self_profile: ClientSelfProfile,
  brief: ClientSelfProfile,
  client_contacts: ClientContactDetails,
  client_passport: ClientPassport,
  client_brief: ClientBrief,
  client_tz: ClientTZ,
  contracts: ClientContracts,
  extra_services: ClientExtraServices,
  work_progress: ClientWorkProgress,
  design_timeline: ClientTimeline,
  design_album: ClientDesignAlbum,
}

const resolvedComponent = computed<Component>(() => clientComponentMap[props.page] || ClientPageContent)
const resolvedProps = computed(() => resolvedComponent.value === ClientPageContent
  ? { slug: props.slug, page: props.page }
  : { slug: props.slug })
</script>
