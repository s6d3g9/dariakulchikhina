<script setup lang="ts">
import { useMessengerSkills } from '../../../entities/skills/model/useMessengerSkills'
import { useMessengerPlugins } from '../../../entities/plugins/model/useMessengerPlugins'
import { useMessengerConnectors } from '../../../entities/connectors/model/useMessengerConnectors'

const props = defineProps<{
  projectId: string | null
}>()

const projectIdRef = computed(() => props.projectId)

const skillsModel = useMessengerSkills(projectIdRef)
const pluginsModel = useMessengerPlugins(projectIdRef)
const connectorsModel = useMessengerConnectors(projectIdRef)

watch(() => props.projectId, async (id) => {
  if (!id) return
  await Promise.all([
    skillsModel.refresh(),
    pluginsModel.refresh(),
    connectorsModel.refresh(),
  ])
}, { immediate: true })

const hasItems = computed(() =>
  skillsModel.bundles.value.length > 0
  || pluginsModel.installedPlugins.value.length > 0
  || connectorsModel.connectors.value.length > 0,
)

const connectorIcon = (type: string) => {
  switch (type) {
    case 'claude-cli': return 'mdi-alpha-a-circle-outline'
    case 'claude-api': return 'mdi-api'
    case 'openai': return 'mdi-brain'
    case 'github': return 'mdi-github'
    case 'linear': return 'mdi-vector-line'
    default: return 'mdi-connection'
  }
}
</script>

<template>
  <Transition name="caps-bar-reveal">
    <div v-if="projectId && hasItems" class="caps-bar">
      <div class="caps-bar__scroll">
        <!-- Skills -->
        <button
          v-for="skill in skillsModel.bundles.value"
          :key="`skill-${skill.id}`"
          type="button"
          class="caps-chip"
          :class="{ 'caps-chip--active': skillsModel.isEnabled(skill.id) }"
          :title="skill.purpose"
          @click="skillsModel.toggle(skill.id)"
        >
          <VIcon size="12" class="caps-chip__icon">mdi-lightning-bolt-outline</VIcon>
          <span class="caps-chip__label">{{ skill.label }}</span>
        </button>

        <!-- Plugins -->
        <button
          v-for="plugin in pluginsModel.installedPlugins.value"
          :key="`plugin-${plugin.id}`"
          type="button"
          class="caps-chip caps-chip--plugin"
          :class="{ 'caps-chip--active': pluginsModel.isEnabled(plugin.id) }"
          :title="plugin.description || plugin.id"
          @click="pluginsModel.toggle(plugin.id)"
        >
          <VIcon size="12" class="caps-chip__icon">mdi-puzzle-outline</VIcon>
          <span class="caps-chip__label">{{ plugin.name }}</span>
        </button>

        <!-- Connectors -->
        <button
          v-for="conn in connectorsModel.connectors.value"
          :key="`conn-${conn.id}`"
          type="button"
          class="caps-chip caps-chip--connector"
          :class="{
            'caps-chip--active': conn.enabled,
            'caps-chip--default': conn.isDefault,
          }"
          :title="conn.type"
          @click="connectorsModel.update(conn.id, { enabled: !conn.enabled })"
        >
          <VIcon size="12" class="caps-chip__icon">{{ connectorIcon(conn.type) }}</VIcon>
          <span class="caps-chip__label">{{ conn.label }}</span>
          <span v-if="conn.isDefault" class="caps-chip__badge">★</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.caps-bar {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.caps-bar::before,
.caps-bar::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  pointer-events: none;
  z-index: 1;
}
.caps-bar::before {
  left: 0;
  background: linear-gradient(to right, rgb(var(--v-theme-surface-container-low)), transparent);
}
.caps-bar::after {
  right: 0;
  background: linear-gradient(to left, rgb(var(--v-theme-surface-container-low)), transparent);
}

.caps-bar__scroll {
  display: flex;
  gap: 6px;
  padding: 5px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.caps-bar__scroll::-webkit-scrollbar { display: none; }

.caps-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 7px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
  flex-shrink: 0;
}
.caps-chip:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-color: rgba(var(--v-theme-on-surface), 0.2);
}
.caps-chip--active {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.4);
  color: rgb(var(--v-theme-primary));
}
.caps-chip--plugin.caps-chip--active {
  background: rgba(var(--v-theme-secondary), 0.12);
  border-color: rgba(var(--v-theme-secondary), 0.4);
  color: rgb(var(--v-theme-secondary));
}
.caps-chip--connector.caps-chip--active {
  background: rgba(var(--v-theme-tertiary, var(--v-theme-secondary)), 0.1);
  border-color: rgba(var(--v-theme-tertiary, var(--v-theme-secondary)), 0.35);
  color: rgb(var(--v-theme-on-surface));
}

.caps-chip__icon { opacity: 0.75; flex-shrink: 0; }
.caps-chip--active .caps-chip__icon { opacity: 1; }

.caps-chip__label { line-height: 1; }

.caps-chip__badge {
  font-size: 9px;
  margin-left: 1px;
  opacity: 0.7;
}

.caps-bar-reveal-enter-active,
.caps-bar-reveal-leave-active {
  transition: max-height 200ms ease, opacity 200ms ease;
  max-height: 36px;
}
.caps-bar-reveal-enter-from,
.caps-bar-reveal-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
