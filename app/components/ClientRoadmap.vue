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
.rm-wrap { padding: 14px; }

.rm-title {
  margin: 0 0 14px;
  font-size: .78rem;
  letter-spacing: .9px;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
}
.rm-empty { color: var(--glass-text); opacity: .35; font-size: .86rem; }

.rm-timeline { position: relative; }
.rm-line {
  position: absolute; left: 8px; top: 2px; bottom: 4px;
  width: 1px; background: var(--glass-border);
}
.rm-list { display: grid; gap: 10px; }
.rm-row { position: relative; display: flex; gap: 10px; }

.rm-dot {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  z-index: 1; flex-shrink: 0; margin-top: 3px;
  transition: border-color .2s, background .2s;
}
.rm-dot--pending  { border-color: var(--glass-border); }
.rm-dot--progress { border-color: rgba(220,160,60,.6); background: rgba(255,200,80,.12); }
.rm-dot--done     { border-color: rgba(60,160,100,.6); background: rgba(60,160,100,.1); }
.rm-dot--skipped  { border-color: var(--glass-border); opacity: .4; }

.rm-content {
  flex: 1;
  border-radius: 10px;
  padding: 10px 12px;
  min-width: 0;
}
.rm-stage-title { margin: 0; font-size: .88rem; color: var(--glass-text); font-weight: 500; }
.rm-desc { margin: 4px 0 0; color: var(--glass-text); opacity: .5; font-size: .8rem; line-height: 1.4; }
.rm-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.rm-date { color: var(--glass-text); opacity: .4; font-size: .74rem; }
.rm-status {
  font-size: .65rem; letter-spacing: .5px; text-transform: uppercase;
  padding: 2px 8px; border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.rm-status--pending, .rm-status--skipped { color: var(--glass-text); opacity: .4; }
.rm-status--progress { color: rgba(180,120,0,1); border-color: rgba(220,160,60,.4); background: rgba(255,200,80,.08); opacity: 1; }
.rm-status--done     { color: rgba(40,140,80,1); border-color: rgba(60,160,100,.4); background: rgba(60,160,100,.07); opacity: 1; }
.rm-notes { margin: 6px 0 2px; color: var(--glass-text); opacity: .45; font-size: .76rem; line-height: 1.42; }
</style>
