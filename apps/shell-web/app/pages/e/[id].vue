<script setup lang="ts">
import { computed, watch } from 'vue'
import { personProfileSchema } from '@daria/card-types/person-profile/schemas'
import EntityCard from '../../components/EntityCard.vue'
import ShellLayout from '../../components/ShellLayout.vue'
import { useEntity } from '../../composables/useEntity'
import { useShellMode } from '../../composables/useShellMode'

const route = useRoute()
const id = computed(() => {
  const raw = route.params.id
  return Array.isArray(raw) ? raw[0] ?? null : raw ?? null
})

const {
  view,
  mode,
  toggleView,
  setMode,
} = useShellMode({
  instance: personProfileSchema.modes.instance,
  type: personProfileSchema.modes.type,
})

const {
  entity,
  pending,
  error,
  refresh,
} = useEntity({
  kind: 'person-profile',
  id,
  view,
  immediate: false,
})

const payload = computed(() => {
  if (error.value) {
    return JSON.stringify({ error: error.value.name, message: error.value.message }, null, 2)
  }

  if (pending.value) {
    return 'loading'
  }

  return JSON.stringify({ error: 'Missing id' }, null, 2)
})

watch(id, () => {
  void refresh()
}, { immediate: true })

async function handleToggleView() {
  toggleView()
  await refresh()
}
</script>

<template>
  <ShellLayout
    v-if="entity"
    :entity="entity"
    :mode="mode"
    @toggle-view="handleToggleView"
    @set-mode="setMode"
  >
    <EntityCard :entity="entity" @toggle-view="handleToggleView" />
  </ShellLayout>
  <main v-else>
    <pre>{{ payload }}</pre>
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  margin: 0;
  padding: 16px;
}

pre {
  margin: 0;
  font-size: 13px;
  white-space: pre-wrap;
}

</style>
