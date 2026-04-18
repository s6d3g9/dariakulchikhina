<template>
  <div class="cab-section" data-section="clients">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }"><h2>Клиенты</h2></div>
    <div v-if="clients.length" class="pivot-list">
      <div
        v-for="c in clients"
        :key="c.id"
        class="pivot-banner glass-surface"
        :class="{ 'pivot-banner--brutalist': isBrutalist }"
        @click="drillToEntityCabinet('clients', c.id, c.name)"
      >
        <div class="pivot-banner-left">
          <span class="pivot-banner-name">{{ c.name }}</span>
          <span v-if="c.phone || c.email" class="pivot-banner-contact">
            {{ [c.phone, c.email].filter(Boolean).join(' / ') }}
          </span>
        </div>
        <span class="pivot-banner-arrow">→</span>
      </div>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }"><p>Клиентов пока нет. Добавьте клиента в проект.</p></div>
  </div>
</template>

<script setup lang="ts">
import { useAdminNav } from '~/entities/admin-navigation/model/useAdminNav'

interface ClientRow {
  id: number
  name: string
  phone: string | null
  email: string | null
}

defineProps<{
  clients: ClientRow[]
  isBrutalist: boolean
}>()

const { drillToEntityCabinet } = useAdminNav()
</script>
