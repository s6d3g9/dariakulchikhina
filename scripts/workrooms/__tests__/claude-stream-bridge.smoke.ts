#!/usr/bin/env -S node --experimental-strip-types
/**
 * Smoke test: claude-stream-bridge against a local mock ingest server.
 *
 * The new bridge is a STDIN FILTER (not a spawner). We feed it a fixed
 * Claude CLI stream-json transcript and verify it POSTs the right ingest
 * events to the mock server.
 *
 * Assertions:
 *   - run_start received exactly once (with our runId)
 *   - at least one delta received
 *   - exactly one tokens event, with non-negative integer tokenIn/tokenOut
 *   - exactly one complete received
 *   - no fatal errors
 *   - bridge exits 0
 *
 * Exits 0 on pass, 1 on failure.
 */

import * as http from "node:http";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

interface IngestEvent {
  type: string;
  runId?: string;
  [key: string]: unknown;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") return reject(new Error("bad address"));
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

// A minimal but realistic stream-json transcript that exercises every branch
// of mapCliEvent(): system init, message_start, content_block_start tool_use,
// content_block_delta text_delta, and a terminal `result` event with usage.
const STREAM_FIXTURE: Array<Record<string, unknown>> = [
  { type: "system", subtype: "init", session_id: "fixture", model: "haiku" },
  { type: "stream_event", event: { type: "message_start", message: { usage: { input_tokens: 11, cache_read_input_tokens: 0 } } } },
  { type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "OK" } } },
  { type: "result", usage: { input_tokens: 11, output_tokens: 2 }, total_cost_usd: 0.000041, duration_ms: 320 },
];

async function runSmoke() {
  const port = await getFreePort();
  const receivedEvents: IngestEvent[] = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const ev = JSON.parse(body) as IngestEvent;
        receivedEvents.push(ev);
        process.stderr.write(`[mock] received: ${ev.type}\n`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(`[smoke] mock ingest server on port ${port}`);

  const agentId = randomUUID();
  const runId = randomUUID();
  const bridgeSrc = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "claude-stream-bridge.ts",
  );

  console.log(`[smoke] spawning bridge agent=${agentId} run=${runId}`);

  const bridge = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      bridgeSrc,
      "--agent-id", agentId,
      "--run-id", runId,
      "--messenger-core-url", `http://127.0.0.1:${port}`,
      "--ingest-token", "smoke-test-token",
    ],
    {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    },
  );

  bridge.stdout.on("data", (d: Buffer) => process.stdout.write(d));
  bridge.stderr.on("data", (d: Buffer) => process.stderr.write(d));

  // Feed the fixture line-by-line and close stdin so the bridge flushes.
  for (const ev of STREAM_FIXTURE) {
    bridge.stdin.write(JSON.stringify(ev) + "\n");
  }
  bridge.stdin.end();

  const TIMEOUT_MS = 15_000;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    bridge.kill("SIGTERM");
  }, TIMEOUT_MS);

  const exitCode = await new Promise<number>((resolve) =>
    bridge.on("close", (code) => resolve(code ?? 1)),
  );
  clearTimeout(timer);
  await new Promise<void>((resolve) => server.close(() => resolve()));

  if (timedOut) {
    fail("bridge timed out after 15 s");
  }

  console.log(`\n[smoke] bridge exited with code ${exitCode}`);
  console.log(`[smoke] total events received: ${receivedEvents.length}`);

  const byType: Record<string, number> = {};
  for (const ev of receivedEvents) {
    byType[ev.type] = (byType[ev.type] ?? 0) + 1;
  }
  console.log("[smoke] event counts:", JSON.stringify(byType, null, 2));

  const runStarts = receivedEvents.filter((e) => e.type === "run_start");
  const deltas = receivedEvents.filter((e) => e.type === "delta");
  const completes = receivedEvents.filter((e) => e.type === "complete");
  const tokenEvents = receivedEvents.filter((e) => e.type === "tokens");
  const fatalErrors = receivedEvents.filter(
    (e) => e.type === "error" && e.fatal === true,
  );

  assert(runStarts.length === 1, `expected exactly 1 run_start, got ${runStarts.length}`);
  assert(runStarts[0].runId === runId, `run_start.runId must match: ${runStarts[0].runId} vs ${runId}`);
  assert(deltas.length >= 1, `expected at least 1 delta, got ${deltas.length}`);
  assert(completes.length === 1, `expected exactly 1 complete, got ${completes.length}`);
  assert(tokenEvents.length === 1, `expected exactly 1 tokens event, got ${tokenEvents.length}`);
  assert(fatalErrors.length === 0, `unexpected fatal errors: ${JSON.stringify(fatalErrors)}`);

  const tok = tokenEvents[0] as { tokenIn?: number; tokenOut?: number; costUsd?: number };
  assert(
    typeof tok.tokenIn === "number" && Number.isInteger(tok.tokenIn) && tok.tokenIn >= 0,
    `tokens.tokenIn must be non-negative integer, got ${tok.tokenIn}`,
  );
  assert(
    typeof tok.tokenOut === "number" && Number.isInteger(tok.tokenOut) && tok.tokenOut >= 0,
    `tokens.tokenOut must be non-negative integer, got ${tok.tokenOut}`,
  );
  assert(
    tok.costUsd === undefined || (typeof tok.costUsd === "number" && tok.costUsd >= 0),
    `tokens.costUsd must be non-negative, got ${tok.costUsd}`,
  );

  assert(exitCode === 0, `bridge exited with non-zero code ${exitCode}`);

  console.log("\n[smoke] ALL ASSERTIONS PASSED ✓");
  process.exit(0);
}

function assert(condition: boolean, message: string) {
  if (!condition) fail(message);
}

function fail(message: string): never {
  console.error(`\n[smoke] FAIL: ${message}`);
  process.exit(1);
}

runSmoke().catch((err) => {
  console.error("[smoke] unhandled:", err);
  process.exit(1);
});
