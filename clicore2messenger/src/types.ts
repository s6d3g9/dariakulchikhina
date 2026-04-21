// Verbatim copy of IngestEvent schema from scripts/workrooms/claude-stream-bridge.ts

export type Substate =
  | "idle"
  | "thinking"
  | "tool_call"
  | "awaiting_input"
  | "streaming"
  | "running"
  | "error";

export type IngestEvent =
  | { type: "run_start"; runId: string; conversationId: string; prompt: string }
  | { type: "substate"; runId: string; value: Substate }
  | { type: "delta"; runId: string; text: string }
  | { type: "tool_use"; runId: string; name: string; inputSummary: string }
  | { type: "tokens"; runId: string; in: number; out: number; totalCostUsd: number }
  | { type: "complete"; runId: string; finalText: string; totalTokens: number; durationMs: number }
  | { type: "error"; runId: string; message: string; fatal: boolean };

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
