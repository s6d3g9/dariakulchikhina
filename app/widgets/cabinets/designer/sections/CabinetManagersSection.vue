<template>
  <div class="cab-section" data-section="managers">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }"><h2>Менеджеры</h2></div>
    <div v-if="managers.length" class="pivot-list">
      <div
        v-for="m in managers"
        :key="m.id"
        class="pivot-banner glass-surface"
        :class="{ 'pivot-banner--brutalist': isBrutalist }"
        @click="drillToEntityCabinet('managers', m.id, m.name)"
      >
        <div class="pivot-banner-left">
          <span class="pivot-banner-name">{{ m.name }}</span>
          <span v-if="m.role" class="pivot-banner-contact">{{ m.role }}</span>
          <span v-if="m.phone || m.email" class="pivot-banner-contact">
            {{ [m.phone, m.email].filter(Boolean).join(' / ') }}
          </span>
          <span v-if="m.telegram" class="pivot-banner-contact">{{ m.telegram }}</span>
        </div>
        <div class="pivot-banner-right">
          <span class="pivot-banner-count">{{ m.projects.length }} {{ pluralProjects(m.projects.length) }}</span>
          <span class="pivot-banner-arrow">→</span>
        </div>
      </div>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }"><p>Менеджеров пока нет.</p></div>
  </div>
</template>

<script setup lang="ts">
import { useAdminNav } from '~/entities/admin-navigation/model/useAdminNav'
import { pluralProjects } from '../model/cabinet-formatters'

interface ManagerRow {
  id: number
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
  telegram?: string | null
  projects: unknown[]
}

defineProps<{
  managers: ManagerRow[]
  isBrutalist: boolean
}>()

const { drillToEntityCabinet } = useAdminNav()
</script>
