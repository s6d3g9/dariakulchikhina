// Field names match ingest-handler.ts Zod schemas exactly
export type IngestEvent =
  | { type: "run_start"; runId: string; conversationId?: string; prompt?: string }
  | { type: "substate"; runId: string; substate: string; message?: string }
  | { type: "delta"; runId: string; delta: string }
  | { type: "tool_use"; runId: string; tool: string; toolUseId?: string; input?: unknown }
  | { type: "tokens"; runId: string; tokenIn: number; tokenOut: number; costUsd?: number; cacheRead?: number; cacheWrite?: number }
  | { type: "complete"; runId: string; finalText?: string }
  | { type: "error"; runId: string; message: string; fatal?: boolean }
  // Subagent lifecycle — emitted when the assistant uses the built-in Task
  // tool to spawn a subagent. runId refers to the PARENT run; the ingest
  // handler creates a child agent_run keyed by toolUseId.
  | { type: "subagent_start"; runId: string; toolUseId: string; subagentType: string; promptExcerpt?: string }
  | { type: "subagent_end"; runId: string; toolUseId: string; success: boolean; message?: string };

export interface CliAdapterContext {
  runId: string;
  state: {
    finalText: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  };
}

export interface CliAdapter {
  readonly name: "claude" | "copilot" | string;
  /** When false, the bridge uses stdin:ignore for the child process (adapter takes prompt via args). Default: true. */
  readonly pipeStdin?: boolean;
  parseLine(line: string, ctx: CliAdapterContext): IngestEvent[];
  /** Called once after EOF / child exit. Emits any buffered final events. */
  finalize?(ctx: CliAdapterContext): IngestEvent[];
  spawnArgs(opts: {
    model: string;
    resume?: string;
    inputFormat?: "text" | "stream-json";
    prompt?: string;
    effort?: "low" | "medium" | "high" | "xhigh";
  }): { bin: string; args: string[] };
}
