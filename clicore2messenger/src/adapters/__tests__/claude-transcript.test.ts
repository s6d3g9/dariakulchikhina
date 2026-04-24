import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeTranscriptAdapter } from "../claude-transcript.ts";
import type { IngestEvent } from "../../types.ts";

function newState() {
  return { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };
}

function feed(lines: unknown[]): { events: IngestEvent[]; state: ReturnType<typeof newState> } {
  const state = newState();
  const events: IngestEvent[] = [];
  for (const obj of lines) {
    const out = claudeTranscriptAdapter.parseLine(JSON.stringify(obj), { runId: "r1", state });
    events.push(...out);
  }
  return { events, state };
}

test("queue-operation enqueue emits substate with prompt excerpt", () => {
  const { events } = feed([
    { type: "queue-operation", operation: "enqueue", content: "do the thing", sessionId: "s1" },
  ]);
  assert.deepEqual(events, [
    { type: "substate", runId: "r1", substate: "queued", message: "do the thing" },
  ]);
});

test("user string message emits user_prompt substate", () => {
  const { events } = feed([
    {
      type: "user",
      uuid: "u1",
      message: { role: "user", content: "hello claude" },
    },
  ]);
  assert.deepEqual(events, [
    { type: "substate", runId: "r1", substate: "user_prompt", message: "hello claude" },
  ]);
});

test("assistant text block emits delta + streaming substate and updates finalText", () => {
  const { events, state } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: { role: "assistant", content: [{ type: "text", text: "ok, working on it" }] },
    },
  ]);
  assert.deepEqual(events, [
    { type: "substate", runId: "r1", substate: "streaming" },
    { type: "delta", runId: "r1", delta: "ok, working on it" },
  ]);
  assert.equal(state.finalText, "ok, working on it");
});

test("assistant thinking block emits thinking substate", () => {
  const { events } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: { role: "assistant", content: [{ type: "thinking", thinking: "..." }] },
    },
  ]);
  assert.deepEqual(events, [{ type: "substate", runId: "r1", substate: "thinking" }]);
});

test("assistant Task tool_use emits tool_use + subagent_start", () => {
  const { events, state } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "toolu_abc",
            name: "Task",
            input: { subagent_type: "Explore", description: "scan repo", prompt: "find handlers" },
          },
        ],
      },
    },
  ]);
  assert.deepEqual(events, [
    { type: "substate", runId: "r1", substate: "tool_call" },
    {
      type: "tool_use",
      runId: "r1",
      tool: "Task",
      toolUseId: "toolu_abc",
      input: { subagent_type: "Explore", description: "scan repo", prompt: "find handlers" },
    },
    {
      type: "subagent_start",
      runId: "r1",
      toolUseId: "toolu_abc",
      subagentType: "Explore",
      promptExcerpt: "find handlers",
    },
  ]);
  assert.ok((state as any)._openSubagents?.has("toolu_abc"));
});

test("tool_result for open subagent emits subagent_end success", () => {
  const { events, state } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [
          { type: "tool_use", id: "toolu_abc", name: "Task", input: { subagent_type: "Explore", prompt: "p" } },
        ],
      },
    },
    {
      type: "user",
      uuid: "u2",
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_abc", content: "done", is_error: false }],
      },
    },
  ]);
  const endEvent = events.find((e) => e.type === "subagent_end");
  assert.deepEqual(endEvent, { type: "subagent_end", runId: "r1", toolUseId: "toolu_abc", success: true });
  assert.equal((state as any)._openSubagents?.has("toolu_abc"), false);
});

test("tool_result is_error=true emits subagent_end success=false with message", () => {
  const { events } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "toolu_xyz", name: "Task", input: { subagent_type: "Plan", prompt: "p" } }],
      },
    },
    {
      type: "user",
      uuid: "u2",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_xyz",
            content: [{ type: "text", text: "boom failure" }],
            is_error: true,
          },
        ],
      },
    },
  ]);
  const endEvent = events.find((e) => e.type === "subagent_end");
  assert.deepEqual(endEvent, {
    type: "subagent_end",
    runId: "r1",
    toolUseId: "toolu_xyz",
    success: false,
    message: "boom failure",
  });
});

test("non-Task tool_use does NOT emit subagent_start", () => {
  const { events, state } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "toolu_1", name: "Read", input: { file_path: "/x" } }],
      },
    },
  ]);
  assert.ok(!events.some((e) => e.type === "subagent_start"));
  assert.ok(events.some((e) => e.type === "tool_use"));
  assert.ok(!(state as any)._openSubagents || (state as any)._openSubagents.size === 0);
});

test("duplicate uuid is deduplicated", () => {
  const state = newState();
  const line = JSON.stringify({
    type: "assistant",
    uuid: "a1",
    message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
  });
  const first = claudeTranscriptAdapter.parseLine(line, { runId: "r1", state });
  const second = claudeTranscriptAdapter.parseLine(line, { runId: "r1", state });
  assert.equal(first.length, 2);
  assert.equal(second.length, 0);
});

test("usage metadata emits tokens event", () => {
  const { events } = feed([
    {
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "done" }],
        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3 },
      },
    },
  ]);
  const tok = events.find((e) => e.type === "tokens");
  assert.deepEqual(tok, { type: "tokens", runId: "r1", tokenIn: 10, tokenOut: 5, cacheRead: 3, cacheWrite: undefined });
});

test("metadata envelopes (attachment, ai-title, last-prompt) are ignored", () => {
  const { events } = feed([
    { type: "attachment", attachment: { name: "x.png" }, uuid: "at1" },
    { type: "ai-title", aiTitle: "session title", sessionId: "s1" },
    { type: "last-prompt", lastPrompt: "p", sessionId: "s1" },
  ]);
  assert.equal(events.length, 0);
});

test("finalize closes open subagents as success and emits complete", () => {
  const state = newState();
  claudeTranscriptAdapter.parseLine(
    JSON.stringify({
      type: "assistant",
      uuid: "a1",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "toolu_open", name: "Task", input: { subagent_type: "X", prompt: "p" } }],
      },
    }),
    { runId: "r1", state }
  );
  const final = claudeTranscriptAdapter.finalize!({ runId: "r1", state });
  assert.ok(final.some((e) => e.type === "subagent_end" && e.toolUseId === "toolu_open" && e.success === true));
  assert.ok(final.some((e) => e.type === "complete"));
});
