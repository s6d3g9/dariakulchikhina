import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import type { CliAdapter, IngestEvent } from "./types.ts";

export async function post(baseUrl: string, agentId: string, token: string, event: IngestEvent): Promise<void> {
  const body = JSON.stringify(event);
  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    try {
      const res = await fetch(`${baseUrl}/agents/${agentId}/stream`, {
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
        return;
      }
    } catch {
      // network error → retry
    }
    if (attempt < MAX_ATTEMPTS) {
      const delayMs = Math.min(200 * Math.pow(2, attempt - 1), 16000);
      await sleep(delayMs);
    }
  }
  console.error(`[bridge] all retries exhausted for event ${event.type}`);
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

export interface SpawnModeOpts {
  adapter: CliAdapter;
  model: string;
  resume?: string;
  effort?: "low" | "medium" | "high" | "xhigh";
  prompt: string;
  runId: string;
  conversationId: string;
  agentId: string;
  messengerUrl: string;
  token: string;
}

export async function runSpawnMode(opts: SpawnModeOpts): Promise<number> {
  const { adapter, model, resume, effort, prompt, runId, conversationId, agentId, messengerUrl, token } = opts;
  const dlqPath = path.join(os.homedir(), "state", "claude-bridge", `${runId}.dlq.ndjson`);

  const send = async (event: IngestEvent) => {
    await post(messengerUrl, agentId, token, event).catch(() => writeDlq(dlqPath, event));
  };

  const startMs = Date.now();

  await send({ type: "run_start", runId, conversationId, prompt });

  const { bin, args } = adapter.spawnArgs({ model, resume, effort, prompt, inputFormat: "text" });
  const useStdin = adapter.pipeStdin !== false;
  const child = spawn(bin, args, {
    stdio: [useStdin ? "pipe" : "ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  if (useStdin) {
    child.stdin!.write(prompt);
    child.stdin!.end();
  }

  const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };

  // Register stderr and close handlers BEFORE the readline loop so fast-exiting
  // children (e.g. /bin/echo in tests) don't fire 'close' before we listen.
  const stderrChunks: Buffer[] = [];
  child.stderr!.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
  const closePromise = new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
  });

  // stdout is always "pipe" — non-null assertion is safe
  const rl = readline.createInterface({ input: child.stdout!, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const ctx = { runId, state };
    let events;
    try {
      events = adapter.parseLine(trimmed, ctx);
    } catch {
      await send({ type: "error", runId, message: `parse error: ${trimmed.slice(0, 200)}`, fatal: false });
      continue;
    }
    for (const ev of events) {
      await send(ev);
    }
  }

  const exitCode = await closePromise;

  const durationMs = Date.now() - startMs;

  if (exitCode !== 0) {
    const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
    await send({
      type: "error",
      runId,
      message: stderrText || `claude exited with code ${exitCode}`,
      fatal: true,
    });
    return 1;
  }

  // Let adapter flush buffered state; if it emits complete we use that (with real timing).
  const finalizeEvents = adapter.finalize?.({ runId, state }) ?? [];
  let sentComplete = false;
  for (const ev of finalizeEvents) {
    await send(ev);
    if (ev.type === "complete") sentComplete = true;
  }

  if (!sentComplete) {
    await send({ type: "complete", runId, finalText: state.finalText || undefined });
  }

  return 0;
}

export interface PipeModeOpts {
  adapter: CliAdapter;
  runId: string;
  agentId: string;
  messengerUrl: string;
  token: string;
}

export async function runPipeMode(opts: PipeModeOpts): Promise<void> {
  const { adapter, runId, agentId, messengerUrl, token } = opts;
  const dlqPath = path.join(os.homedir(), "state", "claude-bridge", `${runId}.dlq.ndjson`);

  const send = async (event: IngestEvent) => {
    await post(messengerUrl, agentId, token, event).catch(() => writeDlq(dlqPath, event));
  };

  await send({ type: "run_start", runId });

  const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const ctx = { runId, state };
    let events;
    try {
      events = adapter.parseLine(trimmed, ctx);
    } catch {
      await send({ type: "error", runId, message: `parse error: ${trimmed.slice(0, 200)}`, fatal: false });
      continue;
    }
    for (const ev of events) {
      await send(ev);
    }
  }

  const finalizeEvents = adapter.finalize?.({ runId, state }) ?? [];
  let sentComplete = false;
  for (const ev of finalizeEvents) {
    await send(ev);
    if (ev.type === "complete") sentComplete = true;
  }
  if (!sentComplete) {
    await send({ type: "complete", runId, finalText: state.finalText || undefined });
  }
}
