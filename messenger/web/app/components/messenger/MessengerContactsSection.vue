<script setup lang="ts">
const contacts = useMessengerContacts()
const conversations = useMessengerConversations()
const searchDraft = ref('')
const actionError = ref('')

onMounted(async () => {
  await contacts.refresh()
  searchDraft.value = contacts.query.value
})

async function runSearch() {
  actionError.value = ''

  try {
    await contacts.refresh(searchDraft.value)
  } catch {
    actionError.value = 'Не удалось обновить список пользователей.'
  }
}

async function sendInvite(targetUserId: string) {
  actionError.value = ''

  try {
    await contacts.invite(targetUserId)
  } catch {
    actionError.value = 'Не удалось отправить приглашение.'
  }
}

async function openDirectChat(targetUserId: string) {
  actionError.value = ''

  try {
    await conversations.openDirectConversation(targetUserId)
  } catch {
    actionError.value = 'Не удалось открыть direct-чат.'
  }
}

async function acceptInvite(inviteId: string) {
  actionError.value = ''

  try {
    await contacts.accept(inviteId)
  } catch {
    actionError.value = 'Не удалось принять приглашение.'
  }
}

async function rejectInvite(inviteId: string) {
  actionError.value = ''

  try {
    await contacts.reject(inviteId)
  } catch {
    actionError.value = 'Не удалось отклонить приглашение.'
  }
}
</script>

<template>
  <section class="section-block" aria-label="Contacts section">
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Contacts</p>
        <h2>Контакты и приглашения</h2>
      </div>
      <div class="search-row">
        <input
          v-model="searchDraft"
          type="text"
          class="inline-input"
          placeholder="Поиск пользователей"
          @keydown.enter.prevent="runSearch"
        >
        <button type="button" class="action-btn" :disabled="contacts.pending.value" @click="runSearch">
          {{ contacts.pending.value ? 'Ищем...' : 'Найти' }}
        </button>
      </div>
    </header>

    <p v-if="actionError" class="auth-error">{{ actionError }}</p>

    <div class="section-split">
      <div class="list-stack">
        <article class="list-card list-card--panel">
          <div class="list-card__main">
            <p class="list-card__title">Контакты</p>
            <p class="list-card__text">{{ contacts.overview.value.contacts.length }} пользователей в direct-сети.</p>
          </div>
        </article>

        <article
          v-for="contact in contacts.overview.value.contacts"
          :key="contact.id"
          class="list-card list-card--action"
        >
          <div class="list-card__main">
            <p class="list-card__title">{{ contact.displayName }}</p>
            <p class="list-card__text">@{{ contact.login }}</p>
          </div>
          <button type="button" class="action-btn" @click="openDirectChat(contact.id)">
            Открыть чат
          </button>
        </article>
      </div>

      <div class="list-stack">
        <article class="list-card list-card--panel">
          <div class="list-card__main">
            <p class="list-card__title">Приглашения</p>
            <p class="list-card__text">Входящие и исходящие заявки в контакты.</p>
          </div>
        </article>

        <article
          v-for="invite in contacts.overview.value.invites"
          :key="invite.id"
          class="list-card list-card--action"
        >
          <div class="list-card__main">
            <p class="list-card__title">{{ invite.displayName }}</p>
            <p class="list-card__text">
              @{{ invite.login }} · {{ invite.direction === 'incoming' ? 'Входящее приглашение' : 'Исходящее приглашение' }}
            </p>
          </div>
          <div class="section-actions" v-if="invite.direction === 'incoming' && invite.status === 'pending'">
            <button type="button" class="action-btn" @click="acceptInvite(invite.id)">Принять</button>
            <button type="button" class="action-btn" @click="rejectInvite(invite.id)">Отклонить</button>
          </div>
          <button v-else type="button" class="action-btn" disabled>
            {{ invite.status === 'pending' ? 'Ожидание' : invite.status === 'accepted' ? 'Принято' : 'Отклонено' }}
          </button>
        </article>
      </div>
    </div>

    <div class="list-stack">
      <article class="list-card list-card--panel">
        <div class="list-card__main">
          <p class="list-card__title">Найденные пользователи</p>
          <p class="list-card__text">Поиск по displayName и login в отдельном messenger контуре.</p>
        </div>
      </article>

      <article
        v-for="candidate in contacts.overview.value.discover"
        :key="candidate.id"
        class="list-card list-card--action"
      >
        <div class="list-card__main">
          <p class="list-card__title">{{ candidate.displayName }}</p>
          <p class="list-card__text">@{{ candidate.login }}</p>
        </div>
        <button
          v-if="candidate.relationship === 'none'"
          type="button"
          class="action-btn"
          @click="sendInvite(candidate.id)"
        >
          Пригласить
        </button>
        <button v-else type="button" class="action-btn" disabled>
          {{ candidate.relationship === 'contact' ? 'Уже в контактах' : candidate.relationship === 'incoming' ? 'Ждет вашего ответа' : 'Приглашение отправлено' }}
        </button>
      </article>
    </div>
  </section>
</template>