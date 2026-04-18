<template>
  <section class="comm-block comm-block--directory">
    <div class="comm-section-head">
      <div class="comm-block-title">Контакты</div>
      <div class="comm-section-metrics">
        <span class="comm-section-pill">{{ contacts.length }}</span>
      </div>
    </div>
    <label class="u-field__label" for="comm-contact-search">Поиск по контактам</label>
    <GlassInput
      id="comm-contact-search"
      :model-value="search"
      type="text"
      class="glass-input --inline comm-search"
      placeholder="Имя, роль или @никнейм"
      @update:model-value="(v: string | number | null) => $emit('update:search', String(v ?? ''))"
    />

    <div v-if="contacts.length" class="comm-list-grid">
      <button
        v-for="participant in contacts"
        :key="participant.actorKey"
        type="button"
        class="comm-person"
        :class="{ 'comm-person--active': activePeerKey === participant.actorKey }"
        @click="$emit('start-chat', participant)"
      >
        <span class="comm-person-topline">
          <span class="comm-person-name">{{ participant.displayName }}</span>
        </span>
        <span class="comm-person-bottomline">
          <span v-if="participant.nickname" class="comm-person-nick">@{{ participant.nickname }}</span>
          <span class="comm-person-badges">
            <span class="comm-person-badge">{{ participant.role }}</span>
          </span>
        </span>
      </button>
    </div>
    <div v-else class="comm-empty-inline">
      <p>[ НЕТ ДОСТУПНЫХ КОНТАКТОВ ]</p>
      <p class="comm-empty-note">Контакты появятся после привязки к проекту дизайнера, подрядчика или другого участника.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Participant {
  actorKey: string
  displayName: string
  nickname?: string | null
  role: string
}

defineProps<{
  contacts: Participant[]
  search: string
  activePeerKey: string | null | undefined
}>()

defineEmits<{
  'update:search': [q: string]
  'start-chat': [participant: Participant]
}>()
</script>
