<script setup lang="ts">
const chats = [
  { id: '1', name: 'Дарья', preview: 'Подготовила отдельный shell для нового продукта.', time: '09:42', unread: 2 },
  { id: '2', name: 'Игорь', preview: 'Нужно подключить voice messages и uploads.', time: 'Вчера', unread: 0 },
  { id: '3', name: 'Project Bot', preview: 'Health endpoint messenger-core готов.', time: 'Вчера', unread: 1 },
]
</script>

<template>
  <section class="section-block" aria-label="Chats section">
    <header class="section-head section-head--stacked">
      <div>
        <p class="section-kicker">Chats</p>
        <h2>Список диалогов</h2>
      </div>
      <input type="text" class="inline-input" placeholder="Поиск по чатам" />
    </header>

    <div class="list-stack">
      <article v-for="chat in chats" :key="chat.id" class="list-card">
        <div class="list-card__main">
          <div class="list-card__row">
            <p class="list-card__title">{{ chat.name }}</p>
            <p class="list-card__meta">{{ chat.time }}</p>
          </div>
          <p class="list-card__text">{{ chat.preview }}</p>
        </div>
        <span v-if="chat.unread" class="badge">{{ chat.unread }}</span>
      </article>
    </div>
  </section>
</template>