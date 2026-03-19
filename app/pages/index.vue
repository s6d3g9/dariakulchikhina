<template>
  <div class="min-h-screen flex items-center justify-center glass-page">
    <div class="lp-wrap">
      <h1 class="lp-logo">dariakulchikhina</h1>
      <p class="lp-sub">дизайн интерьеров</p>
      <div class="lp-links">
        <NuxtLink to="/register" class="lp-btn">
          <span class="lp-btn-icon">◍</span>
          <span>Регистрация</span>
          <span class="lp-btn-hint">все роли</span>
        </NuxtLink>
        <NuxtLink to="/login?role=client" class="lp-btn lp-btn--primary">
          <span class="lp-btn-icon">◌</span>
          <span>Личный кабинет</span>
          <span class="lp-btn-hint">клиенты</span>
        </NuxtLink>
        <NuxtLink to="/login?role=contractor" class="lp-btn">
          <span class="lp-btn-icon">◑</span>
          <span>Кабинет подрядчика</span>
          <span class="lp-btn-hint">мастера</span>
        </NuxtLink>
        <NuxtLink to="/login?role=designer" class="lp-btn lp-btn--muted">
          <span class="lp-btn-icon">◎</span>
          <span>Вход для дизайнера</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lp-wrap {
  text-align: center;
  padding: 40px 20px;
}

.lp-logo {
  font-size: 1.5rem;
  font-weight: 300;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0 0 6px;
  color: var(--glass-text, #1a1a2e);
}

.lp-sub {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  opacity: 0.35;
  margin: 0 0 40px;
  text-transform: uppercase;
}

.lp-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.lp-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  min-width: 240px;
  border: 1px solid var(--glass-border, rgba(180,180,220,0.3));
  border-radius: 14px;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(8px);
  color: var(--glass-text, #1a1a2e);
  font-size: 0.88rem;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.15s;
  justify-content: center;
  position: relative;
}
.lp-btn:hover {
  background: rgba(255,255,255,0.32);
  border-color: rgba(180,180,220,0.55);
  transform: translateY(-1px);
}

.lp-btn--primary {
  background: rgba(255,255,255,0.32);
  border-color: rgba(180,180,220,0.45);
  font-weight: 600;
}
.lp-btn--primary:hover {
  background: rgba(255,255,255,0.48);
}

.lp-btn--muted {
  opacity: 0.45;
  font-size: 0.78rem;
}
.lp-btn--muted:hover { opacity: 0.75; }

.lp-btn-icon {
  font-size: 1rem;
  opacity: 0.6;
}

.lp-btn-hint {
  position: absolute;
  right: 14px;
  font-size: 0.68rem;
  opacity: 0.35;
  letter-spacing: 0.06em;
}
</style>