<template>
  <section class="comm-block comm-block--directory">
    <div class="comm-section-head">
      <div class="comm-block-title">Открытые чаты</div>
      <div class="comm-section-metrics">
        <span class="comm-section-pill">{{ chats.length }}</span>
      </div>
    </div>
    <label class="u-field__label" for="comm-chat-search">Поиск по чатам</label>
    <GlassInput
      id="comm-chat-search"
      :model-value="search"
      type="text"
      class="glass-input --inline comm-search"
      placeholder="Имя, роль или @никнейм"
      @update:model-value="(v: string | number | null) => $emit('update:search', String(v ?? ''))"
    />
    <div v-if="chats.length" class="comm-list-grid">
      <button
        v-for="chat in chats"
        :key="chat.roomId"
        type="button"
        class="comm-person"
        :class="{ 'comm-person--active': activePeerKey === chat.participant.actorKey }"
        @click="$emit('open-chat', chat)"
      >
        <span class="comm-person-topline">
          <span class="comm-person-name">{{ chat.participant.displayName }}</span>
          <span class="comm-chat-updated">{{ formatTime(chat.updatedAt) }}</span>
        </span>
        <span class="comm-person-bottomline">
          <span v-if="chat.participant.nickname" class="comm-person-nick">@{{ chat.participant.nickname }}</span>
          <span class="comm-person-badges">
            <span class="comm-person-badge">{{ chat.participant.role }}</span>
          </span>
        </span>
      </button>
    </div>
    <div v-else class="comm-empty-inline">
      {{ hasAvailableContacts ? '[ НЕТ ОТКРЫТЫХ ЧАТОВ ]' : '[ НЕТ ОТКРЫТЫХ ЧАТОВ: СНАЧАЛА НУЖНЫ КОНТАКТЫ ]' }}
    </div>
  </section>
</template>

<script setup lang="ts">
interface ChatParticipant {
  actorKey: string
  displayName: string
  nickname?: string | null
  role: string
}

interface ChatEntry {
  roomId: string
  participant: ChatParticipant
  updatedAt: string | number | Date
}

defineProps<{
  chats: ChatEntry[]
  search: string
  activePeerKey: string | null | undefined
  hasAvailableContacts: boolean
  formatTime: (value: string | number | Date) => string
}>()

defineEmits<{
  'update:search': [q: string]
  'open-chat': [chat: ChatEntry]
}>()
</script>
