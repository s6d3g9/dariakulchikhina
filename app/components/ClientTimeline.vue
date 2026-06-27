<template>
  <div class="ctl-root">
    <div v-if="teamPending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Section: Team -->
      <section class="ctl-section" v-if="teamMembers.length">
        <div class="ctl-section-header">
          <span class="ctl-section-title">Команда проекта</span>
          <span class="ctl-team-count">{{ teamMembers.length }} {{ noun(teamMembers.length, 'участник', 'участника', 'участников') }}</span>
        </div>

        <div class="ctl-team-grid">
          <div v-for="c in teamMembers" :key="c.id" class="ctl-team-card">
            <div class="ctl-avatar">
              <span class="ctl-avatar-letter">{{ c.avatarInitial || '?' }}</span>
            </div>
            <div class="ctl-team-info">
              <div class="ctl-team-name">{{ c.displayName }}</div>
              <div v-if="c.secondaryName" class="ctl-team-company">{{ c.secondaryName }}</div>
              <div v-if="c.roleLabels.length" class="ctl-work-types">
                <span v-for="role in c.roleLabels.slice(0, 2)" :key="role" class="ctl-wt-chip ctl-wt-chip--role">
                  {{ role }}
                </span>
              </div>
              <div v-if="c.workTypeLabels.length" class="ctl-work-types">
                <span v-for="wt in c.workTypeLabels.slice(0, 3)" :key="wt" class="ctl-wt-chip">
                  {{ wt }}
                </span>
                <span v-if="c.workTypeLabels.length > 3" class="ctl-wt-chip ctl-wt-more">
                  +{{ c.workTypeLabels.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-else class="ctl-no-team">
        Специалисты ещё не назначены
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApiV1ClientProjectTeam, ApiV1Envelope } from '~~/shared/types/api-v1'

const props = defineProps<{ slug: string }>()

const reqHeaders = useRequestHeaders(['cookie'])
const { data: teamEnvelope, pending: teamPending } = await useFetch<ApiV1Envelope<ApiV1ClientProjectTeam>>(
  () => `/api/v1/client/projects/${props.slug}/team`,
  { headers: reqHeaders }
)

const teamMembers = computed(() => teamEnvelope.value?.data.members || [])

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
.ctl-section-title { font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent)); }
.ctl-phase-badge {
  font-size: .62rem; padding: 2px 10px; letter-spacing: .5px;
  border: 1px solid var(--c-border, #e8e8e4); color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent));
}
.ctl-team-count { font-size: .7rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 65%, transparent)); margin-left: auto; }

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
.ctl-dot--done       { border-color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); background: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); color: var(--c-bg, #fff); }
.ctl-dot--in_progress { border-color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); background: var(--c-bg, #fff); color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }
.ctl-dot--pending    { border-color: var(--c-border, color-mix(in srgb, var(--glass-text) 88%, transparent)); color: var(--c-muted, color-mix(in srgb, var(--glass-text) 80%, transparent)); }
.ctl-dot--skipped    { border-color: var(--c-border, color-mix(in srgb, var(--glass-text) 88%, transparent)); opacity: .4; }
.ctl-track-line { flex: 1; width: 1px; background: var(--c-border, #e8e8e4); min-height: 32px; }
.ctl-line--done { background: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }

/* Content */
.ctl-stage-content { flex: 1; padding: 2px 0 28px; }
.ctl-stage-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.ctl-stage-name { font-size: .88rem; font-weight: 500; color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }
.ctl-status-pill {
  font-size: .62rem; padding: 2px 9px; border-radius: 1px;
  text-transform: uppercase; letter-spacing: .4px;
}
.ctl-pill--done       { background: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); color: var(--c-bg, #fff); }
.ctl-pill--in_progress { background: transparent; border: 1px solid var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); }
.ctl-pill--pending    { background: var(--c-bg2, #f8f8f7); color: var(--c-muted, color-mix(in srgb, var(--glass-text) 65%, transparent)); }
.ctl-pill--skipped    { opacity: .5; background: var(--c-bg2, #f8f8f7); color: var(--c-muted, color-mix(in srgb, var(--glass-text) 65%, transparent)); }

.ctl-stage-meta { display: flex; align-items: center; gap: 4px; font-size: .72rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 65%, transparent)); margin-bottom: 6px; }
.ctl-meta-icon { opacity: .5; }
.ctl-stage-desc { font-size: .8rem; color: var(--c-text, color-mix(in srgb, var(--glass-text) 30%, transparent)); margin: 0 0 4px; line-height: 1.55; }
.ctl-stage-note { font-size: .75rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent)); margin: 0; font-style: italic; }

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
.ctl-avatar-letter { font-size: .9rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent)); font-weight: 500; text-transform: uppercase; }
.ctl-team-info { flex: 1; }
.ctl-team-name { font-size: .88rem; font-weight: 500; color: var(--c-text, color-mix(in srgb, var(--glass-text) 10%, transparent)); margin-bottom: 2px; }
.ctl-team-company { font-size: .74rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent)); margin-bottom: 8px; }

/* Work types */
.ctl-work-types { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.ctl-wt-chip {
  font-size: .62rem; padding: 2px 8px; border: 1px solid var(--c-border, #e8e8e4);
  color: var(--c-muted, color-mix(in srgb, var(--glass-text) 55%, transparent));
}
.ctl-wt-chip--role { color: var(--c-text, color-mix(in srgb, var(--glass-text) 20%, transparent)); }
.ctl-wt-more { background: var(--c-bg2, #f8f8f7); }

.ctl-empty, .ctl-no-team { font-size: .82rem; color: var(--c-muted, color-mix(in srgb, var(--glass-text) 65%, transparent)); padding: 24px 0; }

@media (max-width: 640px) {
  .ctl-team-grid { grid-template-columns: 1fr; }
}
</style>
