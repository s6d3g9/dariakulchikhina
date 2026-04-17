<template>
  <component :is="resolvedComponent" v-bind="resolvedProps" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import AdminClientProfile from '~/widgets/cabinets/client/AdminClientProfile.vue'
import AdminFirstContact from '~/widgets/phases/initiation/AdminFirstContact.vue'
import AdminSmartBrief from '~/widgets/phases/initiation/AdminSmartBrief.vue'
import AdminSiteSurvey from '~/widgets/phases/initiation/AdminSiteSurvey.vue'
import AdminToRContract from '~/widgets/phases/initiation/AdminToRContract.vue'
import AdminExtraServices from '~/widgets/phases/initiation/AdminExtraServices.vue'
import AdminSpacePlanning from '~/widgets/phases/concept/AdminSpacePlanning.vue'
import AdminMoodboard from '~/widgets/phases/concept/AdminMoodboard.vue'
import AdminConceptApproval from '~/widgets/phases/concept/AdminConceptApproval.vue'
import AdminWorkingDrawings from '~/widgets/phases/working-project/AdminWorkingDrawings.vue'
import AdminSpecifications from '~/widgets/phases/working-project/AdminSpecifications.vue'
import AdminMepIntegration from '~/widgets/phases/working-project/AdminMepIntegration.vue'
import AdminDesignAlbumFinal from '~/widgets/phases/working-project/AdminDesignAlbumFinal.vue'
import AdminProcurementList from '~/widgets/phases/procurement/AdminProcurementList.vue'
import AdminSuppliers from '~/widgets/phases/procurement/AdminSuppliers.vue'
import AdminProcurementStatus from '~/widgets/phases/procurement/AdminProcurementStatus.vue'
import AdminConstructionPlan from '~/widgets/phases/construction/AdminConstructionPlan.vue'
import AdminWorkLog from '~/widgets/phases/construction/AdminWorkLog.vue'
import AdminSitePhotos from '~/widgets/phases/construction/AdminSitePhotos.vue'
import AdminPunchList from '~/widgets/phases/construction/AdminPunchList.vue'
import AdminCommissioningAct from '~/widgets/phases/commissioning/AdminCommissioningAct.vue'
import AdminClientSignOff from '~/widgets/phases/commissioning/AdminClientSignOff.vue'
import AdminPageContent from '~/features/page-content/ui/AdminPageContent.vue'

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
