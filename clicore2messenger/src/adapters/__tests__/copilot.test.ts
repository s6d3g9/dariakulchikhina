import { test } from "node:test";
import assert from "node:assert/strict";
import { copilotAdapter } from "../copilot.ts";
import type { CliAdapterContext } from "../../types.ts";

function makeCtx(): CliAdapterContext {
  return { runId: "r1", state: { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 } };
}

test("first content line emits substate:running + delta", () => {
  const ctx = makeCtx();
  const events = copilotAdapter.parseLine("hello world", ctx);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], { type: "substate", runId: "r1", substate: "running" });
  assert.deepEqual(events[1], { type: "delta", runId: "r1", delta: "hello world" });
  assert.equal(ctx.state.finalText, "hello world");
});

test("subsequent content line emits only delta (no substate)", () => {
  const ctx = makeCtx();
  ctx.state.finalText = "hello world";
  const events = copilotAdapter.parseLine("second line", ctx);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { type: "delta", runId: "r1", delta: "second line" });
});

test("progress line (starts with >) emits tool_use", () => {
  const ctx = makeCtx();
  const events = copilotAdapter.parseLine("> fetching context", ctx);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    type: "tool_use",
    runId: "r1",
    tool: "copilot:progress",
    input: "> fetching context",
  });
  assert.equal(ctx.state.finalText, "", "progress line should not accumulate into finalText");
});

test("empty line emits no events", () => {
  const ctx = makeCtx();
  assert.deepEqual(copilotAdapter.parseLine("", ctx), []);
  assert.deepEqual(copilotAdapter.parseLine("   ", ctx), []);
});

test("finalize emits complete with joined finalText", () => {
  const ctx = makeCtx();
  // Simulate parsing a few lines
  copilotAdapter.parseLine("hello world", ctx);
  copilotAdapter.parseLine("> progress", ctx);
  copilotAdapter.parseLine("", ctx);
  copilotAdapter.parseLine("second line", ctx);
  copilotAdapter.parseLine("third line", ctx);

  const events = copilotAdapter.finalize!(ctx);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "complete");
  if (events[0].type === "complete") {
    assert.equal(events[0].finalText, "hello world\nsecond line\nthird line");
    assert.equal(events[0].runId, "r1");
  }
});

test("spawnArgs returns correct bin and args", () => {
  const result = copilotAdapter.spawnArgs({ model: "gpt-5.4", prompt: "hi" });
  assert.ok(result.bin.includes("copilot"), `bin should reference copilot, got: ${result.bin}`);
  const args = result.args;
  assert.ok(args.includes("-p"), "args should include -p");
  assert.equal(args[args.indexOf("-p") + 1], "hi");
  assert.ok(args.includes("--allow-all"), "args should include --allow-all");
  assert.ok(args.includes("--model"), "args should include --model");
  assert.equal(args[args.indexOf("--model") + 1], "gpt-5.4");
});

test("spawnArgs with effort appends --effort flag", () => {
  const result = copilotAdapter.spawnArgs({ model: "gpt-5.4", prompt: "hi", effort: "high" });
  assert.ok(result.args.includes("--effort"));
  assert.equal(result.args[result.args.indexOf("--effort") + 1], "high");
});

test("spawnArgs with empty prompt throws", () => {
  assert.throws(
    () => copilotAdapter.spawnArgs({ model: "gpt-5.4", prompt: "" }),
    /copilot adapter requires --prompt in spawn mode/,
  );
  assert.throws(
    () => copilotAdapter.spawnArgs({ model: "gpt-5.4" }),
    /copilot adapter requires --prompt in spawn mode/,
  );
});
