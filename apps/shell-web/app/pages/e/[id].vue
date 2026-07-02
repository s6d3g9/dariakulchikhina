<script setup lang="ts">
import { computed, watch } from 'vue'
import { personProfileSchema } from '@daria/card-types/person-profile/schemas'
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

const sectionSummary = computed(() => {
  const sections = entity.value?.sections ?? []
  return `${sections.length} секций: ${sections.map(section => section.key).join(', ')}`
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
    <article class="entity-preview">
      <h1>{{ entity.title }}</h1>
      <p v-if="entity.subtitle">
        {{ entity.subtitle }}
      </p>
      <span class="view-badge">{{ view }}</span>
      <ul>
        <li>{{ sectionSummary }}</li>
      </ul>
    </article>
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

.entity-preview {
  display: grid;
  gap: 12px;
}

.entity-preview h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.entity-preview p {
  margin: 0;
  color: #59616d;
  font-size: 14px;
}

.view-badge {
  width: fit-content;
  border: 1px solid #c8cfd8;
  border-radius: 999px;
  font-size: 12px;
  padding: 4px 8px;
}

.entity-preview ul {
  margin: 0;
  padding-left: 18px;
}
</style>
