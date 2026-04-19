export type AgentSubstate =
  | 'idle'
  | 'thinking'
  | 'tool_call'
  | 'awaiting_input'
  | 'streaming'
  | 'error';

export interface AgentStreamRunStart {
  type: 'run_start';
  runId: string;
  conversationId: string;
  prompt: string;
}

export interface AgentStreamSubstate {
  type: 'substate';
  runId: string;
  value: AgentSubstate;
}

export interface AgentStreamDelta {
  type: 'delta';
  runId: string;
  text: string;
}

export interface AgentStreamToolUse {
  type: 'tool_use';
  runId: string;
  name: string;
  inputSummary: string;
}

export interface AgentStreamTokens {
  type: 'tokens';
  runId: string;
  in: number;
  out: number;
  totalCostUsd?: number;
}

export interface AgentStreamComplete {
  type: 'complete';
  runId: string;
  finalText: string;
  totalTokens?: number;
  durationMs?: number;
}

export interface AgentStreamError {
  type: 'error';
  runId: string;
  message: string;
  fatal: boolean;
}

export type AgentStreamEvent =
  | AgentStreamRunStart
  | AgentStreamSubstate
  | AgentStreamDelta
  | AgentStreamToolUse
  | AgentStreamTokens
  | AgentStreamComplete
  | AgentStreamError;

export interface AgentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  contextWindowLimit: number;
  contextUsedPct: number;
  totalCostUsd: number;
}
