#!/usr/bin/env -S node --experimental-strip-types
/**
 * Smoke test: claude-stream-bridge against real claude CLI + local mock ingest server.
 *
 * Assertions:
 *   - run_start received exactly once
 *   - at least one delta received
 *   - complete received exactly once
 *   - tokens received with non-negative in/out
 *
 * Exits 0 on pass, 1 on failure.
 */

import * as http from "node:http";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

interface IngestEvent {
  type: string;
  [key: string]: unknown;
}

function startMockServer(port: number): {
  events: IngestEvent[];
  close: () => Promise<void>;
} {
  const events: IngestEvent[] = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const ev = JSON.parse(body) as IngestEvent;
        events.push(ev);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
  });

  return {
    events,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      ),
  };
  // Actually start listening:
  Object.defineProperty(events, "__server__", { value: server, enumerable: false });
  // (unreachable but TS is happy)
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

async function runSmoke() {
  const port = await getFreePort();
  const receivedEvents: IngestEvent[] = [];

  // Start mock ingest server
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

  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve)
  );

  console.log(`[smoke] mock ingest server on port ${port}`);

  const agentId = randomUUID();
  const conversationId = randomUUID();
  const bridgeSrc = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "claude-stream-bridge.ts"
  );

  const env = {
    ...process.env,
    MESSENGER_INGEST_URL: `http://127.0.0.1:${port}`,
    MESSENGER_INGEST_TOKEN: "smoke-test-token",
  };

  console.log(`[smoke] spawning bridge for agent ${agentId}`);

  const bridge = spawn(
    process.execPath,
    ["--experimental-strip-types", bridgeSrc,
      "--agent-id", agentId,
      "--conversation-id", conversationId,
      "--prompt", "Reply with exactly: OK",
      "--model", "haiku",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    }
  );

  bridge.stdout.on("data", (d: Buffer) => process.stdout.write(d));
  bridge.stderr.on("data", (d: Buffer) => process.stderr.write(d));

  const TIMEOUT_MS = 60_000;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    bridge.kill("SIGTERM");
  }, TIMEOUT_MS);

  const exitCode = await new Promise<number>((resolve) =>
    bridge.on("close", (code) => resolve(code ?? 1))
  );
  clearTimeout(timer);
  await new Promise<void>((resolve) => server.close(() => resolve()));

  if (timedOut) {
    fail("bridge timed out after 60 s");
  }

  console.log(`\n[smoke] bridge exited with code ${exitCode}`);
  console.log(`[smoke] total events received: ${receivedEvents.length}`);

  // Print event summary
  const byType: Record<string, number> = {};
  for (const ev of receivedEvents) {
    byType[ev.type] = (byType[ev.type] ?? 0) + 1;
  }
  console.log("[smoke] event counts:", JSON.stringify(byType, null, 2));

  // --- Assertions ---
  const runStarts = receivedEvents.filter((e) => e.type === "run_start");
  const deltas = receivedEvents.filter((e) => e.type === "delta");
  const completes = receivedEvents.filter((e) => e.type === "complete");
  const tokenEvents = receivedEvents.filter((e) => e.type === "tokens");
  const fatalErrors = receivedEvents.filter(
    (e) => e.type === "error" && e.fatal === true
  );

  assert(runStarts.length === 1, `expected exactly 1 run_start, got ${runStarts.length}`);
  assert(deltas.length >= 1, `expected at least 1 delta, got ${deltas.length}`);
  assert(completes.length === 1, `expected exactly 1 complete, got ${completes.length}`);
  assert(tokenEvents.length >= 1, `expected at least 1 tokens event, got ${tokenEvents.length}`);
  assert(fatalErrors.length === 0, `unexpected fatal errors: ${JSON.stringify(fatalErrors)}`);

  const tok = tokenEvents[0] as { in?: number; out?: number };
  assert(
    typeof tok.in === "number" && tok.in >= 0,
    `tokens.in must be non-negative, got ${tok.in}`
  );
  assert(
    typeof tok.out === "number" && tok.out >= 0,
    `tokens.out must be non-negative, got ${tok.out}`
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
  console.error("[smoke] unhandled error:", err);
  process.exit(1);
});
