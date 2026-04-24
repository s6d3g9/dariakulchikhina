import * as os from "node:os";
import * as path from "node:path";
import type { CliAdapter, CliAdapterContext, IngestEvent } from "../types.ts";

/**
 * Adapter for Claude Code session *transcripts* (the JSONL files that the CLI
 * writes to `~/.claude/projects/<slug>/<sessionId>.jsonl` as the session
 * runs). The envelope differs from the `--output-format stream-json` format
 * that claudeAdapter consumes:
 *
 *   { type: "assistant", message: { role, content: [ {type:"tool_use",...}, {type:"text",...}, ... ] }, uuid, ... }
 *   { type: "user",      message: { role, content: [ {type:"tool_result",...} ] | "<str>" }, ... }
 *   { type: "queue-operation", operation: "enqueue", content, ... }
 *   { type: "ai-title" | "last-prompt" | "attachment", ... }   // metadata, ignored
 *
 * Inside `message.content` the block shapes are the same Anthropic API
 * primitives (tool_use, tool_result, text, thinking) so subagent tracking
 * (Task tool_use → subagent_start, matching tool_result → subagent_end)
 * mirrors claudeAdapter exactly.
 */
export const claudeTranscriptAdapter: CliAdapter = {
  name: "claude-transcript",
  // This adapter is only used in tail mode — spawnArgs is never called in
  // practice, but we provide a sane default so the interface stays satisfied.
  pipeStdin: false,

  parseLine(line: string, ctx: CliAdapterContext): IngestEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
    return mapTranscriptEvent(raw, ctx.runId, ctx.state as ExtState);
  },

  finalize(ctx: CliAdapterContext): IngestEvent[] {
    const state = ctx.state as ExtState;
    const events: IngestEvent[] = [];
    if (state._openSubagents && state._openSubagents.size > 0) {
      for (const toolUseId of state._openSubagents) {
        events.push({ type: "subagent_end", runId: ctx.runId, toolUseId, success: true });
      }
      state._openSubagents.clear();
    }
    events.push({ type: "complete", runId: ctx.runId, finalText: state.finalText || undefined });
    return events;
  },

  spawnArgs() {
    const bin = process.env.CLAUDE_CLI_BIN ?? path.join(os.homedir(), ".local", "bin", "claude");
    return { bin, args: ["--help"] };
  },
};

type ExtState = {
  finalText: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  _openSubagents?: Set<string>;
  _seenUuids?: Set<string>;
};

function mapTranscriptEvent(raw: unknown, runId: string, state: ExtState): IngestEvent[] {
  if (typeof raw !== "object" || raw === null) return [];
  const ev = raw as Record<string, unknown>;
  const events: IngestEvent[] = [];

  // Skip duplicate uuids — tail resumption may re-read trailing lines from the
  // offset boundary. Envelopes that don't carry uuid (queue-operation, ai-title)
  // fall through without dedup, which is fine because they are lightweight.
  const uuid = typeof ev.uuid === "string" ? ev.uuid : undefined;
  if (uuid) {
    if (!state._seenUuids) state._seenUuids = new Set();
    if (state._seenUuids.has(uuid)) return [];
    state._seenUuids.add(uuid);
  }

  switch (ev.type) {
    case "queue-operation": {
      // Operator queued a prompt while the previous turn was still running.
      // We surface this as a substate marker so the trace panel shows it as
      // a distinct row — visible proof the prompt landed in the queue.
      if (ev.operation === "enqueue") {
        const content = typeof ev.content === "string" ? ev.content : "";
        events.push({
          type: "substate",
          runId,
          substate: "queued",
          message: content ? content.slice(0, 240) : undefined,
        });
      }
      break;
    }

    case "user": {
      const msg = ev.message as Record<string, unknown> | undefined;
      if (!msg) break;
      const content = msg.content;
      if (typeof content === "string") {
        // New user prompt — emit substate so the UI renders a turn boundary.
        events.push({
          type: "substate",
          runId,
          substate: "user_prompt",
          message: content.slice(0, 240),
        });
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (!isRecord(block)) continue;
          if (block.type === "tool_result") {
            const toolUseId = typeof block.tool_use_id === "string" ? block.tool_use_id : undefined;
            if (toolUseId && state._openSubagents?.has(toolUseId)) {
              const isError = block.is_error === true;
              const message = extractToolResultMessage(block.content);
              const endEvent: IngestEvent = {
                type: "subagent_end",
                runId,
                toolUseId,
                success: !isError,
              };
              if (isError && message) endEvent.message = message.slice(0, 400);
              events.push(endEvent);
              state._openSubagents.delete(toolUseId);
            }
          }
        }
      }
      break;
    }

    case "assistant": {
      const msg = ev.message as Record<string, unknown> | undefined;
      if (!msg) break;
      const content = msg.content;
      if (!Array.isArray(content)) break;

      for (const block of content) {
        if (!isRecord(block)) continue;
        switch (block.type) {
          case "thinking": {
            events.push({ type: "substate", runId, substate: "thinking" });
            break;
          }
          case "text": {
            const text = typeof block.text === "string" ? block.text : "";
            if (text) {
              state.finalText = text; // transcript text is full per block, not delta
              events.push({ type: "substate", runId, substate: "streaming" });
              events.push({ type: "delta", runId, delta: text });
            }
            break;
          }
          case "tool_use": {
            const tool = typeof block.name === "string" ? block.name : "unknown";
            const toolUseId = typeof block.id === "string" ? block.id : undefined;
            const input = block.input;
            events.push({ type: "substate", runId, substate: "tool_call" });
            events.push({ type: "tool_use", runId, tool, toolUseId, input });

            if ((tool === "Task" || tool === "Agent") && toolUseId) {
              const inputObj = isRecord(input) ? input : {};
              const subagentType =
                typeof inputObj.subagent_type === "string"
                  ? inputObj.subagent_type
                  : typeof inputObj.description === "string"
                  ? inputObj.description
                  : "general-purpose";
              const promptRaw = typeof inputObj.prompt === "string" ? inputObj.prompt : "";
              const promptExcerpt = promptRaw ? promptRaw.slice(0, 400) : undefined;
              events.push({
                type: "subagent_start",
                runId,
                toolUseId,
                subagentType,
                promptExcerpt,
              });
              if (!state._openSubagents) state._openSubagents = new Set();
              state._openSubagents.add(toolUseId);
            }
            break;
          }
        }
      }

      // Usage metadata is attached to the assistant envelope as message.usage.
      const usage = msg.usage as Record<string, unknown> | undefined;
      if (usage) {
        const tokensIn = Number(usage.input_tokens ?? 0);
        const tokensOut = Number(usage.output_tokens ?? 0);
        const cacheRead = Number(usage.cache_read_input_tokens ?? 0);
        const cacheWrite = Number(usage.cache_creation_input_tokens ?? 0);
        if (tokensIn || tokensOut) {
          state.tokensIn = tokensIn;
          state.tokensOut = tokensOut;
          events.push({
            type: "tokens",
            runId,
            tokenIn: tokensIn,
            tokenOut: tokensOut,
            cacheRead: cacheRead || undefined,
            cacheWrite: cacheWrite || undefined,
          });
        }
      }
      break;
    }

    default:
      // attachment, ai-title, last-prompt, summary — ignore.
      break;
  }

  return events;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractToolResultMessage(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  for (const c of content) {
    if (isRecord(c) && typeof c.text === "string") parts.push(c.text);
  }
  return parts.length ? parts.join("\n") : undefined;
}
