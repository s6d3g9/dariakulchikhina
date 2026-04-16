<template>
  <component :is="resolvedComponent" v-bind="resolvedProps" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import ClientPageContent from '~/components/ClientPageContent.vue'
import ClientInitiation from '~/components/ClientInitiation.vue'
import ClientContactDetails from '~/components/ClientContactDetails.vue'
import ClientTimeline from '~/components/ClientTimeline.vue'
import ClientDesignAlbum from '~/components/ClientDesignAlbum.vue'
import ClientContracts from '~/components/ClientContracts.vue'
import ClientExtraServices from '~/components/ClientExtraServices.vue'
import ClientSelfProfile from '~/components/ClientSelfProfile.vue'
import ClientBrief from '~/components/ClientBrief.vue'
import ClientTZ from '~/components/ClientTZ.vue'
import ClientWorkProgress from '~/components/ClientWorkProgress.vue'
import ClientPassport from '~/components/ClientPassport.vue'

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
