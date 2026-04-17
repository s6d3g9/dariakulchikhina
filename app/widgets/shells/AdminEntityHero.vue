<template>
  <section
    class="admin-entity-hero"
    :class="{
      'admin-entity-hero--full': fullHeight,
      'admin-entity-hero--framed': frame === 'framed',
      'admin-entity-hero--divided': frame === 'divided',
    }"
    :style="heroStyle"
  >
    <div class="admin-entity-hero__body">
      <p v-if="kicker" class="admin-entity-hero__kicker">{{ kicker }}</p>
      <h1 class="admin-entity-hero__title">{{ title }}</h1>

      <div v-if="facts.length" class="admin-entity-hero__meta" :style="metaStyle">
        <div
          v-for="fact in facts"
          :key="fact.label"
          class="admin-entity-hero__meta-item"
        >
          <span class="admin-entity-hero__meta-label">{{ fact.label }}</span>
          <span class="admin-entity-hero__meta-value">{{ fact.value }}</span>
        </div>
      </div>

      <div v-if="$slots.actions" class="admin-entity-hero__actions">
        <slot name="actions" />
      </div>

      <div v-if="$slots.notices" class="admin-entity-hero__notices">
        <slot name="notices" />
      </div>
    </div>

    <div v-if="prompt || $slots.prompt" class="admin-entity-hero__prompt">
      <slot name="prompt">{{ prompt }}</slot>
    </div>
  </section>
</template>

<script setup lang="ts">
type HeroFact = {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  kicker?: string
  title: string
  facts?: HeroFact[]
  prompt?: string
  fullHeight?: boolean
  frame?: 'framed' | 'divided'
  metaColumns?: number
  maxWidth?: string
}>(), {
  kicker: '',
  facts: () => [],
  prompt: '',
  fullHeight: false,
  frame: 'framed',
  metaColumns: 3,
  maxWidth: '980px',
})

const heroStyle = computed(() => ({
  '--admin-hero-max-width': props.maxWidth,
}))

const metaStyle = computed(() => ({
  '--admin-hero-meta-columns': String(Math.max(1, props.metaColumns)),
}))
</script>

<style scoped>
.admin-entity-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(72vh, 720px);
  padding: 32px 20px;
  border-radius: 0;
}

.admin-entity-hero--framed {
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.admin-entity-hero--divided {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
}

.admin-entity-hero--full {
  min-height: 100vh;
}

.admin-entity-hero__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
}

.admin-entity-hero__kicker {
  margin: 0;
  font-size: .68rem;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.admin-entity-hero__title {
  margin: 0;
  width: min(100%, var(--admin-hero-max-width));
  text-align: center;
  text-transform: uppercase;
  letter-spacing: .12em;
  line-height: .96;
  font-size: clamp(2.4rem, 8vw, 7rem);
  font-weight: 500;
  word-break: break-word;
}

.admin-entity-hero__meta {
  display: grid;
  grid-template-columns: repeat(var(--admin-hero-meta-columns), minmax(0, 1fr));
  gap: 10px;
  width: min(100%, var(--admin-hero-max-width));
}

.admin-entity-hero__meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  min-height: 84px;
}

.admin-entity-hero__meta-label {
  font-size: .6rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.admin-entity-hero__meta-value {
  font-size: .96rem;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.admin-entity-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  width: min(100%, var(--admin-hero-max-width));
}

.admin-entity-hero__notices {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  width: min(100%, var(--admin-hero-max-width));
}

.admin-entity-hero__prompt {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: .68rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.admin-entity-hero__actions :deep(.admin-entity-hero__action),
.admin-entity-hero__notices :deep(.admin-entity-hero__notice) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: .68rem;
  border-radius: 0;
  transition: background-color .14s ease, border-color .14s ease, color .14s ease;
}

.admin-entity-hero__actions :deep(button.admin-entity-hero__action) {
  cursor: pointer;
}

.admin-entity-hero__actions :deep(.admin-entity-hero__action:hover),
.admin-entity-hero__notices :deep(.admin-entity-hero__notice:hover) {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.admin-entity-hero__notices :deep(.admin-entity-hero__notice--success) {
  color: color-mix(in srgb, var(--ds-success, #5caa7f) 78%, var(--glass-text) 22%);
}

.admin-entity-hero__notices :deep(.admin-entity-hero__notice--error) {
  color: color-mix(in srgb, var(--ds-error, #c00) 82%, var(--glass-text) 18%);
}

@media (max-width: 900px) {
  .admin-entity-hero__meta {
    grid-template-columns: repeat(min(2, var(--admin-hero-meta-columns)), minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-entity-hero {
    min-height: auto;
    padding: 26px 14px;
  }

  .admin-entity-hero--full {
    min-height: calc(100vh - max(24px, env(safe-area-inset-top)));
    padding: 28px 16px max(3.5rem, env(safe-area-inset-bottom));
  }

  .admin-entity-hero__title {
    font-size: clamp(2rem, 11vw, 4rem);
    letter-spacing: .09em;
  }

  .admin-entity-hero__meta {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .admin-entity-hero__meta-item {
    padding: 10px 12px;
  }

  .admin-entity-hero__meta-value {
    font-size: .76rem;
  }

  .admin-entity-hero__prompt {
    bottom: max(14px, env(safe-area-inset-bottom));
    font-size: .6rem;
  }
}
</style>