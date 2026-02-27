<template>
  <div class="cw-root">
    <div v-if="pending" class="cw-loading"><div class="cw-loading-bar"></div></div>

    <template v-else-if="project">

      <!-- Hero -->
      <div class="cw-hero">
        <h1 class="cw-hero-title">{{ project.title }}</h1>
        <p class="cw-hero-sub">Личный кабинет · Дизайн-студия Дарьи Кульчихиной</p>
      </div>

      <!-- Phase progress -->
      <div class="cw-phases-wrap glass-surface">
        <div class="cw-phases-label">Этап проекта</div>
        <div class="cw-phases">
          <div
            v-for="phase in phases"
            :key="phase.key"
            class="cw-phase-item"
            :class="{
              'cw-phase--done':   phaseIndex(phase.key) < currentPhaseIndex,
              'cw-phase--active': phase.key === project.status,
              'cw-phase--future': phaseIndex(phase.key) > currentPhaseIndex,
            }"
          >
            <div class="cw-phase-dot"></div>
            <span class="cw-phase-label">{{ phase.label }}</span>
          </div>
        </div>
      </div>

      <!-- Project info -->
      <div class="cw-info-row glass-surface" v-if="hasInfo">
        <div v-if="project.profile?.contract_number" class="cw-info-block">
          <div class="cw-info-lbl">Договор</div>
          <div class="cw-info-val">{{ project.profile.contract_number }}</div>
        </div>
        <div v-if="project.profile?.deadline" class="cw-info-block">
          <div class="cw-info-lbl">Срок сдачи</div>
          <div class="cw-info-val">{{ project.profile.deadline }}</div>
        </div>
        <div v-if="project.profile?.objectAddress" class="cw-info-block">
          <div class="cw-info-lbl">Адрес объекта</div>
          <div class="cw-info-val">{{ project.profile.objectAddress }}</div>
        </div>
        <div v-if="project.profile?.objectArea" class="cw-info-block">
          <div class="cw-info-lbl">Площадь</div>
          <div class="cw-info-val">{{ project.profile.objectArea }} м²</div>
        </div>
        <div v-if="project.profile?.client_name" class="cw-info-block">
          <div class="cw-info-lbl">Клиент</div>
          <div class="cw-info-val">{{ project.profile.client_name }}</div>
        </div>
      </div>

      <!-- Manager contact -->
      <div v-if="project.profile?.manager_name || project.profile?.manager_phone" class="cw-manager glass-card">
        <div class="cw-manager-lbl">Ваш менеджер</div>
        <div class="cw-manager-name">{{ project.profile.manager_name }}</div>
        <div v-if="project.profile.manager_phone" class="cw-manager-phone">{{ project.profile.manager_phone }}</div>
      </div>

    </template>
    <div v-else class="cw-not-found">Проект не найден</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const { data: project, pending } = await useFetch<any>(`/api/projects/${route.params.slug}`)

const phases = [
  { key: 'lead',            label: 'Инициация'  },
  { key: 'concept',         label: 'Эскиз'      },
  { key: 'working_project', label: 'Проект'     },
  { key: 'procurement',     label: 'Закупки'    },
  { key: 'construction',    label: 'Стройка'    },
  { key: 'commissioning',   label: 'Сдача'      },
  { key: 'completed',       label: 'Готово'     },
]
const currentPhaseIndex = computed(() =>
  phases.findIndex(p => p.key === project.value?.status)
)
function phaseIndex(key: string) {
  return phases.findIndex(p => p.key === key)
}
const hasInfo = computed(() => {
  const pf = project.value?.profile
  return pf && (pf.contract_number || pf.deadline || pf.objectAddress || pf.objectArea || pf.client_name)
})
</script>

<style scoped>
.cw-root { display: flex; flex-direction: column; gap: 16px; }
.cw-loading { padding: 40px 0; }
.cw-loading-bar { height: 2px; width: 60px; background: var(--glass-border); animation: cw-bar .9s ease infinite alternate; }
@keyframes cw-bar { to { width: 140px; opacity:.4; } }

.cw-hero { padding: 8px 0 12px; }
.cw-hero-title { font-size: 1.8rem; font-weight: 300; letter-spacing: -.5px; color: var(--glass-text); margin: 0 0 6px; }
.cw-hero-sub   { font-size: .74rem; color: var(--glass-text); opacity: .4; letter-spacing: .5px; margin: 0; }

/* Phase progress */
.cw-phases-wrap {
  padding: 16px 20px; border-radius: 14px;
}
.cw-phases-label {
  font-size: .64rem; text-transform: uppercase; letter-spacing: 1px;
  color: var(--glass-text); opacity: .4; margin-bottom: 14px;
}
.cw-phases {
  display: flex; align-items: flex-start; overflow-x: auto;
  padding-bottom: 2px; scrollbar-width: none;
}
.cw-phases::-webkit-scrollbar { display: none; }
.cw-phase-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  min-width: 72px; position: relative;
}
.cw-phase-item:not(:last-child)::after {
  content: ''; position: absolute; top: 5px;
  left: calc(50% + 7px); right: calc(-50% + 7px);
  height: 1px; background: var(--glass-border);
}
.cw-phase-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--glass-border); background: var(--glass-bg); position: relative; z-index: 1; }
.cw-phase-label { font-size: .55rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .3; text-align: center; line-height: 1.2; }
.cw-phase--done .cw-phase-dot   { background: var(--glass-text); border-color: var(--glass-text); }
.cw-phase--done::after          { background: var(--glass-text) !important; }
.cw-phase--active .cw-phase-dot { background: var(--glass-text); border-color: var(--glass-text); box-shadow: 0 0 0 3px rgba(0,0,0,.1); }
.cw-phase--active .cw-phase-label { opacity: .9; font-weight: 600; }
.cw-phase--future .cw-phase-label { opacity: .25; }

/* Info row */
.cw-info-row {
  display: flex; flex-wrap: wrap; gap: 20px;
  padding: 16px 20px; border-radius: 14px;
}
.cw-info-block { display: flex; flex-direction: column; gap: 3px; }
.cw-info-lbl { font-size: .63rem; text-transform: uppercase; letter-spacing: .8px; color: var(--glass-text); opacity: .4; }
.cw-info-val { font-size: .85rem; color: var(--glass-text); }

/* Manager card */
.cw-manager { padding: 16px 20px; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; }
.cw-manager-lbl   { font-size: .63rem; text-transform: uppercase; letter-spacing: .8px; color: var(--glass-text); opacity: .4; }
.cw-manager-name  { font-size: .88rem; color: var(--glass-text); font-weight: 500; }
.cw-manager-phone { font-size: .8rem;  color: var(--glass-text); opacity: .55; }

.cw-not-found { padding: 60px 0; text-align: center; opacity: .4; font-size: .82rem; letter-spacing: .5px; }
</style>
