<template>
  <div v-if="!staff?.length" class="cab-empty">
    <div class="cab-empty-icon">◔</div>
    <p>Сотрудников пока нет.<br>Администратор добавит мастеров за вашей компанией.</p>
  </div>
  <div v-else class="cab-staff-list">
    <NuxtLink
      v-for="m in staff"
      :key="m.id"
      :to="`/contractor/${m.id}`"
      class="cab-staff-card glass-surface"
    >
      <div class="cab-staff-avatar">◑</div>
      <div class="cab-staff-info">
        <div class="cab-staff-name">{{ m.name }}</div>
        <div v-if="m.workTypes?.length" class="cab-staff-wt">
          {{ m.workTypes.slice(0, 3).map((w: string) => workTypeLabel(w)).join(' · ') }}
          <span v-if="m.workTypes.length > 3"> +{{ m.workTypes.length - 3 }}</span>
        </div>
        <div class="cab-staff-contacts">
          <span v-if="m.phone">☎️ {{ m.phone }}</span>
          <span v-if="m.messenger && m.messengerNick">
            <template v-if="m.messenger === 'telegram'">✈️</template>
            <template v-else-if="m.messenger === 'whatsapp'">&#128242;</template>
            <template v-else>💬</template>
            {{ m.messengerNick }}
          </span>
        </div>
      </div>
      <div class="cab-staff-arrow">›</div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { workTypeLabel } from '~~/shared/utils/work-status'

interface StaffMember {
  id: number | string
  name: string
  workTypes?: string[] | null
  phone?: string | null
  messenger?: string | null
  messengerNick?: string | null
}

defineProps<{
  staff: StaffMember[] | null | undefined
}>()
</script>
