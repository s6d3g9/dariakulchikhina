#!/usr/bin/env -S node --experimental-strip-types
/**
 * claude-stream-bridge — adapts Claude CLI stream-json events → messenger ingest endpoint
 *
 * Two modes:
 *   Spawn mode  (--prompt or --prompt-file): spawns claude CLI, reads its stdout
 *   Pipe mode   (no --prompt / --conversation-id): reads stream-json from stdin
 *
 * Zero npm dependencies; uses only Node built-ins.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Ingest event types (matching ingest-handler.ts schemas exactly)
// ---------------------------------------------------------------------------

type IngestEvent =
  | { type: "run_start"; runId: string; prompt?: string }
  | { type: "substate"; runId: string; substate: string; message?: string }
  | { type: "delta"; runId: string; delta: string }
  | { type: "tool_use"; runId: string; tool: string; input?: unknown }
  | { type: "tokens"; runId: string; tokenIn: number; tokenOut: number; costUsd?: number }
  | { type: "complete"; runId: string; finalText?: string }
  | { type: "error"; runId: string; message: string; fatal?: boolean };

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  agentId: string;
  conversationId?: string;
  prompt?: string;
  promptFile?: string;
  model: string;
  messengerUrl: string;
  token: string;
  resume?: string;
  runId: string;
  pipeMode: boolean;
} {
  const args = argv.slice(2);
  const get = (...flags: string[]) => {
    for (const flag of flags) {
      const i = args.indexOf(flag);
      if (i !== -1 && i + 1 < args.length) return args[i + 1];
    }
    return undefined;
  };

  const agentId = get("--agent-id");
  const conversationId = get("--conversation-id");
  const promptArg = get("--prompt");
  const promptFile = get("--prompt-file");
  const model = get("--model") ?? "sonnet";
  const messengerUrl =
    get("--messenger-core-url", "--messenger-url") ??
    process.env.MESSENGER_INGEST_URL ??
    "http://localhost:4300";
  const token =
    get("--ingest-token", "--token") ??
    process.env.MESSENGER_INGEST_TOKEN ??
    "";
  const resume = get("--resume");
  const runId = get("--run-id") ?? randomUUID();

  if (!agentId) die("--agent-id is required");
  if (!token) die("--ingest-token / --token / MESSENGER_INGEST_TOKEN required");

  // Pipe mode: no prompt means read from stdin
  const pipeMode = !promptArg && !promptFile;

  const prompt = pipeMode ? undefined : (promptArg ?? fs.readFileSync(promptFile!, "utf8"));

  return { agentId, conversationId, prompt, promptFile, model, messengerUrl, token, resume, runId, pipeMode };
}

function die(msg: string): never {
  console.error(`[bridge] fatal: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP sender with exponential-backoff retry
// ---------------------------------------------------------------------------

async function postEvent(
  url: string,
  token: string,
  event: IngestEvent,
  runId: string,
  dlqPath: string
): Promise<void> {
  const body = JSON.stringify(event);
  const MAX_ATTEMPTS = 5;
  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (res.ok || res.status === 202) return;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.error(`[bridge] permanent error ${res.status} for event ${event.type}`);
        writeDlq(dlqPath, event);
        return;
      }
    } catch (_err) {
      // network error → retry
    }
    if (attempt < MAX_ATTEMPTS) {
      const delayMs = Math.min(200 * Math.pow(2, attempt - 1), 16000);
      await sleep(delayMs);
    }
  }
  console.error(`[bridge] all retries exhausted for event ${event.type}, writing to DLQ`);
  writeDlq(dlqPath, event);
}

function writeDlq(dlqPath: string, event: IngestEvent): void {
  try {
    fs.mkdirSync(path.dirname(dlqPath), { recursive: true });
    fs.appendFileSync(dlqPath, JSON.stringify(event) + "\n");
  } catch (err) {
    console.error(`[bridge] failed to write DLQ: ${err}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Stream-JSON event mapper (matches ingest-handler.ts schema exactly)
// ---------------------------------------------------------------------------

function mapCliEvent(
  raw: unknown,
  runId: string,
  state: { finalText: string; tokensIn: number; tokensOut: number; costUsd: number }
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
            const tool = String(cb.name ?? "unknown");
            events.push({ type: "tool_use", runId, tool, input: cb.input });
          }
          break;
        }

        case "content_block_delta": {
          const delta = se.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta") {
            const text = String(delta.text ?? "");
            if (text) {
              state.finalText += text;
              events.push({ type: "substate", runId, substate: "streaming" });
              events.push({ type: "delta", runId, delta: text });
            }
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
      const costUsd = Number(ev.total_cost_usd ?? 0);
      state.tokensIn = tokensIn;
      state.tokensOut = tokensOut;
      state.costUsd = costUsd;
      if (!state.finalText && typeof ev.result === "string") {
        state.finalText = ev.result;
      }
      events.push({ type: "tokens", runId, tokenIn: tokensIn, tokenOut: tokensOut, costUsd });
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);
  const { agentId, prompt, model, messengerUrl, token, resume, runId, pipeMode } = opts;

  const ingestBase = `${messengerUrl}/agents/${agentId}/stream`;
  const dlqPath = path.join(
    os.homedir(),
    "state",
    "claude-bridge",
    `${runId}.dlq.ndjson`
  );

  const post = (event: IngestEvent) => postEvent(ingestBase, token, event, runId, dlqPath);
  const startMs = Date.now();
  const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };

  // Signal run start
  await post({ type: "run_start", runId, ...(prompt ? { prompt } : {}) });

  let inputStream: NodeJS.ReadableStream;

  if (pipeMode) {
    // Pipe mode: read stream-json from stdin
    inputStream = process.stdin;
  } else {
    // Spawn mode: launch Claude CLI
    const claudeBin =
      process.env.CLAUDE_CLI_BIN ??
      path.join(os.homedir(), ".local", "bin", "claude");

    const cliArgs = [
      "--print",
      "--model", model,
      "--output-format", "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--input-format", "text",
    ];
    if (resume) cliArgs.push("--resume", resume);

    const child = spawn(claudeBin, cliArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    child.stdin.write(prompt ?? "");
    child.stdin.end();

    // Collect stderr
    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(trimmed); }
      catch { await post({ type: "error", runId, message: `parse error: ${trimmed.slice(0, 200)}`, fatal: false }); continue; }
      for (const ev of mapCliEvent(parsed, runId, state)) await post(ev);
    }

    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code) => resolve(code ?? 1));
    });

    if (exitCode !== 0) {
      const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
      await post({ type: "error", runId, message: stderrText || `claude exited with code ${exitCode}`, fatal: true });
      process.exit(1);
    }

    await post({ type: "complete", runId, finalText: state.finalText || undefined });
    process.exit(0);
    return;
  }

  // Pipe mode: read from stdin
  const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); }
    catch { continue; }
    for (const ev of mapCliEvent(parsed, runId, state)) await post(ev);
  }

  const durationMs = Date.now() - startMs;
  await post({ type: "complete", runId, finalText: state.finalText || undefined });
  process.exit(0);
}

main().catch((err) => {
  console.error("[bridge] unhandled error:", err);
  process.exit(1);
});
