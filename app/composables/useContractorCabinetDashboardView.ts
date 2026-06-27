import { computed, type Ref } from 'vue'

type ContractorSummary = {
  contractorType?: 'company' | 'master' | string | null
  city?: string | null
}

type ContractorDashboardFact = {
  label: string
  value: string
}

type UseContractorCabinetDashboardViewOptions = {
  contractor: Ref<ContractorSummary | null | undefined>
  section: Ref<string>
  profilePct: Ref<number>
  activeCount: Ref<number>
  linkedProjects: Ref<unknown[] | null | undefined>
  contractorDocs: Ref<unknown[] | null | undefined>
  isBrutalistContractorCabinetMode: Ref<boolean>
}

export function useContractorCabinetDashboardView(options: UseContractorCabinetDashboardViewOptions) {
  const showBrutalistContractorDashboardHero = computed(() => (
    options.isBrutalistContractorCabinetMode.value && options.section.value === 'dashboard'
  ))

  const contractorHeroSubtitle = computed(() => {
    const type = options.contractor.value?.contractorType === 'company' ? 'подрядчик / компания' : 'мастер'
    const city = options.contractor.value?.city ? ` · ${options.contractor.value.city}` : ''
    return `${type}${city}`
  })

  const contractorDashboardFacts = computed<ContractorDashboardFact[]>(() => [
    { label: 'профиль', value: `${options.profilePct.value}%` },
    { label: 'активные задачи', value: String(options.activeCount.value) },
    { label: 'проекты', value: String(options.linkedProjects.value?.length || 0) },
    { label: 'документы', value: String(options.contractorDocs.value?.length || 0) },
  ])

  return {
    showBrutalistContractorDashboardHero,
    contractorHeroSubtitle,
    contractorDashboardFacts,
  }
}