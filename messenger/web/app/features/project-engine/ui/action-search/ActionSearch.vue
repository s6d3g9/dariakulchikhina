<script setup lang="ts">
import type { ProjectActionCategoryGroup, ProjectActionDefinition } from '../../model/useMessengerProjectActions'

interface Props {
  groups: ProjectActionCategoryGroup[]
  selectedActionId: string | null
  pendingAction: string | null
  showSearchPane: boolean
  selectedCategory: string
  canUseCatalogFeatures: boolean
  searchValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchValue: '',
})

const emit = defineEmits<{
  toggleSearchPane: []
  selectCategory: [category: string]
  clearCategorySelection: []
  selectAction: [actionId: string | null]
  'update:searchValue': [value: string]
}>()

const actionSearch = ref('')

const normalizedActionSearch = computed(() => actionSearch.value.trim().toLowerCase())
const searchChipLabel = computed(() => actionSearch.value.trim() || 'Поиск')

const filteredCategoryGroups = computed(() => {
  const query = normalizedActionSearch.value

  return props.groups
    .map((group) => {
      const categoryMatches = matchesText(group.label, query)
      const visibleActions = (!query || categoryMatches)
        ? group.actions
        : group.actions.filter(action => matchesActionSearch(action, query))

      if (query && !categoryMatches && !visibleActions.length) {
        return null
      }

      return {
        ...group,
        visibleActions,
        preview: visibleActions.slice(0, 2).map(action => action.label).join(' · '),
      }
    })
    .filter(Boolean) as Array<ProjectActionCategoryGroup & {
      visibleActions: ProjectActionDefinition[]
      preview: string
    }>
})

const selectedCategoryGroup = computed(() => {
  return props.groups.find(group => group.category === props.selectedCategory) || null
})

const selectedCategoryActions = computed(() => {
  const group = selectedCategoryGroup.value
  const query = normalizedActionSearch.value

  if (!group) {
    return []
  }

  if (!query || matchesText(group.label, query)) {
    return group.actions
  }

  return group.actions.filter(action => matchesActionSearch(action, query))
})

function matchesText(value: string | undefined, query: string) {
  if (!query) {
    return true
  }

  return value?.toLowerCase().includes(query) || false
}

function matchesActionSearch(action: ProjectActionDefinition, query: string) {
  if (!query) {
    return true
  }

  return [action.label, action.description].some(text => matchesText(text, query))
}

function handleActionClick(action: ProjectActionDefinition) {
  emit('selectAction', props.selectedActionId === action.id ? null : action.id)
}

function clearSelection() {
  actionSearch.value = ''
  emit('clearCategorySelection')
}

watch(() => props.showSearchPane, (open) => {
  if (!open) {
    actionSearch.value = ''
  }
})
</script>

<template>
  <div class="action-search-wrapper">
    <button
      type="button"
      class="action-search__chip"
      :class="{ 'action-search__chip--active': showSearchPane, 'action-search__chip--compact': !actionSearch.trim() }"
      @click="emit('toggleSearchPane')"
    >
      <VIcon icon="mdi-magnify" size="16" />
      <span class="action-search__label">{{ searchChipLabel }}</span>
    </button>

    <div class="action-search__rail">
      <div class="action-search__scroll">
        <button
          v-if="selectedCategoryGroup"
          type="button"
          class="action-search__rail-chip action-search__rail-chip--ghost"
          @click="clearSelection"
        >
          <VIcon icon="mdi-arrow-left" size="16" />
          <span>Категории</span>
        </button>

        <template v-if="selectedCategoryGroup && selectedCategoryActions.length">
          <button
            v-for="action in selectedCategoryActions"
            :key="action.id"
            type="button"
            class="action-search__rail-chip"
            :class="{
              'action-search__rail-chip--active': selectedActionId === action.id,
              'action-search__rail-chip--pending': pendingAction === action.id,
            }"
            :disabled="Boolean(pendingAction)"
            @click="handleActionClick(action)"
          >
            <VIcon :icon="action.icon" size="16" />
            <span>{{ action.label }}</span>
          </button>
        </template>

        <template v-else-if="!selectedCategoryGroup">
          <button
            v-for="group in filteredCategoryGroups"
            :key="group.category"
            type="button"
            class="action-search__rail-chip"
            :class="{ 'action-search__rail-chip--active': selectedCategory === group.category }"
            :disabled="Boolean(pendingAction) || !canUseCatalogFeatures"
            @click="emit('selectCategory', group.category)"
          >
            <VIcon :icon="group.icon" size="16" />
            <span>{{ group.label }}</span>
            <span class="action-search__count">{{ group.visibleActions.length }}</span>
          </button>
        </template>

        <span v-else class="action-search__empty">
          {{ selectedCategoryGroup ? 'Нет действий' : 'Ничего не найдено' }}
        </span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.action-search-wrapper {
  display: contents;
}

.action-search__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-container-highest));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  max-width: 132px;
}

.action-search__chip--compact {
  max-width: 44px;
  padding-inline: 0;
}

.action-search__chip--compact .action-search__label {
  display: none;
}

.action-search__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.action-search__chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.action-search__rail-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  white-space: nowrap;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-container-highest));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.action-search__rail-chip--ghost {
  background: transparent;
}

.action-search__rail-chip--pending {
  opacity: 0.68;
}

.action-search__rail-chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.action-search__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-size: 11px;
  line-height: 1;
}

.action-search__empty {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
  white-space: nowrap;
}

@container project-actions (max-width: 479px) {
  .action-search__chip,
  .action-search__rail-chip {
    min-height: 40px;
    padding-inline: 12px;
  }

  .action-search__chip {
    max-width: 132px;
  }
}

@container project-actions (min-width: 480px) {
  .action-search__chip--compact {
    max-width: 132px;
    padding-inline: 14px;
  }

  .action-search__chip--compact .action-search__label {
    display: inline;
  }
}

@container project-actions (min-width: 640px) {
  .action-search__chip {
    max-width: 176px;
  }
}

@container project-actions (min-width: 900px) {
  .action-search__chip {
    max-width: 220px;
  }
}
</style>
