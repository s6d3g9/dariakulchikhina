<template>
  <div class="cw-root">
    <div v-if="pending" class="cw-loading"><div class="cw-loading-bar"></div></div>

    <template v-else-if="project">

      <!-- Hero -->
      <section class="cw-hero">
        <div class="cw-hero-badge glass-chip">{{ phaseLabel }}</div>
        <h1 class="cw-hero-title">{{ project.title }}</h1>
        <p class="cw-hero-sub">Личный кабинет · Дизайн-студия Дарьи Кульчихиной</p>

        <!-- Phase progress -->
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
      </section>

      <!-- Nav cards -->
      <section class="cw-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.slug"
          :to="`/client/${project.slug}/${item.slug}`"
          class="cw-nav-card glass-card"
        >
          <span class="cw-nav-icon">{{ item.icon }}</span>
          <div class="cw-nav-text">
            <span class="cw-nav-title">{{ item.title }}</span>
            <span class="cw-nav-desc">{{ item.desc }}</span>
          </div>
          <span class="cw-nav-arrow">→</span>
        </NuxtLink>
      </section>

      <!-- Project info -->
      <section class="cw-info-row glass-surface" v-if="hasInfo">
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
      </section>

    </template>
    <div v-else class="cw-not-found">Проект не найден</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const { data: project, pending } = await useFetch<any>(`/api/projects/${route.params.slug}`)

const phases = [
  { key: 'lead',            label: 'Инициация'     },
  { key: 'concept',         label: 'Эскиз'         },
  { key: 'working_project', label: 'Проект'         },
  { key: 'procurement',     label: 'Закупки'       },
  { key: 'construction',    label: 'Стройка'       },
  { key: 'commissioning',   label: 'Сдача'         },
  { key: 'completed',       label: 'Готово'        },
]

const currentPhaseIndex = computed(() =>
  phases.findIndex(p => p.key === project.value?.status)
)
const phaseLabel = computed(() =>
  phases.find(p => p.key === project.value?.status)?.label || 'Инициация'
)
function phaseIndex(key: string) {
  return phases.findIndex(p => p.key === key)
}

const ALL_PAGES = [
  { slug: 'phase_init',      title: 'Старт проекта',    desc: 'Знакомство, бриф, обмеры, договор', icon: '◉' },
  { slug: 'self_profile',    title: 'Мои данные',       desc: 'Анкета и личная информация',      icon: '◎' },
  { slug: 'design_timeline', title: 'Ход проекта',      desc: 'Этапы, команда и контакты',       icon: '◈' },
  { slug: 'design_album',    title: 'Альбом проекта',   desc: 'Дизайн-проект и визуализации',    icon: '▣' },
  { slug: 'contracts',       title: 'Документы',        desc: 'Договор, счета и акты',           icon: '◻' },
  { slug: 'work_status',     title: 'Статусы работ',    desc: 'Ход выполнения задач',            icon: '◷' },
  { slug: 'project_roadmap', title: 'Дорожная карта',   desc: 'Этапы и сроки',                  icon: '◈' },
  { slug: 'materials',       title: 'Материалы',        desc: 'Отделочные материалы',            icon: '◫' },
  { slug: 'tz',              title: 'ТЗ',               desc: 'Техническое задание',             icon: '◧' },
  { slug: 'profile_contractors', title:'Подрядчики',    desc: 'Команда проекта',                 icon: '◑' },
]

const navItems = computed(() => {
  const pages = project.value?.pages || []
  return ALL_PAGES.filter(p => pages.includes(p.slug))
})

const hasInfo = computed(() => {
  const pf = project.value?.profile
  return pf && (pf.contract_number || pf.deadline || pf.objectAddress || pf.objectArea)
})
</script>

<style scoped>
.cw-root { padding: 8px 0 24px; }
.cw-loading { padding: 40px 0; }
.cw-loading-bar { height: 2px; width: 60px; background: var(--c-border, #e8e8e4); animation: cw-bar .9s ease infinite alternate; }
@keyframes cw-bar { to { width: 140px; opacity:.4; } }

/* Hero */
.cw-hero { padding: 32px 0 36px; margin-bottom: 36px; }
.cw-hero-badge {
  display: inline-flex; align-items: center;
  font-size: .62rem; letter-spacing: 2px; text-transform: uppercase;
  padding: 3px 12px; margin-bottom: 16px; border-radius: 999px;
}
.cw-hero-title { font-size: 1.9rem; font-weight: 300; letter-spacing: -.5px; color: var(--glass-text); margin: 0 0 8px; }
.cw-hero-sub   { font-size: .76rem; color: var(--glass-text); opacity: .45; letter-spacing: .5px; margin: 0 0 28px; }

/* Phases */
.cw-phases { display: flex; align-items: flex-start; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.cw-phases::-webkit-scrollbar { display: none; }
.cw-phase-item { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 72px; position: relative; }
.cw-phase-item:not(:last-child)::after {
  content: ''; position: absolute; top: 5px; left: calc(50% + 7px); right: calc(-50% + 7px);
  height: 1px; background: var(--glass-border);
}
.cw-phase-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--glass-border); background: var(--glass-bg); position: relative; z-index: 1; }
.cw-phase-label { font-size: .56rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .35; text-align: center; line-height: 1.2; }
.cw-phase--done .cw-phase-dot    { background: var(--glass-text); border-color: var(--glass-text); }
.cw-phase--done::after            { background: var(--glass-text) !important; }
.cw-phase--done .cw-phase-label  { opacity: .45; }
.cw-phase--active .cw-phase-dot  { border-color: var(--glass-text); background: var(--glass-bg); box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 12%, transparent); }
.cw-phase--active .cw-phase-label { color: var(--glass-text); opacity: 1; font-weight: 600; }

/* Nav cards */
.cw-nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-bottom: 28px; }
.cw-nav-card {
  display: flex; align-items: center; gap: 14px; padding: 18px 20px;
  text-decoration: none; color: var(--glass-text);
  border-radius: 14px;
  transition: transform .18s ease, box-shadow .18s ease;
}
.cw-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(18,18,18,.12);
}
.cw-nav-icon  { font-size: 1rem; color: var(--glass-text); opacity: .3; flex-shrink: 0; }
.cw-nav-text  { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cw-nav-title { font-size: .84rem; font-weight: 500; }
.cw-nav-desc  { font-size: .71rem; color: var(--glass-text); opacity: .5; }
.cw-nav-arrow { font-size: .9rem; color: var(--glass-text); opacity: .25; }

/* Info row */
.cw-info-row  { display: flex; flex-wrap: wrap; border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
.cw-info-block { padding: 16px 22px; flex: 1; min-width: 140px; border-right: 1px solid var(--glass-border); }
.cw-info-block:last-child { border-right: none; }
.cw-info-lbl  { font-size: .6rem; text-transform: uppercase; letter-spacing: 1px; color: var(--glass-text); opacity: .4; margin-bottom: 4px; }
.cw-info-val  { font-size: .83rem; color: var(--glass-text); }
.cw-not-found { font-size: .86rem; color: var(--glass-text); opacity: .4; padding: 48px 0; text-align: center; }

@media (max-width: 640px) {
  .cw-hero-title { font-size: 1.3rem; }
  .cw-nav { grid-template-columns: 1fr; }
  .cw-info-row { flex-direction: column; }
  .cw-info-block { border-right: none; border-bottom: 1px solid var(--c-border, #e8e8e4); }
  .cw-info-block:last-child { border-bottom: none; }
}
</style>