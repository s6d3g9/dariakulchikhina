<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/recover?role=contractor', { replace: true })
</script>