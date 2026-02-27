<template>
  <div class="ctl-root">
    <div v-if="stagePending || teamPending" class="ctl-loading">
      <div class="ctl-loading-bar"></div>
    </div>
    <template v-else>

      <!-- Section: Timeline -->
      <section class="ctl-section">
        <div class="ctl-section-header">
          <span class="ctl-section-title">Этапы проекта</span>
          <span class="ctl-phase-badge">{{ currentPhaseName }}</span>
        </div>

        <div class="ctl-timeline" v-if="stages?.length">
          <div
            v-for="(stage, idx) in stages"
            :key="stage.id"
            class="ctl-stage"
            :class="`ctl-stage--${stage.status}`"
          >
            <!-- Left: status dot + line -->
            <div class="ctl-stage-track">
              <div class="ctl-track-dot" :class="`ctl-dot--${stage.status}`">
                <span class="ctl-dot-inner">{{ statusIcon(stage.status) }}</span>
              </div>
              <div v-if="idx < stages.length - 1" class="ctl-track-line" :class="stage.status === 'done' ? 'ctl-line--done' : ''"></div>
            </div>

            <!-- Right: content -->
            <div class="ctl-stage-content">
              <div class="ctl-stage-head">
                <span class="ctl-stage-name">{{ stage.title }}</span>
                <span class="ctl-status-pill" :class="`ctl-pill--${stage.status}`">
                  {{ statusLabel(stage.status) }}
                </span>
              </div>

              <div class="ctl-stage-meta" v-if="stage.dateStart || stage.dateEnd">
                <span v-if="stage.dateStart" class="ctl-meta-item">
                  <span class="ctl-meta-icon">◷</span> {{ fmtDate(stage.dateStart) }}
                </span>
                <span v-if="stage.dateEnd" class="ctl-meta-item">
                  — {{ fmtDate(stage.dateEnd) }}
                </span>
              </div>

              <p v-if="stage.description" class="ctl-stage-desc">{{ stage.description }}</p>
              <p v-if="stage.notes && stage.status === 'in_progress'" class="ctl-stage-note">{{ stage.notes }}</p>
            </div>
          </div>
        </div>
        <div v-else class="ctl-empty">Дорожная карта ещё не заполнена</div>
      </section>

      <!-- Section: Team -->
      <section class="ctl-section" v-if="contractors?.length">
        <div class="ctl-section-header">
          <span class="ctl-section-title">Команда проекта</span>
          <span class="ctl-team-count">{{ contractors.length }} {{ noun(contractors.length, 'специалист', 'специалиста', 'специалистов') }}</span>
        </div>

        <div class="ctl-team-grid">
          <div v-for="c in contractors" :key="c.id" class="ctl-team-card">
            <!-- Avatar -->
            <div class="ctl-avatar">
              <span class="ctl-avatar-letter">{{ c.name?.[0] || '?' }}</span>
            </div>
            <div class="ctl-team-info">
              <div class="ctl-team-name">{{ c.name }}</div>
              <div v-if="c.companyName" class="ctl-team-company">{{ c.companyName }}</div>

              <!-- Work types -->
              <div v-if="c.workTypes?.length" class="ctl-work-types">
                <span v-for="wt in c.workTypes.slice(0, 3)" :key="wt" class="ctl-wt-chip">
                  {{ workTypeLabel(wt) }}
                </span>
                <span v-if="c.workTypes.length > 3" class="ctl-wt-chip ctl-wt-more">
                  +{{ c.workTypes.length - 3 }}
                </span>
              </div>

              <!-- Contacts -->
              <div class="ctl-contacts">
                <a v-if="c.phone" :href="`tel:${c.phone}`" class="ctl-contact-btn ctl-contact-btn--phone">
                  📞 {{ c.phone }}
                </a>
                <a
                  v-if="c.messenger === 'WhatsApp' && c.phone"
                  :href="`https://wa.me/${c.phone.replace(/\D/g,'')}`"
                  target="_blank"
                  class="ctl-contact-btn ctl-contact-btn--wa"
                >
                  WhatsApp
                </a>
                <a
                  v-else-if="c.messenger === 'Telegram' && c.messengerNick"
                  :href="`https://t.me/${c.messengerNick.replace('@','')}`"
                  target="_blank"
                  class="ctl-contact-btn ctl-contact-btn--tg"
                >
                  Telegram
                </a>
                <a
                  v-else-if="c.messenger && c.messengerNick"
                  class="ctl-contact-btn ctl-contact-btn--msg"
                >
                  {{ c.messenger }}: {{ c.messengerNick }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Notice: no team -->
      <div v-else-if="!stagePending && !teamPending" class="ctl-no-team">
        Специалисты ещё не назначены
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string }>()

const { data: stages, pending: stagePending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/roadmap`
)
const { data: contractors, pending: teamPending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`
)
const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const currentPhaseName = computed(() =>
  PROJECT_PHASES.find(p => p.key === project.value?.status)?.label || ''
)

const WORK_TYPES: Record<string, string> = {
  demolition: 'Демонтаж', partition_installation: 'Перегородки',
  plastering: 'Штукатурка', puttying: 'Шпаклёвка', screed: 'Стяжка',
  waterproofing: 'Гидроизоляция', electrical_installation: 'Электрика',
  plumbing_installation: 'Сантехника', tile_installation: 'Укладка плитки',
  painting: 'Покраска', wallpapering: 'Поклейка обоев',
  ceiling_installation: 'Потолки', door_installation: 'Двери',
  floor_installation: 'Полы', hvac: 'Вентиляция', smart_home: 'Умный дом',
  furniture_installation: 'Мебель', final_cleaning: 'Уборка',
}

function workTypeLabel(wt: string) { return WORK_TYPES[wt] || wt }

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending: 'ожидание', in_progress: 'в работе', done: 'готово', skipped: 'пропущено'
  }
  return m[s] || s
}
function statusIcon(s: string) {
  const m: Record<string, string> = { pending: '○', in_progress: '◉', done: '✓', skipped: '—' }
  return m[s] || '○'
}
function fmtDate(d: string) {
  if (!d || d === 'null') return ''
  try { return new Date(d).toLocaleDateString('ru', { day: 'numeric', month: 'short' }) }
  catch { return d }
}
function noun(n: number, one: string, few: string, many: string) {
  const mod = n % 100 > 10 && n % 100 < 20 ? many : { 1: one, 2: few, 3: few, 4: few }[n % 10] || many
  return mod
}
</script>

<style scoped>
.ctl-root { padding: 4px 0 48px; }
.ctl-loading { padding: 40px 0; }
.ctl-loading-bar { height: 2px; width: 60px; background: var(--c-border, #e8e8e4); animation: ctl-b .9s ease infinite alternate; }
@keyframes ctl-b { to { width: 140px; opacity: .4; } }

/* Section */
.ctl-section { margin-bottom: 40px; }
.ctl-section-header {
  display: flex; align-items: baseline; gap: 12px;
  padding-bottom: 14px; margin-bottom: 24px;
  border-bottom: 1px solid var(--c-border, #e8e8e4);
}
.ctl-section-title { font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-muted, #888); }
.ctl-phase-badge {
  font-size: .62rem; padding: 2px 10px; letter-spacing: .5px;
  border: 1px solid var(--c-border, #e8e8e4); color: var(--c-muted, #888);
}
.ctl-team-count { font-size: .7rem; color: var(--c-muted, #aaa); margin-left: auto; }

/* Timeline */
.ctl-timeline { display: flex; flex-direction: column; }
.ctl-stage { display: flex; gap: 16px; padding-bottom: 2px; }

/* Track */
.ctl-stage-track {
  display: flex; flex-direction: column; align-items: center; gap: 0;
  flex-shrink: 0; width: 24px;
}
.ctl-track-dot {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--c-border, #e8e8e4);
  background: var(--c-bg, #fff); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; position: relative; z-index: 1;
}
.ctl-dot-inner { font-size: .62rem; line-height: 1; }
.ctl-dot--done       { border-color: var(--c-text, #1a1a1a); background: var(--c-text, #1a1a1a); color: var(--c-bg, #fff); }
.ctl-dot--in_progress { border-color: var(--c-text, #1a1a1a); background: var(--c-bg, #fff); color: var(--c-text, #1a1a1a); }
.ctl-dot--pending    { border-color: var(--c-border, #e0e0e0); color: var(--c-muted, #ccc); }
.ctl-dot--skipped    { border-color: var(--c-border, #e0e0e0); opacity: .4; }
.ctl-track-line { flex: 1; width: 1px; background: var(--c-border, #e8e8e4); min-height: 32px; }
.ctl-line--done { background: var(--c-text, #1a1a1a); }

/* Content */
.ctl-stage-content { flex: 1; padding: 2px 0 28px; }
.ctl-stage-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.ctl-stage-name { font-size: .88rem; font-weight: 500; color: var(--c-text, #1a1a1a); }
.ctl-status-pill {
  font-size: .62rem; padding: 2px 9px; border-radius: 1px;
  text-transform: uppercase; letter-spacing: .4px;
}
.ctl-pill--done       { background: var(--c-text, #1a1a1a); color: var(--c-bg, #fff); }
.ctl-pill--in_progress { background: transparent; border: 1px solid var(--c-text, #1a1a1a); color: var(--c-text, #1a1a1a); }
.ctl-pill--pending    { background: var(--c-bg2, #f8f8f7); color: var(--c-muted, #aaa); }
.ctl-pill--skipped    { opacity: .5; background: var(--c-bg2, #f8f8f7); color: var(--c-muted, #aaa); }

.ctl-stage-meta { display: flex; align-items: center; gap: 4px; font-size: .72rem; color: var(--c-muted, #aaa); margin-bottom: 6px; }
.ctl-meta-icon { opacity: .5; }
.ctl-stage-desc { font-size: .8rem; color: var(--c-text, #444); margin: 0 0 4px; line-height: 1.55; }
.ctl-stage-note { font-size: .75rem; color: var(--c-muted, #888); margin: 0; font-style: italic; }

/* Team grid */
.ctl-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1px; border: 1px solid var(--c-border, #e8e8e4); }
.ctl-team-card {
  display: flex; align-items: flex-start; gap: 14px; padding: 20px;
  background: var(--c-bg, #fff); border: 1px solid var(--c-border, #e8e8e4); margin: -1px;
}
.ctl-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--c-bg2, #f0f0f0); border: 1px solid var(--c-border, #e8e8e4);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ctl-avatar-letter { font-size: .9rem; color: var(--c-muted, #888); font-weight: 500; text-transform: uppercase; }
.ctl-team-info { flex: 1; }
.ctl-team-name { font-size: .88rem; font-weight: 500; color: var(--c-text, #1a1a1a); margin-bottom: 2px; }
.ctl-team-company { font-size: .74rem; color: var(--c-muted, #888); margin-bottom: 8px; }

/* Work types */
.ctl-work-types { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.ctl-wt-chip {
  font-size: .62rem; padding: 2px 8px; border: 1px solid var(--c-border, #e8e8e4);
  color: var(--c-muted, #888);
}
.ctl-wt-more { background: var(--c-bg2, #f8f8f7); }

/* Contacts */
.ctl-contacts { display: flex; flex-wrap: wrap; gap: 6px; }
.ctl-contact-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .74rem; padding: 5px 12px; text-decoration: none;
  border: 1px solid var(--c-border, #e8e8e4); cursor: pointer;
  color: var(--c-text, #333); transition: border-color .15s;
}
.ctl-contact-btn:hover { border-color: var(--c-text, #1a1a1a); }
.ctl-contact-btn--wa  { border-color: #25d366; color: #25d366; }
.ctl-contact-btn--wa:hover  { background: #25d36616; }
.ctl-contact-btn--tg  { border-color: #229ed9; color: #229ed9; }
.ctl-contact-btn--tg:hover  { background: #229ed916; }
.ctl-contact-btn--phone { }

.ctl-empty, .ctl-no-team { font-size: .82rem; color: var(--c-muted, #aaa); padding: 24px 0; }

@media (max-width: 640px) {
  .ctl-team-grid { grid-template-columns: 1fr; }
}
</style>
