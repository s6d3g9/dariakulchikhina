<template>
  <div class="rm-wrap glass-card">
    <h2 class="rm-title">Дорожная карта</h2>
    <div v-if="pending" class="rm-empty">Загрузка...</div>
    <div v-else class="rm-timeline">
      <!-- Вертикальная линия -->
      <div class="rm-line"></div>
      <div class="rm-list">
        <div
          v-for="stage in stages"
          :key="stage.id"
          class="rm-row"
        >
          <!-- Точка -->
          <div
            class="rm-dot"
            :class="pointClass(stage.status)"
          ></div>
          <div class="rm-content glass-surface">
            <p class="rm-stage-title">{{ stage.title }}</p>
            <p v-if="stage.description" class="rm-desc">{{ stage.description }}</p>
            <div class="rm-meta">
              <span v-if="stage.dateStart" class="rm-date">{{ stage.dateStart }}</span>
              <span v-if="stage.dateEnd" class="rm-date">— {{ stage.dateEnd }}</span>
              <span class="rm-status" :class="statusTextClass(stage.status)">{{ statusLabel(stage.status) }}</span>
            </div>
            <p v-if="stage.notes" class="rm-notes">{{ stage.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: stages, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/roadmap`)

function pointClass(s: string) {
  const map: Record<string, string> = {
    pending: 'rm-dot--pending',
    in_progress: 'rm-dot--progress',
    done: 'rm-dot--done',
    skipped: 'rm-dot--skipped',
  }
  return map[s] || 'rm-dot--pending'
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'ожидание', in_progress: 'в работе', done: 'готово', skipped: 'пропущено'
  }
  return map[s] || s
}
function statusTextClass(s: string) {
  const map: Record<string, string> = {
    pending: 'rm-status--pending',
    in_progress: 'rm-status--progress',
    done: 'rm-status--done',
    skipped: 'rm-status--skipped'
  }
  return map[s] || 'rm-status--pending'
}
</script>

<style scoped>
.rm-wrap {
  --r-title: #666;
  --r-muted: #9a9a9a;
  --r-line: #e3e3e3;
  --r-dot-border: #cfcfcf;
  --r-dot-bg: #fff;
  --r-text: #1f1f1f;
  --r-soft: #7f7f7f;
  --r-progress-dot-border: #dfbf84;
  --r-progress-dot-bg: #fff7ea;
  --r-done-dot-border: #b8d8c1;
  --r-done-dot-bg: #f2faf4;
  --r-status-pending: #999;
  --r-status-progress: #8a5b00;
  --r-status-done: #2e6a3f;
  padding: 14px;
}


.rm-title {
  margin: 0 0 10px;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--r-title);
}
.rm-empty { color: var(--r-muted); font-size: .86rem; }
.rm-timeline { position: relative; }
.rm-line {
  position: absolute; left: 8px; top: 2px; bottom: 4px;
  width: 1px; background: var(--r-line);
}
.rm-list { display: grid; gap: 10px; }
.rm-row { position: relative; display: flex; gap: 10px; }
.rm-dot {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--r-dot-border);
  background: var(--r-dot-bg);
  z-index: 1; flex-shrink: 0; margin-top: 3px;
}
.rm-dot--pending { border-color: var(--r-dot-border); background: var(--r-dot-bg); }
.rm-dot--progress { border-color: var(--r-progress-dot-border); background: var(--r-progress-dot-bg); }
.rm-dot--done { border-color: var(--r-done-dot-border); background: var(--r-done-dot-bg); }
.rm-dot--skipped { border-color: var(--r-dot-border); background: var(--r-dot-bg); }
.rm-content {
  border-radius: 12px; border: 1px solid var(--r-line);
  padding: 8px 10px; padding-bottom: 2px;
}
.rm-stage-title { margin: 0; font-size: .88rem; color: var(--r-text); font-weight: 500; }
.rm-desc { margin: 4px 0 0; color: var(--r-soft); font-size: .8rem; line-height: 1.4; }
.rm-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.rm-date { color: var(--r-muted); font-size: .74rem; }
.rm-status { font-size: .68rem; letter-spacing: .5px; text-transform: uppercase; }
.rm-status--pending, .rm-status--skipped { color: var(--r-status-pending); }
.rm-status--progress { color: var(--r-status-progress); }
.rm-status--done { color: var(--r-status-done); }
.rm-notes { margin: 4px 0 0; color: var(--r-soft); font-size: .76rem; line-height: 1.42; }
</style>
