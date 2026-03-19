<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/recover?role=client', { replace: true })
</script>