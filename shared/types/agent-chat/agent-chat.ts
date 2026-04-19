export interface MessengerAgentRunArtifact {
  kind: 'consultation' | 'file' | 'summary'
  label: string
  content: string
  agentId?: string
}

export interface MessengerAgentRunEvent {
  phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
  status: 'running' | 'completed' | 'failed'
  summary: string
  focus?: string
  activeTargetAgentIds: string[]
  fileNames: string[]
  artifacts: MessengerAgentRunArtifact[]
  timestamp: string
}

export interface MessengerAgentRun {
  runId: string
  conversationId?: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  updatedAt: string
  events: MessengerAgentRunEvent[]
}

export interface MessengerAgentEdgePayload {
  sourceAgentId: string
  targetAgentId: string
  mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
  payloadPreview: string
  runId: string
  conversationId?: string
  timestamp: string
}

export type AgentSubstate = 'idle' | 'thinking' | 'tool_call' | 'awaiting_input' | 'streaming' | 'error'

export interface MessengerAgentTraceEvent {
  type: 'agent.trace'
  conversationId?: string
  trace: {
    runId: string
    agentId: string
    phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
    status: 'running' | 'completed' | 'failed'
    summary: string
    focus?: string
    activeTargetAgentIds?: string[]
    activeConnections?: Array<{
      targetAgentId: string
      mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
      payloadPreview?: string
    }>
    fileNames?: string[]
    artifacts?: Array<{
      kind: 'consultation' | 'file' | 'summary'
      label: string
      content: string
      agentId?: string
    }>
    timestamp: string
  }
}

export interface MessengerAgentRuntimeState {
  runId: string
  agentId: string
  conversationId?: string
  phase: MessengerAgentTraceEvent['trace']['phase']
  status: MessengerAgentTraceEvent['trace']['status']
  summary: string
  focus: string
  activeTargetAgentIds: string[]
  activeConnections: Array<{
    targetAgentId: string
    mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
    payloadPreview?: string
  }>
  fileNames: string[]
  artifacts: Array<{
    kind: 'consultation' | 'file' | 'summary'
    label: string
    content: string
    agentId?: string
  }>
  updatedAt: string
}

export interface MessengerAgentRuntimeTimelineItem extends MessengerAgentRuntimeState {}
