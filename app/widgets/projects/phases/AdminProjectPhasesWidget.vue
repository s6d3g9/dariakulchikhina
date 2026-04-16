<template>
  <component :is="resolvedComponent" v-bind="resolvedProps" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import AdminClientProfile from '~/components/AdminClientProfile.vue'
import AdminFirstContact from '~/components/AdminFirstContact.vue'
import AdminSmartBrief from '~/components/AdminSmartBrief.vue'
import AdminSiteSurvey from '~/components/AdminSiteSurvey.vue'
import AdminToRContract from '~/components/AdminToRContract.vue'
import AdminExtraServices from '~/components/AdminExtraServices.vue'
import AdminSpacePlanning from '~/components/AdminSpacePlanning.vue'
import AdminMoodboard from '~/components/AdminMoodboard.vue'
import AdminConceptApproval from '~/components/AdminConceptApproval.vue'
import AdminWorkingDrawings from '~/components/AdminWorkingDrawings.vue'
import AdminSpecifications from '~/components/AdminSpecifications.vue'
import AdminMepIntegration from '~/components/AdminMepIntegration.vue'
import AdminDesignAlbumFinal from '~/components/AdminDesignAlbumFinal.vue'
import AdminProcurementList from '~/components/AdminProcurementList.vue'
import AdminSuppliers from '~/components/AdminSuppliers.vue'
import AdminProcurementStatus from '~/components/AdminProcurementStatus.vue'
import AdminConstructionPlan from '~/components/AdminConstructionPlan.vue'
import AdminWorkLog from '~/components/AdminWorkLog.vue'
import AdminSitePhotos from '~/components/AdminSitePhotos.vue'
import AdminPunchList from '~/components/AdminPunchList.vue'
import AdminCommissioningAct from '~/components/AdminCommissioningAct.vue'
import AdminClientSignOff from '~/components/AdminClientSignOff.vue'
import AdminPageContent from '~/components/AdminPageContent.vue'

const props = defineProps<{
  slug: string
  page: string
}>()

const phaseComponentMap: Record<string, Component> = {
  profile_customer: AdminClientProfile,
  first_contact: AdminFirstContact,
  self_profile: AdminSmartBrief,
  brief: AdminSmartBrief,
  site_survey: AdminSiteSurvey,
  tor_contract: AdminToRContract,
  extra_services: AdminExtraServices,
  space_planning: AdminSpacePlanning,
  moodboard: AdminMoodboard,
  concept_approval: AdminConceptApproval,
  working_drawings: AdminWorkingDrawings,
  specifications: AdminSpecifications,
  mep_integration: AdminMepIntegration,
  design_album_final: AdminDesignAlbumFinal,
  procurement_list: AdminProcurementList,
  suppliers: AdminSuppliers,
  procurement_status: AdminProcurementStatus,
  construction_plan: AdminConstructionPlan,
  work_log: AdminWorkLog,
  site_photos: AdminSitePhotos,
  punch_list: AdminPunchList,
  commissioning_act: AdminCommissioningAct,
  client_sign_off: AdminClientSignOff,
}

const resolvedComponent = computed<Component>(() => phaseComponentMap[props.page] || AdminPageContent)
const resolvedProps = computed(() => resolvedComponent.value === AdminPageContent
  ? { slug: props.slug, page: props.page }
  : { slug: props.slug })
</script>
