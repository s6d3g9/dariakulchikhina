<template>
  <div class="cc-wrap">
    <div v-if="pending" class="cc-loading">Загрузка...</div>
    <div v-else-if="!contractors?.length" class="cc-empty">Подрядчики не назначены</div>
    <div v-else class="cc-list">
      <div v-for="c in contractors" :key="c.id" class="cc-card glass-surface">
        <div class="cc-head">
          <div class="cc-name">{{ c.name }}</div>
          <div v-if="c.companyName" class="cc-sub">{{ c.companyName }}</div>
        </div>

        <div class="cc-chips" v-if="c.workTypes?.length">
          <span v-for="wt in c.workTypes" :key="wt" class="cc-chip">{{ workTypeLabel(wt) }}</span>
        </div>

        <div class="cc-contacts">
          <a v-if="c.phone" :href="`tel:${c.phone}`" class="cc-contact-item cc-contact--phone">
            <span class="cc-contact-icon">📞</span> {{ c.phone }}
          </a>
          <div v-if="c.messenger && c.messengerNick" class="cc-contact-item">
            <span class="cc-contact-icon">💬</span> {{ c.messenger }}: {{ c.messengerNick }}
          </div>
          <a v-if="c.website" :href="c.website" target="_blank" rel="noopener" class="cc-contact-item cc-contact--link">
            <span class="cc-contact-icon">🔗</span> {{ c.website }}
          </a>
        </div>

        <div v-if="c.notes" class="cc-notes">{{ c.notes }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { workTypeLabel } from '~~/shared/utils/work-status'

const props = defineProps<{ slug: string }>()

const { data: contractors, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`
)
</script>

<style scoped>
.cc-wrap { padding: 4px 0; }
.cc-loading { font-size: .86rem; color: #999; padding: 12px 0; }
.cc-empty  { font-size: .86rem; color: var(--secondary, #999); padding: 12px 0; }

.cc-list { display: grid; gap: 12px; }

.cc-card {
  border: 1px solid var(--border, #e8e8e8);
  padding: 16px 18px;
  background: var(--surface, #fff);
}

.cc-head { margin-bottom: 8px; }
.cc-name { font-size: .92rem; font-weight: 500; color: var(--text, #1a1a1a); }
.cc-sub  { font-size: .78rem; color: var(--secondary, #999); margin-top: 2px; }

.cc-chips {
  display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px;
}
.cc-chip {
  font-size: .7rem; padding: 2px 9px;
  border: 1px solid var(--border, #ddd);
  border-radius: 12px;
  color: var(--secondary, #777);
}

.cc-contacts { display: flex; flex-direction: column; gap: 6px; }
.cc-contact-item {
  display: flex; align-items: center; gap: 7px;
  font-size: .82rem; color: var(--text, #444);
  text-decoration: none;
}
.cc-contact--phone:hover, .cc-contact--link:hover { text-decoration: underline; }
.cc-contact-icon { font-size: .78rem; }

.cc-notes {
  margin-top: 10px;
  font-size: .78rem;
  color: var(--secondary, #888);
  font-style: italic;
  padding-top: 10px;
  border-top: 1px solid var(--border, #eeeeee);
  white-space: pre-line;
}
</style>
