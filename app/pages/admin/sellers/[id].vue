<template>
  <div>
    <div v-if="pending && !seller" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 5" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 4" :key="i"/></div>
    </div>

    <div v-else-if="error || !seller" class="sl-not-found">
      <NuxtLink to="/admin/sellers" class="a-btn-sm">← к поставщикам</NuxtLink>
      <span>Поставщик не найден</span>
    </div>

    <template v-else>
      <!-- Breadcrumb -->
      <div class="sl-breadcrumb">
        <NuxtLink to="/admin/sellers" class="sl-bc-link">← Поставщики</NuxtLink>
        <span class="sl-bc-sep">/</span>
        <span class="sl-bc-cur">{{ seller.name }}</span>
        <div class="sl-bc-actions">
          <button class="a-btn-sm a-btn-danger" @click="deleteSeller">× удалить</button>
        </div>
      </div>

      <AdminSellerCabinet :seller-id="id" />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const route  = useRoute()
const router = useRouter()
const id     = parseInt(route.params.id as string)

const { data: seller, pending, error } = await useFetch<any>(`/api/sellers/${id}`, { server: false })

async function deleteSeller() {
  if (!confirm(`Удалить поставщика «${seller.value?.name}»?`)) return
  await $fetch(`/api/sellers/${id}`, { method: 'DELETE' })
  router.push('/admin/sellers')
}
</script>

<style scoped>
.sl-not-found { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; opacity: .6; }
.sl-breadcrumb { display: flex; align-items: center; gap: 8px; padding: 8px 0 16px; font-size: .8rem; }
.sl-bc-link { color: inherit; opacity: .5; text-decoration: none; }
.sl-bc-link:hover { opacity: .8; }
.sl-bc-sep { opacity: .3; }
.sl-bc-cur { font-weight: 600; }
.sl-bc-actions { margin-left: auto; }
</style>
