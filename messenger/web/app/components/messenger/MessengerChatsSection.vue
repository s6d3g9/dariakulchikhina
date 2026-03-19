<script setup lang="ts">
const conversations = useMessengerConversations()
const searchDraft = ref('')
const actionError = ref('')

onMounted(async () => {
  await conversations.refresh()
  searchDraft.value = conversations.query.value
})

async function runSearch() {
  actionError.value = ''

  try {
    await conversations.refresh(searchDraft.value)
  } catch {
    actionError.value = 'Не удалось обновить список чатов.'
  }
}

async function openChat(conversationId: string) {
  actionError.value = ''

  try {
    await conversations.selectConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось открыть чат.'
  }
}
</script>

<template>
  <section class="section-block" aria-label="Chats section">
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Chats</p>
        <h2>Список диалогов</h2>
      </div>
      <div class="search-row">
        <input v-model="searchDraft" type="text" class="inline-input" placeholder="Поиск по чатам" @keydown.enter.prevent="runSearch">
        <button type="button" class="action-btn" :disabled="conversations.pending.value" @click="runSearch">
          {{ conversations.pending.value ? 'Ищем...' : 'Найти' }}
        </button>
      </div>
    </header>

    <p v-if="actionError" class="auth-error">{{ actionError }}</p>

    <div class="list-stack">
      <article
        v-for="chat in conversations.conversations.value"
        :key="chat.id"
        class="list-card list-card--action list-card--clickable"
        @click="openChat(chat.id)"
      >
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ chat.peerDisplayName }}</p>
            <p class="list-card__meta">{{ new Date(chat.updatedAt).toLocaleDateString('ru-RU') }}</p>
          </div>
          <p class="list-card__text">{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</p>
        </div>
      </article>

      <article v-if="!conversations.conversations.value.length" class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Чаты пока пусты</p>
          <p class="list-card__text">Примите приглашение в контакты и откройте первый direct-чат.</p>
        </div>
      </article>
    </div>
  </section>
</template>