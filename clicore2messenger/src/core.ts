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

export interface TailModeOpts {
  adapter: CliAdapter;
  /** Absolute path to the JSONL transcript to tail. */
  filePath: string;
  /** Directory where line-offset checkpoints are persisted (one per agentId). */
  stateDir?: string;
  runId: string;
  conversationId?: string;
  agentId: string;
  messengerUrl: string;
  token: string;
  /** When set, tail exits after draining existing contents. Used by tests. */
  oneShot?: boolean;
  /** Poll interval when fs.watch does not fire (ms). Default 1500. */
  pollIntervalMs?: number;
  /** Signal that stops the tail loop. */
  signal?: AbortSignal;
}

/**
 * Tail a Claude Code session transcript (JSONL) and stream events to the
 * messenger ingest endpoint. Reads from a persisted byte offset so restarts
 * don't re-emit historical events (the adapter also dedupes by uuid as a
 * second line of defense).
 *
 * The tail reads everything new on each tick, partial trailing lines are
 * buffered across ticks until they terminate with '\n'. The byte offset is
 * persisted after each successful chunk.
 */
export async function runTailMode(opts: TailModeOpts): Promise<void> {
  const {
    adapter,
    filePath,
    runId,
    conversationId,
    agentId,
    messengerUrl,
    token,
    oneShot = false,
    pollIntervalMs = 1500,
    signal,
  } = opts;
  const stateDir = opts.stateDir ?? path.join(os.homedir(), "state", "claude-bridge");
  fs.mkdirSync(stateDir, { recursive: true });
  const offsetPath = path.join(stateDir, `${agentId}.offset`);
  const dlqPath = path.join(stateDir, `${runId}.dlq.ndjson`);

  const send = async (event: IngestEvent) => {
    await post(messengerUrl, agentId, token, event).catch(() => writeDlq(dlqPath, event));
  };

  let offset = loadOffset(offsetPath);
  if (!fs.existsSync(filePath)) {
    // File will appear later (new session). Wait quietly.
    offset = 0;
  } else {
    const size = fs.statSync(filePath).size;
    if (offset > size) offset = 0; // file truncated / rotated — restart from 0
  }

  const firstRun = offset === 0;
  if (firstRun) {
    await send({ type: "run_start", runId, conversationId });
  }

  const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };
  let buffer = "";

  const drain = async (): Promise<void> => {
    if (!fs.existsSync(filePath)) return;
    const size = fs.statSync(filePath).size;
    if (size === offset) return;
    if (size < offset) {
      // truncated or replaced — restart from beginning
      offset = 0;
      buffer = "";
    }
    const fh = await fs.promises.open(filePath, "r");
    try {
      const length = size - offset;
      const buf = Buffer.alloc(length);
      await fh.read(buf, 0, length, offset);
      buffer += buf.toString("utf8");
    } finally {
      await fh.close();
    }
    offset = size;

    const lines = buffer.split("\n");
    // Last element is either empty (ended with \n) or a partial line; keep it.
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let events: IngestEvent[];
      try {
        events = adapter.parseLine(trimmed, { runId, state });
      } catch {
        await send({ type: "error", runId, message: `parse error: ${trimmed.slice(0, 200)}`, fatal: false });
        continue;
      }
      for (const ev of events) {
        await send(ev);
      }
    }
    saveOffset(offsetPath, offset);
  };

  await drain();
  if (oneShot) return;

  // Watch + poll: fs.watch is fire-and-forget (and unreliable on some FS), so
  // we back it with a periodic poll. Both paths ultimately call drain().
  let pending = false;
  const tick = async () => {
    if (pending) return;
    pending = true;
    try {
      await drain();
    } catch (err) {
      console.error(`[bridge tail] drain error: ${err}`);
    } finally {
      pending = false;
    }
  };

  let watcher: fs.FSWatcher | null = null;
  try {
    if (fs.existsSync(filePath)) {
      watcher = fs.watch(filePath, { persistent: false }, () => {
        void tick();
      });
    }
  } catch {
    // Some filesystems don't support watch; poll-only is fine.
  }

  const interval = setInterval(() => {
    void tick();
  }, pollIntervalMs);

  await new Promise<void>((resolve) => {
    const stop = () => {
      clearInterval(interval);
      if (watcher) watcher.close();
      resolve();
    };
    if (signal) {
      if (signal.aborted) return stop();
      signal.addEventListener("abort", stop, { once: true });
    }
    // Never resolves otherwise — the process runs until killed by supervisor.
  });
}

function loadOffset(p: string): number {
  try {
    const raw = fs.readFileSync(p, "utf8").trim();
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveOffset(p: string, offset: number): void {
  try {
    fs.writeFileSync(p, String(offset));
  } catch (err) {
    console.error(`[bridge tail] failed to save offset: ${err}`);
  }
}
