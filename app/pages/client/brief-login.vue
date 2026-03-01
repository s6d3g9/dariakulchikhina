<template>
  <div class="bl-root glass-page">
    <div class="bl-wrap glass-card glass-surface">
      <div class="bl-logo">DK</div>
      <h1 class="bl-title">Кабинет клиента</h1>
      <p class="bl-sub">Перенаправляем на страницу входа…</p>
      <NuxtLink to="/client/login" class="bl-btn bl-btn--link">перейти сейчас</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

await navigateTo('/client/login', { replace: true })
</script>

<style scoped>
.bl-root {
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center; padding: 16px;
}
.bl-wrap {
  width: 100%; max-width: 380px; padding: 40px 36px;
  display: flex; flex-direction: column; align-items: center; gap: 0;
}
.bl-logo {
  font-size: .72rem; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: var(--glass-text); opacity: .4;
  margin-bottom: 20px;
}
.bl-title {
  font-size: 1.1rem; font-weight: 300; letter-spacing: -.3px;
  color: var(--glass-text); margin: 0 0 6px; text-align: center;
}
.bl-sub {
  font-size: .74rem; color: var(--glass-text); opacity: .4;
  letter-spacing: .4px; margin: 0 0 28px; text-align: center;
}
.bl-form { display: flex; flex-direction: column; gap: 14px; width: 100%; }
.bl-field { display: flex; flex-direction: column; gap: 5px; }
.bl-field label { font-size: .67rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .4; }
.bl-input { padding: 9px 13px; border-radius: 9px; font-family: inherit; font-size: .9rem; width: 100%; box-sizing: border-box; }
.bl-error { font-size: .78rem; color: #dc2626; padding: 8px 12px; background: rgba(220,38,38,.08); border-radius: 7px; margin: 0; }
.bl-btn {
  margin-top: 4px; padding: 10px; border-radius: 9px; cursor: pointer;
  border: none; background: var(--glass-text); color: var(--glass-page-bg);
  font-family: inherit; font-size: .85rem; font-weight: 500;
  transition: opacity .15s; width: 100%;
}
.bl-btn:hover:not(:disabled) { opacity: .82; }
.bl-btn:disabled { opacity: .4; cursor: default; }
.bl-btn--link { text-align: center; text-decoration: none; display: block; }
</style>
