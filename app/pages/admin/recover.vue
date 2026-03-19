<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

await navigateTo('/recover?role=designer', { replace: true })
</script>