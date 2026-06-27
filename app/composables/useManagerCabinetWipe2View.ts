import { computed, type Ref } from 'vue'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

type ManagerSummary = {
  name?: string | null
}

type LinkedProject = {
  projectName?: string | null
  title?: string | null
  status?: string | null
  address?: string | null
  role?: string | null
  projectSlug?: string | null
}

type UseManagerCabinetWipe2ViewOptions = {
  manager: Ref<ManagerSummary | null | undefined>
  linkedProjects: Ref<LinkedProject[] | null | undefined>
  activeProjectsCount: Ref<number>
  profilePct: Ref<number>
  section: Ref<string>
  form: {
    role: string
    phone: string
    email: string
    telegram: string
    city: string
    notes: string
  }
}

export function useManagerCabinetWipe2View(options: UseManagerCabinetWipe2ViewOptions) {
  const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
    const manager = options.manager.value
    if (!manager) return null

    const projects = options.linkedProjects.value || []
    const pending = projects.filter((project) => project.status === 'pending' || project.status === 'revision')
    const done = projects.filter((project) => project.status === 'done' || project.status === 'completed').length

    const allSections = [
      {
        title: 'Обзор',
        fields: [
          { label: 'Всего проектов', value: String(projects.length) },
          { label: 'Как лид', value: String(options.activeProjectsCount.value) },
          { label: 'Профиль заполнен', value: `${options.profilePct.value}%` },
          { label: 'Заметки', value: options.form.notes ? 'есть' : '—' },
        ],
      },
      {
        title: 'Проекты',
        fields: projects.length
          ? projects.slice(0, 6).map((project) => ({
              label: project.projectName ?? project.title ?? 'Проект',
              value: project.status ?? '',
              type: 'status' as const,
              span: 2 as const,
              description: project.address ?? '',
              badge: project.role || 'manager',
              caption: project.projectSlug || 'без slug',
              eyebrow: 'проект',
              tone: project.role === 'lead' ? 'accent' as const : 'default' as const,
            }))
          : [{ label: '', value: 'нет проектов', span: 2 as const }],
      },
      {
        title: 'Лента событий',
        fields: projects.slice(0, 5).length
          ? projects.slice(0, 5).map((project) => ({
              label: project.projectName ?? project.title ?? 'Событие',
              value: project.status ?? '',
              type: 'status' as const,
              span: 2 as const,
              description: project.address ?? 'операционный апдейт проекта',
              badge: project.role || 'update',
              caption: project.projectSlug || 'карточка проекта',
              eyebrow: 'лента',
              tone: 'default' as const,
            }))
          : [{ label: '', value: 'нет событий', span: 2 as const }],
      },
      {
        title: 'Согласования',
        fields: pending.length
          ? pending.slice(0, 6).map((project) => ({
              label: project.projectName ?? project.title ?? 'Согласование',
              value: project.status ?? '',
              type: 'status' as const,
              span: 2 as const,
              description: project.address ?? 'требует решения менеджера',
              badge: 'pending',
              caption: project.role || 'координация',
              eyebrow: 'approval',
              tone: 'accent' as const,
            }))
          : [{ label: '', value: 'нет ожидающих согласований', span: 2 as const }],
      },
      {
        title: 'Отчёты',
        fields: [
          { label: 'Всего проектов', value: String(projects.length) },
          { label: 'Завершено', value: String(done) },
          { label: 'В работе', value: String(projects.length - done) },
        ],
      },
      {
        title: 'Профиль',
        fields: [
          { label: 'Роль', value: options.form.role },
          { label: 'Телефон', value: options.form.phone },
          { label: 'Email', value: options.form.email },
          { label: 'Telegram', value: options.form.telegram },
          { label: 'Город', value: options.form.city },
          { label: 'Проектов', value: String(projects.length) },
          { label: 'Заметки', value: options.form.notes, type: 'multiline' as const, span: 2 as const },
        ],
      },
    ]

    const sectionMap: Record<string, string> = {
      projects: 'Проекты',
      feed: 'Лента событий',
      approvals: 'Согласования',
      reports: 'Отчёты',
      profile: 'Профиль',
    }

    const sectionTitle = sectionMap[options.section.value]

    return {
      entityTitle: manager.name,
      entitySubtitle: options.form.role || undefined,
      entityStatus: options.form.role ?? 'менеджер',
      entityStatusColor: 'blue' as const,
      sections: sectionTitle ? allSections.filter((section) => section.title === sectionTitle) : allSections,
    }
  })

  return {
    wipe2CabinetData,
  }
}