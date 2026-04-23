import type { CliAdapter, CliAdapterContext, IngestEvent } from "../types.ts";

export const copilotAdapter: CliAdapter = {
  name: "copilot",
  pipeStdin: false,

  parseLine(line: string, ctx: CliAdapterContext): IngestEvent[] {
    if (!line.trim()) return [];

    // Progress indicator lines — not content
    if (line.startsWith(">")) {
      return [{ type: "tool_use", runId: ctx.runId, tool: "copilot:progress", input: line }];
    }

    const events: IngestEvent[] = [];

    if (!ctx.state.finalText) {
      // First content line — signal that copilot is streaming
      events.push({ type: "substate", runId: ctx.runId, substate: "running" });
    }

    ctx.state.finalText += (ctx.state.finalText ? "\n" : "") + line;
    events.push({ type: "delta", runId: ctx.runId, delta: line });

    return events;
  },

  finalize(ctx: CliAdapterContext): IngestEvent[] {
    return [{
      type: "complete",
      runId: ctx.runId,
      finalText: ctx.state.finalText.trim(),
    }];
  },

  spawnArgs(opts) {
    if (!opts.prompt) throw new Error("copilot adapter requires --prompt in spawn mode");

    const bin = process.env.COPILOT_BIN ??
      `${process.env.HOME ?? "/home/claudecode"}/bin/copilot`;

    const args = ["-p", opts.prompt, "--allow-all"];
    if (opts.model) args.push("--model", opts.model);
    if (opts.effort) args.push("--effort", opts.effort);
    if (opts.resume) args.push("--resume", opts.resume);

    return { bin, args };
  },
};
