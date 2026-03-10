<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  pageTransition: false,
  middleware: [
    'admin',
    (to) => {
      const projectSlug = typeof to.query.projectSlug === 'string' && to.query.projectSlug
        ? to.query.projectSlug
        : null

      return navigateTo(projectSlug
        ? { path: `/admin/projects/${projectSlug}`, query: { ...to.query, designPanelTab: 'modules' } }
        : { path: '/admin', query: { ...to.query, designPanelTab: 'modules' } },
        { replace: true })
    },
  ],
})
</script>
