export interface SkillBundle {
  readonly id: string
  readonly label: string
  readonly purpose: string
}

export interface MessengerProjectSkill {
  projectId: string
  skillId: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function useMessengerSkills(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const bundles = useState<SkillBundle[]>('messenger-skill-bundles', () => [])
  const projectSkills = useState<MessengerProjectSkill[]>('messenger-project-skills', () => [])
  const pending = useState<boolean>('messenger-skills-pending', () => false)

  const enabledSkillIds = computed(() =>
    new Set(projectSkills.value.filter(s => s.enabled).map(s => s.skillId)),
  )

  function isEnabled(skillId: string) {
    return enabledSkillIds.value.has(skillId)
  }

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const [bundlesRes, skillsRes] = await Promise.all([
        api.listSkillBundles(),
        api.listProjectSkills(projectId.value),
      ])
      bundles.value = bundlesRes.bundles as SkillBundle[]
      projectSkills.value = skillsRes.skills
    }
    finally {
      pending.value = false
    }
  }

  async function toggle(skillId: string) {
    if (!projectId.value) return
    if (isEnabled(skillId)) {
      await api.deleteProjectSkill(projectId.value, skillId)
      projectSkills.value = projectSkills.value.filter(s => s.skillId !== skillId)
    }
    else {
      const res = await api.upsertProjectSkill(projectId.value, skillId, { enabled: true })
      const existing = projectSkills.value.find(s => s.skillId === skillId)
      if (existing) {
        projectSkills.value = projectSkills.value.map(s => s.skillId === skillId ? res.skill : s)
      }
      else {
        projectSkills.value = [...projectSkills.value, res.skill]
      }
    }
  }

  return { bundles, projectSkills, pending, enabledSkillIds, isEnabled, refresh, toggle }
}
