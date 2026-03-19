<script setup lang="ts">
const draft = ref('')

const timeline = [
  { id: '1', author: 'Вы', text: 'Каркас чата поднят отдельно от основного проекта.', own: true },
  { id: '2', author: 'Система', text: 'Следующий этап: auth, realtime, voice messages и uploads.', own: false },
]
</script>

<template>
  <section class="section-block" aria-label="Chat section">
    <header class="section-head">
      <div>
        <p class="section-kicker">Direct Chat</p>
        <h2>Основное окно диалога</h2>
      </div>
      <div class="section-actions">
        <button type="button" class="action-btn">Аудио</button>
        <button type="button" class="action-btn">Видео</button>
      </div>
    </header>

    <div class="message-list">
      <article v-for="entry in timeline" :key="entry.id" class="message-bubble" :class="{ 'message-bubble--own': entry.own }">
        <p class="message-bubble__author">{{ entry.author }}</p>
        <p class="message-bubble__text">{{ entry.text }}</p>
      </article>
    </div>

    <div class="composer-bar">
      <button type="button" class="composer-btn">+</button>
      <textarea v-model="draft" rows="1" class="composer-input" placeholder="Сообщение" />
      <button type="button" class="composer-btn">Mic</button>
      <button type="button" class="composer-btn composer-btn--accent">↑</button>
    </div>
  </section>
</template>