<template>
  <section class="ui-visibility-rules">
    <div class="ui-visibility-rules__header">
      <div>
        <p class="ui-visibility-rules__kicker">скрытые элементы</p>
        <h3 class="ui-visibility-rules__title">управление правилами</h3>
        <p class="ui-visibility-rules__copy">{{ syncNotice }}</p>
      </div>
    </div>

    <div v-if="rules.length" class="ui-visibility-rules__list">
      <article v-for="rule in rules" :key="rule.id" class="ui-visibility-rules__item">
        <div class="ui-visibility-rules__meta">
          <span class="ui-visibility-rules__scope">{{ rule.scope === 'global' ? 'все страницы' : rule.path }}</span>
          <span class="ui-visibility-rules__label">{{ rule.label || rule.selector }}</span>
          <code class="ui-visibility-rules__selector">{{ rule.selector }}</code>
        </div>
        <button type="button" class="a-btn-sm a-btn-danger" @click="removeRule(rule.id)">вернуть</button>
      </article>
    </div>

    <p v-else class="ui-visibility-rules__empty">правил скрытия пока нет</p>
  </section>
</template>

<script setup lang="ts">
const { rules, isLoadedFromServer, removeRule } = useElementVisibility()

const syncNotice = computed(() => isLoadedFromServer.value
  ? 'правила синхронизируются между администраторами через сервер'
  : 'работает локальный fallback до восстановления серверной синхронизации')
</script>

<style scoped>
.ui-visibility-rules {
  display: grid;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 16px;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.ui-visibility-rules__kicker,
.ui-visibility-rules__copy,
.ui-visibility-rules__scope,
.ui-visibility-rules__selector,
.ui-visibility-rules__empty {
  margin: 0;
  font-size: .68rem;
  line-height: 1.5;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.ui-visibility-rules__title,
.ui-visibility-rules__label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.ui-visibility-rules__title {
  font-size: .82rem;
}

.ui-visibility-rules__list {
  display: grid;
  gap: 10px;
}

.ui-visibility-rules__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding: 12px;
}

.ui-visibility-rules__meta {
  display: grid;
  gap: 4px;
}

.ui-visibility-rules__label {
  font-size: .76rem;
}

.ui-visibility-rules__selector {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 640px) {
  .ui-visibility-rules__item {
    grid-template-columns: 1fr;
  }
}
</style>