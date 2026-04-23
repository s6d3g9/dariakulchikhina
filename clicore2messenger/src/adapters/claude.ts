import * as os from "node:os";
import * as path from "node:path";
import type { CliAdapter, CliAdapterContext, IngestEvent } from "../types.ts";

export const claudeAdapter: CliAdapter = {
  name: "claude",

  finalize(ctx: CliAdapterContext): IngestEvent[] {
    const state = ctx.state as ExtState;
    const events: IngestEvent[] = [];
    // Flush any tool_use that never got content_block_stop
    if (state._pendingTool) {
      const { tool, json } = state._pendingTool;
      let input: unknown = undefined;
      try { input = json ? JSON.parse(json) : undefined; } catch { input = undefined; }
      events.push({ type: "tool_use", runId: ctx.runId, tool, input });
      state._pendingTool = null;
    }
    events.push({ type: "complete", runId: ctx.runId, finalText: state.finalText || undefined });
    return events;
  },

  parseLine(line: string, ctx: CliAdapterContext): IngestEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
    return mapCliEvent(raw, ctx.runId, ctx.state as ExtState);
  },

  spawnArgs(opts) {
    const bin =
      process.env.CLAUDE_CLI_BIN ??
      path.join(os.homedir(), ".local", "bin", "claude");
    const args = [
      "--print",
      "--model", opts.model,
      "--output-format", "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--input-format", opts.inputFormat ?? "text",
    ];
    if (opts.resume) args.push("--resume", opts.resume);
    return { bin, args };
  },
};

type ExtState = { finalText: string; tokensIn: number; tokensOut: number; costUsd: number; _pendingTool?: { tool: string; json: string } | null };

// Verbatim mapping logic from scripts/workrooms/claude-stream-bridge.ts
function mapCliEvent(
  raw: unknown,
  runId: string,
  state: ExtState
): IngestEvent[] {
  if (typeof raw !== "object" || raw === null) return [];
  const ev = raw as Record<string, unknown>;
  const events: IngestEvent[] = [];

  switch (ev.type) {
    case "system": {
      if (ev.subtype === "init") {
        events.push({ type: "substate", runId, substate: "idle" });
      }
      break;
    }

    case "stream_event": {
      const se = (ev.event ?? ev.stream_event) as Record<string, unknown> | undefined;
      if (!se) break;
      switch (se.type) {
        case "message_start":
          events.push({ type: "substate", runId, substate: "thinking" });
          break;

        case "content_block_start": {
          const cb = se.content_block as Record<string, unknown> | undefined;
          if (cb?.type === "tool_use") {
            events.push({ type: "substate", runId, substate: "tool_call" });
            state._pendingTool = { tool: String(cb.name ?? "unknown"), json: "" };
          }
          break;
        }

        case "content_block_delta": {
          const delta = se.delta as Record<string, unknown> | undefined;
          if (delta?.type === "input_json_delta" && state._pendingTool) {
            state._pendingTool.json += String(delta.partial_json ?? "");
          } else if (delta?.type === "text_delta") {
            const text = String(delta.text ?? "");
            if (text) {
              state.finalText += text;
              events.push({ type: "substate", runId, substate: "streaming" });
              events.push({ type: "delta", runId, delta: text });
            }
          }
          break;
        }

        case "content_block_stop": {
          if (state._pendingTool) {
            const { tool, json } = state._pendingTool;
            let input: unknown = undefined;
            try { input = json ? JSON.parse(json) : undefined; } catch { input = undefined; }
            events.push({ type: "tool_use", runId, tool, input });
            state._pendingTool = null;
          }
          break;
        }
      }
      break;
    }

    case "result": {
      const usage = ev.usage as Record<string, unknown> | undefined;
      const tokensIn = Number(usage?.input_tokens ?? 0);
      const tokensOut = Number(usage?.output_tokens ?? 0);
      const cacheRead = Number(usage?.cache_read_input_tokens ?? 0);
      const cacheWrite = Number(usage?.cache_creation_input_tokens ?? 0);
      const costUsd = Number(ev.total_cost_usd ?? 0);
      state.tokensIn = tokensIn;
      state.tokensOut = tokensOut;
      state.costUsd = costUsd;
      if (!state.finalText && typeof ev.result === "string") {
        state.finalText = ev.result;
      }
      events.push({ type: "tokens", runId, tokenIn: tokensIn, tokenOut: tokensOut, costUsd, cacheRead: cacheRead || undefined, cacheWrite: cacheWrite || undefined });
      break;
    }

    case "error": {
      const msg = String(ev.error ?? ev.message ?? "unknown CLI error");
      events.push({ type: "error", runId, message: msg, fatal: false });
      break;
    }
  }

  return events;
}

function summarise(input: unknown): string {
  try {
    const compact = JSON.stringify(input) ?? "";
    return compact.length > 120 ? compact.slice(0, 117) + "..." : compact;
  } catch {
    return "";
  }
}
