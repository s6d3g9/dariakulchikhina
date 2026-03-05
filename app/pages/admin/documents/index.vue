<template>
  <div>
    <AdminDocumentsSection :category="activeCategory" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('docs'))

const activeCategory = computed(() => adminNav.contentSpec.value.documentCategory || 'all')
</script>
