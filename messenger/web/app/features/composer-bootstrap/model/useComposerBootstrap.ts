export interface BootstrapProposalConnector {
  type: string
  label: string
  config: Record<string, unknown>
}

export interface BootstrapProposalAgent {
  name: string
  type: 'composer' | 'orchestrator' | 'worker' | 'custom'
  description?: string
  model?: string
  skillBundleKind?: string
}

export interface BootstrapProposal {
  connectors: BootstrapProposalConnector[]
  skills: string[]
  plugins: string[]
  mcp: Array<{ name: string; transport: string; endpoint: string }>
  externalApis: Array<{ name: string; baseUrl: string }>
  agents: BootstrapProposalAgent[]
}

export type BootstrapStep = 'form' | 'loading' | 'proposal' | 'parse-failure' | 'applying' | 'done'

export function useComposerBootstrap(projectId: Ref<string | null>) {
  const api = useProjectsApi()

  const step = ref<BootstrapStep>('form')
  const taskDescription = ref('')
  const proposal = ref<BootstrapProposal | null>(null)
  const rawText = ref<string | null>(null)
  const composerAgentId = ref<string | null>(null)
  const error = ref<string | null>(null)

  function reset() {
    step.value = 'form'
    taskDescription.value = ''
    proposal.value = null
    rawText.value = null
    composerAgentId.value = null
    error.value = null
  }

  async function runAuto(): Promise<string | null> {
    if (!projectId.value) return null
    step.value = 'loading'
    error.value = null
    try {
      const res = await api.bootstrapProject(projectId.value, {
        mode: 'auto',
        taskDescription: taskDescription.value,
      })
      if ('proposal' in res) {
        composerAgentId.value = res.composerAgentId
        proposal.value = res.proposal
        step.value = 'proposal'
        return res.composerAgentId
      }
      step.value = 'done'
      return null
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const body = (err as { data?: { rawText?: string } })?.data
      if (body?.rawText) {
        rawText.value = body.rawText
        step.value = 'parse-failure'
      } else {
        error.value = msg
        step.value = 'form'
      }
      return null
    }
  }

  async function applyProposal(): Promise<void> {
    if (!projectId.value || !proposal.value) return
    step.value = 'applying'
    error.value = null
    try {
      await api.bootstrapApply(projectId.value, { proposal: proposal.value })
      step.value = 'done'
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      step.value = 'proposal'
    }
  }

  return {
    step,
    taskDescription,
    proposal,
    rawText,
    composerAgentId,
    error,
    reset,
    runAuto,
    applyProposal,
  }
}
