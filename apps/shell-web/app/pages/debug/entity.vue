<script setup lang="ts">
import { computed } from 'vue'
import { useEntity } from '../../composables/useEntity'

const route = useRoute()

const entityId = computed(() => {
  const raw = route.query.id
  return Array.isArray(raw) ? raw[0] : raw
})
const view = computed(() => route.query.view === 'type' ? 'type' : 'instance')
const kind = computed(() => {
  const raw = route.query.kind
  return Array.isArray(raw) ? raw[0] ?? 'person-profile' : raw ?? 'person-profile'
})

const { entity, pending, error } = useEntity({
  id: entityId,
  view,
  kind,
})

const payload = computed(() => {
  if (entity.value) {
    return JSON.stringify(entity.value, null, 2)
  }

  if (error.value) {
    return JSON.stringify({ error: error.value.name, message: error.value.message }, null, 2)
  }

  if (pending.value) {
    return 'loading'
  }

  return JSON.stringify({ error: 'Missing id' }, null, 2)
})
</script>

<template>
  <main>
    <pre>{{ payload }}</pre>
  </main>
</template>
