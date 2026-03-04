<template>
  <div class="pg-root">
    <h1 style="font-size:.82rem;font-weight:500;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px" :style="{color: 'var(--pg-h1-color)'}">страницы</h1>

    <div v-for="(p, i) in pages" :key="i" class="pg-card">
      <div class="pg-row">
        <label class="pg-lbl">slug:</label>
        <input v-model="p.slug" class="glass-input" type="text">
      </div>
      <div class="pg-row">
        <label class="pg-lbl">название:</label>
        <input v-model="p.title" class="glass-input" type="text">
      </div>
      <div class="pg-row">
        <label class="pg-lbl">заголовок:</label>
        <input v-model="p.pageTitle" class="glass-input" type="text" placeholder="Заголовок страницы">
      </div>
      <div class="pg-row">
        <label class="pg-lbl">шрифт (px):</label>
        <input v-model.number="p.fontSize" class="glass-input" type="number" min="10" max="28" step="1" style="max-width:90px">
      </div>
      <div style="text-align:right;margin-top:8px">
        <button class="a-btn-sm a-btn-danger" @click="removePage(i)">удалить страницу</button>
      </div>
    </div>

    <button class="pg-btn-add" @click="addPage">+ новая страница</button>

    <div class="pg-actions">
      <p v-if="error" style="color:var(--ds-error, #c00);font-size:.8rem">{{ error }}</p>
      <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

type PageCfg = {
  slug: string
  title: string
  pageTitle?: string
  fontSize: number
  sortOrder: number
}

const pages = ref<PageCfg[]>([])
const saving = ref(false)
const error = ref('')

const { data, refresh } = await useFetch<PageCfg[]>('/api/page-configs', { server: false })

watch(data, (v) => {
  pages.value = (v || []).map((p, idx) => ({
    slug: p.slug,
    title: p.title,
    pageTitle: p.pageTitle || '',
    fontSize: p.fontSize ?? 16,
    sortOrder: p.sortOrder ?? idx,
  }))
}, { immediate: true })

function addPage() {
  pages.value.push({
    slug: `page_${pages.value.length + 1}`,
    title: `страница ${pages.value.length + 1}`,
    pageTitle: '',
    fontSize: 16,
    sortOrder: pages.value.length,
  })
}

function removePage(index: number) {
  pages.value.splice(index, 1)
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = pages.value.map((p, index) => ({
      slug: p.slug.trim(),
      title: p.title.trim(),
      pageTitle: (p.pageTitle || '').trim(),
      fontSize: Number.isFinite(Number(p.fontSize)) ? Number(p.fontSize) : 16,
      sortOrder: index,
    })).filter(p => p.slug && p.title)

    if (payload.length === 0) {
      error.value = 'Добавьте хотя бы одну страницу'
      return
    }

    await $fetch('/api/page-configs', {
      method: 'PUT',
      body: { pages: payload },
    })

    await refresh()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pg-root {
  --pg-bg: var(--glass-bg, #fff);
  --pg-border: var(--glass-border, #e0e0e0);
  --pg-lbl: var(--ds-muted, #888);
  --pg-inp-border: color-mix(in srgb, var(--glass-text) 15%, transparent);
  --pg-inp-focus: var(--glass-text, #1a1a1a);
  --pg-inp-color: inherit;
  --pg-add-border: color-mix(in srgb, var(--glass-text) 20%, transparent);
  --pg-add-color: var(--ds-muted, #888);
  --pg-add-hover-color: var(--glass-text, #1a1a1a);
  --danger-color: var(--ds-error, #c00);
  --pg-h1-color: var(--ds-muted, #666);
}
.pg-card {
  --pg-bg: var(--glass-bg, #fff);
  --pg-border: var(--glass-border, #e0e0e0);
  --pg-lbl: var(--ds-muted, #888);
  --pg-inp-border: color-mix(in srgb, var(--glass-text) 15%, transparent);
  --pg-inp-focus: var(--glass-text, #1a1a1a);
  --pg-inp-color: inherit;
  --pg-add-border: color-mix(in srgb, var(--glass-text) 20%, transparent);
  --pg-add-color: var(--ds-muted, #888);
  --pg-add-hover-border: var(--glass-text, #1a1a1a);
  --pg-add-hover-color: var(--glass-text, #1a1a1a);
  --danger-color: var(--ds-error, #c00);

  background: color-mix(in srgb, var(--glass-bg) 90%, transparent);
  border: none;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
.pg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pg-lbl {
  width: 90px;
  font-size: .78rem;
  color: var(--pg-lbl);
  flex-shrink: 0;
}
.pg-btn-add {
  border: none;
  background: color-mix(in srgb, var(--glass-bg) 92%, transparent);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: .82rem;
  cursor: pointer;
  font-family: inherit;
  color: var(--pg-add-color);
  width: 100%;
  margin-top: 8px;
}
.pg-btn-add:hover { border-color: var(--pg-add-hover-border); color: var(--pg-add-hover-color); }
.pg-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.a-btn-danger { color: var(--danger-color); }
.a-btn-danger:hover { background: #c00; color: #fff; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .pg-card { padding: 14px; }
  .pg-row {
    flex-direction: column;
    gap: 4px;
    align-items: stretch;
  }
  .pg-lbl { width: auto; }
  .pg-actions {
    flex-direction: column;
    gap: 8px;
  }
  .pg-actions .a-btn-save { width: 100%; }
}
</style>
