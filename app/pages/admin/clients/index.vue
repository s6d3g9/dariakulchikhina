<template>
  <div>
    <div class="a-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;margin-bottom:16px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">клиенты</span>
    </div>

    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else-if="!clients?.length" style="font-size:.88rem;color:#999;padding:12px 0">
      Клиенты появятся здесь — они привязаны к проектам
    </div>
    <div v-else>
      <div
        v-for="c in clients"
        :key="c.slug"
        class="a-card"
        style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;margin-bottom:8px"
      >
        <div>
          <div style="font-size:.9rem;font-weight:500;color:var(--text,#1a1a1a);margin-bottom:3px">{{ c.title }}</div>
          <div style="font-size:.76rem;color:#aaa;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap">
            <span>{{ c.slug }}</span>
            <span v-if="c.profile?.client_name">{{ c.profile.client_name }}</span>
            <span v-if="c.profile?.client_phone">{{ c.profile.client_phone }}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a
            :href="`/api/auth/client-open?projectSlug=${encodeURIComponent(c.slug)}`"
            target="_blank"
            class="a-btn-sm"
            style="text-decoration:none"
          >кабинет клиента ↗</a>
          <NuxtLink :to="`/admin/projects/${c.slug}`">
            <button class="a-btn-sm">открыть проект</button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: clients, pending } = await useFetch<any[]>('/api/projects')
</script>
