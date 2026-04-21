#!/usr/bin/env -S node --experimental-strip-types
/**
 * claude-stream-bridge — stdin filter that forwards Claude CLI stream-json
 * events to the messenger-core ingest endpoint.
 *
 * This is a FILTER, not a spawner: `claude-session.sh` pipes the stream-json
 * output of `claude --print` through this binary so we can observe the
 * stream without re-running Claude. The prior version tried to spawn Claude
 * itself, which collided with the outer CLI and dropped all events.
 *
 * Usage (matches what claude-session.sh emits):
 *   claude-stream-bridge \
 *     --agent-id <uuid> \
 *     --run-id <uuid> \
 *     [--cli-session-id <uuid>] \
 *     [--parent-run <uuid>] \
 *     --messenger-core-url http://localhost:4300 \
 *     --ingest-token <token>
 *
 * Input:  NDJSON stream-json on stdin (one Claude event per line).
 * Output: POST to ${messengerUrl}/agents/${agentId}/stream (one HTTP call
 *         per mapped ingest event), authenticated with Bearer <token>.
 *
 * The messenger_agent_runs row for `--run-id` must exist upstream (create
 * it with POST /agents/:agentId/runs). Otherwise ingest returns 404 and
 * events land in the DLQ for later replay.
 *
 * Zero npm deps.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Ingest event shape (must match messenger-core/src/agents/ingest-handler.ts)
// ---------------------------------------------------------------------------

type IngestEvent =
  | { type: "run_start"; runId: string; prompt?: string }
  | { type: "substate"; runId: string; substate: string; message?: string }
  | { type: "delta"; runId: string; delta: string }
  | { type: "tool_use"; runId: string; tool: string; input?: unknown }
  | {
      type: "tokens";
      runId: string;
      tokenIn: number;
      tokenOut: number;
      costUsd?: number;
    }
  | { type: "complete"; runId: string; finalText?: string }
  | { type: "error"; runId: string; message: string; fatal?: boolean };

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  agentId: string;
  runId: string;
  cliSessionId?: string;
  parentRun?: string;
  messengerUrl: string;
  token: string;
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const get = (...flags: string[]): string | undefined => {
    for (const flag of flags) {
      const i = args.indexOf(flag);
      if (i !== -1 && i + 1 < args.length) return args[i + 1];
    }
    return undefined;
  };

  const agentId = get("--agent-id");
  const runId = get("--run-id") ?? randomUUID();
  const cliSessionId = get("--cli-session-id");
  const parentRun = get("--parent-run");
  const messengerUrl =
    get("--messenger-core-url", "--messenger-url") ??
    process.env.MESSENGER_CORE_URL ??
    "";
  const token =
    get("--ingest-token", "--token") ??
    process.env.MESSENGER_INGEST_TOKEN ??
    "";

  if (!agentId) die("--agent-id required");
  if (!messengerUrl) die("--messenger-core-url (or $MESSENGER_CORE_URL) required");
  if (!token) die("--ingest-token (or $MESSENGER_INGEST_TOKEN) required");

  return { agentId, runId, cliSessionId, parentRun, messengerUrl, token };
}

function die(msg: string): never {
  process.stderr.write(`[bridge] fatal: ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// HTTP sender with exponential-backoff retry + DLQ on give-up
// ---------------------------------------------------------------------------

async function postEvent(
  url: string,
  token: string,
  event: IngestEvent,
  dlqPath: string,
): Promise<void> {
  const body = JSON.stringify(event);
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        process.stderr.write(
          `[bridge] permanent error ${res.status} for ${event.type} runId=${event.runId}\n`,
        );
        writeDlq(dlqPath, event);
        return;
      }
    } catch {
      // network error — retry
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(Math.min(200 * Math.pow(2, attempt - 1), 16000));
    }
  }
  process.stderr.write(
    `[bridge] exhausted retries for ${event.type} runId=${event.runId}\n`,
  );
  writeDlq(dlqPath, event);
}

function writeDlq(dlqPath: string, event: IngestEvent): void {
  try {
    fs.mkdirSync(path.dirname(dlqPath), { recursive: true });
    fs.appendFileSync(dlqPath, JSON.stringify(event) + "\n");
  } catch {
    // best-effort — nothing else we can do
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// stream-json → IngestEvent mapper
// ---------------------------------------------------------------------------

type MapState = {
  finalText: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  completed: boolean;
};

function mapCliEvent(
  raw: unknown,
  runId: string,
  state: MapState,
): IngestEvent[] {
  if (typeof raw !== "object" || raw === null) return [];
  const ev = raw as Record<string, unknown>;
  const out: IngestEvent[] = [];

  switch (ev.type) {
    case "system": {
      if (ev.subtype === "init") {
        out.push({ type: "substate", runId, substate: "idle" });
      }
      break;
    }

    case "stream_event": {
      const se = (ev.event ?? ev.stream_event) as
        | Record<string, unknown>
        | undefined;
      if (!se) break;
      switch (se.type) {
        case "message_start":
          out.push({ type: "substate", runId, substate: "thinking" });
          break;

        case "content_block_start": {
          const cb = se.content_block as Record<string, unknown> | undefined;
          if (cb?.type === "tool_use") {
            out.push({ type: "substate", runId, substate: "tool_call" });
            out.push({
              type: "tool_use",
              runId,
              tool: String(cb.name ?? "unknown"),
              input: cb.input,
            });
          }
          break;
        }

        case "content_block_delta": {
          const delta = se.delta as Record<string, unknown> | undefined;
          if (delta?.type === "text_delta") {
            const text = String(delta.text ?? "");
            if (text) {
              state.finalText += text;
              out.push({ type: "substate", runId, substate: "streaming" });
              out.push({ type: "delta", runId, delta: text });
            }
          }
          break;
        }
      }
      break;
    }

    case "assistant": {
      // Fallback path for callers that only emit aggregated assistant events
      // (no per-token stream_event). Synthesize a single delta so the UI has
      // *something* to render.
      const content = (ev.message as Record<string, unknown> | undefined)
        ?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          const item = c as Record<string, unknown>;
          if (item?.type === "text") {
            const text = String(item.text ?? "");
            if (text) {
              state.finalText += text;
              out.push({ type: "delta", runId, delta: text });
            }
          }
        }
      }
      break;
    }

    case "result": {
      const usage = ev.usage as Record<string, unknown> | undefined;
      // Server schema requires non-negative integers for tokenIn/tokenOut
      // and a finite non-negative cost. Guard both or the ingest HTTP call
      // 400s and the event lands in the DLQ.
      const tokenIn = Math.max(0, Math.floor(Number(usage?.input_tokens ?? 0)));
      const tokenOut = Math.max(0, Math.floor(Number(usage?.output_tokens ?? 0)));
      const costRaw = Number(ev.total_cost_usd ?? 0);
      const costUsd = Number.isFinite(costRaw) && costRaw >= 0 ? costRaw : 0;
      state.tokensIn += tokenIn;
      state.tokensOut += tokenOut;
      state.costUsd += costUsd;
      out.push({ type: "tokens", runId, tokenIn, tokenOut, costUsd });

      if (!state.finalText && typeof ev.result === "string") {
        state.finalText = ev.result;
      }
      out.push({ type: "complete", runId, finalText: state.finalText });
      state.completed = true;
      break;
    }

    case "error": {
      const msg = String(ev.error ?? ev.message ?? "unknown CLI error");
      out.push({ type: "error", runId, message: msg, fatal: false });
      break;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);
  const ingestUrl = `${opts.messengerUrl.replace(/\/$/, "")}/agents/${opts.agentId}/stream`;
  const dlqPath = path.join(
    os.homedir(),
    "state/claude-bridge",
    `${opts.runId}.dlq.ndjson`,
  );
  const post = (event: IngestEvent) =>
    postEvent(ingestUrl, opts.token, event, dlqPath);

  process.stderr.write(
    `[bridge] agentId=${opts.agentId} runId=${opts.runId} cliSessionId=${opts.cliSessionId ?? "-"} parent=${opts.parentRun ?? "-"} target=${ingestUrl}\n`,
  );

  // 1. run_start — upstream caller should have already created the run row
  //    via POST /agents/:agentId/runs. We still emit so the server flips
  //    status → 'running' and bumps startedAt.
  await post({ type: "run_start", runId: opts.runId });

  // 2. Stream stdin line-by-line. Each complete NDJSON line becomes zero
  //    or more ingest events.
  const state: MapState = {
    finalText: "",
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    completed: false,
  };
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Non-JSON chatter (subjectivity bias echo, shell banner, etc.) —
      // ignore rather than spamming the ingest with parse errors.
      continue;
    }
    for (const ev of mapCliEvent(parsed, opts.runId, state)) {
      await post(ev);
    }
  }

  // 3. If stdin closed before we saw a result event, flag it so the
  //    messenger UI doesn't hang on "streaming" forever.
  if (!state.completed) {
    await post({
      type: "error",
      runId: opts.runId,
      message: "stdin closed before result event",
      fatal: true,
    });
    await post({
      type: "complete",
      runId: opts.runId,
      finalText: state.finalText,
    });
  }

  process.stderr.write(
    `[bridge] done runId=${opts.runId} tokens=${state.tokensIn}+${state.tokensOut} cost=$${state.costUsd.toFixed(4)}\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[bridge] unhandled: ${err}\n`);
  process.exit(1);
});
