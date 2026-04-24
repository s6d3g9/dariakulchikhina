import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runTailMode } from "./core.ts";
import { claudeTranscriptAdapter } from "./adapters/claude-transcript.ts";
import type { IngestEvent } from "./types.ts";

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bridge-tail-"));
}

function mockFetch(captured: IngestEvent[]): void {
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const body = (init?.body as string) ?? "{}";
    captured.push(JSON.parse(body));
    return new Response(null, { status: 202 });
  };
}

test("tail oneShot drains full file and persists offset", async () => {
  const dir = mkTmp();
  const file = path.join(dir, "session.jsonl");
  const state = path.join(dir, "state");

  const lines = [
    { type: "user", uuid: "u1", message: { role: "user", content: "hi" } },
    {
      type: "assistant",
      uuid: "a1",
      message: { role: "assistant", content: [{ type: "text", text: "hello back" }] },
    },
  ];
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");

  const captured: IngestEvent[] = [];
  mockFetch(captured);

  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: file,
    stateDir: state,
    runId: "r1",
    agentId: "agent-host",
    messengerUrl: "http://ex.test",
    token: "tok",
    oneShot: true,
  });

  // run_start + user_prompt substate + streaming + delta
  assert.ok(captured.some((e) => e.type === "run_start"));
  assert.ok(captured.some((e) => e.type === "substate" && (e as any).substate === "user_prompt"));
  assert.ok(captured.some((e) => e.type === "delta" && (e as any).delta === "hello back"));

  const offsetFile = fs.readdirSync(state).find((f) => f.startsWith("agent-host-") && f.endsWith(".offset"));
  assert.ok(offsetFile, "expected offset file to be persisted");
  const savedOffset = Number(fs.readFileSync(path.join(state, offsetFile!), "utf8"));
  assert.equal(savedOffset, fs.statSync(file).size);
});

test("tail resumes from persisted offset and does not re-emit prior lines", async () => {
  const dir = mkTmp();
  const file = path.join(dir, "session.jsonl");
  const state = path.join(dir, "state");

  const first = { type: "user", uuid: "u1", message: { role: "user", content: "first" } };
  fs.writeFileSync(file, JSON.stringify(first) + "\n");

  const capturedA: IngestEvent[] = [];
  mockFetch(capturedA);
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: file,
    stateDir: state,
    runId: "r1",
    agentId: "agent-host",
    messengerUrl: "http://ex.test",
    token: "tok",
    oneShot: true,
  });
  const firstUserPromptCount = capturedA.filter(
    (e) => e.type === "substate" && (e as any).substate === "user_prompt" && (e as any).message === "first"
  ).length;
  assert.equal(firstUserPromptCount, 1);

  // Append a new line and re-run tail — only the new line should be emitted.
  const second = { type: "user", uuid: "u2", message: { role: "user", content: "second" } };
  fs.appendFileSync(file, JSON.stringify(second) + "\n");

  const capturedB: IngestEvent[] = [];
  mockFetch(capturedB);
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: file,
    stateDir: state,
    runId: "r2",
    agentId: "agent-host",
    messengerUrl: "http://ex.test",
    token: "tok",
    oneShot: true,
  });

  // No second run_start (firstRun check keyed on offset > 0).
  assert.ok(!capturedB.some((e) => e.type === "run_start"));
  // Only "second" prompt should appear — not "first".
  const firstAgain = capturedB.filter(
    (e) => e.type === "substate" && (e as any).message === "first"
  );
  const secondSeen = capturedB.filter(
    (e) => e.type === "substate" && (e as any).message === "second"
  );
  assert.equal(firstAgain.length, 0);
  assert.equal(secondSeen.length, 1);
});

test("tail handles file truncation by restarting from 0", async () => {
  const dir = mkTmp();
  const file = path.join(dir, "session.jsonl");
  const state = path.join(dir, "state");

  fs.writeFileSync(
    file,
    JSON.stringify({ type: "user", uuid: "u1", message: { role: "user", content: "hello" } }) + "\n"
  );
  const capturedA: IngestEvent[] = [];
  mockFetch(capturedA);
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: file,
    stateDir: state,
    runId: "r1",
    agentId: "agent-host",
    messengerUrl: "http://ex.test",
    token: "tok",
    oneShot: true,
  });

  // Truncate and write shorter content (same-size truncation is ambiguous and
  // doesn't happen in real Claude Code sessions — files only grow).
  fs.writeFileSync(file, '{"type":"user","uuid":"u2","message":{"role":"user","content":"x"}}\n');

  const capturedB: IngestEvent[] = [];
  mockFetch(capturedB);
  await runTailMode({
    adapter: claudeTranscriptAdapter,
    filePath: file,
    stateDir: state,
    runId: "r2",
    agentId: "agent-host",
    messengerUrl: "http://ex.test",
    token: "tok",
    oneShot: true,
  });

  assert.ok(
    capturedB.some((e) => e.type === "substate" && (e as any).message === "x"),
    "fresh line should be emitted after truncation"
  );
});
