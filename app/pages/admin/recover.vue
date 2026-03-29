<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/recover?role=admin', { replace: true })
</script>