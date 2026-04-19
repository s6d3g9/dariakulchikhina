#!/usr/bin/env -S node --experimental-strip-types
/**
 * claude-stream-bridge — adapts Claude CLI stream-json events → messenger ingest endpoint
 * Zero npm dependencies; uses only Node built-ins.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Substate =
  | "idle"
  | "thinking"
  | "tool_call"
  | "awaiting_input"
  | "streaming"
  | "error";

type IngestEvent =
  | { type: "run_start"; runId: string; conversationId: string; prompt: string }
  | { type: "substate"; runId: string; value: Substate }
  | { type: "delta"; runId: string; text: string }
  | { type: "tool_use"; runId: string; name: string; inputSummary: string }
  | { type: "tokens"; runId: string; in: number; out: number; totalCostUsd: number }
  | { type: "complete"; runId: string; finalText: string; totalTokens: number; durationMs: number }
  | { type: "error"; runId: string; message: string; fatal: boolean };

// ---------------------------------------------------------------------------
// CLI arg parsing (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  agentId: string;
  conversationId: string;
  prompt: string;
  promptFile?: string;
  model: string;
  messengerUrl: string;
  token: string;
  resume?: string;
  runId: string;
} {
  const args = argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const agentId = get("--agent-id");
  const conversationId = get("--conversation-id");
  const promptArg = get("--prompt");
  const promptFile = get("--prompt-file");
  const model = get("--model") ?? "sonnet";
  const messengerUrl =
    get("--messenger-url") ??
    process.env.MESSENGER_INGEST_URL ??
    "http://localhost:3033";
  const token =
    get("--token") ?? process.env.MESSENGER_INGEST_TOKEN ?? "";
  const resume = get("--resume");
  const runId = get("--run-id") ?? randomUUID();

  if (!agentId) die("--agent-id is required");
  if (!conversationId) die("--conversation-id is required");
  if (!promptArg && !promptFile) die("--prompt or --prompt-file is required");
  if (!token) die("MESSENGER_INGEST_TOKEN / --token is required");

  const prompt =
    promptArg ??
    fs.readFileSync(promptFile!, "utf8");

  return { agentId, conversationId, prompt, promptFile, model, messengerUrl, token, resume, runId };
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
      if (res.ok || res.status === 202) return; // success
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // permanent client error
        console.error(`[bridge] permanent error ${res.status} for event ${event.type}`);
        writeDlq(dlqPath, event);
        return;
      }
      // 5xx or 429 → retry
    } catch (err) {
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
// Stream-JSON event mapper
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
        events.push({ type: "substate", runId, value: "idle" });
      }
      break;
    }

    case "stream_event": {
      // Claude CLI uses `event` key (not `stream_event`) inside the wrapper
      const se = (ev.event ?? ev.stream_event) as Record<string, unknown> | undefined;
      if (!se) break;
      switch (se.type) {
        case "message_start":
          events.push({ type: "substate", runId, value: "thinking" });
          break;

        case "content_block_start": {
          const cb = se.content_block as Record<string, unknown> | undefined;
          if (cb?.type === "tool_use") {
            events.push({ type: "substate", runId, value: "tool_call" });
            const name = String(cb.name ?? "unknown");
            const inputSummary = summarise(cb.input);
            events.push({ type: "tool_use", runId, name, inputSummary });
          }
          break;
        }

        case "content_block_delta": {
          const delta = se.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta") {
            const text = String(delta.text ?? "");
            if (text) {
              state.finalText += text;
              events.push({ type: "substate", runId, value: "streaming" });
              events.push({ type: "delta", runId, text });
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
      events.push({ type: "tokens", runId, in: tokensIn, out: tokensOut, totalCostUsd: costUsd });
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);
  const { agentId, conversationId, prompt, model, messengerUrl, token, resume, runId } = opts;

  const ingestBase = `${messengerUrl}/agents/${agentId}/stream`;
  const dlqPath = path.join(
    os.homedir(),
    "state",
    "claude-bridge",
    `${runId}.dlq.ndjson`
  );

  const post = (event: IngestEvent) => postEvent(ingestBase, token, event, runId, dlqPath);
  const startMs = Date.now();

  // 1. Signal run start
  await post({ type: "run_start", runId, conversationId, prompt });

  // 2. Spawn Claude CLI
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

  child.stdin.write(prompt);
  child.stdin.end();

  // Accumulate mutable run state
  const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };

  // 3. Parse stdout line by line
  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      await post({ type: "error", runId, message: `parse error: ${trimmed.slice(0, 200)}`, fatal: false });
      continue;
    }
    const mapped = mapCliEvent(parsed, runId, state);
    for (const ev of mapped) {
      await post(ev);
    }
  }

  // Collect stderr for error messages
  const stderrChunks: Buffer[] = [];
  child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  // 4. Wait for process exit
  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
  });

  const durationMs = Date.now() - startMs;

  if (exitCode !== 0) {
    const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
    await post({
      type: "error",
      runId,
      message: stderrText || `claude exited with code ${exitCode}`,
      fatal: true,
    });
    process.exit(1);
  }

  // 5. Emit complete
  await post({
    type: "complete",
    runId,
    finalText: state.finalText,
    totalTokens: state.tokensIn + state.tokensOut,
    durationMs,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("[bridge] unhandled error:", err);
  process.exit(1);
});
